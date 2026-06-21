export default {
    type: 'asn',
    appliesTo: ['ip'],

    async run(asset) {
        const res = await fetch(`https://api.iplocation.net/?ip=${asset.name}`);
        if (!res.ok) throw new Error(`iplocation.net returned ${res.status}`);
        const data = await res.json();
        return [data];
    },
};
