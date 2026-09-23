# Accompany — backend

Express modular monolith for authentication. PostgreSQL is the durable store. Redis backs authentication rate limits.

## Prerequisites

- Node.js 20 or newer
- PostgreSQL
- Redis

## Installation

```bash
npm install
cp .env.example .env
```

Set `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` in `.env`. Do not commit `.env`.

## Migrations

```bash
npm run migrate
```

## Development

```bash
npm run dev
```

The server listens on `http://localhost:4000` unless `PORT` is set.

`GET /health` returns `{ "status": "ok" }`.

Sign-in codes are queued through the communication service. In development the default providers are in-memory mocks, and the mock delivery line is printed to stdout. Staging and production must set `EMAIL_PROVIDER=mailjet` and `SMS_PROVIDER=textbee`. See `../docs/communication-providers.md` to replace either provider.

## Checks

```bash
npm run typecheck
npm test
```

## Production build

```bash
npm run build
npm start
```
