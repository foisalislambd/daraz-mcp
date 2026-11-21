import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const needed = [
  "packages/daraz-client/dist/index.js",
  "packages/mcp-server/dist/index.js",
  "packages/cli/dist/cli.js",
];

if (needed.some((file) => !existsSync(file))) {
  const build = spawnSync(
    "pnpm",
    ["--filter", "@daraz-mcp/client", "--filter", "@daraz-mcp/mcp-server", "--filter", "daraz-mcp", "build"],
    { stdio: "inherit" },
  );
  if (build.status) process.exit(build.status);
}

const args = process.argv.slice(2);
const command = args.length > 0 ? args : ["serve"];
const run = spawnSync("node", ["packages/cli/dist/cli.js", ...command], { stdio: "inherit" });
process.exit(run.status ?? 1);
