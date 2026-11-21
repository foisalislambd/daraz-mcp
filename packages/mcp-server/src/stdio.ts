import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createDarazMcpServer } from "./server.js";
import type { ShopContext } from "./shops.js";

export async function startStdio(ctx: ShopContext): Promise<void> {
  const server = createDarazMcpServer(ctx);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
