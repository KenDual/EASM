export default {
  type: 'cert_trans',
  appliesTo: ['domain'],

  async run(asset) {
    const res = await fetch(`https://crt.sh/?q=${asset.name}&output=json`);
    if (!res.ok) throw new Error(`crt.sh returned ${res.status}`);
    const certs = await res.json();

    return certs.map((c) => ({
      id: c.id,
      issuer: c.issuer_name,
      common_name: c.common_name,
      not_before: c.not_before,
      not_after: c.not_after,
      entry_timestamp: c.entry_timestamp,
    }));
  },
};
