# Quick start

## 1. Create a Daraz app

1. Sign in at https://open.daraz.com/.
2. Create an application and copy the app key and app secret.
3. Set the callback URL.
   - Local CLI: `http://127.0.0.1:8787/callback`
   - Hosted panel: `https://YOUR_HOST/api/daraz/callback`

The authorize URL uses `client_id` (the app key), `response_type=code`, and `force_auth=true`. The official seller-authorization samples use the venture host, for example `https://api.daraz.com.bd/oauth/authorize`.

## 2. Run the wizard

```bash
npx daraz-mcp setup
```

Approve the app in the browser. The CLI exchanges the code at `POST /auth/token/create` and stores the tokens with AES-256-GCM.

## 3. Check

```bash
npx daraz-mcp doctor
npx daraz-mcp shops
```

## 4. Connect a client

`npx daraz-mcp config` prints Claude Desktop, Cursor, and VS Code snippets.

Try a read tool first: `list_shops`, then `daily_sales_summary`. Do not set `confirm` on a write tool until you mean to change the shop.

## Several shops

Run setup again for another region. Tools take a `shop` argument (id or label) when more than one shop is saved.
