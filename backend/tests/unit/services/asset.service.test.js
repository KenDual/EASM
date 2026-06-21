import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../../src/repositories/asset.repository.js', () => ({
    assetRepository: {
        findAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
    },
}));

let assetService, assetRepository, ErrNotFound;

beforeAll(async () => {
    ({ assetService } = await import('../../../src/services/asset.service.js'));
    ({ assetRepository } = await import('../../../src/repositories/asset.repository.js'));
    ({ ErrNotFound } = await import('../../../src/utils/errors.js'));
});

const mockAsset = {
    id: 'uuid-1',
    name: 'example.com',
    type: 'domain',
    status: 'active',
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
};

beforeEach(() => jest.clearAllMocks());

describe('assetService.list', () => {
    test('delegates to repository', () => {
        const expected = { data: [mockAsset], total: 1, page: 1, limit: 20 };
        assetRepository.findAll.mockReturnValue(expected);

        const result = assetService.list({ page: 1, limit: 20 });

        expect(assetRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
        expect(result).toBe(expected);
    });
});

describe('assetService.getById', () => {
    test('returns asset when found', () => {
        assetRepository.findById.mockReturnValue(mockAsset);
        expect(assetService.getById('uuid-1')).toBe(mockAsset);
    });

    test('throws ErrNotFound when not found', () => {
        assetRepository.findById.mockReturnValue(null);
        expect(() => assetService.getById('missing')).toThrow(ErrNotFound);
    });
});

describe('assetService.create', () => {
    test('generates uuid and calls repository', () => {
        assetRepository.create.mockReturnValue(mockAsset);

        const result = assetService.create({
            name: 'example.com',
            type: 'domain',
            status: 'active',
        });

        expect(assetRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'example.com', type: 'domain' })
        );
        expect(result).toBe(mockAsset);
    });
});

describe('assetService.delete', () => {
    test('succeeds when asset exists', () => {
        assetRepository.delete.mockReturnValue(true);
        expect(() => assetService.delete('uuid-1')).not.toThrow();
    });

    test('throws ErrNotFound when asset does not exist', () => {
        assetRepository.delete.mockReturnValue(false);
        expect(() => assetService.delete('missing')).toThrow(ErrNotFound);
    });
});
