# 📋 PLAN.md — Mini EASM (Sessions 3-7 Homework)

> Tài liệu này biến `REQUIREMENTS.md` thành kế hoạch thực thi hoàn chỉnh cho project Mini EASM.
> Mục tiêu: **đơn giản, gọn nhẹ, chạy local ổn định trước**, sau đó mới đến CI/CD và deploy.

---

## 📑 Mục Lục

1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Tech Stack & Quyết Định Kiến Trúc](#2-tech-stack--quyết-định-kiến-trúc)
3. [Cấu Trúc Thư Mục](#3-cấu-trúc-thư-mục)
4. [Database Schema](#4-database-schema)
5. [Thiết Kế API](#5-thiết-kế-api)
6. [Scanner Architecture](#6-scanner-architecture)
7. [Roadmap & Milestones (theo Phase)](#7-roadmap--milestones-theo-phase)
8. [Chi Tiết Từng Bài (1 → 10)](#8-chi-tiết-từng-bài-1--10)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Tiêu Chí Hoàn Thành & Bảng Điểm](#11-tiêu-chí-hoàn-thành--bảng-điểm)
12. [Rủi Ro & Mitigations](#12-rủi-ro--mitigations)

---

## 1. Tổng Quan Dự Án

**Mini EASM** (External Attack Surface Management) — một hệ thống quản lý tài sản (assets) và thực hiện các loại scan để phát hiện thông tin liên quan đến security.

### Phạm vi

- **Backend:** REST API quản lý assets + scan jobs + scan results
- **Frontend:** UI tối giản để CRUD assets, trigger scans, xem kết quả
- **Persistence:** SQLite (file-based)
- **Scanners:** 9 loại scan (5 existing + 4 mới)
- **Ops:** CI/CD GitHub Actions, Docker Compose, deploy lên Oracle Cloud VM với DNS (No-IP) + HTTPS (Let's Encrypt/Certbot)

### Nguyên tắc thiết kế

- **Simplicity first** — chọn dependency tối thiểu, raw SQL thay vì ORM nặng
- **Local-first** — mọi bài đều phải chạy ổn định trên máy local trước khi nghĩ tới deploy
- **Clean Architecture (light)** — tách layer: route → handler → service → repository → DB
- **Fire-and-forget scans** — handler trả 202 ngay, scan chạy nền và update DB

---

## 2. Tech Stack & Quyết Định Kiến Trúc

### Backend

| Layer       | Lựa chọn                                       | Lý do                                                     |
| ----------- | ---------------------------------------------- | --------------------------------------------------------- |
| Runtime     | **Node.js 20 LTS**                             | LTS, hỗ trợ native `fetch`, ổn định                       |
| Framework   | **Express.js 4**                               | Quen thuộc, nhẹ, nhiều ví dụ                              |
| Database    | **SQLite** (file `mini_asm.db`)                | Không cần server DB, gọn nhẹ, đủ cho lab                  |
| DB driver   | **`better-sqlite3`**                           | Synchronous, nhanh, API đơn giản, không cần callback hell |
| Migrations  | **Custom runner** đọc file `*.sql` theo thứ tự | Đơn giản, không phụ thuộc ORM                             |
| Validation  | **`zod`**                                      | Schema validation hiện đại, gọn                           |
| Logging     | **`pino`** + **`pino-http`**                   | Nhẹ, JSON output, dễ tích hợp                             |
| Env         | **`dotenv`**                                   | Tiêu chuẩn                                                |
| Testing     | **`jest`** + **`supertest`**                   | Phổ biến nhất, có mocking built-in                        |
| UUID        | **`crypto.randomUUID()`** (built-in Node 20)   | Không cần thêm package                                    |
| WHOIS       | **`whoiser`**                                  | Pure JS, không cần binary                                 |
| HTTP client | **native `fetch`**                             | Node 20+ có sẵn                                           |

### Frontend

| Layer        | Lựa chọn                                   | Lý do                                   |
| ------------ | ------------------------------------------ | --------------------------------------- |
| Markup       | **Vanilla HTML5**                          | Không build step                        |
| CSS          | **Tailwind CSS via CDN**                   | Không cần npm, không build, style nhanh |
| JS           | **Vanilla ES Modules**                     | Native module, không cần bundler        |
| HTTP         | **`fetch` API**                            | Built-in browser                        |
| Serve (dev)  | Backend Express phục vụ `frontend/` static | Đơn giản, 1 lệnh `npm start`            |
| Serve (prod) | **Nginx** (Docker)                         | Reverse proxy + static                  |

### DevOps

| Tool                                           | Mục đích                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| **Docker + Docker Compose**                    | Bài 6 — containerize backend + frontend                            |
| **GitHub Actions**                             | Bài 5, 10 — CI/CD                                                  |
| **Gosec → ESLint security plugin + npm audit** | Thay Gosec (Go-only) — dùng `eslint-plugin-security` + `npm audit` |
| **Trivy**                                      | Vulnerability scan (filesystem + image)                            |
| **Gitleaks**                                   | Secret detection                                                   |
| **TruffleHog**                                 | Secret scanner sâu hơn                                             |
| **Oracle Cloud Always Free**                   | Bài 8 — VM ARM Ampere A1 (2 vCPU, 12GB RAM free tier)              |
| **No-IP**                                      | Bài 9 — DDNS subdomain miễn phí                                    |
| **Certbot (Let's Encrypt)**                    | Bài 9 — SSL/TLS                                                    |
| **Nginx**                                      | Reverse proxy + TLS termination                                    |

### Tools KHÔNG dùng (và lý do)

- ❌ **ORM (Prisma/Sequelize)** — quá nặng cho lab này
- ❌ **TypeScript** — thêm build step, không cần thiết cho project lab
- ❌ **React/Vue** — bạn nói "không chú trọng frontend"
- ❌ **Redis/queue** — fire-and-forget với async function là đủ
- ❌ **PostgreSQL** — SQLite đủ, không cần server riêng

---

## 3. Cấu Trúc Thư Mục

```
homework-2/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js                  # load + validate .env (Zod)
│   │   │   └── logger.js               # pino instance
│   │   ├── db/
│   │   │   ├── connection.js           # better-sqlite3 instance
│   │   │   ├── migrate.js              # migration runner
│   │   │   └── migrations/
│   │   │       ├── 001_create_assets.sql
│   │   │       ├── 002_create_scan_jobs.sql
│   │   │       └── 003_create_scan_results.sql
│   │   ├── models/                     # domain types + validation schemas (Zod)
│   │   │   ├── asset.js
│   │   │   └── scan_job.js
│   │   ├── repositories/               # DB access layer
│   │   │   ├── asset.repository.js
│   │   │   └── scan_job.repository.js
│   │   ├── services/                   # business logic
│   │   │   ├── asset.service.js
│   │   │   └── scan.service.js
│   │   ├── scanners/                   # 1 file per scan type
│   │   │   ├── index.js                # registry: type → scanner
│   │   │   ├── dns.scanner.js
│   │   │   ├── whois.scanner.js
│   │   │   ├── subdomain.scanner.js
│   │   │   ├── cert_trans.scanner.js
│   │   │   ├── asn.scanner.js
│   │   │   ├── ip.scanner.js
│   │   │   ├── port.scanner.js
│   │   │   ├── ssl.scanner.js
│   │   │   └── tech.scanner.js
│   │   ├── handlers/                   # HTTP controllers
│   │   │   ├── asset.handler.js
│   │   │   └── scan.handler.js
│   │   ├── middleware/
│   │   │   ├── cors.js
│   │   │   ├── error.js                # central error handler
│   │   │   └── validate.js             # Zod request validator
│   │   ├── routes/
│   │   │   └── index.js                # mount all routes
│   │   ├── utils/
│   │   │   ├── errors.js               # ErrNotFound, ErrInvalid, ...
│   │   │   └── safety.js               # port scan safety check (private IPs)
│   │   └── app.js                      # Express app factory
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── models/                 # 3.1 model validation
│   │   │   ├── scanners/               # 3.4 scanner logic
│   │   │   ├── handlers/               # 3.2 bonus
│   │   │   └── services/               # 3.3 bonus
│   │   └── helpers/
│   │       └── memdb.js                # in-memory SQLite for tests
│   ├── .env.example
│   ├── .eslintrc.cjs                   # eslint + security plugin
│   ├── jest.config.js
│   ├── package.json
│   ├── server.js                       # entry: starts HTTP server
│   └── Dockerfile
│
├── frontend/
│   ├── index.html                      # SPA shell
│   ├── css/
│   │   └── styles.css                  # custom overrides (nếu cần)
│   ├── js/
│   │   ├── api.js                      # fetch wrapper, base URL từ window config
│   │   ├── assets.js                   # list/create/delete UI
│   │   ├── scans.js                    # trigger/poll/render scan UI
│   │   ├── dashboard.js                # stats
│   │   └── main.js                     # router (hash-based) + bootstrap
│   ├── config.js                       # API_URL (overridable runtime)
│   ├── nginx.conf                      # prod nginx config
│   └── Dockerfile                      # nginx:alpine image
│
├── docs/
│   ├── api.yml                         # OpenAPI 3.0 spec (cập nhật khi đổi API)
│   └── architecture.md                 # diagram + flow
│
├── deploy/
│   ├── nginx/
│   │   └── default.conf                # reverse proxy + TLS (prod)
│   ├── certbot/                        # volume cho cert
│   └── scripts/
│       ├── setup-vm.sh                 # script cài Docker, ufw, ...
│       └── deploy.sh                   # pull + compose up
│
├── homeworks/
│   └── submissions/
│       └── day3/
│           ├── SUBMISSION.md
│           └── screenshots/
│               ├── bai1-db.png
│               ├── bai2-scan.png
│               └── ...
│
├── .github/
│   └── workflows/
│       ├── ci.yml                      # Bài 5: build + test + security
│       └── deploy.yml                  # Bài 10: auto deploy on merge
│
├── docker-compose.yml                  # local dev (db file mount + backend + frontend)
├── docker-compose.prod.yml             # prod (+ nginx + certbot)
├── .gitignore
├── .gitleaksignore
├── README.md                           # cách cài + run
├── REQUIREMENTS.md                     # đề bài gốc
└── PLAN.md                             # tài liệu này
```

---

## 4. Database Schema

### Bảng `assets`

```sql
CREATE TABLE IF NOT EXISTS assets (
    id          TEXT PRIMARY KEY,                       -- UUID
    name        TEXT NOT NULL,                          -- e.g. "example.com"
    type        TEXT NOT NULL CHECK(type IN ('domain','ip')),
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK(status IN ('active','inactive')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assets_type   ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
```

### Bảng `scan_jobs`

```sql
CREATE TABLE IF NOT EXISTS scan_jobs (
    id          TEXT PRIMARY KEY,                       -- UUID
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
```

### Bảng `scan_results`

```sql
CREATE TABLE IF NOT EXISTS scan_results (
    id          TEXT PRIMARY KEY,                       -- UUID
    job_id      TEXT NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
    asset_id    TEXT NOT NULL REFERENCES assets(id)    ON DELETE CASCADE,
    scan_type   TEXT NOT NULL,
    data        TEXT NOT NULL,                          -- JSON blob
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_results_job   ON scan_results(job_id);
CREATE INDEX IF NOT EXISTS idx_results_asset ON scan_results(asset_id);
CREATE INDEX IF NOT EXISTS idx_results_type  ON scan_results(scan_type);
```

> **Note:** SQLite không có `JSONB`. Cột `data` lưu JSON string; layer model sẽ `JSON.parse` khi đọc.

### Migration Runner (chiến lược)

- File: `backend/src/db/migrate.js`
- Tạo bảng `_migrations(filename TEXT PRIMARY KEY, applied_at TEXT)`
- Đọc thư mục `migrations/`, sort theo tên, apply file chưa có trong `_migrations`
- Mỗi file SQL chạy trong 1 transaction
- Trigger khi: `npm run migrate` (manual) HOẶC ngay khi server start (auto, có flag `AUTO_MIGRATE=true`)

---

## 5. Thiết Kế API

### Asset Endpoints

| Method | Path          | Mô tả                       | Status code |
| ------ | ------------- | --------------------------- | ----------- |
| POST   | `/assets`     | Tạo asset                   | 201         |
| GET    | `/assets`     | List assets (có pagination) | 200         |
| GET    | `/assets/:id` | Get asset by ID             | 200/404     |
| DELETE | `/assets/:id` | Xóa asset                   | 204/404     |

### Scan Endpoints

| Method | Path                     | Mô tả                      | Status code |
| ------ | ------------------------ | -------------------------- | ----------- |
| POST   | `/assets/:id/scan`       | Tạo scan job (async)       | 202         |
| GET    | `/scan-jobs/:id`         | Trạng thái 1 job           | 200/404     |
| GET    | `/scan-jobs/:id/results` | Kết quả 1 job              | 200/404     |
| GET    | `/assets/:id/scans`      | List scans của 1 asset     | 200         |
| GET    | `/assets/:id/results`    | Tất cả results của 1 asset | 200         |
| GET    | `/assets/:id/dns`        | DNS records mới nhất       | 200         |
| GET    | `/assets/:id/whois`      | WHOIS mới nhất             | 200         |
| GET    | `/assets/:id/subdomains` | Subdomains mới nhất        | 200         |

### Health

| Method | Path      | Mô tả               |
| ------ | --------- | ------------------- |
| GET    | `/health` | Liveness (200 OK)   |
| GET    | `/ready`  | Readiness (DB ping) |

### Error Response Format (chuẩn hóa)

```json
{
    "error": {
        "code": "NOT_FOUND",
        "message": "asset not found",
        "details": {}
    }
}
```

### OpenAPI Spec

Viết tại `docs/api.yml` (OpenAPI 3.0). Cập nhật mỗi khi thêm/đổi endpoint (yêu cầu "✅ Cập nhật tài liệu api.yml").

---

## 6. Scanner Architecture

### Interface (tất cả scanner đều implement)

```js
// scanners/<type>.scanner.js
export default {
    type: "dns", // unique scan type
    appliesTo: ["domain"], // hợp lệ với asset type nào
    /**
     * @param {{ name: string, type: 'domain'|'ip' }} asset
     * @returns {Promise<Array<object>>}   results array (raw, sẽ JSON.stringify lưu DB)
     */
    async run(asset) {
        /* ... */
    },
};
```

### Registry (`scanners/index.js`)

```js
import dns from "./dns.scanner.js";
import whois from "./whois.scanner.js";
// ...
export const SCANNERS = Object.fromEntries(
    [dns, whois, subdomain, certTrans, asn, ip, port, ssl, tech].map((s) => [
        s.type,
        s,
    ]),
);
export const ALL_TYPES = Object.keys(SCANNERS);
```

### Scan Execution Flow

```
POST /assets/:id/scan { scan_type: "dns" }
   │
   ▼
scan.service.startScan(assetId, "dns")
   │
   ├─ validate asset exists + scanner.appliesTo includes asset.type
   ├─ INSERT scan_jobs (status='pending')
   ├─ respond 202 với scan_job ngay (fire-and-forget)
   └─ setImmediate(() => runScanAsync(job))

runScanAsync(job):
   ├─ UPDATE status='running', started_at=now
   ├─ try { results = await scanner.run(asset) }
   ├─ INSERT scan_results (data = JSON.stringify(results))
   ├─ UPDATE status='completed', ended_at=now
   └─ catch → UPDATE status='failed', error=msg
```

### Scanner Implementation Notes (per type)

| Scan type    | Cách implement                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `dns`        | Node `dns/promises` — resolve A, AAAA, MX, NS, TXT, CNAME                                                                   |
| `whois`      | Package `whoiser` — parse WHOIS data                                                                                        |
| `subdomain`  | Query crt.sh API (`https://crt.sh/?q=%.<domain>&output=json`) — dedupe                                                      |
| `cert_trans` | Query crt.sh — list cert metadata (issuer, dates)                                                                           |
| `asn`        | Public API `https://api.iplocation.net/?ip=<ip>` hoặc `ip-api.com`                                                          |
| `ip` (mới)   | Geolocation + reverse DNS: `ip-api.com/json/<ip>` + Node `dns.reverse`                                                      |
| `port` (mới) | TCP connect scan với Node `net.Socket` — port list mặc định `[22,80,443,3306,5432,...]` — **safety check trước**            |
| `ssl` (mới)  | Node `tls.connect` lấy peer certificate, parse subject/issuer/SAN/expiry                                                    |
| `tech` (mới) | HTTP GET → parse headers (Server, X-Powered-By) + meta tags từ HTML, regex detect (Nginx/React/Cloudflare/...)              |
| `all`        | Chạy tất cả scanner với `appliesTo` chứa asset.type (Promise.allSettled), status `completed`/`partial`/`failed` tùy kết quả |

### Port Scan Safety

- File `utils/safety.js`:
    ```js
    export function isPrivateIP(ip) {
        return (
            /^127\./.test(ip) ||
            /^10\./.test(ip) ||
            /^192\.168\./.test(ip) ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
            ip === "localhost" ||
            ip === "::1"
        );
    }
    ```
- `port.scanner.js` ném `ErrInvalid('port scan only allowed on private IPs')` nếu fail check.
- Default port list: `[22, 80, 443, 3306, 5432, 6379, 8080, 8443, 27017]` (gọn, không scan full 65535).
- Connect timeout: 1500ms/port; max parallel: 50.

---

## 7. Roadmap & Milestones (theo Phase)

> Tuân thủ yêu cầu: **chạy local ổn định trước**, rồi mới đến ops.

### Phase 0 — Setup (½ ngày) ✅ DONE

- [x] Tạo repo, branch `homework-final` từ branch homework lần trước
- [x] Init `backend/` (`npm init`, install deps), `frontend/`, scaffolding theo cấu trúc mục 3
- [x] Setup ESLint + Prettier + `.editorconfig`
- [x] `.env.example`, `.gitignore`
- [x] README skeleton

### Phase 1 — Core Local (Bài 1 → 4) — **MUST PASS LOCAL TRƯỚC**

- [x] **Bài 1:** SQLite + migrations + asset CRUD repository → service → handler
- [x] **Bài 2:** 9 scanner + scan job/result endpoints
- [x] **Bài 3:** Unit tests (model + scanner bắt buộc; handler + service bonus) — 55 tests, 88% coverage
- [x] **Bài 4:** Frontend vanilla + CORS — verify full flow trên browser (code done, cần browser test)
- [x] **Gate (partial):** `npm test` xanh ✅ — browser demo còn lại

### Phase 2 — Containerize & CI (Bài 5, 6) ✅ DONE

- [x] **Bài 6:** Dockerfile backend + frontend, docker-compose.yml local (+ healthcheck)
- [x] **Bài 5:** GitHub Actions CI: lint → test → security (eslint-security, npm audit, Trivy, Gitleaks CLI, TruffleHog) — tất cả xanh
- [ ] Branch protection rule: PR phải pass CI mới merge

### Phase 3 — Feature nâng cao (Bài 7)

- [ ] Chọn 1 trong: Scheduled Scans / Asset Tags / Alerts / Scan Comparison / Export
- [ ] **Khuyến nghị: Asset Tags** — đơn giản nhất, không cần cron/email/queue

### Phase 4 — Cloud + DNS + TLS (Bài 8, 9)

- [ ] **Bài 8:** Provision Oracle Cloud VM (Ubuntu 22.04 ARM), `setup-vm.sh`, deploy `docker-compose.prod.yml`
- [ ] **Bài 9:** Đăng ký subdomain No-IP, trỏ A record → VM IP; Certbot lấy cert; Nginx reverse proxy với TLS

### Phase 5 — Auto Deploy (Bài 10)

- [ ] Tạo branch `deploy`
- [ ] GitHub Actions workflow `deploy.yml`: SSH vào VM → pull → compose up
- [ ] Secrets: `SERVER_HOST`, `SERVER_USER`, `SSH_PRIVATE_KEY`
- [ ] Test: merge PR vào `deploy` → kiểm tra app auto update

### Phase 6 — Submission

- [ ] Chụp screenshots theo yêu cầu mỗi bài
- [ ] Viết `SUBMISSION.md` ở `homeworks/submissions/day3/`
- [ ] Mở PR `homework-final` → `main`, set reviewer `dinhmanhtan`
- [ ] Invite `dmtangtnd@gmail.com` vào repo

---

## 8. Chi Tiết Từng Bài (1 → 10)

### Bài 1: Database (SQLite) — 30đ

**Deliverables**

- `backend/src/db/connection.js` — singleton `better-sqlite3` instance
- `backend/src/db/migrations/*.sql` — 3 file migration ban đầu
- `backend/src/db/migrate.js` — runner + script `npm run migrate`
- `backend/src/repositories/asset.repository.js` — CRUD đầy đủ
- Server start: auto-migrate (nếu `AUTO_MIGRATE=true`) hoặc fail-fast nếu chưa migrate
- Retry logic kết nối DB (5 lần × 2s) khi start

**Test thủ công (cho screenshot)**

```bash
npm run migrate
npm start
curl -X POST http://localhost:8080/assets \
  -H "Content-Type: application/json" \
  -d '{"name":"example.com","type":"domain"}'
curl http://localhost:8080/assets
# Ctrl+C, npm start lại → data vẫn còn (vì SQLite file)
ls -la mini_asm.db
```

**Screenshot cần**

- File `mini_asm.db` tồn tại
- API response sau POST + sau restart
- (Bonus) screenshot `sqlite3 mini_asm.db "SELECT * FROM assets;"`

---

### Bài 2: Mở rộng Scan API — 25đ + bonus

**Deliverables**

- 9 file scanner (xem mục 6)
- Endpoints scan đầy đủ (xem mục 5)
- Repository `scan_job.repository.js`
- Service `scan.service.js` orchestrate fire-and-forget
- Safety check cho `port` scan

**Bonus (+5 mỗi scan mới)** — tổng +20đ cho `ip`, `port`, `ssl`, `tech`.

**Test thủ công**

- Test script tương tự REQUIREMENTS.md mục Test (curl các loại scan)
- Verify `scan_jobs.status` chuyển `pending → running → completed`
- Verify `port` scan từ chối IP public

---

### Bài 3: Unit Tests — 20đ + bonus

**Bắt buộc**

- `tests/unit/models/asset.test.js` — Zod schema validation: hợp lệ/không hợp lệ name/type
- `tests/unit/scanners/dns.test.js` — mock `dns/promises`, assert kết quả
- `tests/unit/scanners/safety.test.js` — `isPrivateIP` true/false table-driven

**Bonus**

- `tests/unit/handlers/*.test.js` — dùng `supertest` + mock service
- `tests/unit/services/*.test.js` — mock repository

**Mục tiêu coverage:** ≥ 70% lines cho `src/` (CI fail nếu thấp hơn)

**Commands**

```bash
npm test
npm run test:coverage
```

---

### Bài 4: Frontend — 20đ

**Trang chính (`index.html`)**

- Header + tab navigation (hash router): `#/assets`, `#/scans`, `#/dashboard`
- View Assets: bảng + form thêm + nút delete
- View Scan Detail: chọn asset → trigger scan → poll job mỗi 2s → render kết quả
- Dashboard: tổng số assets theo type, scans theo status (đơn giản, có thể chỉ text)

**Backend CORS middleware** đã có sẵn từ Phase 1.

**Test thủ công**

```bash
npm start            # backend chạy localhost:8080 + serve frontend tại /
# mở http://localhost:8080
```

**Screenshot**

- Danh sách assets có data
- Form tạo asset
- Scan result hiển thị JSON đẹp

---

### Bài 5: CI/CD (BONUS) — 25đ

**File:** `.github/workflows/ci.yml`

**Jobs**

1. **setup** — checkout, setup-node, cache npm
2. **lint** — `npm run lint` (eslint + security plugin)
3. **test** — `npm test` + upload coverage artifact
4. **audit** — `npm audit --audit-level=high`
5. **trivy** — `aquasecurity/trivy-action@master` scan filesystem + Docker image
6. **gitleaks** — `gitleaks/gitleaks-action`
7. **trufflehog** — `trufflesecurity/trufflehog`
8. **build-images** (chỉ trigger trên PR vào main) — build backend + frontend images

**Branch protection:** Settings → Rulesets → require: lint, test, audit, trivy, gitleaks pass.

**Lưu ý:** REQUIREMENTS bản gốc dùng Gosec (Go) — project Node.js thay bằng `eslint-plugin-security` + `npm audit`.

---

### Bài 6: Docker Compose (BONUS) — 15đ

**`backend/Dockerfile`** — multi-stage:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["node", "server.js"]
```

**`frontend/Dockerfile`** — nginx:alpine + copy static files

**`docker-compose.yml`** (local):

```yaml
services:
    backend:
        build: ./backend
        ports: ["8080:8080"]
        volumes:
            - ./data:/app/data # persist sqlite file
        environment:
            - DB_PATH=/app/data/mini_asm.db
            - AUTO_MIGRATE=true
    frontend:
        build: ./frontend
        ports: ["3000:80"]
        depends_on: [backend]
```

**Test:** `docker compose up -d` → `docker compose ps` → mở `localhost:3000`

---

### Bài 7: Tính năng EASM mới (BONUS) — 15đ

**Đề xuất: Asset Tags** (đơn giản nhất)

- Migration `004_create_asset_tags.sql`: bảng `tags(id, name UNIQUE)`, bảng pivot `asset_tags(asset_id, tag_id)`
- Endpoints:
    - `POST /assets/:id/tags { tags: ["prod","critical"] }`
    - `GET /assets?tag=prod`
    - `DELETE /assets/:id/tags/:tagName`
- UI: input multi-tag trên form asset + filter chip trên danh sách

**Alternative dễ:** Export Reports (CSV) — endpoint `GET /assets/:id/results.csv`

---

### Bài 8: Deploy Cloud VM (BONUS) — 20đ

**Provider:** Oracle Cloud Infrastructure (OCI) Always Free

- VM shape: `VM.Standard.A1.Flex` (ARM Ampere, 2 vCPU / 12GB RAM trong free tier)
- OS: Ubuntu 22.04 LTS
- Network: VCN với public IP, ingress rules cho port 22, 80, 443

**Setup script (`deploy/scripts/setup-vm.sh`)**

- Update apt
- Install Docker + Docker Compose plugin
- Add user to `docker` group
- Setup `ufw` (allow 22, 80, 443)
- Clone repo
- `docker compose -f docker-compose.prod.yml up -d`

**Test**

```bash
curl http://<vm-ip>:8080/health
```

---

### Bài 9: Domain + TLS (BONUS) — 15đ

**DNS:** No-IP subdomain (e.g. `mini-asm.ddns.net`)

- Đăng ký free account No-IP
- Tạo hostname trỏ A record về IP VM
- Cài `noip-duc` (Dynamic Update Client) trên VM nếu IP có thể đổi (Oracle Cloud cấp reserved IP free → có thể bỏ DUC)

**TLS:** Let's Encrypt via Certbot

- Phương án: **Certbot trong Docker** (`certbot/certbot:latest`) + Nginx serve webroot challenge
- `docker-compose.prod.yml` thêm services: `nginx`, `certbot`
- Volume share: `./certbot/conf:/etc/letsencrypt`, `./certbot/www:/var/www/certbot`
- Renewal: cron `0 0 * * * docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload`

**Nginx config (`deploy/nginx/default.conf`)**

- HTTP `:80` → redirect HTTPS (trừ `/.well-known/acme-challenge/`)
- HTTPS `:443`:
    - `location /api/` → `proxy_pass http://backend:8080/`
    - `location /` → `proxy_pass http://frontend:80`

**Test**

```bash
curl -I https://mini-asm.ddns.net
openssl s_client -connect mini-asm.ddns.net:443 -servername mini-asm.ddns.net < /dev/null
```

---

### Bài 10: Auto Deploy (BONUS) — 15đ

**Workflow file:** `.github/workflows/deploy.yml`

```yaml
on:
    push:
        branches: [deploy]
jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: appleboy/ssh-action@v1
              with:
                  host: ${{ secrets.SERVER_HOST }}
                  username: ${{ secrets.SERVER_USER }}
                  key: ${{ secrets.SSH_PRIVATE_KEY }}
                  script: |
                      cd ~/homework-2
                      git pull origin deploy
                      docker compose -f docker-compose.prod.yml pull
                      docker compose -f docker-compose.prod.yml up -d --build
            - name: Health check
              run: |
                  sleep 20
                  curl -fsS https://mini-asm.ddns.net/api/health
```

**Secrets cần set trên GitHub:**

- `SERVER_HOST` = IP/domain VM
- `SERVER_USER` = `ubuntu`
- `SSH_PRIVATE_KEY` = private key SSH (generate riêng cho deploy, không dùng key cá nhân)

**Test:** merge PR vào `deploy` → watch Actions → verify app cập nhật.

---

## 9. Testing Strategy

### Pyramid

- **Unit** (≥ 70%): models, scanners (mock external), utils, services (mock repo)
- **Integration** (sample 3-5 endpoints): supertest + in-memory SQLite (`new Database(':memory:')`)
- **Manual E2E**: curl + browser, screenshots cho submission

### Test database helper

```js
// tests/helpers/memdb.js
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
export function newTestDb() {
    const db = new Database(":memory:");
    const dir = path.join(__dirname, "../../src/db/migrations");
    for (const f of fs.readdirSync(dir).sort()) {
        db.exec(fs.readFileSync(path.join(dir, f), "utf-8"));
    }
    return db;
}
```

### Mock pattern cho scanner

- Inject dependencies (DNS resolver, fetch) qua constructor/options → dễ mock
- VD: `dns.scanner.js` nhận `{ resolver = dnsPromises }` mặc định

### Coverage gate

- `jest.config.js`: `coverageThreshold: { global: { lines: 70, statements: 70 } }`
- CI fail nếu rớt

---

## 10. Deployment Architecture

### Local

```
┌──────────┐    HTTP    ┌──────────┐
│ Browser  │◄──────────►│ Backend  │
│ (vanilla)│            │ (8080)   │
└──────────┘            └────┬─────┘
                             │
                        ┌────▼─────┐
                        │ SQLite   │
                        │ (file)   │
                        └──────────┘
```

### Production (Oracle Cloud VM)

```
                Internet
                   │
                   ▼  :80/:443
            ┌──────────────┐
            │    Nginx     │  ◄── TLS via Certbot
            └──┬────────┬──┘
   /api/...   │        │  /
              ▼        ▼
        ┌──────────┐ ┌──────────┐
        │ Backend  │ │ Frontend │
        │ (Node)   │ │ (Nginx)  │
        └────┬─────┘ └──────────┘
             │
        ┌────▼─────┐
        │  SQLite  │  ◄── volume mount
        │  (file)  │
        └──────────┘
```

### Compose layout

- **`docker-compose.yml`** (dev): backend + frontend, expose ports trực tiếp
- **`docker-compose.prod.yml`** (VM): backend + frontend + nginx + certbot, expose chỉ 80/443

---

## 11. Tiêu Chí Hoàn Thành & Bảng Điểm

| Bài | Điểm           | Tiêu chí "Done"                                                                   |
| --- | -------------- | --------------------------------------------------------------------------------- |
| 1   | 30             | DB tự tạo khi `npm start`, asset CRUD persist sau restart, README có hướng dẫn    |
| 2   | 25 (+20 bonus) | 9 scanner chạy được, fire-and-forget, port scan có safety check                   |
| 3   | 20 (+bonus)    | Coverage ≥ 70%, có model + scanner test; handler/service test cho bonus           |
| 4   | 20             | UI hoạt động full flow: list/create/delete asset + start/view scan                |
| 5   | 25             | CI workflow xanh, có lint/test/audit/trivy/gitleaks/trufflehog, branch protection |
| 6   | 15             | `docker compose up` chạy được, app accessible qua container                       |
| 7   | 15             | 1 feature mới hoạt động end-to-end, có test                                       |
| 8   | 20             | App chạy trên VM public, accessible qua IP                                        |
| 9   | 15             | HTTPS hoạt động với cert hợp lệ, redirect HTTP→HTTPS                              |
| 10  | 15             | Merge vào branch `deploy` → app tự update trên VM trong < 2 phút                  |

**Total bắt buộc:** 95
**Total bonus:** +105 → **Tổng 200**

---

## 12. Rủi Ro & Mitigations

| Rủi ro                                                     | Tác động                 | Mitigation                                                                                                       |
| ---------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `better-sqlite3` native build fail trên ARM (Oracle Cloud) | Bài 8 stuck              | Dùng `node:20-alpine` base image + cài `python3 make g++` trong builder stage, hoặc dùng `node:20-bookworm-slim` |
| WHOIS API rate limit                                       | Scanner fail             | Cache 1h, retry với backoff                                                                                      |
| crt.sh down (subdomain/cert_trans)                         | 2 scanner fail           | Try/catch, mark job `partial`, log để demo robustness                                                            |
| No-IP hostname expire 30 ngày nếu không confirm            | DNS down                 | Bật notification email + tạo cron reminder; hoặc dùng DuckDNS thay nếu tiện hơn                                  |
| Let's Encrypt rate limit (5 cert/tuần/domain)              | Cert fail khi test nhiều | Dùng `--staging` flag cho lần test đầu                                                                           |
| SSH key leak                                               | Compromise VM            | Dùng deploy key riêng (read-only nếu có thể), không commit, scope key cho repo                                   |
| Oracle Cloud reclaim "Always Free" VM nếu idle             | Mất VM                   | Setup uptime monitoring hoặc cron ping định kỳ                                                                   |
| Port scan vô tình hit IP public                            | Vấn đề pháp lý/đạo đức   | Hard-fail trong `safety.js`, có unit test cover, log warning rõ ràng                                             |
| SQLite write contention nếu nhiều scan đồng thời           | DB lock errors           | `better-sqlite3` mặc định serialize write; với fire-and-forget tốt, OK cho lab                                   |

---

## 13. Quick Start (sẽ đưa vào README cuối cùng)

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run migrate
npm start                  # serves API + frontend tại http://localhost:8080

# Tests
npm test
npm run test:coverage

# Docker (Phase 2+)
docker compose up -d
open http://localhost:3000
```

---

**Kết thúc PLAN.md.** Tài liệu này là blueprint sống — cập nhật khi có thay đổi quyết định kiến trúc hoặc scope.
