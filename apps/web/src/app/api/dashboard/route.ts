import { getDb, monthUsage } from "@/server/db";
import { json, userFromRequest } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const db = await getDb();
  const snapshot = await db.get("SELECT payload, source, updated_at FROM snapshots WHERE user_id = ?", [user.id]);
  const shops = await db.all("SELECT id, label, region, status FROM shops WHERE user_id = ?", [user.id]);
  const used = await monthUsage(user.id);
  const payload = snapshot ? JSON.parse(String(snapshot.payload)) : emptyPayload();
  return json({
    source: snapshot ? snapshot.source : "empty",
    updatedAt: snapshot?.updated_at ?? null,
    currency: payload.currency || "BDT",
    stats: { ...payload.stats, apiCallsMonth: used, shops: shops.length },
    chart: payload.chart || [],
    orders: payload.orders || [],
    lowStock: payload.lowStock || [],
    shops,
  });
}

function emptyPayload() {
  return {
    currency: "BDT",
    stats: { salesToday: 0, ordersToday: 0, pendingOrders: 0, lowStock: 0 },
    chart: [],
    orders: [],
    lowStock: [],
  };
}
