import { createServer } from "node:http";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { spawn } from "node:child_process";
import { buildAuthorizeUrl, createDaraz, isRegionCode, type RegionCode } from "@daraz-mcp/client";
import { configInstructions } from "./configs.js";
import { upsertShop, type StoredShop } from "./store.js";

async function ask(prompt: string, fallback?: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await rl.question(fallback ? `${prompt} [${fallback}]: ` : `${prompt}: `)).trim();
    return answer || fallback || "";
  } finally {
    rl.close();
  }
}

function openBrowser(url: string) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    const child = spawn(command, [url], { stdio: "ignore", detached: true });
    child.unref();
  } catch {
    stdout.write(`Open this URL in a browser:\n${url}\n`);
  }
}

function waitForCode(port: number, expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const state = url.searchParams.get("state");
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end("<html><body><p>You can close this tab and return to the terminal.</p></body></html>");
      server.close();
      if (error) {
        reject(new Error(error));
        return;
      }
      if (!code || state !== expectedState) {
        reject(new Error("OAuth callback did not include a matching code."));
        return;
      }
      resolve(code);
    });
    server.listen(port, "127.0.0.1");
    server.on("error", reject);
  });
}

export async function runSetup(dir?: string): Promise<void> {
  stdout.write("Daraz MCP setup\nThis stores tokens encrypted under your config directory (mode 0600).\n\n");
  const regionInput = (await ask("Region (BD, PK, LK, NP, MM)", "BD")).toUpperCase();
  if (!isRegionCode(regionInput)) throw new Error("Unknown region.");
  const region: RegionCode = regionInput;
  const appKey = await ask("Daraz app key");
  const appSecret = await ask("Daraz app secret");
  const label = await ask("Shop label", `${region} shop`);
  if (!appKey || !appSecret) throw new Error("App key and secret are required.");

  const port = 8787;
  const redirectUri = await ask("OAuth redirect URI", `http://127.0.0.1:${port}/callback`);
  const state = Math.random().toString(36).slice(2);
  const url = buildAuthorizeUrl({ region, appKey, redirectUri, state });
  stdout.write(`\nApprove the app in your browser. If it does not open, visit:\n${url}\n\n`);
  const pending = waitForCode(port, state);
  openBrowser(url);
  const code = await pending;
  const api = createDaraz({ region, appKey, appSecret });
  const token = await api.client.createToken(code);
  const accessToken = String(token.access_token || "");
  if (!accessToken) throw new Error("Daraz did not return an access token.");
  const sellerId =
    Array.isArray(token.country_user_info) && token.country_user_info[0]
      ? String((token.country_user_info[0] as { seller_id?: string }).seller_id || "")
      : "";
  const shop: StoredShop = {
    id: sellerId || `${region.toLowerCase()}-${appKey.slice(0, 6)}`,
    label,
    region,
    appKey,
    appSecret,
    accessToken,
    ...(typeof token.refresh_token === "string" ? { refreshToken: token.refresh_token } : {}),
    ...(typeof token.expires_in === "number"
      ? { accessTokenExpiresAt: Date.now() + token.expires_in * 1000 }
      : {}),
  };
  upsertShop(shop, dir);
  stdout.write(`\nSaved shop ${shop.label} (${shop.id}).\n\n${configInstructions()}\n`);
}

export async function printConfig(): Promise<void> {
  stdout.write(`${configInstructions()}\n`);
}
