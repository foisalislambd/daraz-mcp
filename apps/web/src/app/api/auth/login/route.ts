import { getDb } from "@/server/db";
import { verifyPassword } from "@/server/passwords";
import { createSession, json, publicUser, sessionCookie, type SessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  const password = body?.password || "";
  const db = await getDb();
  const row = await db.get("SELECT * FROM users WHERE email = ?", [email]);
  if (!row || !(await verifyPassword(password, String(row.password_hash)))) {
    return json({ error: "Email or password is incorrect." }, 401);
  }
  const user: SessionUser = {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    createdAt: Number(row.created_at),
  };
  const token = await createSession(user.id);
  return json({ admin: publicUser(user) }, 200, { "set-cookie": sessionCookie(token) });
}
