"use client";

import { useEffect, useState } from "react";

function block(mcpUrl: string, style: "claude" | "vscode") {
  if (style === "vscode") {
    return JSON.stringify(
      {
        servers: {
          daraz: { type: "http", url: mcpUrl, headers: { Authorization: "Bearer dk_live_YOUR_KEY" } },
        },
      },
      null,
      2,
    );
  }
  return JSON.stringify(
    {
      mcpServers: {
        daraz: { url: mcpUrl, headers: { Authorization: "Bearer dk_live_YOUR_KEY" } },
      },
    },
    null,
    2,
  );
}

const localStdio = JSON.stringify(
  { mcpServers: { daraz: { command: "npx", args: ["-y", "daraz-mcp", "serve"] } } },
  null,
  2,
);

export default function SetupPage() {
  const [mcpUrl, setMcpUrl] = useState("https://your-host/mcp");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/keys")
      .then((response) => response.json())
      .then((body) => {
        if (body.mcpUrl) setMcpUrl(body.mcpUrl);
      })
      .catch(() => undefined);
  }, []);

  function copy(id: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopied(id);
  }

  const cards = [
    { id: "claude", title: "Claude Desktop (hosted)", body: block(mcpUrl, "claude"), hint: "claude_desktop_config.json" },
    { id: "cursor", title: "Cursor (hosted)", body: block(mcpUrl, "claude"), hint: "~/.cursor/mcp.json" },
    { id: "vscode", title: "VS Code (hosted)", body: block(mcpUrl, "vscode"), hint: ".vscode/mcp.json" },
    { id: "local", title: "Local stdio (after npx daraz-mcp setup)", body: localStdio, hint: "Claude, Cursor, or VS Code" },
  ];

  return (
    <div className="admin-content space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Client setup</h1>
        <p className="mt-1 text-sm text-gray-500">
          Replace dk_live_YOUR_KEY with a key from API keys. The local command reads encrypted tokens from your computer.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map((card) => (
          <div key={card.id} className="admin-card admin-card-body">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{card.title}</h2>
                <p className="text-xs text-gray-500">{card.hint}</p>
              </div>
              <button type="button" className="text-sm font-medium text-brand-600" onClick={() => copy(card.id, card.body)}>
                {copied === card.id ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs dark:bg-white/5">{card.body}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
