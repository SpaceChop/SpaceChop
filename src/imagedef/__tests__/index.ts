import { createReadStream } from 'fs';
import path from 'path';
import ImageDefinition from '..';
import toMatchImageSnapshot from '../../test/utils/toMatchImageSnapshot';
import { Format } from '../../types/Format';
import analyze from '../analyze';

expect.extend({ toMatchImageSnapshot });

describe('ImageDefinition', () => {
  describe('Analyze', () => {
    describe('Basic files', () => {
      const assets = '../../test/assets';
      const sources: Array<{
        source: string;
        alpha: boolean;
        interlacing: boolean;
        root: string,
        type: Format,
        width: number,
        height: number
        animated: boolean,
        lossy?: boolean,
      }> = [{
        source: 'grid.jpg',
        alpha: false,
        interlacing: false,
        root: assets,
        type: 'jpeg',
        width: 100,
        height: 100,
        animated: false,
      }, {
        source: 'grid-no-exif.jpg',
        alpha: false,
        interlacing: false,
        root: assets,
        type: 'jpeg',
        width: 100,
        height: 100,
        animated: false,
      }, {
        source: 'grid-interlaced.jpg',
        alpha: false,
        interlacing: true,
        root: assets,
        type: 'jpeg',
        width: 100,
        height: 100,
        animated: false,
      }, {
        source: 'grid.png',
        alpha: true,
        interlacing: false,
        root: assets,
        type: 'png',
        width: 100,
        height: 100,
        animated: false,
      }, {
        source: 'cat.png',
        alpha: true,
        interlacing: false,
        root: assets,
        type: 'png',
        width: 100,
        height: 100,
        animated: false,
      }, {
        source: 'cat-interlaced.png',
        alpha: true,
        interlacing: true,
        root: assets,
        type: 'png',
        width: 100,
        height: 100,
        animated: false,
      }, {
        source: 'cat-no-alpha.png',
        alpha: false,
        interlacing: false,
        root: assets,
        type: 'png',
        width: 100,
        height: 100,
        animated: false,
      }, {
        source: 'grid.gif',
        alpha: false,
        interlacing: false,
        root: assets,
        type: 'gif',
        width: 100,
        height: 100,
        animated: false,
      }, {
        source: 'grid.webp',
        alpha: false,
        interlacing: false,
        root: assets,
        type: 'webp',
        width: 100,
        height: 100,
        animated: false,
      }, {
        source: 'grid-lossy.webp',
        alpha: false,
        interlacing: false,
        root: assets,
        type: 'webp',
        width: 100,
        height: 100,
        animated: false,
      }, {
        source: 'rose-alpha.webp',
        alpha: true,
        interlacing: false,
        root: assets,
        type: 'webp',
        width: 400,
        height: 301,
        animated: false,
      }, {
        source: 'lossy-vp8.webp',
        alpha: false,
        interlacing: false,
        root: assets,
        type: 'webp',
        width: 550,
        height: 368,
        animated: false,
      }, {
        source: 'grid-interlaced.gif',
        alpha: false,
        interlacing: true,
        root: assets,
        type: 'gif',
        width: 100,
        height: 100,
        animated: false,
      }, {
        source: 'animated.gif',
        alpha: true,
        interlacing: false,
        root: assets,
        type: 'gif',
        width: 100,
        height: 100,
        animated: true,
      }, {
        source: 'animated.png',
        alpha: true,
        interlacing: false,
        root: assets,
        type: 'png',
        width: 100,
        height: 100,
        animated: true,
      }, {
        source: 'animated.webp',
        alpha: true,
        interlacing: false,
        root: assets,
        type: 'webp',
        width: 320,
        height: 240,
        animated: true,
        lossy: false,
      }, {
        source: 'animated-alpha.webp',
        alpha: true,
        interlacing: false,
        root: assets,
        type: 'webp',
        width: 200,
        height: 200,
        animated: true,
        lossy: false,
      },
      ];

      // create a test for all file types
      for (const {
        source,
        width,
        height,
        alpha,
        interlacing,
        animated,
        type,
        root,
      } of sources) {
        describe(`analyze ImageDefinition for ${source}`, () => {
          const expected: ImageDefinition = {
            width,
            height,
            type,
            alpha,
            interlacing,
            animated,
          };
          const stream = createReadStream(path.join(__dirname, root, source));

          it('should return valid ImageDefinition', async () => {
            const recieved = await analyze(stream, []);
            expect(recieved).toEqual(
              expect.objectContaining(expected),
            );
          });
        });
      }
    });
  });
});
