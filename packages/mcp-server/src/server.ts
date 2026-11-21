import {
  API_CATALOG,
  DarazError,
  REGIONS,
  findEndpoint,
  getRegion,
  type PriceQuantitySku,
} from "@daraz-mcp/client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiFor, resolveShop, shopSummary, type ShopContext, type ShopConnection } from "./shops.js";

const SERVER_VERSION = "0.1.0";

const shopId = z
  .string()
  .optional()
  .describe("Shop id or label. Required when more than one shop is connected.");

const confirm = z
  .literal(true)
  .describe("Must be true. Write tools do nothing unless the caller explicitly confirms.");

function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const code = error instanceof DarazError ? error.code : undefined;
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ error: message, code }),
      },
    ],
  };
}

async function withShop<T>(
  ctx: ShopContext,
  tool: string,
  id: string | undefined,
  fn: (api: ReturnType<typeof apiFor>, shop: ShopConnection) => Promise<T>,
) {
  const started = Date.now();
  try {
    const shop = resolveShop(ctx.shops, id);
    const api = apiFor(ctx, shop);
    const data = await fn(api, shop);
    await ctx.onUsage?.({
      shopId: shop.id,
      tool,
      ok: true,
      durationMs: Date.now() - started,
    });
    return jsonResult(data);
  } catch (error) {
    await ctx.onUsage?.({
      tool,
      ok: false,
      durationMs: Date.now() - started,
      errorCode: error instanceof DarazError ? error.code : "error",
    });
    return errorResult(error);
  }
}

function dayWindow(region: string, now = new Date()) {
  const def = getRegion(region);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: def.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return {
    start: `${parts}T00:00:00${def.offset}`,
    end: `${parts}T23:59:59${def.offset}`,
    currency: def.currency,
  };
}

function sinceDays(region: string, days: number) {
  const def = getRegion(region);
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: def.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}${def.offset}`;
}

const read = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

const write = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export function createDarazMcpServer(ctx: ShopContext): McpServer {
  const server = new McpServer({
    name: "daraz-mcp",
    version: SERVER_VERSION,
  });

  server.registerTool(
    "list_shops",
    {
      title: "List connected shops",
      description: "Shops available to this MCP session. Tokens are never returned.",
      inputSchema: z.object({}),
      annotations: read,
    },
    async () => jsonResult({ shops: ctx.shops.map(shopSummary) }),
  );

  server.registerTool(
    "list_api_catalog",
    {
      title: "List Daraz API coverage",
      description:
        "Every Daraz path this server will call, with how the path was verified. unverified paths can 404.",
      inputSchema: z.object({
        group: z.string().optional(),
      }),
      annotations: read,
    },
    async ({ group }) =>
      jsonResult({
        endpoints: API_CATALOG.filter((item) => !group || item.group === group).map((item) => ({
          name: item.name,
          group: item.group,
          method: item.method,
          path: item.path,
          write: item.write,
          verification: item.verification,
          description: item.description,
        })),
      }),
  );

  server.registerTool(
    "get_seller",
    {
      title: "Get seller",
      description: "Seller profile for the connected shop. Path /seller/get is a secondary report, not a portal capture.",
      inputSchema: z.object({ shop: shopId }),
      annotations: read,
    },
    async ({ shop }) => withShop(ctx, "get_seller", shop, (api) => api.getSeller()),
  );

  server.registerTool(
    "get_orders",
    {
      title: "Get orders",
      description:
        "List orders. Provide createdAfter or updateAfter as an ISO datetime. limit is capped at 100. Path verified in a working Daraz client.",
      inputSchema: z.object({
        shop: shopId,
        createdAfter: z.string().optional(),
        createdBefore: z.string().optional(),
        updateAfter: z.string().optional(),
        updateBefore: z.string().optional(),
        status: z.string().optional(),
        offset: z.number().int().nonnegative().optional(),
        limit: z.number().int().positive().max(100).optional(),
      }),
      annotations: read,
    },
    async (args) => withShop(ctx, "get_orders", args.shop, (api) => api.getOrders(args)),
  );

  server.registerTool(
    "get_order",
    {
      title: "Get one order",
      description: "Order header by order id.",
      inputSchema: z.object({ shop: shopId, orderId: z.string().min(1) }),
      annotations: read,
    },
    async ({ shop, orderId }) => withShop(ctx, "get_order", shop, (api) => api.getOrder(orderId)),
  );

  server.registerTool(
    "get_order_items",
    {
      title: "Get order items",
      description: "Line items for one order.",
      inputSchema: z.object({ shop: shopId, orderId: z.string().min(1) }),
      annotations: read,
    },
    async ({ shop, orderId }) =>
      withShop(ctx, "get_order_items", shop, (api) => api.getOrderItems(orderId)),
  );

  server.registerTool(
    "get_products",
    {
      title: "Get products",
      description:
        "List products. filter is required. limit is capped at 50. options=1 adds extended stock fields.",
      inputSchema: z.object({
        shop: shopId,
        filter: z.enum(["all", "live", "inactive", "deleted", "image-missing", "pending", "rejected", "sold-out"]),
        limit: z.number().int().positive().max(50).optional(),
        offset: z.number().int().nonnegative().optional(),
        updateAfter: z.string().optional(),
        createAfter: z.string().optional(),
        options: z.union([z.literal(0), z.literal(1)]).optional(),
      }),
      annotations: read,
    },
    async (args) => withShop(ctx, "get_products", args.shop, (api) => api.getProducts(args)),
  );

  server.registerTool(
    "get_product",
    {
      title: "Get one product",
      description: "Product by item id or seller SKU.",
      inputSchema: z.object({
        shop: shopId,
        itemId: z.string().optional(),
        sellerSku: z.string().optional(),
      }),
      annotations: read,
    },
    async ({ shop, itemId, sellerSku }) =>
      withShop(ctx, "get_product", shop, (api) => api.getProductItem({ itemId, sellerSku })),
  );

  server.registerTool(
    "get_category_tree",
    {
      title: "Category tree",
      description: "Daraz category tree for the shop region.",
      inputSchema: z.object({ shop: shopId }),
      annotations: read,
    },
    async ({ shop }) => withShop(ctx, "get_category_tree", shop, (api) => api.getCategoryTree()),
  );

  server.registerTool(
    "get_category_attributes",
    {
      title: "Category attributes",
      description: "Mandatory and optional attributes for a category id.",
      inputSchema: z.object({ shop: shopId, categoryId: z.string().min(1) }),
      annotations: read,
    },
    async ({ shop, categoryId }) =>
      withShop(ctx, "get_category_attributes", shop, (api) => api.getCategoryAttributes(categoryId)),
  );

  server.registerTool(
    "query_brands",
    {
      title: "Query brands",
      description: "Brand search via /category/brands/query.",
      inputSchema: z.object({
        shop: shopId,
        name: z.string().optional(),
        offset: z.number().int().nonnegative().optional(),
        limit: z.number().int().positive().max(100).optional(),
      }),
      annotations: read,
    },
    async ({ shop, ...query }) => withShop(ctx, "query_brands", shop, (api) => api.queryBrands(query)),
  );

  server.registerTool(
    "get_finance",
    {
      title: "Transactions or payouts",
      description:
        "Finance reads. transaction uses /finance/transaction/detail/get (singular detail). payout uses /finance/payout/status/get. Both are secondary reports, not portal captures.",
      inputSchema: z.object({
        shop: shopId,
        kind: z.enum(["transactions", "payouts"]),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        createdAfter: z.string().optional(),
        tradeOrderId: z.string().optional(),
      }),
      annotations: read,
    },
    async ({ shop, kind, startTime, endTime, createdAfter, tradeOrderId }) =>
      withShop(ctx, "get_finance", shop, async (api) => {
        if (kind === "payouts") {
          return api.getPayoutStatus(createdAfter || startTime || sinceDays(api.client.regionCode, 30));
        }
        return api.getTransactions({
          startTime: startTime || sinceDays(api.client.regionCode, 2),
          endTime: endTime || dayWindow(api.client.regionCode).end,
          tradeOrderId,
        });
      }),
  );

  server.registerTool(
    "list_returns",
    {
      title: "List reverse orders",
      description: "Returns via /reverse/order/list. Secondary report; field names should be checked on the first live call.",
      inputSchema: z.object({
        shop: shopId,
        pageNo: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().max(100).optional(),
      }),
      annotations: read,
    },
    async ({ shop, pageNo, pageSize }) =>
      withShop(ctx, "list_returns", shop, (api) =>
        api.listReverseOrders({
          page_no: pageNo ?? 1,
          page_size: pageSize ?? 20,
        }),
      ),
  );

  server.registerTool(
    "list_reviews",
    {
      title: "List reviews",
      description:
        "UNVERIFIED on Daraz. Calls Lazada-style /review/seller/list. The Product Review section exists in the portal navigation but its pages were not readable.",
      inputSchema: z.object({
        shop: shopId,
        itemId: z.string().optional(),
        page: z.number().int().positive().optional(),
      }),
      annotations: read,
    },
    async ({ shop, itemId, page }) =>
      withShop(ctx, "list_reviews", shop, (api) =>
        api.listReviews({ item_id: itemId, current: page ?? 1 }),
      ),
  );

  server.registerTool(
    "list_vouchers",
    {
      title: "List seller vouchers",
      description:
        "UNVERIFIED on Daraz. Calls Lazada-style /promotion/vouchers/get. The Seller Voucher section exists in the portal navigation but its pages were not readable.",
      inputSchema: z.object({ shop: shopId }),
      annotations: read,
    },
    async ({ shop }) => withShop(ctx, "list_vouchers", shop, (api) => api.listVouchers()),
  );

  server.registerTool(
    "daily_sales_summary",
    {
      title: "Daily sales summary",
      description:
        "Orders created during the shop's local calendar day, with a gross sum of the order price field and counts by status. Reads at most 500 orders.",
      inputSchema: z.object({ shop: shopId }),
      annotations: read,
    },
    async ({ shop }) =>
      withShop(ctx, "daily_sales_summary", shop, (api, current) => {
        const window = dayWindow(current.region);
        return api.dailySalesSummary(window.start, window.end);
      }),
  );

  server.registerTool(
    "low_stock_report",
    {
      title: "Low stock report",
      description:
        "SKUs whose Available or quantity is at or below the threshold. Scans up to 150 products from /products/get.",
      inputSchema: z.object({
        shop: shopId,
        threshold: z.number().int().nonnegative().optional(),
      }),
      annotations: read,
    },
    async ({ shop, threshold }) =>
      withShop(ctx, "low_stock_report", shop, (api) => api.lowStockReport(threshold ?? 5)),
  );

  server.registerTool(
    "pending_orders",
    {
      title: "Pending orders",
      description: "Orders updated in the last 14 days with status pending or unpaid.",
      inputSchema: z.object({ shop: shopId }),
      annotations: read,
    },
    async ({ shop }) =>
      withShop(ctx, "pending_orders", shop, (api, current) =>
        api.pendingOrders(sinceDays(current.region, 14)),
      ),
  );

  server.registerTool(
    "update_price_quantity",
    {
      title: "Update price and stock",
      description:
        "DESTRUCTIVE. Updates price and/or quantity through /product/price_quantity/update. Requires confirm=true. At most 50 SKUs.",
      inputSchema: z.object({
        shop: shopId,
        confirm,
        skus: z
          .array(
            z.object({
              itemId: z.string().optional(),
              skuId: z.string().optional(),
              sellerSku: z.string().optional(),
              quantity: z.number().int().nonnegative().optional(),
              price: z.union([z.string(), z.number()]).optional(),
              salePrice: z.union([z.string(), z.number()]).optional(),
            }),
          )
          .min(1)
          .max(50),
      }),
      annotations: write,
    },
    async ({ shop, skus }) =>
      withShop(ctx, "update_price_quantity", shop, (api) =>
        api.updatePriceQuantity(skus as PriceQuantitySku[]),
      ),
  );

  server.registerTool(
    "bulk_update_price_quantity_csv",
    {
      title: "Bulk price and stock from CSV",
      description:
        "DESTRUCTIVE. CSV header must include item_id and/or sku_id and/or seller_sku, plus any of quantity, price, sale_price. Requires confirm=true. Sent in batches of 50.",
      inputSchema: z.object({
        shop: shopId,
        confirm,
        csv: z.string().min(1),
      }),
      annotations: write,
    },
    async ({ shop, csv }) =>
      withShop(ctx, "bulk_update_price_quantity_csv", shop, (api) => api.updatePriceQuantityCsv(csv)),
  );

  server.registerTool(
    "create_product",
    {
      title: "Create product",
      description:
        "DESTRUCTIVE. Creates one product. payloadXml is the Daraz Request XML. Requires confirm=true.",
      inputSchema: z.object({ shop: shopId, confirm, payloadXml: z.string().min(1) }),
      annotations: write,
    },
    async ({ shop, payloadXml }) =>
      withShop(ctx, "create_product", shop, (api) => api.createProduct(payloadXml)),
  );

  server.registerTool(
    "update_product",
    {
      title: "Update product",
      description: "DESTRUCTIVE. Updates one product from XML. Requires confirm=true.",
      inputSchema: z.object({ shop: shopId, confirm, payloadXml: z.string().min(1) }),
      annotations: write,
    },
    async ({ shop, payloadXml }) =>
      withShop(ctx, "update_product", shop, (api) => api.updateProduct(payloadXml)),
  );

  server.registerTool(
    "remove_product",
    {
      title: "Remove product SKUs",
      description: "DESTRUCTIVE. Removes up to 50 seller SKUs. Requires confirm=true.",
      inputSchema: z.object({
        shop: shopId,
        confirm,
        sellerSkus: z.array(z.string().min(1)).min(1).max(50),
      }),
      annotations: write,
    },
    async ({ shop, sellerSkus }) =>
      withShop(ctx, "remove_product", shop, (api) => api.removeProduct(sellerSkus)),
  );

  server.registerTool(
    "deactivate_product",
    {
      title: "Deactivate product",
      description: "DESTRUCTIVE. Takes a listing off sale. Pass the parameters Daraz expects, usually item ids. Requires confirm=true.",
      inputSchema: z.object({
        shop: shopId,
        confirm,
        params: z.record(z.string(), z.string()),
      }),
      annotations: write,
    },
    async ({ shop, params }) =>
      withShop(ctx, "deactivate_product", shop, (api) => api.deactivateProduct(params)),
  );

  server.registerTool(
    "upload_image",
    {
      title: "Upload image",
      description:
        "DESTRUCTIVE. Uploads a base64 image to /image/upload. File bytes are not part of the signature. Requires confirm=true.",
      inputSchema: z.object({
        shop: shopId,
        confirm,
        filename: z.string().min(1),
        contentType: z.string().min(1),
        base64: z.string().min(1),
      }),
      annotations: write,
    },
    async ({ shop, filename, contentType, base64 }) =>
      withShop(ctx, "upload_image", shop, (api) =>
        api.uploadImage({
          filename,
          contentType,
          bytes: new Uint8Array(Buffer.from(base64, "base64")),
        }),
      ),
  );

  server.registerTool(
    "pack_order",
    {
      title: "Pack order",
      description:
        "DESTRUCTIVE. Calls /order/pack. Parameter names follow the shared Lazada pack call and were not in the portal capture. Requires confirm=true.",
      inputSchema: z.object({
        shop: shopId,
        confirm,
        params: z.record(z.string(), z.string()),
      }),
      annotations: write,
    },
    async ({ shop, params }) => withShop(ctx, "pack_order", shop, (api) => api.packOrder(params)),
  );

  server.registerTool(
    "ready_to_ship",
    {
      title: "Ready to ship",
      description: "DESTRUCTIVE. Calls /order/rts. Secondary report. Requires confirm=true.",
      inputSchema: z.object({
        shop: shopId,
        confirm,
        params: z.record(z.string(), z.string()),
      }),
      annotations: write,
    },
    async ({ shop, params }) => withShop(ctx, "ready_to_ship", shop, (api) => api.readyToShip(params)),
  );

  server.registerTool(
    "cancel_order",
    {
      title: "Cancel order",
      description:
        "DESTRUCTIVE. Calls /order/cancel. Look up reason ids with call_api on /order/failure_reason/get first. Requires confirm=true.",
      inputSchema: z.object({
        shop: shopId,
        confirm,
        params: z.record(z.string(), z.string()),
      }),
      annotations: write,
    },
    async ({ shop, params }) => withShop(ctx, "cancel_order", shop, (api) => api.cancelOrder(params)),
  );

  server.registerTool(
    "set_invoice_number",
    {
      title: "Set invoice number",
      description: "DESTRUCTIVE. Calls /order/invoice_number/set. Requires confirm=true.",
      inputSchema: z.object({
        shop: shopId,
        confirm,
        params: z.record(z.string(), z.string()),
      }),
      annotations: write,
    },
    async ({ shop, params }) =>
      withShop(ctx, "set_invoice_number", shop, (api) => api.setInvoiceNumber(params)),
  );

  server.registerTool(
    "voucher_action",
    {
      title: "Create or change a voucher",
      description:
        "DESTRUCTIVE and UNVERIFIED on Daraz. Calls /promotion/voucher/{create|update|activate|deactivate}. Requires confirm=true.",
      inputSchema: z.object({
        shop: shopId,
        confirm,
        action: z.enum(["create", "update", "activate", "deactivate"]),
        params: z.record(z.string(), z.string()),
      }),
      annotations: write,
    },
    async ({ shop, action, params }) =>
      withShop(ctx, "voucher_action", shop, (api) => api.voucherWrite(action, params)),
  );

  server.registerTool(
    "call_api",
    {
      title: "Call a catalogued Daraz API",
      description:
        "Call any path in list_api_catalog. Write paths require confirm=true. Paths that are not in the catalog are rejected. Partner logistics APIs are included but are not normal seller calls.",
      inputSchema: z.object({
        shop: shopId,
        path: z.string().min(1),
        params: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
        confirm: z.literal(true).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
    },
    async ({ shop, path, params, confirm: confirmed }) =>
      withShop(ctx, "call_api", shop, (api) => {
        const spec = findEndpoint(path);
        if (!spec) {
          throw new Error(`Path ${path} is not in the verified catalog.`);
        }
        if (spec.write && confirmed !== true) {
          throw new Error(`Refusing write ${path} without confirm=true.`);
        }
        return api.call(path, params);
      }),
  );

  server.registerResource(
    "regions",
    "daraz://regions",
    {
      description: "Daraz venture hosts, currencies, and time zones.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(REGIONS, null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    "shops",
    "daraz://shops",
    {
      description: "Connected shops without secrets.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(ctx.shops.map(shopSummary), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    "catalog",
    "daraz://catalog",
    {
      description: "API catalog and verification status.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(API_CATALOG, null, 2),
        },
      ],
    }),
  );

  server.registerPrompt(
    "morning-shop-brief",
    {
      title: "Morning shop brief",
      description: "Ask the assistant to summarise today's sales, pending orders, and low stock.",
      argsSchema: { shop: shopId },
    },
    async ({ shop }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Using only read tools, prepare a morning brief for Daraz shop ${shop ?? "(default)"}. Include daily_sales_summary, pending_orders, and low_stock_report. Use the shop currency. Do not change prices, stock, or orders.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "restock-plan",
    {
      title: "Restock plan",
      description: "Draft a restock list. Does not apply updates until a person confirms.",
      argsSchema: {
        shop: shopId,
        threshold: z.string().optional(),
      },
    },
    async ({ shop, threshold }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Read low_stock_report for shop ${shop ?? "(default)"} with threshold ${threshold ?? "5"}. Propose new quantities but do not call any write tool until I reply with explicit confirmation.`,
          },
        },
      ],
    }),
  );

  return server;
}
