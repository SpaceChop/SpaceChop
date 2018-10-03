import { Config } from '../../../types/Config';
import { validate } from '../../validate';

describe('validate storage', () => {
  it('should not throw error on valid storage', () => {
    const config: Config = {
      paths: ['/:preset/:image'],
      sources: [{
        s3: {
          access_key_id: 'access_key_id',
          secret_access_key: 'secret_access_key',
          region: 'region',
          bucket_name: 'bucket_name',
          path: ':image',
        },
      }],
      storage: {
        s3: {
          access_key_id: 'access_key_id',
          secret_access_key: 'secret_access_key',
          region: 'region',
          bucket_name: 'bucket_name',
          path: ':image',
        },
      },
      presets: {},
    };
    expect(() => validate(config)).not.toThrow();
  });
});
