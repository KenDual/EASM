import { promises as dnsPromises } from 'dns';

export default {
    type: 'ip',
    appliesTo: ['ip'],

    async run(asset) {
        const [geo, reverse] = await Promise.allSettled([
            fetch(`http://ip-api.com/json/${asset.name}`).then((r) => r.json()),
            dnsPromises.reverse(asset.name),
        ]);

        return [
            {
                geo: geo.status === 'fulfilled' ? geo.value : null,
                reverse_dns: reverse.status === 'fulfilled' ? reverse.value : [],
            },
        ];
    },
};
