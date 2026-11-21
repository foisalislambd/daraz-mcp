import { randomBytes } from "node:crypto";
import { createDaraz } from "@daraz-mcp/client";
import { getDb, open, seal } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const back = "/admin/shops";
  if (oauthError || !code || !state) {
    return Response.redirect(`${back}?error=oauth`, 302);
  }
  const db = await getDb();
  const row = await db.get("SELECT * FROM oauth_states WHERE state = ?", [state]);
  if (!row || Number(row.expires_at) < Date.now()) {
    return Response.redirect(`${back}?error=state`, 302);
  }
  await db.run("DELETE FROM oauth_states WHERE state = ?", [state]);
  const appKey = open(row.app_key_enc ? String(row.app_key_enc) : null);
  const appSecret = open(row.app_secret_enc ? String(row.app_secret_enc) : null);
  if (!appKey || !appSecret) return Response.redirect(`${back}?error=app`, 302);
  try {
    const api = createDaraz({ region: String(row.region), appKey, appSecret });
    const token = await api.client.createToken(code);
    const access = String(token.access_token || "");
    if (!access) return Response.redirect(`${back}?error=token`, 302);
    const sellerId =
      Array.isArray(token.country_user_info) && token.country_user_info[0]
        ? String((token.country_user_info[0] as { seller_id?: string }).seller_id || "")
        : "";
    const platform = appKey === process.env.DARAZ_APP_KEY;
    await db.run(
      `INSERT INTO shops (id, user_id, label, region, seller_id, app_key_enc, app_secret_enc, access_token_enc, refresh_token_enc, expires_at, status, uses_platform_app, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `shop_${randomBytes(8).toString("hex")}`,
        row.user_id,
        row.label,
        row.region,
        sellerId || null,
        platform ? null : seal(appKey),
        platform ? null : seal(appSecret),
        seal(access),
        seal(typeof token.refresh_token === "string" ? token.refresh_token : undefined),
        typeof token.expires_in === "number" ? Date.now() + token.expires_in * 1000 : null,
        "connected",
        platform ? 1 : 0,
        Date.now(),
      ],
    );
  } catch {
    return Response.redirect(`${back}?error=exchange`, 302);
  }
  return Response.redirect(`${back}?connected=1`, 302);
}
