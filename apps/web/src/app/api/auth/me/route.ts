import { json, publicUser, userFromRequest } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return json({ admin: null }, 401);
  return json({ admin: publicUser(user) });
}
