import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createLogger, decryptString, encryptString, randomKey, sha256Hex } from "@daraz-mcp/client";
import Database from "better-sqlite3";
import { count, eq, sql } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import { MIGRATION_SQL } from "./migrate.sql.ts";
import { hashPassword } from "./passwords.ts";
import { getPlan } from "./plans.ts";
import { schema, shops } from "./schema.ts";

const log = createLogger({ component: "web" });

export type Row = Record<string, unknown>;

interface SqlClient {
  all(query: string, params?: unknown[]): Promise<Row[]>;
  get(query: string, params?: unknown[]): Promise<Row | undefined>;
  run(query: string, params?: unknown[]): Promise<void>;
  dialect: "sqlite" | "postgres";
}

let client: SqlClient | undefined;
let sqliteOrm: BetterSQLite3Database<typeof schema> | undefined;
let encryptionKey: Buffer | undefined;

function databaseFile(): string {
  const configured = process.env.SQLITE_PATH || join(process.cwd(), "data", "daraz.sqlite");
  mkdirSync(dirname(configured), { recursive: true });
  return configured;
}

function loadKey(): Buffer {
  if (encryptionKey) return encryptionKey;
  const fromEnv = process.env.TOKEN_ENCRYPTION_KEY;
  if (fromEnv) {
    const key = Buffer.from(fromEnv, "base64");
    if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes of base64.");
    encryptionKey = key;
    return key;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("TOKEN_ENCRYPTION_KEY is required in production.");
  }
  const file = join(dirname(databaseFile()), "dev-encryption.key");
  mkdirSync(dirname(file), { recursive: true });
  if (!existsSync(file)) writeFileSync(file, randomKey());
  encryptionKey = readFileSync(file);
  if (encryptionKey.length !== 32) throw new Error("dev-encryption.key must be 32 bytes.");
  return encryptionKey;
}

export function seal(value: string | undefined): string | null {
  if (!value) return null;
  return encryptString(value, loadKey());
}

export function open(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return decryptString(value, loadKey());
}

async function applySql(exec: (statement: string) => Promise<void> | void) {
  const statements = MIGRATION_SQL.split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  for (const statement of statements) await exec(statement);
}

export async function getDb(): Promise<SqlClient> {
  if (client) return client;
  const url = process.env.DATABASE_URL || "";
  if (url.startsWith("postgres")) {
    const pool = new pg.Pool({ connectionString: url });
    const orm = drizzlePg(pool);
    await applySql(async (statement) => {
      await orm.execute(sql.raw(statement));
    });
    client = {
      dialect: "postgres",
      async all(query, params = []) {
        const result = await pool.query(toPg(query), params);
        return result.rows as Row[];
      },
      async get(query, params = []) {
        const rows = await this.all(query, params);
        return rows[0];
      },
      async run(query, params = []) {
        await pool.query(toPg(query), params);
      },
    };
    log.info({ dialect: "postgres" }, "database ready");
  } else {
    const sqlite = new Database(databaseFile());
    sqlite.pragma("journal_mode = WAL");
    sqliteOrm = drizzle(sqlite, { schema });
    await applySql((statement) => {
      sqlite.exec(statement);
    });
    client = {
      dialect: "sqlite",
      async all(query, params = []) {
        return sqlite.prepare(query).all(...params) as Row[];
      },
      async get(query, params = []) {
        return sqlite.prepare(query).get(...params) as Row | undefined;
      },
      async run(query, params = []) {
        sqlite.prepare(query).run(...params);
      },
    };
    log.info({ dialect: "sqlite" }, "database ready");
  }
  await seedIfRequested();
  return client;
}

function toPg(query: string): string {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

/** Drizzle query used by the plan meter. SQLite only; Postgres uses the SQL client. */
export async function countShopsForUser(userId: string): Promise<number> {
  if (sqliteOrm) {
    const row = sqliteOrm.select({ value: count() }).from(shops).where(eq(shops.userId, userId)).get();
    return Number(row?.value ?? 0);
  }
  const db = await getDb();
  const row = await db.get("SELECT COUNT(*) AS value FROM shops WHERE user_id = ?", [userId]);
  return Number(row?.value ?? 0);
}

export async function seedIfRequested() {
  if (process.env.SEED_DEMO !== "true") return;
  const db = client;
  if (!db) return;
  const email = process.env.DEMO_EMAIL || "demo@daraz-mcp.local";
  const existing = await db.get("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) return;
  const now = Date.now();
  const userId = "user_demo";
  const password = await hashPassword(process.env.DEMO_PASSWORD || "demo-password");
  await db.run(
    "INSERT INTO users (id, email, name, password_hash, plan, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, email, "Demo Seller", password, "pro", now],
  );
  await db.run(
    `INSERT INTO shops (id, user_id, label, region, seller_id, access_token_enc, refresh_token_enc, status, uses_platform_app, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "shop_demo",
      userId,
      "Dhaka Fashion House",
      "BD",
      "BD10001",
      seal("demo-access-token"),
      seal("demo-refresh-token"),
      "connected",
      0,
      now,
    ],
  );
  const key = "dk_live_demo_screenshot_key";
  await db.run(
    "INSERT INTO api_keys (id, user_id, name, prefix, key_hash, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ["key_demo", userId, "Claude Desktop", key.slice(0, 12), sha256Hex(key), now - 86_400_000, now],
  );
  const tools = ["get_orders", "daily_sales_summary", "get_products", "low_stock_report", "get_seller"];
  for (let i = 0; i < 18; i++) {
    await db.run(
      "INSERT INTO usage_logs (id, user_id, api_key_id, shop_id, tool, ok, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        `log_${i}`,
        userId,
        "key_demo",
        "shop_demo",
        tools[i % tools.length],
        i === 7 ? 0 : 1,
        80 + i * 13,
        now - i * 3_600_000,
      ],
    );
  }
  const chart = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now - (13 - index) * 86_400_000);
    const label = date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    return { label, revenue: 42000 + ((index * 3700) % 28000), orders: 18 + (index % 9) };
  });
  const payload = {
    currency: "BDT",
    stats: {
      salesToday: 84250,
      ordersToday: 36,
      pendingOrders: 8,
      lowStock: 5,
      apiCallsMonth: 428,
    },
    chart,
    orders: [
      { id: "204811", customer: "Rahim U.", amount: 2450, status: "pending", createdAt: new Date(now - 3600_000).toISOString() },
      { id: "204790", customer: "Nusrat K.", amount: 1890, status: "processing", createdAt: new Date(now - 7200_000).toISOString() },
      { id: "204766", customer: "Karim A.", amount: 640, status: "completed", createdAt: new Date(now - 18_000_000).toISOString() },
      { id: "204741", customer: "Mitu S.", amount: 3120, status: "pending", createdAt: new Date(now - 26_000_000).toISOString() },
    ],
    lowStock: [
      { sellerSku: "PANJABI-NAVY-M", available: 2, itemId: "10001" },
      { sellerSku: "SHAREE-RED-SILK", available: 0, itemId: "10002" },
      { sellerSku: "KURTI-MINT-L", available: 4, itemId: "10003" },
    ],
  };
  await db.run(
    "INSERT INTO snapshots (user_id, payload, source, updated_at) VALUES (?, ?, ?, ?)",
    [userId, JSON.stringify(payload), "sample", now],
  );
  log.info({ email }, "seeded demo seller");
}

export async function monthUsage(userId: string): Promise<number> {
  const db = await getDb();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const row = await db.get(
    "SELECT COUNT(*) AS value FROM usage_logs WHERE user_id = ? AND created_at >= ?",
    [userId, start.getTime()],
  );
  return Number(row?.value ?? 0);
}

export async function assertWithinPlan(userId: string, kind: "shops" | "keys" | "calls") {
  const db = await getDb();
  const user = await db.get("SELECT plan FROM users WHERE id = ?", [userId]);
  const plan = getPlan(String(user?.plan ?? "free"));
  if (kind === "shops") {
    const countShops = await countShopsForUser(userId);
    if (countShops >= plan.shops) {
      throw new Error(`${plan.label} plan allows ${plan.shops} shops.`);
    }
  }
  if (kind === "keys") {
    const row = await db.get(
      "SELECT COUNT(*) AS value FROM api_keys WHERE user_id = ? AND revoked_at IS NULL",
      [userId],
    );
    if (Number(row?.value ?? 0) >= plan.keys) throw new Error(`${plan.label} plan allows ${plan.keys} API keys.`);
  }
  if (kind === "calls") {
    const used = await monthUsage(userId);
    if (used >= plan.monthlyCalls) throw new Error(`${plan.label} monthly call limit reached.`);
  }
}
