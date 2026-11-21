import { randomBytes } from "node:crypto";
import { sha256Hex } from "@daraz-mcp/client";
import { getDb } from "./db";

const COOKIE = "daraz_session";
const MAX_AGE = 14 * 24 * 60 * 60;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  createdAt: number;
}

export function sessionCookie(token: string): string {
  const publicUrl = process.env.PUBLIC_APP_URL || "";
  const secure =
    process.env.COOKIE_SECURE === "true" ||
    (process.env.COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production" &&
      (publicUrl.startsWith("https://") || publicUrl === ""))
      ? "; Secure"
      : "";
  return `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}

export function clearCookie(): string {
  return `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const db = await getDb();
  await db.run(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    [randomBytes(16).toString("hex"), userId, sha256Hex(token), Date.now() + MAX_AGE * 1000],
  );
  return token;
}

export async function userFromRequest(request: Request): Promise<SessionUser | undefined> {
  const header = request.headers.get("cookie") || "";
  const match = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  if (!match) return undefined;
  const token = decodeURIComponent(match.slice(COOKIE.length + 1));
  const db = await getDb();
  const row = await db.get(
    `SELECT users.id, users.email, users.name, users.plan, users.created_at
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    [sha256Hex(token), Date.now()],
  );
  if (!row) return undefined;
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    plan: String(row.plan),
    createdAt: Number(row.created_at),
  };
}

export function json(data: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...Object.fromEntries(new Headers(extraHeaders)) },
  });
}

export function publicUser(user: SessionUser) {
  return {
    id: user.id,
    username: user.name,
    email: user.email,
    role: user.plan,
    lastLoginAt: new Date().toISOString(),
    createdAt: new Date(user.createdAt).toISOString(),
  };
}
