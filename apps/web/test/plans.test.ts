import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/server/passwords";
import { getPlan, PLANS } from "../src/server/plans";

describe("plans", () => {
  it("falls back to free for unknown ids", () => {
    expect(getPlan("nope").id).toBe("free");
    expect(PLANS.pro.monthlyCalls).toBe(50_000);
  });

  it("hashes passwords", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
