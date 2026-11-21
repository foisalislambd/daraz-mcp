import { safeEqual } from "@daraz-mcp/client";
import { startHttpServer, startStdio, type ShopContext } from "@daraz-mcp/mcp-server";
import { configInstructions } from "./configs.js";
import { loadShops, updateShopTokens } from "./store.js";
import { printConfig, runSetup } from "./wizard.js";

function context(): ShopContext {
  const shops = loadShops();
  return {
    shops,
    onTokensUpdated: async (shopId, tokens) => {
      if (!process.env.DARAZ_ACCESS_TOKEN) updateShopTokens(shopId, tokens);
    },
  };
}

function help() {
  return `daraz-mcp <command>

Commands:
  setup     App key, browser OAuth, encrypted local tokens, client config
  serve     MCP server on stdio (default for Claude, Cursor, and VS Code)
  http      MCP Streamable HTTP on 127.0.0.1:8788
  config    Print Claude Desktop, Cursor, and VS Code snippets
  shops     List saved shops without secrets
  doctor    Check that a shop is configured

Environment overrides for headless use:
  DARAZ_REGION, DARAZ_APP_KEY, DARAZ_APP_SECRET, DARAZ_ACCESS_TOKEN, DARAZ_REFRESH_TOKEN
`;
}

async function main() {
  const [command = "serve"] = process.argv.slice(2);
  if (command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(help());
    return;
  }
  if (command === "setup") {
    await runSetup();
    return;
  }
  if (command === "config") {
    await printConfig();
    return;
  }
  if (command === "shops") {
    const shops = loadShops().map((shop) => ({ id: shop.id, label: shop.label, region: shop.region }));
    process.stdout.write(`${JSON.stringify(shops, null, 2)}\n`);
    return;
  }
  if (command === "doctor") {
    const shops = loadShops();
    if (shops.length === 0) {
      process.stderr.write("No shop configured. Run: npx daraz-mcp setup\n");
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`OK: ${shops.length} shop(s) configured.\n${configInstructions()}\n`);
    return;
  }
  if (command === "serve") {
    const ctx = context();
    if (ctx.shops.length === 0) {
      process.stderr.write("No Daraz shop configured. Run daraz-mcp setup first.\n");
      process.exitCode = 1;
      return;
    }
    await startStdio(ctx);
    return;
  }
  if (command === "http") {
    const ctx = context();
    const apiKey = process.env.DARAZ_MCP_API_KEY;
    const port = Number(process.env.PORT || 8788);
    await startHttpServer({
      port,
      host: process.env.HOST || "127.0.0.1",
      getContext: async (req) => {
        if (!apiKey) return ctx;
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : "";
        if (!token || token.length !== apiKey.length || !safeEqual(token, apiKey)) return undefined;
        return ctx;
      },
    });
    process.stderr.write(`daraz-mcp listening on http://127.0.0.1:${port}/mcp\n`);
    return;
  }
  process.stderr.write(`Unknown command ${command}\n${help()}`);
  process.exitCode = 1;
}

void main();
