import { assetService } from '../services/asset.service.js';
import { validate } from '../middleware/validate.js';
import { CreateAssetSchema } from '../models/asset.js';

export const assetHandler = {
  list: async (req, res, next) => {
    try {
      const { page, limit } = req.query;
      const result = assetService.list({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  getById: async (req, res, next) => {
    try {
      const asset = assetService.getById(req.params.id);
      res.json(asset);
    } catch (err) {
      next(err);
    }
  },

  create: [
    validate(CreateAssetSchema),
    async (req, res, next) => {
      try {
        const asset = assetService.create(req.body);
        res.status(201).json(asset);
      } catch (err) {
        next(err);
      }
    },
  ],

  delete: async (req, res, next) => {
    try {
      assetService.delete(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  },
};
