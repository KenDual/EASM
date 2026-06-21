import { promises as dnsPromises } from 'dns';

export default {
  type: 'dns',
  appliesTo: ['domain'],

  async run(asset, { resolver = dnsPromises } = {}) {
    const name = asset.name;
    const results = {};

    const resolve = async (type) => {
      try {
        results[type] = await resolver.resolve(name, type);
      } catch {
        results[type] = [];
      }
    };

    await Promise.allSettled([
      resolve('A'),
      resolve('AAAA'),
      resolve('MX'),
      resolve('NS'),
      resolve('TXT'),
      resolve('CNAME').catch(() => {
        results['CNAME'] = [];
      }),
    ]);

    return [results];
  },
};
