# Accompany — web

Vite, React, TypeScript, Tailwind CSS, and shadcn/ui. No product screens are implemented yet.

## Prerequisites

- Node.js 20 or newer
- npm

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Vite prints the local URL, usually `http://localhost:5173`.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Components

shadcn/ui is initialized with the `nova` preset and Tailwind CSS v4. Add a component with:

```bash
npx shadcn@latest add <name>
```

Import it from `@/components/ui/<name>`.
