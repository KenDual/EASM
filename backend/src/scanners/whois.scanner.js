import whoiser from 'whoiser';

export default {
    type: 'whois',
    appliesTo: ['domain'],

    async run(asset) {
        const data = await whoiser(asset.name, { follow: 1 });
        return [data];
    },
};
