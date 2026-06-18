import { assetRepository } from '../repositories/asset.repository.js';
import { scanJobRepository } from '../repositories/scan_job.repository.js';
import { SCANNERS, ALL_TYPES } from '../scanners/index.js';
import { ErrNotFound, ErrInvalid } from '../utils/errors.js';
import logger from '../config/logger.js';

export const scanService = {
  async startScan(assetId, scanType) {
    const asset = assetRepository.findById(assetId);
    if (!asset) throw new ErrNotFound(`Asset ${assetId} not found`);

    if (scanType !== 'all') {
      const scanner = SCANNERS[scanType];
      if (!scanner) throw new ErrInvalid(`Unknown scan type: ${scanType}`);
      if (!scanner.appliesTo.includes(asset.type)) {
        throw new ErrInvalid(`Scan type '${scanType}' does not apply to asset type '${asset.type}'`);
      }
    }

    const job = scanJobRepository.create({
      id: crypto.randomUUID(),
      asset_id: assetId,
      scan_type: scanType,
    });

    setImmediate(() => runScanAsync(job, asset));

    return job;
  },

  getJob(id) {
    const job = scanJobRepository.findById(id);
    if (!job) throw new ErrNotFound(`Scan job ${id} not found`);
    return job;
  },

  getJobResults(id) {
    const job = scanJobRepository.findById(id);
    if (!job) throw new ErrNotFound(`Scan job ${id} not found`);
    return scanJobRepository.findResultsByJob(id);
  },

  getAssetScans(assetId) {
    return scanJobRepository.findByAsset(assetId);
  },

  getAssetResults(assetId) {
    return scanJobRepository.findResultsByAsset(assetId);
  },

  getLatestResult(assetId, scanType) {
    return scanJobRepository.findLatestResultByType(assetId, scanType);
  },
};

async function runScanAsync(job, asset) {
  const now = () => new Date().toISOString();

  scanJobRepository.updateStatus(job.id, { status: 'running', started_at: now() });

  try {
    const typesToRun = job.scan_type === 'all'
      ? ALL_TYPES.filter((t) => SCANNERS[t].appliesTo.includes(asset.type))
      : [job.scan_type];

    const results = await Promise.allSettled(
      typesToRun.map((type) => SCANNERS[type].run(asset).then((data) => ({ type, data })))
    );

    let hasFailure = false;
    let lastError = '';
    for (const result of results) {
      if (result.status === 'fulfilled') {
        scanJobRepository.createResult({
          id: crypto.randomUUID(),
          job_id: job.id,
          asset_id: asset.id,
          scan_type: result.value.type,
          data: result.value.data,
        });
      } else {
        hasFailure = true;
        lastError = result.reason?.message ?? 'Unknown error';
        logger.warn({ jobId: job.id, error: lastError }, 'Scanner failed');
      }
    }

    let finalStatus;
    if (!hasFailure) finalStatus = 'completed';
    else if (job.scan_type === 'all') finalStatus = 'partial';
    else finalStatus = 'failed';

    scanJobRepository.updateStatus(job.id, {
      status: finalStatus,
      ended_at: now(),
      error: hasFailure ? lastError : null,
    });
  } catch (err) {
    logger.error({ jobId: job.id, err }, 'Scan failed');
    scanJobRepository.updateStatus(job.id, {
      status: 'failed',
      ended_at: now(),
      error: err.message,
    });
  }
}
