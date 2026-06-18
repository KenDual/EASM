import dns from './dns.scanner.js';
import whois from './whois.scanner.js';
import subdomain from './subdomain.scanner.js';
import certTrans from './cert_trans.scanner.js';
import asn from './asn.scanner.js';
import ip from './ip.scanner.js';
import port from './port.scanner.js';
import ssl from './ssl.scanner.js';
import tech from './tech.scanner.js';

const scannerList = [dns, whois, subdomain, certTrans, asn, ip, port, ssl, tech];

export const SCANNERS = Object.fromEntries(scannerList.map((s) => [s.type, s]));
export const ALL_TYPES = Object.keys(SCANNERS);
