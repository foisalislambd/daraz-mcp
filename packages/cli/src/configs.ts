export function claudeDesktopConfig(): string {
  return JSON.stringify(
    {
      mcpServers: {
        daraz: {
          command: "npx",
          args: ["-y", "daraz-mcp", "serve"],
        },
      },
    },
    null,
    2,
  );
}

export function cursorConfig(): string {
  return JSON.stringify(
    {
      mcpServers: {
        daraz: {
          command: "npx",
          args: ["-y", "daraz-mcp", "serve"],
        },
      },
    },
    null,
    2,
  );
}

export function vscodeConfig(): string {
  return JSON.stringify(
    {
      servers: {
        daraz: {
          type: "stdio",
          command: "npx",
          args: ["-y", "daraz-mcp", "serve"],
        },
      },
    },
    null,
    2,
  );
}

export function hostedClientConfig(mcpUrl: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        daraz: {
          url: mcpUrl,
          headers: {
            Authorization: "Bearer dk_live_YOUR_KEY",
          },
        },
      },
    },
    null,
    2,
  );
}

export function configInstructions(): string {
  return [
    "Claude Desktop: paste into claude_desktop_config.json",
    claudeDesktopConfig(),
    "",
    "Cursor: paste into ~/.cursor/mcp.json",
    cursorConfig(),
    "",
    "VS Code: paste into .vscode/mcp.json (MCP servers view)",
    vscodeConfig(),
    "",
    "The server speaks MCP over stdio and reads encrypted credentials from ~/.config/daraz-mcp.",
  ].join("\n");
}
