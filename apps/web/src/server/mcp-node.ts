import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { safeEqual, sha256Hex } from "@daraz-mcp/client";
import { handleMcpHttp, type ShopConnection } from "@daraz-mcp/mcp-server";
import { assertWithinPlan, getDb, open, seal } from "./db.ts";

export async function handleHostedMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Missing API key" }));
    return;
  }
  const db = await getDb();
  const key = await db.get(
    "SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL",
    [sha256Hex(token)],
  );
  if (!key) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid API key" }));
    return;
  }
  const presentedPrefix = token.slice(0, 12);
  if (!safeEqual(presentedPrefix, String(key.prefix))) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid API key" }));
    return;
  }
  try {
    await assertWithinPlan(String(key.user_id), "calls");
  } catch (error) {
    res.writeHead(402, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Plan limit" }));
    return;
  }
  const rows = await db.all("SELECT * FROM shops WHERE user_id = ? AND status = ?", [
    key.user_id,
    "connected",
  ]);
  const shops: ShopConnection[] = rows.flatMap((row) => {
    const accessToken = open(row.access_token_enc ? String(row.access_token_enc) : null);
    if (!accessToken) return [];
    const usesPlatform = row.uses_platform_app === 1;
    const appKey = usesPlatform
      ? process.env.DARAZ_APP_KEY
      : open(row.app_key_enc ? String(row.app_key_enc) : null);
    const appSecret = usesPlatform
      ? process.env.DARAZ_APP_SECRET
      : open(row.app_secret_enc ? String(row.app_secret_enc) : null);
    if (!appKey || !appSecret) return [];
    return [
      {
        id: String(row.id),
        label: String(row.label),
        region: String(row.region),
        appKey,
        appSecret,
        accessToken,
        refreshToken: open(row.refresh_token_enc ? String(row.refresh_token_enc) : null),
        accessTokenExpiresAt: row.expires_at ? Number(row.expires_at) : undefined,
      },
    ];
  });
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  let body: unknown;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }
  }
  await handleMcpHttp(
    req,
    res,
    {
      shops,
      onUsage: async (event) => {
        await db.run(
          "INSERT INTO usage_logs (id, user_id, api_key_id, shop_id, tool, ok, error_code, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            `log_${randomBytes(8).toString("hex")}`,
            key.user_id,
            key.id,
            event.shopId ?? null,
            event.tool,
            event.ok ? 1 : 0,
            event.errorCode ?? null,
            event.durationMs,
            Date.now(),
          ],
        );
        await db.run("UPDATE api_keys SET last_used_at = ? WHERE id = ?", [Date.now(), key.id]);
      },
      onTokensUpdated: async (shopId, tokens) => {
        await db.run(
          "UPDATE shops SET access_token_enc = ?, refresh_token_enc = ?, expires_at = ? WHERE id = ? AND user_id = ?",
          [
            seal(tokens.accessToken),
            tokens.refreshToken ? seal(tokens.refreshToken) : null,
            tokens.accessTokenExpiresAt ?? null,
            shopId,
            key.user_id,
          ],
        );
      },
    },
    body,
  );
}
