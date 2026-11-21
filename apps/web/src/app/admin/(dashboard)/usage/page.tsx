"use client";

import { AdminLoading } from "@/components/admin/ui/admin-loading";
import { useEffect, useState } from "react";

type Log = {
  id: string;
  tool: string;
  ok: boolean;
  errorCode: string | null;
  durationMs: number;
  createdAt: number;
  shopId: string | null;
};

export default function UsagePage() {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [tool, setTool] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (tool) params.set("tool", tool);
    if (status) params.set("status", status);
    fetch(`/api/usage?${params.toString()}`)
      .then((response) => response.json())
      .then((body) => {
        setLogs(body.logs);
      });
  }, [tool, status]);

  if (!logs) return <AdminLoading message="Loading usage…" />;

  return (
    <div className="admin-content space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Usage</h1>
        <div className="flex gap-2">
          <input
            placeholder="Tool name"
            value={tool}
            onChange={(e) => setTool(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">All</option>
            <option value="ok">Success</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>
      <div className="admin-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Tool</th>
              <th className="px-4 py-3 font-medium">Shop</th>
              <th className="px-4 py-3 font-medium">Result</th>
              <th className="px-4 py-3 font-medium">ms</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={5}>
                  No calls match this filter.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs">{log.tool}</td>
                <td className="px-4 py-3">{log.shopId || "—"}</td>
                <td className="px-4 py-3">{log.ok ? "ok" : log.errorCode || "error"}</td>
                <td className="px-4 py-3">{log.durationMs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
