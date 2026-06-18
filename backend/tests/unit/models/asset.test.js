import { CreateAssetSchema, AssetTypeEnum } from '../../../src/models/asset.js';

describe('CreateAssetSchema', () => {
  describe('valid inputs', () => {
    test('domain asset', () => {
      const result = CreateAssetSchema.safeParse({ name: 'example.com', type: 'domain' });
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ name: 'example.com', type: 'domain', status: 'active' });
    });

    test('ip asset', () => {
      const result = CreateAssetSchema.safeParse({ name: '192.168.1.1', type: 'ip' });
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('ip');
    });

    test('explicit status', () => {
      const result = CreateAssetSchema.safeParse({ name: 'test.io', type: 'domain', status: 'inactive' });
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('inactive');
    });

    test('defaults status to active', () => {
      const result = CreateAssetSchema.safeParse({ name: 'test.io', type: 'domain' });
      expect(result.data.status).toBe('active');
    });

    test('subdomain with dots and hyphens', () => {
      const result = CreateAssetSchema.safeParse({ name: 'api.sub-domain.example.com', type: 'domain' });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    test('missing name', () => {
      const result = CreateAssetSchema.safeParse({ type: 'domain' });
      expect(result.success).toBe(false);
    });

    test('empty name', () => {
      const result = CreateAssetSchema.safeParse({ name: '', type: 'domain' });
      expect(result.success).toBe(false);
    });

    test('name with spaces', () => {
      const result = CreateAssetSchema.safeParse({ name: 'bad name', type: 'domain' });
      expect(result.success).toBe(false);
    });

    test('name with special characters', () => {
      const result = CreateAssetSchema.safeParse({ name: 'bad!name', type: 'domain' });
      expect(result.success).toBe(false);
    });

    test('invalid type', () => {
      const result = CreateAssetSchema.safeParse({ name: 'example.com', type: 'fqdn' });
      expect(result.success).toBe(false);
      expect(result.error.flatten().fieldErrors.type).toBeDefined();
    });

    test('invalid status', () => {
      const result = CreateAssetSchema.safeParse({ name: 'example.com', type: 'domain', status: 'deleted' });
      expect(result.success).toBe(false);
    });

    test('missing type', () => {
      const result = CreateAssetSchema.safeParse({ name: 'example.com' });
      expect(result.success).toBe(false);
    });

    test('name exceeding max length', () => {
      const result = CreateAssetSchema.safeParse({ name: 'a'.repeat(256), type: 'domain' });
      expect(result.success).toBe(false);
    });
  });
});

describe('AssetTypeEnum', () => {
  test('accepts domain and ip', () => {
    expect(AssetTypeEnum.safeParse('domain').success).toBe(true);
    expect(AssetTypeEnum.safeParse('ip').success).toBe(true);
  });

  test('rejects anything else', () => {
    expect(AssetTypeEnum.safeParse('hostname').success).toBe(false);
    expect(AssetTypeEnum.safeParse('').success).toBe(false);
  });
});
