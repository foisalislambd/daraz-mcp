import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createDarazMcpServer } from "./server.js";
import type { ShopContext } from "./shops.js";

export async function handleMcpHttp(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: ShopContext,
  parsedBody?: unknown,
): Promise<void> {
  const server = createDarazMcpServer(ctx);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, parsedBody);
}

export interface HttpServerOptions {
  port: number;
  host?: string;
  getContext: (req: IncomingMessage) => Promise<ShopContext | undefined>;
}

export function startHttpServer(options: HttpServerOptions): Promise<Server> {
  const host = options.host ?? "127.0.0.1";
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname !== "/mcp") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }
    if (req.method === "GET" && !req.headers["mcp-session-id"]) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ name: "daraz-mcp", transport: "streamable-http" }));
      return;
    }
    try {
      const ctx = await options.getContext(req);
      if (!ctx) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const raw = Buffer.concat(chunks).toString("utf8");
      const body = raw ? JSON.parse(raw) : undefined;
      await handleMcpHttp(req, res, ctx, body);
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : "MCP error" }));
      }
    }
  });
  return new Promise((resolve) => {
    server.listen(options.port, host, () => resolve(server));
  });
}
