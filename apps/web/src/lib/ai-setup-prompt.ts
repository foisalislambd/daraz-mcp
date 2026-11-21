export const MCP_URL_PLACEHOLDER = "https://YOUR_HOST/mcp";

export const AI_SETUP_PROMPT = `# Set up Daraz MCP for me

You are helping me connect a Daraz seller shop to an AI client through the daraz-mcp project.
Repository: https://github.com/foisalislambd/daraz-mcp
This project is not affiliated with Daraz or Alibaba.
Daraz MCP is free. There are no plans, prices, or usage caps.

Do not invent API paths, hosts, or secrets. Do not write secrets into git, chat logs, or screenshots. Ask me to paste an app key, app secret, or API key only when a step needs it, and never echo the secret back in full.

## What I already have

- Hosted MCP URL, if a panel is running: ${MCP_URL_PLACEHOLDER}
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
`;

export function aiSetupPrompt(mcpUrl?: string): string {
  const url = mcpUrl?.trim() ? mcpUrl.trim() : MCP_URL_PLACEHOLDER;
  return AI_SETUP_PROMPT.replaceAll(MCP_URL_PLACEHOLDER, url);
}
