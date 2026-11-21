"use client";

import { RevenueChart } from "@/components/admin/dashboard/revenue-chart";
import { CopyForAiButton } from "@/components/admin/ui/copy-for-ai-button";
import { AdminLoading } from "@/components/admin/ui/admin-loading";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import { AlertTriangle, Package, ScrollText, ShoppingCart, Store } from "lucide-react";
import { useEffect, useState } from "react";

type Dashboard = {
  source: string;
  currency: string;
  stats: {
    salesToday: number;
    ordersToday: number;
    pendingOrders: number;
    lowStock: number;
    apiCallsMonth: number;
    apiLimit: number;
    shops: number;
  };
  chart: { label: string; revenue: number; orders: number }[];
  orders: { id: string; customer: string; amount: number; status: string; createdAt: string }[];
  lowStock: { sellerSku: string; available: number; itemId: string }[];
  shops: { id: string; label: string; region: string; status: string }[];
};

function Stat({
  label,
  value,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="admin-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl dark:text-white">
            {value}
          </p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [mcpUrl, setMcpUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/keys")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (body?.mcpUrl) setMcpUrl(String(body.mcpUrl));
      })
      .catch(() => undefined);
    fetch("/api/dashboard")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the dashboard");
        return response.json() as Promise<Dashboard>;
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, []);

  if (!data && !error) return <AdminLoading message="Loading dashboard…" />;
  if (error || !data) return <div className="admin-card admin-card-body text-sm text-error-500">{error}</div>;

  const money = (value: number) => formatCurrency(value, data.currency);

  return (
    <div className="admin-content space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Shop overview</h1>
        <span className="admin-chip w-fit">{data.shops.length} shop{data.shops.length === 1 ? "" : "s"}</span>
      </div>

      {data.shops.length === 0 && (
        <div className="admin-card admin-card-body">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Connect a shop</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
            <li>
              <Link className="font-medium text-brand-600" href="/admin/shops">
                Connect a Daraz country
              </Link>{" "}
              (Bangladesh, Pakistan, Sri Lanka, Nepal, or Myanmar).
            </li>
            <li>
              <Link className="font-medium text-brand-600" href="/admin/keys">
                Create an API key
              </Link>{" "}
              and copy the MCP URL.
            </li>
            <li>Paste the client config, or use Copy for AI and let an assistant finish setup.</li>
          </ol>
          <div className="mt-4">
            <CopyForAiButton mcpUrl={mcpUrl} />
          </div>
        </div>
      )}

      <div className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <Stat
          label="Sales today"
          value={money(data.stats.salesToday)}
          icon={<ShoppingCart className="h-5 w-5 text-brand-600" />}
          iconBg="bg-brand-50 dark:bg-brand-500/15"
        />
        <Stat
          label="Orders today"
          value={data.stats.ordersToday.toLocaleString()}
          icon={<Package className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-500/15"
        />
        <Stat
          label="Pending orders"
          value={data.stats.pendingOrders.toLocaleString()}
          icon={<Store className="h-5 w-5 text-amber-600" />}
          iconBg="bg-amber-50 dark:bg-amber-500/15"
        />
        <Stat
          label="Low stock"
          value={data.stats.lowStock.toLocaleString()}
          icon={<AlertTriangle className="h-5 w-5 text-error-500" />}
          iconBg="bg-error-50 dark:bg-error-500/15"
        />
        <Stat
          label="API usage"
          value={`${data.stats.apiCallsMonth.toLocaleString()} / ${data.stats.apiLimit.toLocaleString()}`}
          icon={<ScrollText className="h-5 w-5 text-emerald-600" />}
          iconBg="bg-emerald-50 dark:bg-emerald-500/15"
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart data={data.chart} currency={data.currency} title="Sales" />
        </div>
        <div className="admin-card">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Low stock</h2>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.lowStock.length === 0 && <li className="px-4 py-6 text-sm text-gray-500">No low-stock SKUs saved.</li>}
            {data.lowStock.map((item) => (
              <li key={item.sellerSku} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-gray-800 dark:text-gray-100">{item.sellerSku}</span>
                <span className="text-gray-500">{item.available} left</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="admin-card overflow-x-auto">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent orders</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((order) => (
              <tr key={order.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{order.id}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{order.customer}</td>
                <td className="px-4 py-3">{money(order.amount)}</td>
                <td className="px-4 py-3 capitalize">{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
