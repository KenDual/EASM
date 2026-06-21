import { isPrivateIP } from '../../../src/utils/safety.js';

describe('isPrivateIP', () => {
    describe('returns true for private/loopback addresses', () => {
        test.each([
            ['127.0.0.1'],
            ['127.0.0.2'],
            ['10.0.0.1'],
            ['10.255.255.255'],
            ['192.168.0.1'],
            ['192.168.100.200'],
            ['172.16.0.1'],
            ['172.20.0.1'],
            ['172.31.255.255'],
            ['169.254.0.1'],
            ['169.254.169.254'],
            ['localhost'],
            ['::1'],
            ['fc00::1'],
            ['fe80::1'],
        ])('%s', (ip) => {
            expect(isPrivateIP(ip)).toBe(true);
        });
    });

    describe('returns false for public addresses', () => {
        test.each([
            ['8.8.8.8'],
            ['1.1.1.1'],
            ['93.184.216.34'],
            ['172.32.0.1'],
            ['172.15.255.255'],
            ['11.0.0.1'],
            ['192.169.0.1'],
        ])('%s', (ip) => {
            expect(isPrivateIP(ip)).toBe(false);
        });
    });
});
