import { randomBytes } from "node:crypto";
import { sha256Hex } from "@daraz-mcp/client";
import { getDb } from "@/server/db";
import { json, userFromRequest } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const db = await getDb();
  const rows = await db.all(
    "SELECT id, name, prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC",
    [user.id],
  );
  const origin = process.env.PUBLIC_APP_URL || new URL(request.url).origin;
  return json({
    mcpUrl: `${origin}/mcp`,
    keys: rows.map((row) => ({
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      revokedAt: row.revoked_at,
    })),
  });
}

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const body = (await request.json().catch(() => null)) as { name?: string; rotateId?: string } | null;
  const name = body?.name?.trim() || "API key";
  const db = await getDb();
  if (body?.rotateId) {
    await db.run("UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL", [
      Date.now(),
      body.rotateId,
      user.id,
    ]);
  }
  const secret = `dk_live_${randomBytes(24).toString("base64url")}`;
  const id = `key_${randomBytes(8).toString("hex")}`;
  await db.run(
    "INSERT INTO api_keys (id, user_id, name, prefix, key_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, user.id, name, secret.slice(0, 12), sha256Hex(secret), Date.now()],
  );
  return json({ id, name, secret, prefix: secret.slice(0, 12) }, 201);
}

export async function DELETE(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing key id" }, 400);
  const db = await getDb();
  await db.run("UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ?", [Date.now(), id, user.id]);
  return json({ ok: true });
}
