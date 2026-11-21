# API coverage

`open.daraz.com` is a client-rendered site. A plain fetch returns an empty shell. Paths below were checked against a captured render of the portal (`pratikkuikel/daraz-api-skill` files `daraz-full-content.txt` and `daraz-api-full.txt`), the Alibaba seller-authorization article that prints the Daraz authorize URLs, and public Daraz clients whose source we read (`ghostrunner-0/kick_lifestyle` `lib/darazMini.js` and `eharain/Rutba-ERP` `daraz.js`).

The machine-generated "98 API" catalogue in that same skill repo was **not** used. It invents paths and describes a bearer-token scheme this gateway does not use.

## Signing

Verified against the Daraz/Lazada signature article (sort parameters, concatenate key+value, prefix the API path, HMAC-SHA256, uppercase hex) and against `darazMini.js`. Empty values are omitted from both the signature and the request. `timestamp` is milliseconds. `sign_method` is `sha256`. File bytes are not part of the signature.

Test vector locked in `packages/daraz-client/test/sign.test.ts`:

```
/test/apibar2foo1foo_bar3foobar4
secret test-secret
sign FE01B44E2D0F8A799FDC350C3EDDA02F3BFCE762E60DA58768964FF1CD949437
```

A published curl example uses sign `4190D323…` but does not include the app secret, so it is not a vector we can lock.

## Official portal capture (Product)

`/product/create`, `/product/deactivate`, `/category/brands/query`, `/category/attributes/get`, `/category/tree/get`, `/product/item/get`, `/products/get`, `/product/qc/status/get`, `/image/response/get`, `/image/migrate`, `/images/migrate`, `/product/remove`, `/images/set`, `/product/price_quantity/update`, `/product/update`, `/image/upload`.

Service endpoints on that page:

| Region | REST base |
| --- | --- |
| Bangladesh | `https://api.daraz.com.bd/rest` |
| Pakistan | `https://api.daraz.pk/rest` |
| Sri Lanka | `https://api.daraz.lk/rest` |
| Nepal | `https://api.daraz.com.np/rest` |
| Myanmar | `https://api.shop.com.mm/rest` |

The same capture's Logistics section lists EPIS partner paths under `/logistics/epis/...`. They are in the catalog for `call_api` and are not normal seller-centre tools.

## OAuth

Authorize samples from the Daraz seller-authorization document:

- `https://api.daraz.com.bd/oauth/authorize`
- `https://api.daraz.pk/oauth/authorize`
- `https://api.daraz.lk/oauth/authorize`
- `https://api.daraz.com.np/oauth/authorize`
- `https://api.shop.com.mm/oauth/authorize`

Query: `response_type=code`, `force_auth=true`, `redirect_uri`, `client_id` = app key.

`/auth/token/create` and `/auth/token/refresh` are what the working clients call on the venture REST host. Some other integrations use `https://auth.daraz.com`. That central host is optional (`host: "central"`) and was not in the official sample links we read.

## Working client paths

Read in source: `/orders/get`, `/order/get`, `/order/items/get`, plus the product paths above.

## Secondary reports (not in the capture we fetched)

These are implemented and labelled in tool descriptions. They can 404 or differ by venture:

- `/orders/items/get`
- `/order/document/get`
- `/order/invoice_number/set`
- `/order/failure_reason/get`
- `/order/cancel`
- `/order/pack`
- `/order/rts`
- `/shipment/providers/get`
- `/seller/get`
- `/shop/get`
- `/finance/transaction/detail/get` (singular `detail`, not Lazada's `details`)
- `/finance/payout/status/get`
- `/reverse/order/list` (not Lazada's `/reverse/getreverseordersforseller`)

## Lazada paths, unverified on Daraz

The portal navigation lists Seller Voucher, Product Review, Finance, Order, Fulfillment, Free Shipping, Flexicombo, Instant Messaging, and 3PV. Only Product and Logistics were expanded in the capture.

Included, and marked unverified:

- `/promotion/vouchers/get`
- `/promotion/voucher/create`
- `/promotion/voucher/update`
- `/promotion/voucher/activate`
- `/promotion/voucher/deactivate`
- `/review/seller/list`
- `/review/seller/history/list`

Not implemented, because the pages were not readable and guessing paths would be wrong:

- Free Shipping
- Flexicombo
- Instant messaging
- Fulfillment beyond pack / ready-to-ship
- 3PV seller APIs
- Webhooks / message push
- Wallet reconciliation
- Multi-warehouse XML (the single-warehouse sample is implemented; the warehouse block's tag names were not in the capture)

## Response envelope

Success is `code` `"0"` with `request_id`. Anything else is an error. `E901` / code `901` is treated as throttle and retried with backoff. `IllegalAccessToken`, `InvalidSession`, `AccessTokenExpired`, and `MissingAccessToken` trigger one refresh.

## Open questions

1. Which authorize host Daraz enables for a given app: venture (documented) or `auth.daraz.com`.
2. Exact business parameter names for finance, reverse orders, documents, and vouchers.
3. Whether Daraz push/webhooks are enabled. This server polls; it does not receive webhooks.
4. Whether `/order/pack` and `/order/rts` are current, or whether Daraz expects the newer fulfill/package paths used on Lazada.
5. Rate limits are not published. The client backs off on `E901` and HTTP 429.
6. Image upload field name `image` matches the Lazada SDK, not a Daraz page we could read.
