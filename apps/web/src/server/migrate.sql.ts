export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  region TEXT NOT NULL,
  seller_id TEXT,
  app_key_enc TEXT,
  app_secret_enc TEXT,
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  expires_at INTEGER,
  status TEXT NOT NULL,
  uses_platform_app INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);
CREATE TABLE IF NOT EXISTS usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  api_key_id TEXT,
  shop_id TEXT,
  tool TEXT NOT NULL,
  ok INTEGER NOT NULL,
  error_code TEXT,
  duration_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  region TEXT NOT NULL,
  label TEXT NOT NULL,
  app_key_enc TEXT,
  app_secret_enc TEXT,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS snapshots (
  user_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  source TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS usage_logs_user_created ON usage_logs (user_id, created_at);
`;
