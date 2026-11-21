import { getDb } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/passwords";
import { json, publicUser, userFromRequest } from "@/server/session";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  } | null;
  const db = await getDb();
  if (body?.name && body.name.trim().length >= 2) {
    await db.run("UPDATE users SET name = ? WHERE id = ?", [body.name.trim(), user.id]);
    user.name = body.name.trim();
  }
  if (body?.newPassword) {
    if (body.newPassword.length < 8) return json({ error: "New password must be at least 8 characters." }, 400);
    const row = await db.get("SELECT password_hash FROM users WHERE id = ?", [user.id]);
    if (!row || !(await verifyPassword(body.currentPassword || "", String(row.password_hash)))) {
      return json({ error: "Current password is incorrect." }, 400);
    }
    await db.run("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(body.newPassword), user.id]);
  }
  return json({ admin: publicUser(user) });
}
