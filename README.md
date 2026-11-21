<div align="center">

# Daraz MCP

Run a Daraz shop from Claude, Cursor, VS Code, or any MCP client.

[![CI](https://github.com/foisalislambd/daraz-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/foisalislambd/daraz-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![npm 0.1.0](https://img.shields.io/badge/npm-0.1.0-CB3837?logo=npm&logoColor=white)](packages/cli/package.json)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](package.json)

<img src="docs/images/dashboard.png" alt="Daraz MCP dashboard: sales, orders, low stock, and API usage" width="860">

</div>

The screenshot is the admin panel with a seeded demo account. The chart is a labelled sample snapshot, not a live Daraz response.

This project is **not affiliated with, endorsed by, or maintained by Daraz or Alibaba**. You need your own app key from the [Daraz Open Platform](https://open.daraz.com/).

`daraz-mcp` is version **0.1.0** in this repository. It is not on the npm registry yet, so `npx daraz-mcp` will not resolve until it is published. From a checkout, one command after `pnpm install` is `pnpm daraz setup`.

## Copy for AI

Paste this into ChatGPT, Claude, Cursor, or another assistant. It tells the assistant how to install and connect Daraz MCP. It does not contain app secrets or API keys. The same text is in [docs/AI_SETUP_PROMPT.md](docs/AI_SETUP_PROMPT.md). The panel buttons fill in your MCP URL.

````markdown
# Set up Daraz MCP for me

You are helping me connect a Daraz seller shop to an AI client through the daraz-mcp project.
Repository: https://github.com/foisalislambd/daraz-mcp
This project is not affiliated with Daraz or Alibaba.
Daraz MCP is free. There are no plans, prices, or usage caps.

Do not invent API paths, hosts, or secrets. Do not write secrets into git, chat logs, or screenshots. Ask me to paste an app key, app secret, or API key only when a step needs it, and never echo the secret back in full.

## What I already have

- Hosted MCP URL, if a panel is running: https://YOUR_HOST/mcp
- If that URL is still the placeholder, I do not have a hosted panel yet. Use the local CLI instead.

## Choose one path

### A. Hosted panel (no CLI on my machine)

1. Ask me for the panel URL. Sign-in is email and password that I create. Do not reuse demo passwords.
2. Open Shops. Countries are Bangladesh (BD), Pakistan (PK), Sri Lanka (LK), Nepal (NP), and Myanmar (MM). Bangladesh is the default.
3. Tell me to register this callback on the Daraz app before connecting: the panel origin plus /api/daraz/callback.
4. I enter a shop label, the country, and my own app key and secret unless the operator already set a platform app. Then I click Connect Daraz and approve the seller login.
5. On API keys, I create a key. The full key is shown once. You may refer to it as dk_live_YOUR_KEY. Do not store it in a file I might commit.
6. Put the MCP URL and Authorization: Bearer dk_live_YOUR_KEY into the client config for Claude Desktop, Cursor, or VS Code. ChatGPT and other Streamable HTTP clients use the same URL and header.
7. First tool calls must be reads: list_shops, then daily_sales_summary. Do not set confirm: true on a write tool until I explicitly ask to change price, stock, products, or orders.

### B. Local checkout (one command after install)

1. Require Node.js 20 or newer and pnpm 10.15.1.
2. From the repo root, run: pnpm install
3. Then one command: pnpm daraz setup
   That builds the client, MCP server, and CLI if needed, then starts the wizard.
4. Wizard defaults: region BD, redirect http://127.0.0.1:8787/callback, shop label "<REGION> shop".
   I must register that exact callback on the Daraz app. The wizard only receives the code on port 8787.
5. Valid regions: BD, PK, LK, NP, MM. Each uses its own REST host and authorize host from the client. Do not switch to https://auth.daraz.com unless I ask; that central host is unverified.
6. Tokens are encrypted in ~/.config/daraz-mcp (or DARAZ_MCP_HOME). Do not print master.key or credentials.enc.
7. Check with: pnpm daraz doctor
   Then: pnpm daraz config
8. Start the server with: pnpm daraz
   That is stdio MCP. For HTTP on this machine only: pnpm daraz http
   Optional DARAZ_MCP_API_KEY is a local bearer secret. Do not invent one and paste it into a public chat.

## After it is connected

Ask me which shop and which country. Use read tools for a morning brief. Wait for my confirmation before any write.

If a call returns E001 or 404, say the path may be unverified and point me at docs/api-coverage.md. Do not guess a replacement path.
````

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Hosted (no install, for sellers)](#hosted-no-install-for-sellers)
- [Self-host / local (for developers)](#self-host--local-for-developers)
- [Daraz app key and secret](#daraz-app-key-and-secret)
- [Client configuration](#client-configuration)
- [Tools](#tools)
- [Example prompts](#example-prompts)
- [Environment variables](#environment-variables)
- [Docker and deployment](#docker-and-deployment)
- [Regions](#regions)
- [Security](#security)
- [FAQ](#faq)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License and disclaimer](#license-and-disclaimer)

## Features

- Typed Daraz client: HMAC-SHA256 signing, OAuth, token refresh, and retries when Daraz returns throttle code E901 or the network fails. That retry is a technical safeguard. It is not a plan limit.
- MCP server on stdio and Streamable HTTP. Read tools are separate from write tools. Writes require `confirm: true`.
- Local CLI (`daraz-mcp`): setup wizard, encrypted tokens, printed configs for Claude Desktop, Cursor, and VS Code.
- Multi-tenant web panel, free for every seller: sign up, connect a shop, create and revoke API keys, copy an MCP URL, and read usage logs. There are no plans, prices, or caps on shops, keys, or calls.
- Regions BD, PK, LK, NP, and MM. Bangladesh is the default.
- SQLite by default, Postgres when `DATABASE_URL` starts with `postgres`.

## How it works

```mermaid
flowchart LR
  client["AI client"] --> mcp["MCP server"]
  mcp --> daraz["Daraz Open Platform"]
  panel["Hosted panel"] --> mcp
```

The client calls MCP tools. The server signs each REST call and sends it to the venture host (`https://api.daraz.com.bd/rest` for Bangladesh). The panel stores shops and API keys and serves the same MCP server at `POST /mcp`.

## Gallery

| Dashboard | Shops |
| --- | --- |
| <img src="docs/images/dashboard.png" alt="Dashboard" width="420"> | <img src="docs/images/shops.png" alt="Shops" width="420"> |

| API keys | Client setup |
| --- | --- |
| <img src="docs/images/keys.png" alt="API keys and MCP URL" width="420"> | <img src="docs/images/setup.png" alt="Client setup" width="420"> |

| Usage |
| --- |
| <img src="docs/images/usage.png" alt="Usage logs" width="420"> |

## Hosted (no install, for sellers)

This repository does not run a public seller site. An operator deploys `apps/web` and gives you the URL. You do not install Node.

1. Open the panel and create an account.
2. On **Shops**, enter a label, region, and (unless the operator set a platform app) your Daraz app key and secret. Choose **Connect Daraz** and approve the seller login.
3. Register the callback the form shows on your Daraz app: `https://YOUR_HOST/api/daraz/callback`.
4. On **API keys**, create a key. The full key is shown once. Copy the MCP URL.
5. Paste the URL and `Authorization: Bearer dk_live_...` into your AI client. Snippets are on **Client setup**.
6. Ask a read question first (`list_shops`, `daily_sales_summary`). A write only runs when the tool call includes `confirm: true`.

The panel is free. There are no plans and no limits on shops, API keys, or MCP calls. Usage is a log, not a quota. Daraz itself may throttle a burst with `E901`; the client backs off and retries.

## Self-host / local (for developers)

Node.js 20 or newer (CI uses 22). pnpm 10.15.1.

1. Clone the repo and install.

   ```bash
   corepack enable
   corepack prepare pnpm@10.15.1 --activate
   pnpm install
   pnpm build
   ```

2. Create a Daraz app and copy the key and secret. See [Daraz app key and secret](#daraz-app-key-and-secret).
3. Run the wizard. It asks for region, app key, app secret, and a shop label, opens the seller login, and stores tokens with AES-256-GCM.

   ```bash
   pnpm daraz setup
   ```

   Default redirect: `http://127.0.0.1:8787/callback`. Files land in `~/.config/daraz-mcp` (`master.key` and `credentials.enc`, mode `0600`), or in `DARAZ_MCP_HOME`.
4. Check the install.

   ```bash
   pnpm daraz doctor
   pnpm daraz shops
   pnpm daraz config
   ```

5. Point Claude Desktop, Cursor, or VS Code at the local server. See [Client configuration](#client-configuration).
6. Optional: run the panel yourself.

   ```bash
   cp .env.example .env
   # set TOKEN_ENCRYPTION_KEY before production
   pnpm dev:web
   ```

   Open http://localhost:3000. Demo data for UI review only:

   ```bash
   SEED_DEMO=true DEMO_EMAIL=demo@daraz-mcp.local DEMO_PASSWORD=demo-password pnpm --filter @daraz-mcp/web dev
   ```

Headless, without the wizard (the process reads these instead of the encrypted file):

```bash
export DARAZ_REGION=BD
export DARAZ_APP_KEY=...
export DARAZ_APP_SECRET=...
export DARAZ_ACCESS_TOKEN=...
export DARAZ_REFRESH_TOKEN=...
pnpm daraz serve
```

More detail: [docs/quickstart.md](docs/quickstart.md), [docs/deployment.md](docs/deployment.md).

## Daraz app key and secret

1. Sign in at https://open.daraz.com/.
2. Create an application and copy the app key and app secret.
3. Set the callback URL before you start OAuth.
   - Local CLI: `http://127.0.0.1:8787/callback`
   - Panel: `https://YOUR_HOST/api/daraz/callback` (or `http://localhost:3000/api/daraz/callback` for local dev)

Authorize uses `response_type=code`, `force_auth=true`, `redirect_uri`, and `client_id` (the app key) on the venture host, for example `https://api.daraz.com.bd/oauth/authorize`. The CLI and panel exchange the code at `POST /auth/token/create`.

If `DARAZ_APP_KEY` and `DARAZ_APP_SECRET` are set on the panel, sellers are not asked for their own key. That platform app is not stored per shop.

## Client configuration

After `daraz-mcp` is published, the command is `npx -y daraz-mcp`. The snippets below use that command. From a checkout, replace `npx` and the args with `node` and the path to `packages/cli/dist/cli.js`.

<details>
<summary>Claude Desktop and Cursor (local stdio)</summary>

Claude Desktop: `claude_desktop_config.json`. Cursor: `~/.cursor/mcp.json`.

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

</details>

<details>
<summary>VS Code (local stdio)</summary>

`.vscode/mcp.json`:

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

</details>

<details>
<summary>Hosted Streamable HTTP (Claude Desktop and Cursor)</summary>

Replace the URL and key. The panel prints the same JSON on **Client setup**.

```json
{
  "mcpServers": {
    "daraz": {
      "url": "https://YOUR_HOST/mcp",
      "headers": {
        "Authorization": "Bearer dk_live_YOUR_KEY"
      }
    }
  }
}
```

</details>

<details>
<summary>VS Code (hosted HTTP)</summary>

```json
{
  "servers": {
    "daraz": {
      "type": "http",
      "url": "https://YOUR_HOST/mcp",
      "headers": {
        "Authorization": "Bearer dk_live_YOUR_KEY"
      }
    }
  }
}
```

</details>

<details>
<summary>ChatGPT and other Streamable HTTP clients</summary>

There is no ChatGPT-only config file. Clients that speak Streamable HTTP use the same hosted URL and bearer key as above (`POST /mcp`). A public HTTPS URL is required for a client that cannot reach your machine.

Local HTTP, for a client on the same computer:

```bash
export DARAZ_MCP_API_KEY=optional-shared-secret
pnpm daraz http
```

That listens on `http://127.0.0.1:8788/mcp` (`PORT` and `HOST` override this). If `DARAZ_MCP_API_KEY` is set, the request must send `Authorization: Bearer` with that value.

</details>

Add another shop by running setup again. When more than one shop is saved, pass the `shop` argument (id or label).

## Tools

Read tools do not change the shop. Write tools are annotated destructive and require `confirm: true`. `call_api` rejects unknown paths; a write through `call_api` still needs `confirm: true`.

| Tool | Access | Confirm | What it does |
| --- | --- | --- | --- |
| `list_shops` | read | no | Connected shops, no secrets |
| `list_api_catalog` | read | no | Paths and how each one was verified |
| `get_seller` | read | no | `/seller/get` |
| `get_orders` | read | no | `/orders/get` |
| `get_order` | read | no | `/order/get` |
| `get_order_items` | read | no | `/order/items/get` |
| `get_products` | read | no | `/products/get` |
| `get_product` | read | no | `/product/item/get` |
| `get_category_tree` | read | no | `/category/tree/get` |
| `get_category_attributes` | read | no | `/category/attributes/get` |
| `query_brands` | read | no | `/category/brands/query` |
| `get_finance` | read | no | Transactions or payout status |
| `list_returns` | read | no | `/reverse/order/list` |
| `list_reviews` | read | no | Unverified on Daraz |
| `list_vouchers` | read | no | Unverified on Daraz |
| `daily_sales_summary` | read | no | Today's orders and a price sum |
| `low_stock_report` | read | no | SKUs at or under a threshold |
| `pending_orders` | read | no | `pending` and `unpaid` in the last 14 days |
| `update_price_quantity` | write | yes | `/product/price_quantity/update` |
| `bulk_update_price_quantity_csv` | write | yes | CSV of price and stock, 50 SKUs per call |
| `create_product` | write | yes | XML payload |
| `update_product` | write | yes | XML payload |
| `remove_product` | write | yes | Up to 50 seller SKUs |
| `deactivate_product` | write | yes | `/product/deactivate` |
| `upload_image` | write | yes | Base64 file to `/image/upload` |
| `pack_order` | write | yes | `/order/pack` |
| `ready_to_ship` | write | yes | `/order/rts` |
| `cancel_order` | write | yes | `/order/cancel` |
| `set_invoice_number` | write | yes | `/order/invoice_number/set` |
| `voucher_action` | write | yes | Unverified voucher create, update, activate, or deactivate |
| `call_api` | mixed | writes only | Any catalog path |

Resources: `daraz://regions`, `daraz://shops`, `daraz://catalog`.

Prompts: `morning-shop-brief`, `restock-plan`.

CSV columns for bulk updates: `item_id`, `sku_id`, `seller_sku`, `quantity`, `price`, `sale_price`. At least one identity column is required.

Some parameter names were not printed on the captured portal pages. A live call can return `E001`. See [docs/tools.md](docs/tools.md) and [docs/api-coverage.md](docs/api-coverage.md).

## Example prompts

These match the built-in prompts. They use read tools only until you confirm a write.

- Morning brief: "Using only read tools, prepare a morning brief. Include daily sales, pending orders, and low stock. Use the shop currency. Do not change prices, stock, or orders."
- Restock list: "Read the low-stock report with threshold 5. Propose new quantities. Do not call any write tool until I confirm."
- Orders: "List pending orders that need action."
- Catalog: "Show live products and flag SKUs with available stock under 5."

## Environment variables

Copy `.env.example`. Do not commit secrets.

| Variable | Where | Purpose |
| --- | --- | --- |
| `TOKEN_ENCRYPTION_KEY` | Panel | 32 bytes, base64. Required in production. Encrypts Daraz tokens and app secrets. |
| `PUBLIC_APP_URL` | Panel | Public origin, no path. OAuth redirect base. |
| `COOKIE_SECURE` | Panel | `true` or `false`. In production the cookie is `Secure` when this is unset and the public URL is https or empty. Set `false` for a local production server on http. |
| `DATABASE_URL` | Panel | `postgres://...` for Postgres. Omit for SQLite. |
| `SQLITE_PATH` | Panel | SQLite file. Default `apps/web/data/daraz.sqlite` when the process cwd is `apps/web`. |
| `PORT` / `HOST` | Panel or CLI `http` | Panel default `3000` / `0.0.0.0`. CLI HTTP default `8788` / `127.0.0.1`. |
| `DARAZ_APP_KEY` / `DARAZ_APP_SECRET` | Panel or CLI | Platform app, or the headless shop credentials. |
| `DARAZ_REGION` | CLI | `BD`, `PK`, `LK`, `NP`, or `MM`. |
| `DARAZ_ACCESS_TOKEN` / `DARAZ_REFRESH_TOKEN` | CLI | Headless tokens. When set, the CLI does not use the encrypted file. |
| `DARAZ_SHOP_ID` / `DARAZ_SHOP_LABEL` | CLI | Optional labels for the env shop. |
| `DARAZ_MCP_HOME` | CLI | Config directory. Default `~/.config/daraz-mcp`. |
| `DARAZ_MCP_API_KEY` | CLI `http` | Optional bearer secret for the local HTTP server. |
| `SEED_DEMO` | Panel | `true` inserts a demo user and a sample dashboard. Leave unset in production. |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | Panel | Demo account. Defaults `demo@daraz-mcp.local` / `demo-password`. |
| `NODE_ENV` | Panel | `production` requires `TOKEN_ENCRYPTION_KEY`. |

Generate an encryption key:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

## Docker and deployment

```bash
export TOKEN_ENCRYPTION_KEY="$(node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))")"
docker compose up --build
```

Compose starts Postgres 16 and the web app on port 3000. `DATABASE_URL` is `postgres://daraz:daraz@postgres:5432/daraz`. If you omit `TOKEN_ENCRYPTION_KEY`, compose uses 32 zero bytes so the container can boot. Replace that key before any real token is stored.

The process is `node --experimental-strip-types server.ts`. It boots Next.js and handles `/mcp` on the Node HTTP server. Responses are stateless JSON, so a proxy does not need sticky sessions.

## Regions

| Code | Country | Currency | REST base | Authorize host |
| --- | --- | --- | --- | --- |
| `BD` | Bangladesh | BDT | `https://api.daraz.com.bd/rest` | `https://api.daraz.com.bd` |
| `PK` | Pakistan | PKR | `https://api.daraz.pk/rest` | `https://api.daraz.pk` |
| `LK` | Sri Lanka | LKR | `https://api.daraz.lk/rest` | `https://api.daraz.lk` |
| `NP` | Nepal | NPR | `https://api.daraz.com.np/rest` | `https://api.daraz.com.np` |
| `MM` | Myanmar | MMK | `https://api.shop.com.mm/rest` | `https://api.shop.com.mm` |

`https://auth.daraz.com` is an optional central host (`host: "central"`). It was not in the official authorize samples this client follows, so the wizard and the panel do not use it.

The five REST hosts, authorize hosts, currencies, and timezones above are locked by `packages/daraz-client/test/regions.test.ts`. They come from the CreateProduct service-endpoint table and the seller-authorization samples, including Myanmar on `api.shop.com.mm`. A live seller login was not run for every country from this repository.

## Security

- Local tokens: AES-256-GCM. The key file and ciphertext are mode `0600`. Anyone who can read both can decrypt them.
- Panel tokens: the same cipher with `TOKEN_ENCRYPTION_KEY`. Losing the key makes stored tokens unreadable.
- API keys are stored as SHA-256. The full key is shown once. Revoke it in the panel if it leaks.
- Session cookies are random, HTTP-only, and stored as hashes. Passwords are scrypt.
- Logs redact field names that look like tokens, secrets, or passwords.
- OAuth `state` expires after 15 minutes.
- Write tools change live seller data when `confirm` is true. Give keys only to clients you trust.

Details: [SECURITY.md](SECURITY.md).

## FAQ

<details>
<summary>The browser login never returns to the CLI.</summary>

The Daraz app callback must be exactly `http://127.0.0.1:8787/callback` unless you typed a different redirect. The wizard listens on port 8787.

</details>

<details>
<summary>A write tool did nothing.</summary>

Writes require `confirm: true` in the tool arguments. The model should not set that until you ask it to change the shop.

</details>

<details>
<summary>Daraz returns <code>E001</code> or a 404.</summary>

Some finance, reverse-order, document, and voucher parameter names are shared Lazada-style names, not strings copied from an unread Daraz page. `list_reviews`, `list_vouchers`, and `voucher_action` are labelled unverified. See [docs/api-coverage.md](docs/api-coverage.md).

</details>

<details>
<summary>Sign-in works, then the panel sends me back to login.</summary>

In production the session cookie is `Secure` when `PUBLIC_APP_URL` is https or unset. On plain HTTP, set `COOKIE_SECURE=false` or an `http://` `PUBLIC_APP_URL`.

</details>

<details>
<summary>Where is the database?</summary>

SQLite at `SQLITE_PATH`, or `apps/web/data/daraz.sqlite` when that variable is unset. Set `DATABASE_URL` to a `postgres://` URL to use Postgres. Drizzle defines the schema. Startup SQL creates tables and drops a leftover `users.plan` column from older databases. Other queries use bound SQL.

</details>

<details>
<summary>Are webhooks supported?</summary>

No. The server polls. There is no webhook receiver.

</details>

## Roadmap

What the code already marks as unfinished:

- Review and voucher paths are implemented and labelled unverified.
- Free Shipping, Flexicombo, instant messaging, 3PV, wallet, multi-warehouse XML, and webhooks are not implemented.
- `daraz-mcp` is prepared for npm with changesets. It is not published yet.

## Contributing

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Do not add a Daraz path unless you can point at a portal capture, an official document, or a client you have read. Do not commit `.env`, token files, or `data/`.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License and disclaimer

[MIT](LICENSE). Copyright (c) 2026 Foisal Islam.

**Not affiliated with Daraz or Alibaba.** API paths that were not verified against a page we could read are listed in [docs/api-coverage.md](docs/api-coverage.md).

The admin UI is adapted from [ZenPanel](https://github.com/foisalislambd/zenpanel) v2.1.3 (MIT, Copyright 2026 Foisal Islam). The license is in [apps/web/VENDOR-LICENSE](apps/web/VENDOR-LICENSE). The panel keeps ZenPanel's Next.js, Tailwind CSS, sidebar, and theme, and replaces the template pages with the Daraz screens above.
