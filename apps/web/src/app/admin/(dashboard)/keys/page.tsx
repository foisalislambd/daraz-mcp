"use client";

import { AdminLoading } from "@/components/admin/ui/admin-loading";
import { FormEvent, useEffect, useState } from "react";

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  createdAt: number;
  lastUsedAt: number | null;
  revokedAt: number | null;
};

export default function KeysPage() {
  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [mcpUrl, setMcpUrl] = useState("");
  const [name, setName] = useState("Claude");
  const [fresh, setFresh] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/keys");
    const body = await response.json();
    setKeys(body.keys);
    setMcpUrl(body.mcpUrl);
  }

  useEffect(() => {
    void fetch("/api/keys")
      .then((response) => response.json())
      .then((body) => {
        setKeys(body.keys);
        setMcpUrl(body.mcpUrl);
      });
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Could not create a key");
      return;
    }
    setFresh(body.secret);
    await load();
  }

  async function revoke(id: string) {
    await fetch(`/api/keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  async function rotate(id: string) {
    const response = await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, rotateId: id }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Could not rotate the key");
      return;
    }
    setFresh(body.secret);
    await load();
  }

  if (!keys) return <AdminLoading message="Loading API keys…" />;

  return (
    <div className="admin-content space-y-5">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">API keys and MCP URL</h1>
      <div className="admin-card admin-card-body">
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">MCP URL</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <code className="flex-1 overflow-x-auto rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-white/5">{mcpUrl}</code>
          <button
            type="button"
            className="h-10 rounded-lg border border-gray-200 px-3 text-sm font-medium dark:border-gray-700"
            onClick={() => navigator.clipboard.writeText(mcpUrl)}
          >
            Copy
          </button>
        </div>
      </div>
      <form onSubmit={create} className="admin-card admin-card-body flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium">Key name</label>
          <input
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button className="h-11 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white" type="submit">
          Create key
        </button>
      </form>
      {error && <p className="text-sm text-error-500">{error}</p>}
      {fresh && (
        <div className="admin-card admin-card-body">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Copy this key now. It is not shown again.</p>
          <code className="mt-2 block overflow-x-auto text-sm">{fresh}</code>
          <button type="button" className="mt-3 text-sm font-medium text-brand-600" onClick={() => navigator.clipboard.writeText(fresh)}>
            Copy key
          </button>
        </div>
      )}
      <div className="admin-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Prefix</th>
              <th className="px-4 py-3 font-medium">Last used</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 font-medium">{key.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{key.prefix}…</td>
                <td className="px-4 py-3">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}</td>
                <td className="px-4 py-3">{key.revokedAt ? "Revoked" : "Active"}</td>
                <td className="px-4 py-3 text-right space-x-3">
                  {!key.revokedAt && (
                    <>
                      <button type="button" className="text-sm font-medium text-brand-600" onClick={() => rotate(key.id)}>
                        Rotate
                      </button>
                      <button type="button" className="text-sm font-medium text-error-500" onClick={() => revoke(key.id)}>
                        Revoke
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
