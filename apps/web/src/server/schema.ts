import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { integer as pgInteger, pgTable, text as pgText } from "drizzle-orm/pg-core";

/** SQLite schema. Postgres uses the same column names in schema.pg.ts tables. */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
});

export const shops = sqliteTable("shops", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  label: text("label").notNull(),
  region: text("region").notNull(),
  sellerId: text("seller_id"),
  appKeyEnc: text("app_key_enc"),
  appSecretEnc: text("app_secret_enc"),
  accessTokenEnc: text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc"),
  expiresAt: integer("expires_at"),
  status: text("status").notNull(),
  usesPlatformApp: integer("uses_platform_app").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  prefix: text("prefix").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  revokedAt: integer("revoked_at"),
  createdAt: integer("created_at").notNull(),
  lastUsedAt: integer("last_used_at"),
});

export const usageLogs = sqliteTable("usage_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  apiKeyId: text("api_key_id"),
  shopId: text("shop_id"),
  tool: text("tool").notNull(),
  ok: integer("ok").notNull(),
  errorCode: text("error_code"),
  durationMs: integer("duration_ms").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const oauthStates = sqliteTable("oauth_states", {
  state: text("state").primaryKey(),
  userId: text("user_id").notNull(),
  region: text("region").notNull(),
  label: text("label").notNull(),
  appKeyEnc: text("app_key_enc"),
  appSecretEnc: text("app_secret_enc"),
  expiresAt: integer("expires_at").notNull(),
});

export const snapshots = sqliteTable("snapshots", {
  userId: text("user_id").primaryKey(),
  payload: text("payload").notNull(),
  source: text("source").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const pgUsers = pgTable("users", {
  id: pgText("id").primaryKey(),
  email: pgText("email").notNull().unique(),
  name: pgText("name").notNull(),
  passwordHash: pgText("password_hash").notNull(),
  createdAt: pgInteger("created_at").notNull(),
});

export const schema = {
  users,
  sessions,
  shops,
  apiKeys,
  usageLogs,
  oauthStates,
  snapshots,
};
