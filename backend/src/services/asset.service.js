import { assetRepository } from '../repositories/asset.repository.js';
import { ErrNotFound } from '../utils/errors.js';

export const assetService = {
  list(query) {
    return assetRepository.findAll(query);
  },

  getById(id) {
    const asset = assetRepository.findById(id);
    if (!asset) throw new ErrNotFound(`Asset ${id} not found`);
    return asset;
  },

  create(data) {
    const id = crypto.randomUUID();
    return assetRepository.create({ id, ...data });
  },

  delete(id) {
    const deleted = assetRepository.delete(id);
    if (!deleted) throw new ErrNotFound(`Asset ${id} not found`);
  },
};
