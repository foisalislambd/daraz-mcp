import { createServer } from "node:http";
import next from "next";
import { handleHostedMcp } from "./src/server/mcp-node.ts";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOST || "0.0.0.0";
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/mcp") {
      await handleHostedMcp(req, res);
      return;
    }
    await handle(req, res);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", msg: "request failed", error: String(error) }));
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end("Internal error");
    }
  }
}).listen(port, hostname, () => {
  console.log(JSON.stringify({ level: "info", msg: "daraz mcp web listening", port, dev }));
});
