import { Request, Response } from 'express';
import pathToRegex from 'path-to-regexp';
import { Stream } from 'stream';
import console from './lib/console';
import extractParamValues from './lib/extractParamValues';
import jq from './lib/jq';
import populateParams from './lib/populateParams';
import populatePresetParams from './lib/populatePresetParams';
import asyncWrapper from './lib/requestAsyncWrapper';
import StreamSwitch from './lib/stream-switch';
import streamToBuffer from './lib/streamToBuffer';
import fetchSource from './sources/lib/fetch-source';
import instantiateSources from './sources/lib/instantiate-sources';
import Sources from './sources/sources';
import hash from './storage/hash';
import fetchFromStorage from './storage/lib/fetch-from-storage';
import instantiateStorage from './storage/lib/instantiate-storage';
import uploadToStorage from './storage/lib/upload-to-storage';
import IStorage from './storage/storage';
import Trace from './trace';
import transform, { buildTransformation } from './transform';
import { Config } from './types/Config';
import { formatToMime, Mime } from './types/Format';
import { ParamSchema } from './types/ParamSchema';
import { PathConfig } from './types/PathConfig';

export const handleError = (res) => (error) => {
  console.error(error);
  res.status(500);
  res.end(error.message);
};

export const respond = async (response: Response, stream: Stream, mime: Mime, config: Config) => {
  return new Promise(async (resolve, reject) => {
    response.set('Content-Type', mime);

    if (config.disableChunkedEncoding) {
      const buffer = await streamToBuffer(stream);
      response.set('Content-Length', `${buffer.length}`);
      // If content-length is set node will not set the transfer-encoding
      // so next line is not neccesary but leaving it here
      // since it is confusing.
      // response.set('Transfer-Encoding', '');
      response.end(buffer);
      resolve();
      return;
    }

    response.set('Transfer-Encoding', 'chunked');
    stream.pipe(response);
    stream.on('error', reject);
    stream.on('end', resolve);
    return;
  });
};

export const requestHandler = (
  path: PathConfig,
  config: Config,
  keys: any,
  sources: Sources,
  storage?: IStorage,
  types?: ParamSchema,
) => async (req: Request, res: Response) => {
  // Create trace instance.
  const trace = new Trace();
  // Extract params from request (enables the use of dynamic named params (.*)).
  const params = extractParamValues(keys, path, req, types);
  // trace.log('url', req.url);
  // trace.log('params', params);

  // find the right preset steps to use
  const preset = config.presets[params.preset];

  if (!preset) {
    res.status(404);
    res.end('Could not find preset');
    trace.warn('preset', 'Could not find preset');
    return;
  } else {
    // trace.log('preset', preset);
  }

  // Lookup params from source.
  if (preset.lookup_params) {
    const { lookup_params } = preset;
    const lookupParams = populateParams(lookup_params.params, params);
    const lookupSource = lookup_params.source;
    const data = await fetchSource(sources, lookupParams, lookupSource)
      .then(streamToBuffer).then((buffer) => buffer.toString());
    if (lookup_params.extract_from_json) {
      for (const param of Object.keys(lookup_params.extract_from_json)) {
        const filter = lookup_params.extract_from_json[param];
        const value = await jq(data, filter);
        params[param] = value;
      }
    }
  }

  // populate steps with params.
  const steps = populatePresetParams(preset.steps, params);
  // trace.log('steps', steps);
  if (storage) {
    params.hash = hash(steps);
  }

  // check if transformation is already done and exists in storage
  if (storage) {
    const fromCache = await fetchFromStorage(storage, params);

    // It exists in cache
    if (fromCache && fromCache.contentType) {
      if ('analyze' in req.query) {
        const { state } = await buildTransformation(fromCache.stream, steps);
        res.json(state);
        return;
      }

      await respond(res, fromCache.stream, fromCache.contentType, config);
      trace.end();
      return;
    }
  }

  // look through sources to fetch original source stream
  const stream = await fetchSource(sources, params);

  if (!stream) {
    res.status(404);
    res.end('Could not find image');
    trace.warn('image', 'Could not find image');
    return;
  }

  // Only analyze image after pipeline
  const onlyAnalyze = 'analyze' in req.query;
  if (onlyAnalyze) {
    const { state } = await buildTransformation(stream, steps);
    // trace.log('analyze', state);
    res.json({ state, params, steps });
    trace.end();
  } else {
    try {
      const { stream: transformed, definition } = await transform(stream, steps, config, sources, params);
      // trace.log('definition', definition);
      const contentType = formatToMime(definition.type);

      // Send image data through the worker which passes through to response.
      let streamToRespondWith = transformed;
      if (config.storage) {
        const streamSwitch = new StreamSwitch(transformed);
        streamToRespondWith = streamSwitch.createReadStream();
        const streamToCache = streamSwitch.createReadStream();
        uploadToStorage(storage, params, streamToCache, contentType);
      }
      await respond(res, streamToRespondWith, contentType, config);
      trace.end();
    } catch (err) {
      console.warn(err);
      trace.warn('error', err.message);
    }
  }
};

export default (config: Config, server) => {
  if (!config) {
    return;
  }
  // extract paths from config to listen in on.
  const services = Object.keys(config.services);

  let storage = null;
  if (!!config.storage) {
    storage = instantiateStorage(config.storage);
  }
  const sources = instantiateSources(config.sources);
  // listen on all paths.
  services.forEach((service: string) => {
    const path: PathConfig = config.services[service].path;
    const types: ParamSchema = config.params;
    const keys = [];
    const pattern = pathToRegex(path.pattern, keys);
    const handler = requestHandler(path, config, keys, sources, storage, types);
    server.get(pattern, asyncWrapper(handler, handleError));
  });
};
