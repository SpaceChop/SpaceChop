import path from 'path';
import Resize, { ResizeConfig } from './../index';
import ImageDefinition, { ImageType } from './../../../imagedef'
import createTransformedStream from '../../../test/utils/createTransformedStream';
import toMatchImageSnapshot from '../../../test/utils/toMatchImageSnapshot';

expect.extend({ toMatchImageSnapshot })
describe('Resize', () => {
  describe('Transformation of state', () => {
    const defaultConfig: ResizeConfig = { width: 200, height: 200 };
    const defaultState: ImageDefinition = { height: 400, width: 400, type: ImageType.jpeg };

    it('should not return same state', () => {
      const r = new Resize(defaultConfig);
      const stateBefore = defaultState;
      const { state: stateAfter } = r.execute(stateBefore);
      expect(stateBefore === stateAfter).toBe(false);
    });

    it('should update width & height', () => {
      const op = new Resize(defaultConfig);
      const { state } = op.execute(defaultState);
      expect(state).toEqual(expect.objectContaining({
        width: 200,
        height: 200
      }));
    });

    it('should not update type', () => {
      const op = new Resize(defaultConfig);
      const { state } = op.execute(defaultState);
      expect(state).toEqual(expect.objectContaining({
        type: defaultState.type,
      }));
    });
  });

  describe('Command', () => {
    const defaultConfig: ResizeConfig = { width: 200, height: 200 };
    const defaultState: ImageDefinition = { height: 400, width: 400, type: ImageType.jpeg };

    it('should use correct width & height', () => {
      const op = new Resize(defaultConfig);
      const { command } = op.execute(defaultState);
      expect(command).toEqual(expect.stringMatching(/-resize 200x200/));
    });
  });

  describe('Image similarity', () => {
    const defaultConfig: ResizeConfig = { width: 50, height: 100 };
    const defaultState: ImageDefinition = { width: 100, height: 100, type: ImageType.jpeg };

    const gridPathJPEG: string = path.join(__dirname, '../../../test/assets', 'grid.jpg');
    const gridPathPNG: string = path.join(__dirname, '../../../test/assets', 'grid.png');
    const gridPathPNGInterlaced: string = path.join(__dirname, '../../../test/assets', 'grid-interlaced.png');
    const gridPathGIF: string = path.join(__dirname, '../../../test/assets', 'grid.gif');

    it('should correctly resize JPEG', async () => {
      const result = createTransformedStream(
        gridPathJPEG,
        new Resize(defaultConfig),
        defaultState
      );
      await expect(result).toMatchImageSnapshot({ extension: 'jpg' });
    });

    it('should correctly resize PNG', async () => {
      const result = createTransformedStream(
        gridPathPNG,
        new Resize(defaultConfig),
        { ...defaultState, type: ImageType.png }
      );
      await expect(result).toMatchImageSnapshot({ extension: 'png' });
    });

    it('should correctly resize interlaced PNG', async () => {
      const result = createTransformedStream(
        gridPathPNGInterlaced,
        new Resize(defaultConfig),
        { ...defaultState, type: ImageType.png, interlacing: true }
      );
      await expect(result).toMatchImageSnapshot({ extension: 'png' });
    });

    it('should correctly resize GIF', async () => {
      const result = createTransformedStream(
        gridPathGIF,
        new Resize(defaultConfig),
        { ...defaultState, type: ImageType.gif }
      );
      await expect(result).toMatchImageSnapshot({ extension: 'gif' });
    });
  });
});