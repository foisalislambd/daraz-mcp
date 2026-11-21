import { randomBytes } from "node:crypto";
import { buildAuthorizeUrl, isRegionCode } from "@daraz-mcp/client";
import { assertWithinPlan, getDb, seal } from "@/server/db";
import { json, userFromRequest } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const db = await getDb();
  const rows = await db.all(
    "SELECT id, label, region, seller_id, status, created_at, uses_platform_app FROM shops WHERE user_id = ? ORDER BY created_at DESC",
    [user.id],
  );
  const origin = (process.env.PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  return json({
    redirectUri: `${origin}/api/daraz/callback`,
    shops: rows.map((row) => ({
      id: row.id,
      label: row.label,
      region: row.region,
      sellerId: row.seller_id,
      status: row.status,
      createdAt: row.created_at,
      usesPlatformApp: row.uses_platform_app === 1,
    })),
    platformAppConfigured: Boolean(process.env.DARAZ_APP_KEY && process.env.DARAZ_APP_SECRET),
  });
}

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const body = (await request.json().catch(() => null)) as {
    label?: string;
    region?: string;
    appKey?: string;
    appSecret?: string;
  } | null;
  const region = (body?.region || "BD").toUpperCase();
  const label = body?.label?.trim() || "";
  if (!isRegionCode(region) || label.length < 2) {
    return json({ error: "A shop label and a valid region are required." }, 400);
  }
  const platform = Boolean(process.env.DARAZ_APP_KEY && process.env.DARAZ_APP_SECRET);
  const appKey = platform ? process.env.DARAZ_APP_KEY! : body?.appKey?.trim() || "";
  const appSecret = platform ? process.env.DARAZ_APP_SECRET! : body?.appSecret?.trim() || "";
  if (!appKey || !appSecret) {
    return json({ error: "Enter the Daraz app key and secret, or configure the platform app." }, 400);
  }
  try {
    await assertWithinPlan(user.id, "shops");
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Plan limit" }, 402);
  }
  const state = randomBytes(16).toString("hex");
  const db = await getDb();
  await db.run(
    "INSERT INTO oauth_states (state, user_id, region, label, app_key_enc, app_secret_enc, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [state, user.id, region, label, seal(appKey), seal(appSecret), Date.now() + 15 * 60 * 1000],
  );
  const origin = process.env.PUBLIC_APP_URL || new URL(request.url).origin;
  const redirectUri = `${origin}/api/daraz/callback`;
  const url = buildAuthorizeUrl({ region, appKey, redirectUri, state });
  return json({ url, redirectUri });
}

export async function DELETE(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing shop id" }, 400);
  const db = await getDb();
  await db.run("DELETE FROM shops WHERE id = ? AND user_id = ?", [id, user.id]);
  return json({ ok: true });
}
