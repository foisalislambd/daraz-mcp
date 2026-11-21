import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { claudeDesktopConfig } from "../src/configs.js";
import { readConfig, upsertShop } from "../src/store.js";

describe("credential store", () => {
  it("encrypts shops at rest and keeps the file private", () => {
    const dir = mkdtempSync(join(tmpdir(), "daraz-mcp-"));
    upsertShop(
      {
        id: "s1",
        label: "Shop",
        region: "BD",
        appKey: "key",
        appSecret: "secret",
        accessToken: "token-value",
        refreshToken: "refresh-value",
      },
      dir,
    );
    const raw = readFileSync(join(dir, "credentials.enc"), "utf8");
    expect(raw).not.toContain("token-value");
    expect(raw).not.toContain("secret");
    const mode = statSync(join(dir, "credentials.enc")).mode & 0o777;
    expect(mode).toBe(0o600);
    expect(readConfig(dir).shops[0]?.accessToken).toBe("token-value");
  });

  it("prints a stdio config that runs daraz-mcp", () => {
    expect(claudeDesktopConfig()).toContain("daraz-mcp");
    expect(claudeDesktopConfig()).toContain("serve");
  });
});
