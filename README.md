# Daraz MCP

MCP server, typed Open Platform client, setup CLI, and hosted admin for Daraz sellers. Bangladesh (`api.daraz.com.bd`) is the default. Pakistan, Sri Lanka, Nepal, and Myanmar are the same client with a different region.

This project is **not affiliated with, endorsed by, or maintained by Daraz or Alibaba**. You need your own app key from [Daraz Open Platform](https://open.daraz.com/).

The hosted panel in `apps/web` is adapted from [ZenPanel](https://github.com/foisalislambd/zenpanel) (MIT, Copyright 2026 Foisal Islam). See `apps/web/VENDOR-LICENSE`.

## What you get

- `@daraz-mcp/client` signs every call with HMAC-SHA256, refreshes tokens, and retries throttle and network errors.
- `@daraz-mcp/mcp-server` exposes read tools and destructive write tools. Writes require `confirm: true`.
- `daraz-mcp` is the CLI: `npx daraz-mcp setup`, then paste the printed config into Claude Desktop, Cursor, or VS Code.
- `apps/web` is the multi-tenant panel: sign up, connect a shop, copy an MCP URL and API key, read usage, and see plan limits. Payments are not wired up.

## Quick start (local)

```bash
pnpm install
pnpm build
npx daraz-mcp setup
```

The wizard asks for the region, app key, and app secret, opens the Daraz seller login, and stores tokens encrypted in `~/.config/daraz-mcp` (files mode `0600`).

Headless alternative, without the wizard:

```bash
export DARAZ_REGION=BD
export DARAZ_APP_KEY=...
export DARAZ_APP_SECRET=...
export DARAZ_ACCESS_TOKEN=...
export DARAZ_REFRESH_TOKEN=...
npx daraz-mcp serve
```

Claude Desktop and Cursor:

```json
{
  "mcpServers": {
    "daraz": {
      "command": "npx",
      "args": ["-y", "daraz-mcp", "serve"]
    }
  }
}
```

VS Code (`.vscode/mcp.json`):

```json
{
  "servers": {
    "daraz": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "daraz-mcp", "serve"]
    }
  }
}
```

## Hosted panel

```bash
cp .env.example .env
# set TOKEN_ENCRYPTION_KEY (32 bytes, base64) before production
pnpm dev:web
```

Open http://localhost:3000. SQLite is the default database. Set `DATABASE_URL=postgres://...` for Postgres. Both go through Drizzle.

```bash
docker compose up --build
```

The compose file includes a local-only encryption key default. Replace it before any real tokens are stored.

Seed a demo account for UI review:

```bash
SEED_DEMO=true DEMO_EMAIL=demo@daraz-mcp.local DEMO_PASSWORD=demo-password pnpm --filter @daraz-mcp/web dev
```

Hosted MCP is `POST /mcp` with `Authorization: Bearer dk_live_...`.

## বাংলায় সংক্ষেপে

এই টুল দিয়ে দারাজ সেলাররা Claude, Cursor, বা VS Code থেকে দোকান দেখতে ও চালাতে পারবেন। প্রথমে বাংলাদেশ (`api.daraz.com.bd`)। পাকিস্তান, শ্রীলঙ্কা, নেপাল, এবং মিয়ানমার একই ক্লায়েন্টে region বদলালেই চলে।

১. [open.daraz.com](https://open.daraz.com/) থেকে app key ও secret নিন।  
২. `npx daraz-mcp setup` চালান। ব্রাউজারে সেলার লগইন করলে টোকেন কম্পিউটারে এনক্রিপ্ট হয়ে থাকবে।  
৩. উইজার্ড যে কনফিগ দেখায় সেটা Claude Desktop, Cursor, বা VS Code-এ বসান।  
৪. পড়ার টুল আলাদা। দাম, স্টক, বা অর্ডার বদলাতে `confirm: true` লাগবে।

এটি দারাজের অফিসিয়াল পণ্য নয়।

## Docs

- [Quick start](docs/quickstart.md)
- [Tool reference](docs/tools.md)
- [API coverage and what was not verified](docs/api-coverage.md)
- [Hosted deployment](docs/deployment.md)
- [Security](SECURITY.md)

## Development

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Node.js 20 or newer. pnpm 10. Changesets live in `.changeset` for the publishable packages `daraz-mcp`, `@daraz-mcp/client`, and `@daraz-mcp/mcp-server`.
