# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mini EASM** — External Attack Surface Management system. Manages domain/IP assets and runs security scans (DNS, WHOIS, subdomain enumeration, port scan, SSL, etc.) against them.

## Current Status

| Phase | Status |
|-------|--------|
| Phase 0 — Scaffold | ✅ Done |
| Phase 1 — Bài 1 (DB + Asset CRUD) | ✅ Done |
| Phase 1 — Bài 2 (9 Scanners) | ✅ Done |
| Phase 1 — Bài 3 (Unit Tests, 55 tests, 88% cov) | ✅ Done |
| Phase 1 — Bài 4 (Frontend browser test) | ⏳ Code done, needs browser verify |
| Phase 2 — Bài 6 (Docker + Compose) | ✅ Done |
| Phase 2 — Bài 5 (GitHub Actions CI) | ✅ Done |

## Common Commands

All commands run from `backend/`:

```bash
npm start              # Start API server + serve frontend at http://localhost:8080
npm run migrate        # Run pending DB migrations manually
npm test               # Run Jest test suite
npm run test:coverage  # Run tests with coverage report (gate: ≥70% lines)
npm run lint           # ESLint with security plugin

# Run a single test file (Windows — use jest.js directly, not .bin/jest)
node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit/models/asset.test.js
```

**Kill server holding port 8080 on Windows:**
```powershell
$proc = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }
```

## Architecture

### Layer Stack (top → bottom)

```
routes/index.js  →  handlers/*.handler.js  →  services/*.service.js  →  repositories/*.repository.js  →  db/connection.js (better-sqlite3)
```

- **Routes** mount handlers, no logic
- **Handlers** validate HTTP input (via `middleware/validate.js` + Zod schemas), call service, return HTTP response
- **Services** contain business logic; call repositories and scanners
- **Repositories** are the only layer that touches SQL — raw `better-sqlite3` calls, no ORM
- **Models** (`src/models/`) hold Zod schemas used for validation; not DB models

### Scan Fire-and-Forget Pattern

`POST /assets/:id/scan` returns **202** immediately. The handler calls `scan.service.startScan()` which:
1. Inserts a `scan_jobs` row with `status='pending'`
2. Returns the job to the handler (202 response sent)
3. Uses `setImmediate(() => runScanAsync(job))` — scan runs in background
4. Updates job status: `pending → running → completed/failed/partial`

Status logic in `scan.service.js`:
- Single scanner throws → `failed`
- `scan_type='all'` with some failures → `partial`
- All succeed → `completed`

### Scanner Interface

Every scanner in `src/scanners/` exports a default object:

```js
export default {
  type: 'dns',                   // unique key, matches scan_type in DB
  appliesTo: ['domain'],         // 'domain', 'ip', or both
  async run(asset) { }           // returns Array<object> — raw data, caller does JSON.stringify
}
```

`src/scanners/index.js` exports `SCANNERS` (map of type→scanner) and `ALL_TYPES`. The `'all'` scan type is not a scanner — it's handled in `scan.service.js` via `Promise.allSettled` over applicable scanners.

DNS scanner accepts an injected `resolver` option for testing: `run(asset, { resolver = dnsPromises } = {})`.

### Database

- SQLite file at `DB_PATH` (default `./mini_asm.db`), managed by `better-sqlite3` (synchronous API)
- Migrations: numbered SQL files in `src/db/migrations/`, run by `src/db/migrate.js` which tracks applied files in `_migrations` table
- `scan_results.data` column stores JSON strings — always `JSON.parse` on read, `JSON.stringify` on write
- Server startup: `waitForDb()` (5 retries × 2s) then `runMigrations()` if `AUTO_MIGRATE=true`

### Error Handling

All errors flow through `middleware/error.js`. Throw typed errors from `utils/errors.js`:

```js
throw new ErrNotFound('asset not found')   // → 404
throw new ErrInvalid('invalid scan type')  // → 400
throw new ErrConflict('already exists')    // → 409
```

Standard error response shape:
```json
{ "error": { "code": "NOT_FOUND", "message": "...", "details": {} } }
```

### Port Scan Safety

`src/utils/safety.js` exports `isPrivateIP(ip)`. `port.scanner.js` **must** call this and throw `ErrInvalid` if the target is not a private IP — scans on public IPs are rejected with `status: 'failed'`.

## Testing

### ESM Mocking Pattern

This project uses ESM (`"type": "module"`). Jest mocking in ESM requires:

```js
// 1. Import jest explicitly
import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// 2. Use unstable_mockModule (NOT jest.mock) — must be called before any import of the mocked module
jest.unstable_mockModule('../../../src/repositories/asset.repository.js', () => ({
  assetRepository: { findAll: jest.fn(), findById: jest.fn() },
}));

// 3. Dynamic imports AFTER the mock declarations
let assetService, assetRepository;
beforeAll(async () => {
  ({ assetService } = await import('../../../src/services/asset.service.js'));
  ({ assetRepository } = await import('../../../src/repositories/asset.repository.js'));
});
```

For tests that don't need mocking, `describe/test/expect` are injected as globals automatically — no import needed.

### Test Helper

`tests/helpers/memdb.js` provides `newTestDb()` — returns an in-memory `better-sqlite3` instance with all migrations applied. Use for integration tests that need a real DB.

## Key Constraints

- **ESM only** — `"type": "module"` in package.json; use `import/export`, not `require`
- **No TypeScript** — plain `.js` files
- **No ORM** — raw SQL in repositories only
- **Frontend** — vanilla HTML + Tailwind CDN + ES modules; no build step, no npm in `frontend/`
- `crypto.randomUUID()` for UUIDs (Node 20 built-in)
- `fetch` for HTTP calls in scanners (Node 20 built-in)
- On **Windows**, `node_modules/.bin/jest` is a bash script — always use `node_modules/jest/bin/jest.js` directly

## Environment Variables

See `backend/.env.example`. Key vars: `PORT`, `DB_PATH`, `AUTO_MIGRATE`, `LOG_LEVEL`, `NODE_ENV`.
