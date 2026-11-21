import { getDb, monthUsage } from "@/server/db";
import { json, userFromRequest } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const url = new URL(request.url);
  const tool = url.searchParams.get("tool") || "";
  const status = url.searchParams.get("status") || "";
  const db = await getDb();
  const filters = ["user_id = ?"];
  const params: unknown[] = [user.id];
  if (tool) {
    filters.push("tool = ?");
    params.push(tool);
  }
  if (status === "ok") filters.push("ok = 1");
  if (status === "error") filters.push("ok = 0");
  const rows = await db.all(
    `SELECT id, tool, ok, error_code, duration_ms, created_at, shop_id FROM usage_logs WHERE ${filters.join(" AND ")} ORDER BY created_at DESC LIMIT 200`,
    params,
  );
  return json({
    used: await monthUsage(user.id),
    logs: rows.map((row) => ({
      id: row.id,
      tool: row.tool,
      ok: row.ok === 1,
      errorCode: row.error_code,
      durationMs: row.duration_ms,
      createdAt: row.created_at,
      shopId: row.shop_id,
    })),
  });
}
