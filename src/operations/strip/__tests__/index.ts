import path from 'path';
import ImageDefinition, { ImageType } from '../../../imagedef';
import createTransformedStream from '../../../test/utils/createTransformedStream';
import Strip, { StripConfig } from '..';
import toMatchImageSnapshot from '../../../test/utils/toMatchImageSnapshot';
import extractStreamExif from '../../../test/utils/extractStreamExif';
import { PassThrough } from 'stream';
import { createReadStream } from 'fs';

expect.extend({ toMatchImageSnapshot });

describe('Strip', () => {
  describe('Command', () => {
    const defaultConfig: StripConfig = {};
    const defaultState: ImageDefinition = { width: 100, height: 100, type: ImageType.jpeg };

    const __assets = '../../../test/assets';
    const sources = {
      jpeg: path.join(__dirname, __assets, 'grid.jpg'),
      png: path.join(__dirname, __assets, 'grid.png'),
      gif: path.join(__dirname, __assets, 'grid.gif'),
    };

    // create a test for all file types
    for (const type of Object.keys(ImageType)) {
      // XXX add source for webp and remove this if statement.
      if (type !== 'webp') {
        it(`should strip exif from ${type}`, async () => {
          // create operation with config.
          const operation = new Strip({ ...defaultConfig });
          // select source image to use.
          const source = sources[type];

          // get original exif data.
          const original = createReadStream(source);
          const exifOrig = await extractStreamExif(original);

          // set current state of source image.
          const state = { ...defaultState, type: ImageType[type] };

          // do the transformation operation.
          const result = createTransformedStream(source, operation, state);

          // pass through streams to be able to read them multiple times.
          const a = new PassThrough();
          const b = new PassThrough();
          result.pipe(a);
          result.pipe(b);

          // check what exifdata is still on the transformed image.
          const exif = await extractStreamExif(a);

          // check that exif data was removed and did not change from snapchot.
          expect(exif.length).toBeLessThan(exifOrig.length);
          expect(exif).toMatchSnapshot();

          // check so that the image matches the snapshot.
          await expect(b).toMatchImageSnapshot({ extension: type });
        });
      }
    }
  });
});