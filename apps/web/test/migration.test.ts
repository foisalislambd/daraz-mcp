import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterAll, describe, expect, it } from "vitest";

describe("users.plan drop", () => {
  const dir = mkdtempSync(join(tmpdir(), "daraz-migrate-"));
  const file = join(dir, "old.sqlite");

  afterAll(() => {
    delete process.env.SQLITE_PATH;
  });

  it("drops the leftover plan column and keeps the user row", async () => {
    const sqlite = new Database(file);
    sqlite.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free',
        created_at INTEGER NOT NULL
      );
    `);
    sqlite
      .prepare(
        "INSERT INTO users (id, email, name, password_hash, plan, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run("user_old", "seller@example.com", "Old Seller", "hash", "pro", 1);
    sqlite.close();

    process.env.SQLITE_PATH = file;
    process.env.SEED_DEMO = "false";
    process.env.DATABASE_URL = "";
    const { getDb } = await import("../src/server/db.ts");
    const db = await getDb();
    const columns = await db.all("PRAGMA table_info(users)");
    expect(columns.map((column) => column.name)).not.toContain("plan");
    const row = await db.get("SELECT email, name FROM users WHERE id = ?", ["user_old"]);
    expect(row).toMatchObject({ email: "seller@example.com", name: "Old Seller" });
  });
});
