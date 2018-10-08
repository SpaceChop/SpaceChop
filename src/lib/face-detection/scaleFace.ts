import { ImageFaceBox } from '../../types';

export interface ScaleFace {
  scale?: number;
  scaleX?: number;
  scaleY?: number;
}
/**
 * Scales the position and size of an image.
 * Supports scaling in only one axis as well as both.
 */
export default (scaling: ScaleFace) => (face: ImageFaceBox): ImageFaceBox => {
  const {
    scale = 1,
    scaleX = scale,
    scaleY = scale,
  } = scaling;
  return {
    x: Math.round(face.x / scaleX),
    y: Math.round(face.y / scaleY),
    width: Math.round(face.width / scaleX),
    height: Math.round(face.height / scaleY),
  };
};
