import { Request, Response } from 'express';
import pathToRegex from 'path-to-regexp';
import console from './lib/console';
import extractParamValues from './lib/extractParamValues';
import populatePresetParams from './lib/populatePresetParams';
import asyncWrapper from './lib/requestAsyncWrapper';
import StreamSwitch from './lib/stream-switch';
import instantiateSource from './sources/lib/instantiate-source';
import lookThroughSources from './sources/lib/look-through-sources';
import Source from './sources/source';
import fetchFromStorage from './storage/lib/fetch-from-storage';
import instantiateStorage from './storage/lib/instantiate-storage';
import uploadToStorage from './storage/lib/upload-to-storage';
import IStorage from './storage/storage';
import transform, { buildTransformation } from './transform';
import { Config } from './types/Config';
import { formatToMime } from './types/Format';

export const handleError = (res) => (error) => {
  console.error(error);
  res.status(500);
  res.end(error.message);
};

export const requestHandler = (
  config: Config, keys,
  sources: Source[],
  storage?: IStorage,
) => async (req: Request, res: Response) => {
  // Extract params from request (enables the use of dynamic named params (.*)).
  const params = extractParamValues(keys, req.params);

  // find the right preset steps to use
  const preset = config.presets[params.preset];

  if (!preset) {
    res.status(404);
    res.end('Could not find preset');
    return;
  }

  // populate steps with params.
  const steps = populatePresetParams(preset.steps, params);

  // check if transformation is already done and exists in storage
  if (storage) {
    const fromCache = await fetchFromStorage(storage, params);
    // It exists in cache
    if (fromCache && fromCache.contentType) {
      res.set('Content-Type', fromCache.contentType);
      fromCache.stream.pipe(res);
      return;
    }
  }

  // look through sources to fetch original source stream
  const stream = await lookThroughSources(sources, params);

  if (!stream) {
    res.status(404);
    res.end('Could not find image');
    return;
  }

  // Only analyze image after pipeline
  const onlyAnalyze = 'analyze' in req.query;
  if (onlyAnalyze) {
    const { state } = await buildTransformation(stream, steps);
    res.json(state);
  } else {
    const { stream: transformed, definition } = await transform(stream, steps);
    const contentType = formatToMime(definition.type);
    res.set('Content-Type', contentType);
    // Send image data through the worker which passes through to response.

    let streamToRespondWith = transformed;
    if (config.storage) {
      const streamSwitch = new StreamSwitch(transformed);
      streamToRespondWith = streamSwitch.createReadStream();
      const streamToCache = streamSwitch.createReadStream();
      uploadToStorage(storage, params, streamToCache, contentType);
    }
    streamToRespondWith.pipe(res);
  }
};

export default (config: Config, server) => {
  if (!config) {
    return;
  }
  // extract paths from config to listen in on.
  const { paths = ['/*'] } = config;

  const storage = !!config.storage ? instantiateStorage(config.storage) : null;
  const sources = config.sources.map(instantiateSource);
  // listen on all paths.
  paths.forEach((path) => {
    const keys = [];
    const pattern = pathToRegex(path, keys);
    const handler = requestHandler(config, keys, sources, storage);
    server.get(pattern, asyncWrapper(handler, handleError));
  });
};
