import { CENTRAL_AUTH_BASE, getRegion, type RegionCode } from "./regions.js";

export interface AuthorizeUrlInput {
  region: RegionCode | string;
  appKey: string;
  redirectUri: string;
  state?: string;
  /**
   * `venture` matches the official Daraz seller-authorization samples.
   * `central` is the unverified `https://auth.daraz.com` fallback.
   */
  host?: "venture" | "central";
  forceAuth?: boolean;
}

export function buildAuthorizeUrl(input: AuthorizeUrlInput): string {
  const region = getRegion(input.region);
  const base = input.host === "central" ? CENTRAL_AUTH_BASE : region.authorizeBase;
  const url = new URL("/oauth/authorize", base.endsWith("/") ? base : `${base}/`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("force_auth", input.forceAuth === false ? "false" : "true");
  url.searchParams.set("client_id", input.appKey);
  url.searchParams.set("redirect_uri", input.redirectUri);
  if (input.state) url.searchParams.set("state", input.state);
  return url.toString();
}
