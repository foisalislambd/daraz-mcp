import { API_CATALOG, PRODUCT_FILTERS, findEndpoint, type ProductFilter } from "./catalog.js";
import { DarazClient, type DarazEnvelope, type RequestOptions } from "./client.js";
import { getRegion } from "./regions.js";
import { buildPriceQuantityPayload, parsePriceQuantityCsv, type PriceQuantitySku } from "./xml.js";

export interface OrderQuery {
  createdAfter?: string;
  createdBefore?: string;
  updateAfter?: string;
  updateBefore?: string;
  status?: string;
  sortBy?: "created_at" | "updated_at";
  sortDirection?: "ASC" | "DESC";
  offset?: number;
  limit?: number;
}

function clamp(value: number | undefined, max: number, fallback: number): number {
  const n = value ?? fallback;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(max, Math.floor(n));
}

function orderParams(
  query: OrderQuery,
  limitMax: number,
): Record<string, string | number | undefined> {
  if (!query.createdAfter && !query.updateAfter) {
    throw new Error("orders/get requires createdAfter or updateAfter.");
  }
  return {
    created_after: query.createdAfter,
    created_before: query.createdBefore,
    update_after: query.updateAfter,
    update_before: query.updateBefore,
    status: query.status,
    sort_by: query.sortBy,
    sort_direction: query.sortDirection,
    offset: query.offset ?? 0,
    limit: clamp(query.limit, limitMax, 50),
  };
}

export class DarazApi {
  constructor(readonly client: DarazClient) {}

  call<T = unknown>(path: string, params?: RequestOptions["params"], method?: "GET" | "POST") {
    const spec = findEndpoint(path);
    if (!spec) {
      throw new Error(
        `Refusing undocumented path "${path}". Add it to the catalog only after it is verified.`,
      );
    }
    return this.client.request<T>({
      path,
      method: method ?? spec.method,
      params,
    });
  }

  getSeller() {
    return this.client.request({ path: "/seller/get" });
  }

  getShop() {
    return this.client.request({ path: "/shop/get" });
  }

  getOrders(query: OrderQuery) {
    return this.client.request({ path: "/orders/get", params: orderParams(query, 100) });
  }

  getOrder(orderId: string) {
    return this.client.request({ path: "/order/get", params: { order_id: orderId } });
  }

  getOrderItems(orderId: string) {
    return this.client.request({ path: "/order/items/get", params: { order_id: orderId } });
  }

  getOrdersItems(orderIds: string[]) {
    if (orderIds.length === 0) throw new Error("orderIds is empty.");
    if (orderIds.length > 100) throw new Error("Batch at most 100 order ids per call.");
    return this.client.request({
      path: "/orders/items/get",
      params: { order_ids: JSON.stringify(orderIds) },
    });
  }

  getProducts(query: {
    filter: ProductFilter;
    limit?: number;
    offset?: number;
    createAfter?: string;
    createBefore?: string;
    updateAfter?: string;
    updateBefore?: string;
    skuSellerList?: string[];
    options?: 0 | 1;
  }) {
    if (!PRODUCT_FILTERS.includes(query.filter)) {
      throw new Error(`filter must be one of ${PRODUCT_FILTERS.join(", ")}.`);
    }
    return this.client.request({
      path: "/products/get",
      params: {
        filter: query.filter,
        limit: clamp(query.limit, 50, 20),
        offset: query.offset ?? 0,
        create_after: query.createAfter,
        create_before: query.createBefore,
        update_after: query.updateAfter,
        update_before: query.updateBefore,
        sku_seller_list: query.skuSellerList ? JSON.stringify(query.skuSellerList) : undefined,
        options: query.options,
      },
    });
  }

  getProductItem(query: { itemId?: string; sellerSku?: string }) {
    if (!query.itemId && !query.sellerSku) throw new Error("itemId or sellerSku is required.");
    return this.client.request({
      path: "/product/item/get",
      params: { item_id: query.itemId, seller_sku: query.sellerSku },
    });
  }

  getCategoryTree() {
    return this.client.request({ path: "/category/tree/get" });
  }

  getCategoryAttributes(categoryId: string) {
    return this.client.request({
      path: "/category/attributes/get",
      params: { primary_category_id: categoryId },
    });
  }

  queryBrands(query: { offset?: number; limit?: number; name?: string } = {}) {
    return this.client.request({
      path: "/category/brands/query",
      params: {
        offset: query.offset ?? 0,
        limit: clamp(query.limit, 100, 20),
        name: query.name,
      },
    });
  }

  getQcStatus(query: { offset?: number; limit?: number; sellerSkus?: string[] }) {
    return this.client.request({
      path: "/product/qc/status/get",
      params: {
        offset: query.offset ?? 0,
        limit: clamp(query.limit, 50, 20),
        seller_skus: query.sellerSkus ? JSON.stringify(query.sellerSkus) : undefined,
      },
    });
  }

  updatePriceQuantity(skus: PriceQuantitySku[]) {
    return this.client.request({
      method: "POST",
      path: "/product/price_quantity/update",
      params: { payload: buildPriceQuantityPayload(skus) },
    });
  }

  updatePriceQuantityCsv(csv: string) {
    const rows = parsePriceQuantityCsv(csv);
    const chunks: PriceQuantitySku[][] = [];
    for (let i = 0; i < rows.length; i += 50) chunks.push(rows.slice(i, i + 50));
    return this.runChunks(chunks);
  }

  private async runChunks(chunks: PriceQuantitySku[][]) {
    const results = [];
    for (const chunk of chunks) results.push(await this.updatePriceQuantity(chunk));
    return results;
  }

  createProduct(payloadXml: string) {
    return this.client.request({ method: "POST", path: "/product/create", params: { payload: payloadXml } });
  }

  updateProduct(payloadXml: string) {
    return this.client.request({ method: "POST", path: "/product/update", params: { payload: payloadXml } });
  }

  deactivateProduct(params: Record<string, string>) {
    return this.client.request({ method: "POST", path: "/product/deactivate", params });
  }

  removeProduct(sellerSkus: string[]) {
    if (sellerSkus.length === 0 || sellerSkus.length > 50) {
      throw new Error("seller SKU list must contain 1 to 50 entries.");
    }
    return this.client.request({
      method: "POST",
      path: "/product/remove",
      params: { seller_sku_list: JSON.stringify(sellerSkus) },
    });
  }

  uploadImage(file: { filename: string; contentType: string; bytes: Uint8Array }) {
    return this.client.request({
      method: "POST",
      path: "/image/upload",
      file: { field: "image", ...file },
    });
  }

  migrateImage(url: string) {
    return this.client.request({ method: "POST", path: "/image/migrate", params: { payload: url } });
  }

  migrateImages(urls: string[]) {
    return this.client.request({
      method: "POST",
      path: "/images/migrate",
      params: { payload: JSON.stringify(urls) },
    });
  }

  setImages(payloadXml: string) {
    return this.client.request({ method: "POST", path: "/images/set", params: { payload: payloadXml } });
  }

  getImageResponse(batchId: string) {
    return this.client.request({ path: "/image/response/get", params: { batch_id: batchId } });
  }

  getShipmentProviders() {
    return this.client.request({ path: "/shipment/providers/get" });
  }

  getTransactions(query: { startTime: string; endTime: string; tradeOrderId?: string; offset?: number; limit?: number }) {
    return this.client.request({
      path: "/finance/transaction/detail/get",
      params: {
        start_time: query.startTime,
        end_time: query.endTime,
        trade_order_id: query.tradeOrderId,
        offset: query.offset ?? 0,
        limit: clamp(query.limit, 100, 50),
      },
    });
  }

  getPayoutStatus(createdAfter: string) {
    return this.client.request({
      path: "/finance/payout/status/get",
      params: { created_after: createdAfter },
    });
  }

  listReverseOrders(query: Record<string, string | number | undefined>) {
    return this.client.request({ path: "/reverse/order/list", params: query });
  }

  getFailureReasons() {
    return this.client.request({ path: "/order/failure_reason/get" });
  }

  getOrderDocument(query: { docType: string; orderItemIds: string[] }) {
    return this.client.request({
      path: "/order/document/get",
      params: {
        doc_type: query.docType,
        order_item_ids: JSON.stringify(query.orderItemIds),
      },
    });
  }

  packOrder(params: Record<string, string>) {
    return this.client.request({ method: "POST", path: "/order/pack", params });
  }

  readyToShip(params: Record<string, string>) {
    return this.client.request({ method: "POST", path: "/order/rts", params });
  }

  cancelOrder(params: Record<string, string>) {
    return this.client.request({ method: "POST", path: "/order/cancel", params });
  }

  setInvoiceNumber(params: Record<string, string>) {
    return this.client.request({ method: "POST", path: "/order/invoice_number/set", params });
  }

  listVouchers(params: Record<string, string | number | undefined> = {}) {
    return this.client.request({ path: "/promotion/vouchers/get", params });
  }

  voucherWrite(action: "create" | "update" | "activate" | "deactivate", params: Record<string, string>) {
    const path = `/promotion/voucher/${action}`;
    return this.client.request({ method: "POST", path, params });
  }

  listReviews(params: Record<string, string | number | undefined> = {}) {
    return this.client.request({ path: "/review/seller/list", params });
  }

  catalog() {
    return API_CATALOG;
  }

  async dailySalesSummary(dayStartIso: string, dayEndIso: string) {
    const orders: Record<string, unknown>[] = [];
    let offset = 0;
    let truncated = false;
    for (let page = 0; page < 5; page++) {
      const envelope = await this.getOrders({
        createdAfter: dayStartIso,
        createdBefore: dayEndIso,
        limit: 100,
        offset,
        sortBy: "created_at",
        sortDirection: "ASC",
      });
      const batch = extractOrders(envelope);
      orders.push(...batch);
      if (batch.length < 100) break;
      offset += 100;
      if (page === 4) truncated = true;
    }
    const byStatus: Record<string, number> = {};
    let gross = 0;
    for (const order of orders) {
      const statuses = Array.isArray(order.statuses)
        ? order.statuses.map(String)
        : [String(order.status ?? "unknown")];
      for (const status of statuses) byStatus[status] = (byStatus[status] ?? 0) + 1;
      const price = Number(order.price ?? 0);
      if (Number.isFinite(price)) gross += price;
    }
    const region = getRegion(this.client.regionCode);
    return {
      region: region.code,
      currency: region.currency,
      from: dayStartIso,
      to: dayEndIso,
      orderCount: orders.length,
      grossMerchandiseValue: Number(gross.toFixed(2)),
      byStatus,
      truncated,
      orders: orders.slice(0, 20),
    };
  }

  async lowStockReport(threshold = 5) {
    const rows: Array<Record<string, unknown>> = [];
    for (let page = 0; page < 3; page++) {
      const envelope = await this.getProducts({
        filter: "all",
        limit: 50,
        offset: page * 50,
        options: 1,
      });
      const products = extractProducts(envelope);
      for (const product of products) {
        const skus = Array.isArray(product.skus) ? product.skus : [];
        for (const sku of skus) {
          if (!sku || typeof sku !== "object") continue;
          const record = sku as Record<string, unknown>;
          const available = Number(record.Available ?? record.quantity ?? NaN);
          if (Number.isFinite(available) && available <= threshold) {
            rows.push({
              itemId: product.item_id,
              sellerSku: record.SellerSku,
              skuId: record.SkuId,
              quantity: record.quantity,
              available,
              status: record.Status ?? product.status,
            });
          }
        }
      }
      if (products.length < 50) break;
    }
    return { threshold, count: rows.length, items: rows };
  }

  async pendingOrders(sinceIso: string) {
    const pending = await this.getOrders({ updateAfter: sinceIso, status: "pending", limit: 100 });
    const unpaid = await this.getOrders({ updateAfter: sinceIso, status: "unpaid", limit: 100 });
    return {
      pending: extractOrders(pending),
      unpaid: extractOrders(unpaid),
    };
  }
}

function extractOrders(envelope: DarazEnvelope): Record<string, unknown>[] {
  const data = envelope.data;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.orders)) return record.orders as Record<string, unknown>[];
  }
  return [];
}

function extractProducts(envelope: DarazEnvelope): Record<string, unknown>[] {
  const data = envelope.data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.products)) return record.products as Record<string, unknown>[];
  }
  return [];
}
