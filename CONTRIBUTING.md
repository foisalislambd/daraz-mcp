# Contributing

## Setup

Node.js 22 and pnpm 10.

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## Layout

- `packages/daraz-client` is the only place that signs Daraz requests.
- `packages/mcp-server` turns that client into MCP tools.
- `packages/cli` is the published `daraz-mcp` binary.
- `apps/web` is the ZenPanel-based admin. Keep its MIT attribution in `VENDOR-LICENSE`.

## API paths

Do not add a Daraz path unless you can point at a portal capture, an official document, or a client you have read. Put the verification tag on the catalog entry and mention it in `docs/api-coverage.md`.

## Changesets

```bash
pnpm exec changeset
```

The web app is private and ignored by changesets.

## Pull requests

Run the test script before opening a PR. Do not commit `.env`, token files, or `data/`.
