export default {
    type: 'subdomain',
    appliesTo: ['domain'],

    async run(asset) {
        const res = await fetch(`https://crt.sh/?q=%.${asset.name}&output=json`);
        if (!res.ok) throw new Error(`crt.sh returned ${res.status}`);
        const certs = await res.json();

        const subdomains = [
            ...new Set(
                certs
                    .flatMap((c) => c.name_value.split('\n'))
                    .filter((s) => s.endsWith(asset.name) && !s.includes('*'))
                    .map((s) => s.toLowerCase())
            ),
        ];

        return subdomains.map((s) => ({ subdomain: s }));
    },
};
