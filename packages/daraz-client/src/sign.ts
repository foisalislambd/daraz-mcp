import { createHmac } from "node:crypto";

export type SignParams = Record<string, string>;

/**
 * Daraz/Lazada signature.
 *
 * 1. Drop null, undefined, and empty-string values (they must also be omitted from the request).
 * 2. Sort the remaining names by ASCII, excluding `sign`.
 * 3. Concatenate name and value with no separator.
 * 4. Prefix the API path, for example `/orders/get`.
 * 5. HMAC-SHA256 with the app secret, hex-encoded, uppercase.
 *
 * Byte-array parameters such as an uploaded file are not included. The official
 * signature article also shows a request body appended once after the parameters
 * for body-signed calls. Daraz seller calls we could read send form or query
 * parameters and do not append a body, so `body` is optional.
 */
export function buildSignPlain(apiPath: string, params: SignParams, body?: string): string {
  const keys = Object.keys(params)
    .filter((key) => key !== "sign" && params[key] !== "")
    .sort();
  let plain = apiPath;
  for (const key of keys) {
    plain += key + params[key];
  }
  if (body) plain += body;
  return plain;
}

export function signRequest(
  appSecret: string,
  apiPath: string,
  params: SignParams,
  body?: string,
): string {
  const plain = buildSignPlain(apiPath, params, body);
  return createHmac("sha256", appSecret).update(plain, "utf8").digest("hex").toUpperCase();
}

export function cleanParams(
  input: Record<string, string | number | boolean | null | undefined>,
): SignParams {
  const out: SignParams = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = String(value);
  }
  return out;
}
