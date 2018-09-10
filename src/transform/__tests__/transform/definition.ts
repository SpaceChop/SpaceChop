import { createReadStream } from 'fs';
import path from 'path';
import transform from '../..';
import assetsFolder from '../../../test/assets/dirname';

describe('Headers', () => {
  const img = path.join(assetsFolder, 'grid.jpg');
  let definition;
  beforeAll(async () => {
    const input = createReadStream(img);
    const result = await transform(input, []);
    definition = result.definition;
  });

  it('should set type', () => {
    expect(definition.type).toBe('jpeg');
  });
});
