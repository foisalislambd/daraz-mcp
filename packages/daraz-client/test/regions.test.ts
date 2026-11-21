import { describe, expect, it, vi } from "vitest";
import { DarazClient } from "../src/client.js";
import { buildAuthorizeUrl } from "../src/oauth.js";
import { getRegion, REGION_CODES, REGIONS, type RegionCode } from "../src/regions.js";

const EXPECTED: Record<
  RegionCode,
  { name: string; currency: string; timeZone: string; offset: string; restBase: string; authorize: string }
> = {
  BD: {
    name: "Bangladesh",
    currency: "BDT",
    timeZone: "Asia/Dhaka",
    offset: "+06:00",
    restBase: "https://api.daraz.com.bd/rest",
    authorize: "https://api.daraz.com.bd",
  },
  PK: {
    name: "Pakistan",
    currency: "PKR",
    timeZone: "Asia/Karachi",
    offset: "+05:00",
    restBase: "https://api.daraz.pk/rest",
    authorize: "https://api.daraz.pk",
  },
  LK: {
    name: "Sri Lanka",
    currency: "LKR",
    timeZone: "Asia/Colombo",
    offset: "+05:30",
    restBase: "https://api.daraz.lk/rest",
    authorize: "https://api.daraz.lk",
  },
  NP: {
    name: "Nepal",
    currency: "NPR",
    timeZone: "Asia/Kathmandu",
    offset: "+05:45",
    restBase: "https://api.daraz.com.np/rest",
    authorize: "https://api.daraz.com.np",
  },
  MM: {
    name: "Myanmar",
    currency: "MMK",
    timeZone: "Asia/Yangon",
    offset: "+06:30",
    restBase: "https://api.shop.com.mm/rest",
    authorize: "https://api.shop.com.mm",
  },
};

describe("Daraz regions", () => {
  it("covers every country code and no extras", () => {
    expect([...REGION_CODES]).toEqual(["BD", "PK", "LK", "NP", "MM"]);
    expect(Object.keys(REGIONS).sort()).toEqual([...REGION_CODES].sort());
  });

  it.each(REGION_CODES)("selects the %s REST host, authorize URL, currency, and timezone", async (code) => {
    const expected = EXPECTED[code];
    const region = getRegion(code.toLowerCase());
    expect(region).toMatchObject({
      code,
      name: expected.name,
      currency: expected.currency,
      timeZone: expected.timeZone,
      offset: expected.offset,
      restBase: expected.restBase,
      authorizeBase: expected.authorize,
    });

    const authorize = new URL(
      buildAuthorizeUrl({
        region: code,
        appKey: "500000",
        redirectUri: "http://127.0.0.1:8787/callback",
        state: "state-1",
      }),
    );
    expect(authorize.origin).toBe(expected.authorize);
    expect(authorize.pathname).toBe("/oauth/authorize");
    expect(authorize.searchParams.get("client_id")).toBe("500000");
    expect(authorize.searchParams.get("response_type")).toBe("code");
    expect(authorize.searchParams.get("force_auth")).toBe("true");

    const central = new URL(
      buildAuthorizeUrl({
        region: code,
        appKey: "500000",
        redirectUri: "http://127.0.0.1:8787/callback",
        host: "central",
      }),
    );
    expect(central.origin).toBe("https://auth.daraz.com");

    const fetchImpl = vi.fn(async (input: string | URL) => {
      const href = String(input);
      expect(href.startsWith(`${expected.restBase}/seller/get?`)).toBe(true);
      expect(href).toContain("sign_method=sha256");
      expect(href).toContain("sign=");
      expect(href).not.toContain("sign=undefined");
      return new Response(JSON.stringify({ code: "0", data: { ok: true }, request_id: "r" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const client = new DarazClient({
      region: code,
      appKey: "app",
      appSecret: "secret",
      accessToken: "token",
      fetchImpl: fetchImpl as typeof fetch,
      maxRetries: 0,
      now: () => 1_758_412_800_000,
    });
    const result = await client.request({ path: "/seller/get" });
    expect(result.data).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("rejects an unknown region", () => {
    expect(() => getRegion("SG")).toThrow(/BD, PK, LK, NP, MM/);
  });
});
