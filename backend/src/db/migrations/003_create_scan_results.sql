CREATE TABLE IF NOT EXISTS scan_results (
    id          TEXT PRIMARY KEY,
    job_id      TEXT NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
    asset_id    TEXT NOT NULL REFERENCES assets(id)    ON DELETE CASCADE,
    scan_type   TEXT NOT NULL,
    data        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_results_job   ON scan_results(job_id);
CREATE INDEX IF NOT EXISTS idx_results_asset ON scan_results(asset_id);
CREATE INDEX IF NOT EXISTS idx_results_type  ON scan_results(scan_type);
