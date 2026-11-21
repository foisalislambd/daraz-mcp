import { describe, expect, it } from "vitest";
import { buildSignPlain, cleanParams, signRequest } from "../src/sign.js";

describe("signRequest", () => {
  it("matches the official sort-and-concatenate example", () => {
    const params = cleanParams({
      foo: "1",
      bar: "2",
      foo_bar: "3",
      foobar: "4",
      sign: "ignored",
      empty: "",
      missing: undefined,
    });
    const plain = buildSignPlain("/test/api", params);
    expect(plain).toBe("/test/apibar2foo1foo_bar3foobar4");
    expect(signRequest("test-secret", "/test/api", params)).toBe(
      "FE01B44E2D0F8A799FDC350C3EDDA02F3BFCE762E60DA58768964FF1CD949437",
    );
  });

  it("signs token create parameters without an access token", () => {
    const params = cleanParams({
      app_key: "123456",
      code: "0_TryzT8Vd9T1pwS7VWZ2qlMOS5",
      sign_method: "sha256",
      timestamp: "1758412800000",
    });
    expect(buildSignPlain("/auth/token/create", params)).toBe(
      "/auth/token/createapp_key123456code0_TryzT8Vd9T1pwS7VWZ2qlMOS5sign_methodsha256timestamp1758412800000",
    );
    expect(signRequest("secret", "/auth/token/create", params)).toBe(
      "013FC06959FBF63ACB5FA31A0C3F72EDCBA0DC8DCAB13A6FE8838CB1D3E229EC",
    );
  });
});
