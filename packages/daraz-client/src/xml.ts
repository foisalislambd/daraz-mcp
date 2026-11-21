export interface PriceQuantitySku {
  itemId?: string;
  skuId?: string;
  sellerSku?: string;
  quantity?: number;
  price?: string | number;
  salePrice?: string | number;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function tag(name: string, value: string | number | undefined): string {
  if (value === undefined || value === "") return "";
  return `<${name}>${escapeXml(String(value))}</${name}>`;
}

/**
 * XML payload for `/product/price_quantity/update`, matching the portal sample
 * shape: Request/Product/Skus/Sku with ItemId, SkuId, Quantity, Price, SalePrice.
 * SellerSku is included when the caller has no numeric ids. At most 50 SKUs.
 */
export function buildPriceQuantityPayload(skus: PriceQuantitySku[]): string {
  if (skus.length === 0) throw new Error("At least one SKU is required.");
  if (skus.length > 50) throw new Error("Daraz accepts at most 50 SKUs per price/stock update.");
  const body = skus
    .map((sku) => {
      if (!sku.itemId && !sku.skuId && !sku.sellerSku) {
        throw new Error("Each SKU needs itemId, skuId, or sellerSku.");
      }
      return `<Sku>${tag("ItemId", sku.itemId)}${tag("SkuId", sku.skuId)}${tag("SellerSku", sku.sellerSku)}${tag("Quantity", sku.quantity)}${tag("Price", sku.price)}${tag("SalePrice", sku.salePrice)}</Sku>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><Request><Product><Skus>${body}</Skus></Product></Request>`;
}

export interface CsvPriceRow {
  item_id?: string;
  sku_id?: string;
  seller_sku?: string;
  quantity?: string;
  price?: string;
  sale_price?: string;
}

export function parsePriceQuantityCsv(csv: string): PriceQuantitySku[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) throw new Error("CSV needs a header and at least one row.");
  const header = splitCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((key, i) => {
      row[key] = (cells[i] ?? "").trim();
    });
    const sku: PriceQuantitySku = {};
    if (row.item_id) sku.itemId = row.item_id;
    if (row.sku_id) sku.skuId = row.sku_id;
    if (row.seller_sku) sku.sellerSku = row.seller_sku;
    if (row.quantity) {
      const quantity = Number(row.quantity);
      if (!Number.isInteger(quantity) || quantity < 0) {
        throw new Error(`Row ${index + 2}: quantity must be a non-negative integer.`);
      }
      sku.quantity = quantity;
    }
    if (row.price) sku.price = row.price;
    if (row.sale_price) sku.salePrice = row.sale_price;
    return sku;
  });
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else current += char;
  }
  cells.push(current);
  return cells;
}
