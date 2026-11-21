import { sha256Hex } from "@daraz-mcp/client";
import { getDb } from "@/server/db";
import { clearCookie, json } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const header = request.headers.get("cookie") || "";
  const match = header.split(";").map((part) => part.trim()).find((part) => part.startsWith("daraz_session="));
  if (match) {
    const token = decodeURIComponent(match.slice("daraz_session=".length));
    const db = await getDb();
    await db.run("DELETE FROM sessions WHERE token_hash = ?", [sha256Hex(token)]);
  }
  return json({ ok: true }, 200, { "set-cookie": clearCookie() });
}
