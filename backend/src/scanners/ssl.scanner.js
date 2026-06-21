import tls from 'tls';

export default {
    type: 'ssl',
    appliesTo: ['domain'],

    async run(asset) {
        return new Promise((resolve, reject) => {
            const socket = tls.connect(
                { host: asset.name, port: 443, servername: asset.name, rejectUnauthorized: false },
                () => {
                    const cert = socket.getPeerCertificate(true);
                    socket.destroy();

                    resolve([
                        {
                            subject: cert.subject,
                            issuer: cert.issuer,
                            valid_from: cert.valid_from,
                            valid_to: cert.valid_to,
                            fingerprint: cert.fingerprint,
                            san: cert.subjectaltname,
                            serial_number: cert.serialNumber,
                        },
                    ]);
                }
            );

            socket.on('error', reject);
            socket.setTimeout(5000, () => {
                socket.destroy();
                reject(new Error('TLS connect timeout'));
            });
        });
    },
};
