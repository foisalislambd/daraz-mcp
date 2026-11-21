# Hosted deployment

## Environment

Copy `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `TOKEN_ENCRYPTION_KEY` | Production | 32 bytes, base64. Encrypts Daraz tokens and app secrets. |
| `DATABASE_URL` | No | `postgres://...` for Postgres. Omit for SQLite. |
| `PUBLIC_APP_URL` | Yes for OAuth | Public origin, no trailing path. Used as the OAuth redirect base. |
| `DARAZ_APP_KEY` / `DARAZ_APP_SECRET` | No | Platform app. If set, sellers are not asked for their own key. |
| `SEED_DEMO` | No | Inserts a demo user and sample dashboard. Do not enable in production. |

Generate a key:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Register `https://YOUR_HOST/api/daraz/callback` on the Daraz app.

## Docker

```bash
export TOKEN_ENCRYPTION_KEY="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))")"
docker compose up --build
```

The web process listens on port 3000. MCP is `POST /mcp` with `Authorization: Bearer <api key>`.

## Plans

`free`, `pro`, and `business` cap shops, keys, and monthly MCP calls. The billing page shows the caps and a disabled upgrade button. There is no payment provider.

## Process

`node --experimental-strip-types server.ts` boots Next.js and handles `/mcp` on the Node HTTP server, because the MCP SDK's Streamable HTTP transport speaks Node `IncomingMessage` / `ServerResponse`. Stateless JSON responses are enabled so a reverse proxy does not need sticky sessions.
