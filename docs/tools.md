# Tool reference

Read tools do not change the shop. Write tools are annotated `destructiveHint: true` and the input schema requires `confirm: true`.

| Tool | Access | What it does |
| --- | --- | --- |
| `list_shops` | read | Connected shops, no secrets |
| `list_api_catalog` | read | Paths and how each one was verified |
| `get_seller` | read | `/seller/get` |
| `get_orders` | read | `/orders/get` |
| `get_order` | read | `/order/get` |
| `get_order_items` | read | `/order/items/get` |
| `get_products` | read | `/products/get` |
| `get_product` | read | `/product/item/get` |
| `get_category_tree` | read | `/category/tree/get` |
| `get_category_attributes` | read | `/category/attributes/get` |
| `query_brands` | read | `/category/brands/query` |
| `get_finance` | read | Transactions or payout status |
| `list_returns` | read | `/reverse/order/list` |
| `list_reviews` | read | Unverified on Daraz |
| `list_vouchers` | read | Unverified on Daraz |
| `daily_sales_summary` | read | Today's orders and a price sum |
| `low_stock_report` | read | SKUs at or under a threshold |
| `pending_orders` | read | `pending` and `unpaid` in the last 14 days |
| `update_price_quantity` | write | `/product/price_quantity/update` |
| `bulk_update_price_quantity_csv` | write | CSV of price and stock, 50 SKUs per call |
| `create_product` | write | XML payload |
| `update_product` | write | XML payload |
| `remove_product` | write | Up to 50 seller SKUs |
| `deactivate_product` | write | `/product/deactivate` |
| `upload_image` | write | Base64 file to `/image/upload` |
| `pack_order` | write | `/order/pack` |
| `ready_to_ship` | write | `/order/rts` |
| `cancel_order` | write | `/order/cancel` |
| `set_invoice_number` | write | `/order/invoice_number/set` |
| `voucher_action` | write | Unverified voucher create/update/activate/deactivate |
| `call_api` | mixed | Any catalog path. Writes still need `confirm: true` |

Resources: `daraz://regions`, `daraz://shops`, `daraz://catalog`.

Prompts: `morning-shop-brief`, `restock-plan`.

CSV columns for bulk updates: `item_id`, `sku_id`, `seller_sku`, `quantity`, `price`, `sale_price`. At least one identity column is required.

Business parameters that were not printed on the captured portal pages (category attribute id, finance time fields, reverse paging, document types) follow the shared Lazada-style names used by working clients. If a live call returns `E001`, check the parameter name in the Daraz console before changing the client.
