import net from 'net';
import { promises as dnsPromises } from 'dns';
import { isPrivateIP } from '../utils/safety.js';
import { ErrInvalid } from '../utils/errors.js';

const DEFAULT_PORTS = [22, 80, 443, 3306, 5432, 6379, 8080, 8443, 27017];
const CONNECT_TIMEOUT = 1500;
const MAX_PARALLEL = 50;

export default {
  type: 'port',
  appliesTo: ['ip'],

  async run(asset) {
    const ip = asset.name;
    if (!isPrivateIP(ip)) {
      throw new ErrInvalid('Port scan is only allowed on private IP addresses');
    }

    const results = await scanPorts(ip, DEFAULT_PORTS);
    return results;
  },
};

async function scanPort(ip, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ port, open: false, reason: 'timeout' });
    }, CONNECT_TIMEOUT);

    socket.connect(port, ip, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ port, open: true });
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      resolve({ port, open: false, reason: err.code });
    });
  });
}

async function scanPorts(ip, ports) {
  const results = [];
  for (let i = 0; i < ports.length; i += MAX_PARALLEL) {
    const batch = ports.slice(i, i + MAX_PARALLEL);
    const batchResults = await Promise.all(batch.map((p) => scanPort(ip, p)));
    results.push(...batchResults);
  }
  return results;
}
