import * as t from 'runtypes';

const CompressConfig = t.Partial({
  quality: t.Number.withConstraint(
    (n) => {
      if (n < 0 || n > 100) {
        return 'quality must be between 0 and 100';
      }
      if (n % 1 !== 0) {
        return 'quality must be non decimal number';
      }
      return true;
    },
  ),
  lossy: t.Boolean,
});

export type CompressConfig = t.Static<typeof CompressConfig>;
export default CompressConfig;
