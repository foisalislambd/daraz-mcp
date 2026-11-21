import {
  DarazApi,
  DarazClient,
  getRegion,
  silentLogger,
  type Logger,
  type RegionCode,
  type TokenSet,
} from "@daraz-mcp/client";

export interface ShopConnection {
  id: string;
  label?: string;
  region: RegionCode | string;
  appKey: string;
  appSecret: string;
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: number;
}

export interface ShopContext {
  shops: ShopConnection[];
  logger?: Logger;
  fetchImpl?: typeof fetch;
  onTokensUpdated?: (shopId: string, tokens: TokenSet) => void | Promise<void>;
  onUsage?: (event: UsageEvent) => void | Promise<void>;
}

export interface UsageEvent {
  shopId?: string;
  tool: string;
  ok: boolean;
  durationMs: number;
  errorCode?: string;
}

export function resolveShop(shops: ShopConnection[], shopId?: string): ShopConnection {
  if (shops.length === 0) {
    throw new Error("No Daraz shop is connected. Run daraz-mcp setup or connect a shop in the admin panel.");
  }
  if (!shopId) {
    if (shops.length === 1) return shops[0];
    const labels = shops.map((shop) => shop.label || shop.id).join(", ");
    throw new Error(`Several shops are connected (${labels}). Pass the shop id.`);
  }
  const found = shops.find((shop) => shop.id === shopId || shop.label === shopId);
  if (!found) throw new Error(`Unknown shop "${shopId}".`);
  return found;
}

export function apiFor(ctx: ShopContext, shop: ShopConnection): DarazApi {
  const client = new DarazClient({
    region: shop.region,
    appKey: shop.appKey,
    appSecret: shop.appSecret,
    accessToken: shop.accessToken,
    refreshToken: shop.refreshToken,
    accessTokenExpiresAt: shop.accessTokenExpiresAt,
    logger: (ctx.logger ?? silentLogger).child({ shopId: shop.id }),
    fetchImpl: ctx.fetchImpl,
    onTokensUpdated: (tokens) => ctx.onTokensUpdated?.(shop.id, tokens),
  });
  return new DarazApi(client);
}

export function shopSummary(shop: ShopConnection) {
  const region = getRegion(shop.region);
  return {
    id: shop.id,
    label: shop.label ?? shop.id,
    region: region.code,
    country: region.name,
    currency: region.currency,
  };
}
