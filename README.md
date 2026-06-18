# Mini EASM

External Attack Surface Management — quản lý assets (domain/IP) và thực hiện security scans.

## Quick Start

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm start
# API + Frontend tại http://localhost:8080
```

## Development

```bash
npm test                 # run tests
npm run test:coverage    # tests + coverage report
npm run lint             # ESLint security check
```

## Docker

```bash
docker compose up -d
# Backend: http://localhost:8080
# Frontend: http://localhost:3000
```

## Scan Types

| Type | Mô tả | Áp dụng |
|------|-------|---------|
| `dns` | DNS records (A, MX, NS, TXT, CNAME) | domain |
| `whois` | WHOIS registration info | domain |
| `subdomain` | Subdomain enumeration via crt.sh | domain |
| `cert_trans` | Certificate transparency logs | domain |
| `asn` | ASN / geolocation lookup | ip |
| `ip` | Reverse DNS + geolocation | ip |
| `port` | TCP port scan (private IPs only) | ip |
| `ssl` | TLS certificate details | domain |
| `tech` | Technology detection via HTTP headers | domain |
| `all` | Chạy tất cả scan phù hợp | domain/ip |
