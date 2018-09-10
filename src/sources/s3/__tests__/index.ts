import { Readable } from 'stream';
import { S3SourceConfig } from '../types';
import S3Source from './../index';

const mocks = {
  headObject: jest.fn((_, cb) => { cb(null, false); }),
  Endpoint: jest.fn(),
};

jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
    headObject: mocks.headObject,
    getObject: jest.fn(() => ({
      createReadStream: jest.fn(() => {
        const { PassThrough } =  require('stream');
        return new PassThrough();
      }),
    })),
  })),
  Endpoint: jest.fn().mockImplementation(
    (...args) => mocks.Endpoint(...args),
  ),
  config: { update: jest.fn() },
}));

const defaultConfig: S3SourceConfig = {
  access_key_id: 'xxx',
  secret_access_key: 'xxx',
  region: 'xxx',
  bucket_name: 'xx',
  path: ':image',
};
describe('S3 source', () => {
  describe('.exists', () => {
    it('should call S3.headObject', async () => {
      mocks.headObject.mockClear();
      const source = new S3Source(defaultConfig);
      await source.exists({ image: 'hej' });
      expect(mocks.headObject).toHaveBeenCalled();
    });

    it('should call AWS.Endpoint', async () => {
      mocks.headObject.mockClear();
      const source = new S3Source({
        ...defaultConfig,
        endpoint: 'endpoint',
      });
      await source.exists({ image: 'hej' });
      expect(mocks.Endpoint.mock.calls[0][0]).toBe('endpoint');
    });

    it('should resolve to false if image does not exists', async () => {
      // In mock implementation of aws-sdk above headObject
      // is set to return false.
      const source = new S3Source(defaultConfig);
      const result = await source.exists({ image: 'hej' });
      expect(result).toBe(false);
    });
  });

  describe('.stream', () => {
    it('should return a stream', async () => {
      const source = new S3Source(defaultConfig);
      // console.log(source);
      const result = await source.stream({ image: 'hej' });
      expect(result).toBeInstanceOf(Readable);
    });
  });

});
