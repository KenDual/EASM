import { scanService } from '../services/scan.service.js';
import { validate } from '../middleware/validate.js';
import { CreateScanJobSchema } from '../models/scan_job.js';

export const scanHandler = {
  startScan: [
    validate(CreateScanJobSchema),
    async (req, res, next) => {
      try {
        const job = await scanService.startScan(req.params.id, req.body.scan_type);
        res.status(202).json(job);
      } catch (err) {
        next(err);
      }
    },
  ],

  getJob: async (req, res, next) => {
    try {
      const job = scanService.getJob(req.params.id);
      res.json(job);
    } catch (err) {
      next(err);
    }
  },

  getJobResults: async (req, res, next) => {
    try {
      const results = scanService.getJobResults(req.params.id);
      res.json(results);
    } catch (err) {
      next(err);
    }
  },

  getAssetScans: async (req, res, next) => {
    try {
      const scans = scanService.getAssetScans(req.params.id);
      res.json(scans);
    } catch (err) {
      next(err);
    }
  },

  getAssetResults: async (req, res, next) => {
    try {
      const results = scanService.getAssetResults(req.params.id);
      res.json(results);
    } catch (err) {
      next(err);
    }
  },

  getLatestResult: (scanType) => async (req, res, next) => {
    try {
      const result = scanService.getLatestResult(req.params.id, scanType);
      if (!result) return res.json(null);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
