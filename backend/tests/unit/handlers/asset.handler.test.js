import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../../src/services/asset.service.js', () => ({
  assetService: {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock logger to suppress output during tests
jest.unstable_mockModule('../../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

let request, assetService, ErrNotFound;
let app;

beforeAll(async () => {
  const express = (await import('express')).default;
  const supertest = await import('supertest');
  request = supertest.default;

  ({ assetService } = await import('../../../src/services/asset.service.js'));
  ({ ErrNotFound } = await import('../../../src/utils/errors.js'));
  const { assetHandler } = await import('../../../src/handlers/asset.handler.js');
  const { errorHandler } = await import('../../../src/middleware/error.js');

  app = express();
  app.use(express.json());
  app.get('/assets', assetHandler.list);
  app.post('/assets', assetHandler.create);
  app.get('/assets/:id', assetHandler.getById);
  app.delete('/assets/:id', assetHandler.delete);
  app.use(errorHandler);
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

describe('GET /assets', () => {
  test('200 with paginated result', async () => {
    assetService.list.mockReturnValue({ data: [mockAsset], total: 1, page: 1, limit: 20 });

    const res = await request(app).get('/assets');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });
});

describe('POST /assets', () => {
  test('201 on valid input', async () => {
    assetService.create.mockReturnValue(mockAsset);

    const res = await request(app)
      .post('/assets')
      .send({ name: 'example.com', type: 'domain' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('uuid-1');
  });

  test('400 on invalid type', async () => {
    const res = await request(app)
      .post('/assets')
      .send({ name: 'example.com', type: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  test('400 on missing name', async () => {
    const res = await request(app).post('/assets').send({ type: 'domain' });
    expect(res.status).toBe(400);
  });
});

describe('GET /assets/:id', () => {
  test('200 when found', async () => {
    assetService.getById.mockReturnValue(mockAsset);

    const res = await request(app).get('/assets/uuid-1');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('example.com');
  });

  test('404 when not found', async () => {
    assetService.getById.mockImplementation(() => {
      throw new ErrNotFound('Asset missing not found');
    });

    const res = await request(app).get('/assets/missing');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('DELETE /assets/:id', () => {
  test('204 on success', async () => {
    assetService.delete.mockReturnValue(undefined);
    const res = await request(app).delete('/assets/uuid-1');
    expect(res.status).toBe(204);
  });

  test('404 when not found', async () => {
    assetService.delete.mockImplementation(() => {
      throw new ErrNotFound('Asset missing not found');
    });

    const res = await request(app).delete('/assets/missing');
    expect(res.status).toBe(404);
  });
});
