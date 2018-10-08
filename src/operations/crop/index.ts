import getLargestFace from '../../lib/face-detection/getLargestFace';
import translateFace from '../../lib/face-detection/translateFace';
import translationForCenteringOnFace from '../../lib/face-detection/translationForCenteringOnFace';
import { getMagickOffset, magickGravityMap } from '../../lib/magick';
import { DefinitionRequirement, Gravity, ImageDefinition } from '../../types';
import Operation from './../operation';
import { CropConfig } from './types';

const gravityTransform = (config: CropConfig, state: ImageDefinition, gravity: Gravity) => {
  const width = config.width as number;
  const height = config.height as number;

  if (config.gravity !== 'face' || !state.faces || state.faces.length === 0) {
    return null;
  }

  const largestFace = getLargestFace(state.faces);

  const translate = translationForCenteringOnFace(
    { width, height },
    { width: state.width, height: state.height },
    largestFace,
    gravity,
  );

  return translate;
};

export const magickOptions = (config: CropConfig, state: ImageDefinition): string[] => {
  const width = config.width === undefined ||
    config.width > state.width ? state.width : config.width as number;
  const height = config.height === undefined ||
    config.height > state.height ? state.height : config.height as number;
  const gravity = config.gravity as Gravity;
  // calculate translation of faces from center.
  const translate = gravityTransform(config, state, 'center');
  const offset = getMagickOffset(translate);
  const geometry = `${width}x${height}${offset}`;
  return [
    '-',
    `-gravity ${magickGravityMap[gravity]}`,
    `-crop ${geometry}`,

    // magick crop only changes the image size, but not the canvas's.
    // using repage solves this.
    // If repage was not used, the true image size (that is widthxheight) would still
    // be the same, but the "projected" image would be correct size.
    `-repage ${geometry}`,
    `${state.type}:-`,
  ];
};

export const transformState = (config: CropConfig, state: ImageDefinition): ImageDefinition => {
  const width = config.width === undefined ||
    config.width > state.width ? state.width : config.width as number;
  const height = config.height === undefined ||
    config.height > state.height ? state.height : config.height as number;
  // calculate translation of faces from northwest.
  const translate = gravityTransform({ ...config, width, height }, state, 'northwest');

  let faces = state.faces;
  if (state.faces && translate) {
    faces = state.faces.map(translateFace({ x: -translate.x, y: -translate.y }));
  }

  return {
    ...state,
    width,
    height,
    faces,
  };
};

export const defaultConfig: CropConfig = {
  gravity: 'center',
};

export default class Crop implements Operation {
  public config: CropConfig;
  constructor(config: CropConfig) {
    this.config = { ...defaultConfig, ...config };
  }

  public requirements(): DefinitionRequirement[] {
    if (this.config.gravity === 'face') {
      return ['faces'];
    }
    return [];
  }

  public execute(state: ImageDefinition): { command: string, state: ImageDefinition } {
    const options = magickOptions(this.config, state);
    return {
      state: transformState(this.config, state),
      command: 'magick ' + options.join(' '),
    };
  }
}
