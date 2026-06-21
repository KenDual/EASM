import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import dnsScanner from '../../../src/scanners/dns.scanner.js';

const mockResolver = {
    resolve: jest.fn(),
};

beforeEach(() => {
    mockResolver.resolve.mockReset();
});

describe('dns.scanner', () => {
    test('type and appliesTo', () => {
        expect(dnsScanner.type).toBe('dns');
        expect(dnsScanner.appliesTo).toContain('domain');
        expect(dnsScanner.appliesTo).not.toContain('ip');
    });

    test('collects A, AAAA, MX, NS, TXT records', async () => {
        mockResolver.resolve.mockImplementation((_name, type) => {
            const data = {
                A: ['93.184.216.34'],
                AAAA: ['2606:2800:220:1:248:1893:25c8:1946'],
                MX: [{ exchange: 'mail.example.com', priority: 10 }],
                NS: ['ns1.example.com'],
                TXT: [['v=spf1 -all']],
            };
            return Promise.resolve(data[type] ?? []);
        });

        const result = await dnsScanner.run(
            { name: 'example.com', type: 'domain' },
            { resolver: mockResolver }
        );

        expect(result).toHaveLength(1);
        expect(result[0].A).toEqual(['93.184.216.34']);
        expect(result[0].MX).toHaveLength(1);
        expect(result[0].NS).toContain('ns1.example.com');
    });

    test('returns empty arrays when record type not found', async () => {
        mockResolver.resolve.mockRejectedValue(
            Object.assign(new Error('ENODATA'), { code: 'ENODATA' })
        );

        const result = await dnsScanner.run(
            { name: 'nxdomain.example', type: 'domain' },
            { resolver: mockResolver }
        );

        expect(result).toHaveLength(1);
        expect(result[0].A).toEqual([]);
        expect(result[0].MX).toEqual([]);
    });

    test('resolver called with correct domain', async () => {
        mockResolver.resolve.mockResolvedValue([]);

        await dnsScanner.run({ name: 'test.io', type: 'domain' }, { resolver: mockResolver });

        expect(mockResolver.resolve).toHaveBeenCalledWith('test.io', 'A');
        expect(mockResolver.resolve).toHaveBeenCalledWith('test.io', 'MX');
    });
});
