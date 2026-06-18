CREATE TABLE IF NOT EXISTS scan_jobs (
    id          TEXT PRIMARY KEY,
    asset_id    TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    scan_type   TEXT NOT NULL CHECK(scan_type IN
                ('dns','whois','subdomain','cert_trans','asn',
                 'ip','port','ssl','tech','all')),
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending','running','completed','failed','partial')),
    started_at  TEXT,
    ended_at    TEXT,
    error       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scan_jobs_asset  ON scan_jobs(asset_id);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_status ON scan_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scan_jobs_type   ON scan_jobs(scan_type);
