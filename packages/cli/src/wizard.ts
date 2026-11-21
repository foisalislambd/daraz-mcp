import { createServer } from "node:http";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { spawn } from "node:child_process";
import { buildAuthorizeUrl, createDaraz, getRegion, isRegionCode, REGION_CODES, type RegionCode } from "@daraz-mcp/client";
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
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        reject(new Error("Port 8787 is already in use. Stop the other setup window and run this again."));
        return;
      }
      reject(error);
    });
  });
}

export async function runSetup(dir?: string): Promise<void> {
  const port = 8787;
  const redirectUri = `http://127.0.0.1:${port}/callback`;
  stdout.write(
    [
      "Daraz MCP setup",
      "Tokens are encrypted in ~/.config/daraz-mcp (or DARAZ_MCP_HOME). Files are mode 0600.",
      `Register this callback on the Daraz app before you continue: ${redirectUri}`,
      `Countries: ${REGION_CODES.join(", ")}. Press Enter to use Bangladesh (BD).`,
      "",
    ].join("\n"),
  );
  const regionInput = (await ask("Country code", "BD")).toUpperCase();
  if (!isRegionCode(regionInput)) {
    throw new Error(`Unknown country "${regionInput}". Use one of ${REGION_CODES.join(", ")}.`);
  }
  const region: RegionCode = regionInput;
  const country = getRegion(region);
  const appKey = await ask("Daraz app key from open.daraz.com");
  if (!appKey) throw new Error("The app key is required. Create an app at https://open.daraz.com/ and paste the key.");
  const appSecret = await ask("Daraz app secret");
  if (!appSecret) throw new Error("The app secret is required. It is encrypted on disk and is not printed again.");
  const label = await ask("Shop label", `${country.name} shop`);
  const state = Math.random().toString(36).slice(2);
  const url = buildAuthorizeUrl({ region, appKey, redirectUri, state });
  stdout.write(
    `\nOpening ${country.name} seller login (${country.authorizeBase}).\nIf the browser does not open, visit:\n${url}\n\n`,
  );
  const pending = waitForCode(port, state);
  openBrowser(url);
  const code = await pending;
  const api = createDaraz({ region, appKey, appSecret });
  const token = await api.client.createToken(code);
  const accessToken = String(token.access_token || "");
  if (!accessToken) {
    throw new Error(
      "Daraz did not return an access token. Check the app key, secret, and that the callback URL matches the app.",
    );
  }
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
