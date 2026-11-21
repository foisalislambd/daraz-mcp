export {
  API_CATALOG,
  PRODUCT_FILTERS,
  findEndpoint,
  type ApiEndpoint,
  type HttpMethod,
  type ProductFilter,
  type Verification,
} from "./catalog.js";
export { DarazClient, type DarazClientOptions, type DarazEnvelope, type RequestOptions, type TokenSet } from "./client.js";
export { DarazApi, type OrderQuery } from "./api.js";
export { decryptString, encryptString, randomKey, safeEqual, sha256Hex } from "./crypto.js";
export { DarazError, type DarazErrorOptions } from "./errors.js";
export { createLogger, redact, silentLogger, type Logger } from "./logger.js";
export { buildAuthorizeUrl, type AuthorizeUrlInput } from "./oauth.js";
export {
  CENTRAL_AUTH_BASE,
  REGIONS,
  REGION_CODES,
  getRegion,
  isRegionCode,
  type RegionCode,
  type RegionDefinition,
} from "./regions.js";
export { buildSignPlain, cleanParams, signRequest } from "./sign.js";
export {
  buildPriceQuantityPayload,
  parsePriceQuantityCsv,
  type PriceQuantitySku,
} from "./xml.js";

import { DarazApi } from "./api.js";
import { DarazClient, type DarazClientOptions } from "./client.js";

export function createDaraz(options: DarazClientOptions): DarazApi {
  return new DarazApi(new DarazClient(options));
}
