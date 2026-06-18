import { Router } from 'express';
import { assetHandler } from '../handlers/asset.handler.js';
import { scanHandler } from '../handlers/scan.handler.js';

const router = Router();

// Asset CRUD
router.get('/assets', assetHandler.list);
router.post('/assets', assetHandler.create);
router.get('/assets/:id', assetHandler.getById);
router.delete('/assets/:id', assetHandler.delete);

// Scan operations
router.post('/assets/:id/scan', scanHandler.startScan);
router.get('/assets/:id/scans', scanHandler.getAssetScans);
router.get('/assets/:id/results', scanHandler.getAssetResults);
router.get('/assets/:id/dns', scanHandler.getLatestResult('dns'));
router.get('/assets/:id/whois', scanHandler.getLatestResult('whois'));
router.get('/assets/:id/subdomains', scanHandler.getLatestResult('subdomain'));

// Scan job
router.get('/scan-jobs/:id', scanHandler.getJob);
router.get('/scan-jobs/:id/results', scanHandler.getJobResults);

export default router;
