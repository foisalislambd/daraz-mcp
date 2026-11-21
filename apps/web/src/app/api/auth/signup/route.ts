import { randomBytes } from "node:crypto";
import { getDb } from "@/server/db";
import { hashPassword } from "@/server/passwords";
import { createSession, json, publicUser, sessionCookie, type SessionUser } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    name?: string;
  } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  const name = body?.name?.trim() || "";
  const password = body?.password || "";
  if (!email.includes("@") || password.length < 8 || name.length < 2) {
    return json({ error: "Name, a valid email, and a password of at least 8 characters are required." }, 400);
  }
  const db = await getDb();
  const existing = await db.get("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) return json({ error: "An account with that email already exists." }, 409);
  const user: SessionUser = {
    id: `user_${randomBytes(8).toString("hex")}`,
    email,
    name,
    plan: "free",
    createdAt: Date.now(),
  };
  await db.run(
    "INSERT INTO users (id, email, name, password_hash, plan, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [user.id, user.email, user.name, await hashPassword(password), user.plan, user.createdAt],
  );
  const token = await createSession(user.id);
  return json({ admin: publicUser(user) }, 201, { "set-cookie": sessionCookie(token) });
}
