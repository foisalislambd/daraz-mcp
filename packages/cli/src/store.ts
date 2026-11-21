import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  decryptString,
  encryptString,
  isRegionCode,
  randomKey,
  type RegionCode,
  type TokenSet,
} from "@daraz-mcp/client";

export interface StoredShop {
  id: string;
  label: string;
  region: RegionCode;
  appKey: string;
  appSecret: string;
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: number;
}

export interface StoredConfig {
  shops: StoredShop[];
}

export function configDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.DARAZ_MCP_HOME || join(homedir(), ".config", "daraz-mcp");
}

function keyPath(dir: string) {
  return join(dir, "master.key");
}

function dataPath(dir: string) {
  return join(dir, "credentials.enc");
}

export function loadOrCreateKey(dir: string): Buffer {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = keyPath(dir);
  if (!existsSync(file)) {
    const key = randomKey();
    writeFileSync(file, key, { mode: 0o600 });
    chmodSync(file, 0o600);
    return key;
  }
  const key = readFileSync(file);
  if (key.length !== 32) throw new Error("master.key must be 32 bytes.");
  return key;
}

export function readConfig(dir = configDir()): StoredConfig {
  const file = dataPath(dir);
  if (!existsSync(file)) return { shops: [] };
  const plain = decryptString(readFileSync(file, "utf8"), loadOrCreateKey(dir));
  const parsed = JSON.parse(plain) as StoredConfig;
  if (!parsed || !Array.isArray(parsed.shops)) return { shops: [] };
  return parsed;
}

export function writeConfig(config: StoredConfig, dir = configDir()): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const payload = encryptString(JSON.stringify(config), loadOrCreateKey(dir));
  const file = dataPath(dir);
  writeFileSync(file, payload, { mode: 0o600 });
  chmodSync(file, 0o600);
}

export function upsertShop(shop: StoredShop, dir = configDir()): void {
  const config = readConfig(dir);
  const index = config.shops.findIndex((item) => item.id === shop.id);
  if (index >= 0) config.shops[index] = shop;
  else config.shops.push(shop);
  writeConfig(config, dir);
}

export function updateShopTokens(shopId: string, tokens: TokenSet, dir = configDir()): void {
  const config = readConfig(dir);
  const shop = config.shops.find((item) => item.id === shopId);
  if (!shop) return;
  shop.accessToken = tokens.accessToken;
  if (tokens.refreshToken) shop.refreshToken = tokens.refreshToken;
  if (tokens.accessTokenExpiresAt) shop.accessTokenExpiresAt = tokens.accessTokenExpiresAt;
  writeConfig(config, dir);
}

export function shopsFromEnv(env: NodeJS.ProcessEnv = process.env): StoredShop[] {
  const region = (env.DARAZ_REGION || "BD").toUpperCase();
  if (!env.DARAZ_APP_KEY || !env.DARAZ_APP_SECRET || !env.DARAZ_ACCESS_TOKEN) return [];
  if (!isRegionCode(region)) throw new Error(`DARAZ_REGION must be a Daraz region, got ${region}.`);
  return [
    {
      id: env.DARAZ_SHOP_ID || `${region.toLowerCase()}-env`,
      label: env.DARAZ_SHOP_LABEL || "Environment shop",
      region,
      appKey: env.DARAZ_APP_KEY,
      appSecret: env.DARAZ_APP_SECRET,
      accessToken: env.DARAZ_ACCESS_TOKEN,
      ...(env.DARAZ_REFRESH_TOKEN ? { refreshToken: env.DARAZ_REFRESH_TOKEN } : {}),
    },
  ];
}

export function loadShops(dir = configDir(), env: NodeJS.ProcessEnv = process.env): StoredShop[] {
  const fromEnv = shopsFromEnv(env);
  if (fromEnv.length > 0) return fromEnv;
  return readConfig(dir).shops;
}
