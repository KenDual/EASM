# Architecture

See PLAN.md sections 3 (directory structure), 5 (API design), and 6 (scanner architecture) for full details.

## Layer diagram

```
HTTP Request
    │
    ▼
routes/index.js          (mount, no logic)
    │
    ▼
handlers/*.handler.js    (validate input → call service → return HTTP response)
    │
    ▼
services/*.service.js    (business logic, orchestration)
    │
    ▼
repositories/*.js        (raw SQL via better-sqlite3)
    │
    ▼
SQLite (mini_asm.db)
```

## Scan flow

```
POST /assets/:id/scan
  → scan.service.startScan()
      → INSERT scan_jobs (pending)
      → respond 202
      → setImmediate(runScanAsync)
          → status = running
          → scanner.run(asset)
          → INSERT scan_results
          → status = completed/failed/partial
```
