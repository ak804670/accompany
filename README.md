# Accompany

The mobile app, API, and web client are separate packages.

```text
app/       iOS and Android (Expo, React Native)
backend/   API
web/       Web client
```

Run each package from its own directory. They do not share a lockfile.

## App

```bash
cd app
npm install
npm start
```

Setup, environment variables, and quality checks are in `app/README.md`. Architecture is in `app/docs/architecture.md`.

## Backend

Express, TypeScript, PostgreSQL, and Redis. Authentication lives in this package. From `backend/`:

```bash
npm install
npm run dev
```

`GET http://localhost:4000/health` returns `{ "status": "ok" }`. See `backend/README.md`.

## Web

Vite, React, Tailwind CSS, and shadcn/ui. From `web/`:

```bash
npm install
npm run dev
```

See `web/README.md`.
