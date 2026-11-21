import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/server/passwords";

describe("passwords", () => {
  it("hashes passwords", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
