import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";
import { createDarazMcpServer } from "../src/server.js";
import type { ShopConnection } from "../src/shops.js";

const shop: ShopConnection = {
  id: "bd-shop",
  label: "Dhaka",
  region: "BD",
  appKey: "app",
  appSecret: "secret",
  accessToken: "token",
};

async function connect(fetchImpl: typeof fetch) {
  const server = createDarazMcpServer({ shops: [shop], fetchImpl });
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

describe("daraz mcp tools", () => {
  it("lists read tools separately from destructive writes", async () => {
    const client = await connect(vi.fn() as typeof fetch);
    const tools = await client.listTools();
    const names = tools.tools.map((tool) => tool.name);
    expect(names).toContain("daily_sales_summary");
    expect(names).toContain("get_orders");
    expect(names).toContain("update_price_quantity");
    const writeTool = tools.tools.find((tool) => tool.name === "update_price_quantity");
    expect(writeTool?.annotations?.destructiveHint).toBe(true);
    const readTool = tools.tools.find((tool) => tool.name === "get_seller");
    expect(readTool?.annotations?.readOnlyHint).toBe(true);
    const resources = await client.listResources();
    expect(resources.resources.map((item) => item.uri)).toContain("daraz://regions");
    const prompts = await client.listPrompts();
    expect(prompts.prompts.map((item) => item.name)).toContain("morning-shop-brief");
  });

  it("returns the seller and refuses a write without confirm", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ code: "0", data: { name: "Shop" }, request_id: "r" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const client = await connect(fetchImpl as typeof fetch);
    const seller = await client.callTool({ name: "get_seller", arguments: {} });
    expect(JSON.stringify(seller)).toContain("Shop");

    const denied = await client.callTool({
      name: "update_price_quantity",
      arguments: {
        skus: [{ sellerSku: "A", quantity: 1 }],
      },
    });
    expect(denied.isError).toBe(true);

    const applied = await client.callTool({
      name: "bulk_update_price_quantity_csv",
      arguments: {
        confirm: true,
        csv: "seller_sku,quantity,price\nA,4,19.00\n",
      },
    });
    expect(applied.isError).toBeFalsy();
    const body = String((fetchImpl.mock.calls.at(-1)?.[1] as RequestInit | undefined)?.body);
    expect(body).toContain("SellerSku");
    expect(decodeURIComponent(body)).toContain("A");
  });

  it("rejects paths that are not in the catalog", async () => {
    const client = await connect(vi.fn() as typeof fetch);
    const result = await client.callTool({
      name: "call_api",
      arguments: { path: "/made/up", params: {} },
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain("not in the verified catalog");
  });
});
