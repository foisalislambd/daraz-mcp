export const REGION_CODES = ["BD", "PK", "LK", "NP", "MM"] as const;

export type RegionCode = (typeof REGION_CODES)[number];

export interface RegionDefinition {
  code: RegionCode;
  name: string;
  currency: string;
  /** IANA zone used to format order windows. */
  timeZone: string;
  /** Fixed offset written into Daraz datetime strings. */
  offset: string;
  /** Official REST gateway from the CreateProduct service-endpoint table. */
  restBase: string;
  /**
   * Venture OAuth host. Authorize URLs are `https://api.../oauth/authorize`.
   * Bangladesh, Pakistan, Sri Lanka, and Nepal match the Daraz seller-authorization
   * document. Myanmar uses api.shop.com.mm, which is both the documented REST host
   * and the authorize host in that document.
   */
  authorizeBase: string;
}

export const REGIONS: Record<RegionCode, RegionDefinition> = {
  BD: {
    code: "BD",
    name: "Bangladesh",
    currency: "BDT",
    timeZone: "Asia/Dhaka",
    offset: "+06:00",
    restBase: "https://api.daraz.com.bd/rest",
    authorizeBase: "https://api.daraz.com.bd",
  },
  PK: {
    code: "PK",
    name: "Pakistan",
    currency: "PKR",
    timeZone: "Asia/Karachi",
    offset: "+05:00",
    restBase: "https://api.daraz.pk/rest",
    authorizeBase: "https://api.daraz.pk",
  },
  LK: {
    code: "LK",
    name: "Sri Lanka",
    currency: "LKR",
    timeZone: "Asia/Colombo",
    offset: "+05:30",
    restBase: "https://api.daraz.lk/rest",
    authorizeBase: "https://api.daraz.lk",
  },
  NP: {
    code: "NP",
    name: "Nepal",
    currency: "NPR",
    timeZone: "Asia/Kathmandu",
    offset: "+05:45",
    restBase: "https://api.daraz.com.np/rest",
    authorizeBase: "https://api.daraz.com.np",
  },
  MM: {
    code: "MM",
    name: "Myanmar",
    currency: "MMK",
    timeZone: "Asia/Yangon",
    offset: "+06:30",
    restBase: "https://api.shop.com.mm/rest",
    authorizeBase: "https://api.shop.com.mm",
  },
};

/**
 * Some integrations use a central auth host instead of the venture host.
 * The official seller-authorization samples use the venture host. This central
 * host is optional and unverified against a live Daraz login.
 */
export const CENTRAL_AUTH_BASE = "https://auth.daraz.com";

export function isRegionCode(value: string): value is RegionCode {
  return (REGION_CODES as readonly string[]).includes(value.toUpperCase());
}

export function getRegion(code: string): RegionDefinition {
  const normalized = code.trim().toUpperCase();
  if (!isRegionCode(normalized)) {
    throw new Error(`Unknown Daraz region "${code}". Expected one of ${REGION_CODES.join(", ")}.`);
  }
  return REGIONS[normalized];
}
