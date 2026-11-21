import { describe, expect, it, vi } from "vitest";
import { DarazClient } from "../src/client.js";
import { DarazError } from "../src/errors.js";
import { decryptString, encryptString, randomKey } from "../src/crypto.js";
import { redact as redactLog } from "../src/logger.js";
import { buildPriceQuantityPayload, parsePriceQuantityCsv } from "../src/xml.js";
import { buildAuthorizeUrl } from "../src/oauth.js";
import { DarazApi } from "../src/api.js";

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("DarazClient", () => {
  it("signs and sends form posts, then maps a business error", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = String(init?.body);
      expect(body).toContain("sign_method=sha256");
      expect(body).toContain("sign=");
      expect(body).not.toContain("access_token");
      return jsonResponse({ code: "4105", message: "BIZ_CHECK_SELLER_SKU_DUPLICATE", request_id: "r1" });
    });
    const client = new DarazClient({
      region: "BD",
      appKey: "app",
      appSecret: "secret",
      fetchImpl: fetchImpl as typeof fetch,
      maxRetries: 0,
    });
    await expect(client.createToken("code-1")).rejects.toMatchObject({
      code: "4105",
      requestId: "r1",
      retryable: false,
    });
  });

  it("retries E901 and then returns data", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse({ code: "901", message: "E901: The request is too frequent", request_id: "slow" });
      }
      return jsonResponse({ code: "0", data: { name: "Shop" }, request_id: "ok" });
    });
    const client = new DarazClient({
      region: "BD",
      appKey: "app",
      appSecret: "secret",
      accessToken: "token",
      fetchImpl: fetchImpl as typeof fetch,
      maxRetries: 2,
    });
    const result = await client.request({ path: "/seller/get" });
    expect(result.data).toEqual({ name: "Shop" });
    expect(calls).toBe(2);
  });

  it("refreshes once after AccessTokenExpired", async () => {
    const paths: string[] = [];
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = String(url);
      paths.push(href + (init?.method === "POST" || init?.body ? " POST" : ""));
      if (href.includes("/auth/token/refresh")) {
        return jsonResponse({
          code: "0",
          access_token: "new-token",
          refresh_token: "new-refresh",
          expires_in: 3600,
        });
      }
      const body = String(init?.body ?? "");
      const query = href.includes("?") ? href : body;
      if (query.includes("access_token=old-token") || query.includes("access_token=old-token".replace)) {
        if (!query.includes("new-token")) {
          return jsonResponse({ code: "AccessTokenExpired", message: "AccessTokenExpired" });
        }
      }
      if (!query.includes("new-token")) {
        return jsonResponse({ code: "AccessTokenExpired", message: "AccessTokenExpired" });
      }
      return jsonResponse({ code: "0", data: { seller_id: "9" } });
    });
    const updated: string[] = [];
    const client = new DarazClient({
      region: "PK",
      appKey: "app",
      appSecret: "secret",
      accessToken: "old-token",
      refreshToken: "refresh",
      accessTokenExpiresAt: Date.now() + 60 * 60 * 1000,
      fetchImpl: fetchImpl as typeof fetch,
      onTokensUpdated: (tokens) => {
        updated.push(tokens.accessToken);
      },
    });
    const result = await client.request({ path: "/seller/get" });
    expect(result.data).toEqual({ seller_id: "9" });
    expect(updated).toEqual(["new-token"]);
    expect(paths.some((path) => path.includes("/auth/token/refresh"))).toBe(true);
  });

  it("does not call an unknown path", async () => {
    const api = new DarazApi(
      new DarazClient({
        region: "BD",
        appKey: "a",
        appSecret: "b",
        accessToken: "t",
        fetchImpl: vi.fn() as typeof fetch,
      }),
    );
    expect(() => api.call("/not/a/real/path")).toThrow(/undocumented/);
  });
});

describe("oauth and xml", () => {
  it("builds the Bangladesh venture authorize URL", () => {
    const url = new URL(
      buildAuthorizeUrl({
        region: "BD",
        appKey: "500000",
        redirectUri: "https://example.com/callback",
        state: "abc",
      }),
    );
    expect(url.origin).toBe("https://api.daraz.com.bd");
    expect(url.pathname).toBe("/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("500000");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("force_auth")).toBe("true");
    expect(url.searchParams.get("state")).toBe("abc");
  });

  it("builds price quantity xml and parses csv", () => {
    const xml = buildPriceQuantityPayload([
      { itemId: "1", skuId: "2", quantity: 3, price: "10.00" },
    ]);
    expect(xml).toContain("<ItemId>1</ItemId>");
    expect(xml).toContain("<SkuId>2</SkuId>");
    expect(xml).toContain("<Quantity>3</Quantity>");
    const rows = parsePriceQuantityCsv("item_id,sku_id,quantity,price\n9,8,4,12.5\n");
    expect(rows).toEqual([{ itemId: "9", skuId: "8", quantity: 4, price: "12.5" }]);
  });
});

describe("secrets", () => {
  it("round-trips AES-GCM and redacts logs", () => {
    const key = randomKey();
    const cipher = encryptString("access-token", key);
    expect(cipher).not.toContain("access-token");
    expect(decryptString(cipher, key)).toBe("access-token");
    expect(redactLog({ accessToken: "x", path: "/seller/get" })).toEqual({
      accessToken: "[redacted]",
      path: "/seller/get",
    });
  });
});

describe("errors", () => {
  it("marks auth failures", () => {
    const error = new DarazError({ code: "IllegalAccessToken", message: "nope" });
    expect(error.auth).toBe(true);
  });
});
