import { getDb } from '../db/connection.js';

export const scanJobRepository = {
    findById(id) {
        return getDb().prepare('SELECT * FROM scan_jobs WHERE id = ?').get(id) ?? null;
    },

    findByAsset(assetId) {
        return getDb()
            .prepare('SELECT * FROM scan_jobs WHERE asset_id = ? ORDER BY created_at DESC')
            .all(assetId);
    },

    create({ id, asset_id, scan_type }) {
        const db = getDb();
        db.prepare('INSERT INTO scan_jobs (id, asset_id, scan_type) VALUES (?, ?, ?)').run(
            id,
            asset_id,
            scan_type
        );
        return this.findById(id);
    },

    updateStatus(id, { status, started_at, ended_at, error }) {
        const db = getDb();
        db.prepare(
            `UPDATE scan_jobs SET status = ?,
        started_at = COALESCE(?, started_at),
        ended_at = COALESCE(?, ended_at),
        error = COALESCE(?, error)
       WHERE id = ?`
        ).run(status, started_at ?? null, ended_at ?? null, error ?? null, id);
    },

    createResult({ id, job_id, asset_id, scan_type, data }) {
        getDb()
            .prepare(
                'INSERT INTO scan_results (id, job_id, asset_id, scan_type, data) VALUES (?, ?, ?, ?, ?)'
            )
            .run(id, job_id, asset_id, scan_type, JSON.stringify(data));
    },

    findResultsByJob(jobId) {
        return getDb()
            .prepare('SELECT * FROM scan_results WHERE job_id = ? ORDER BY created_at DESC')
            .all(jobId)
            .map((r) => ({ ...r, data: JSON.parse(r.data) }));
    },

    findResultsByAsset(assetId) {
        return getDb()
            .prepare('SELECT * FROM scan_results WHERE asset_id = ? ORDER BY created_at DESC')
            .all(assetId)
            .map((r) => ({ ...r, data: JSON.parse(r.data) }));
    },

    findLatestResultByType(assetId, scanType) {
        const row = getDb()
            .prepare(
                'SELECT * FROM scan_results WHERE asset_id = ? AND scan_type = ? ORDER BY created_at DESC LIMIT 1'
            )
            .get(assetId, scanType);
        return row ? { ...row, data: JSON.parse(row.data) } : null;
    },
};
