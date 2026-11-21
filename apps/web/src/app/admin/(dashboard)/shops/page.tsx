"use client";

import { AdminLoading } from "@/components/admin/ui/admin-loading";
import { FormEvent, useEffect, useState } from "react";

type Shop = {
  id: string;
  label: string;
  region: string;
  sellerId: string | null;
  status: string;
};

const inputClass =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900";

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[] | null>(null);
  const [platform, setPlatform] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [region, setRegion] = useState("BD");
  const [appKey, setAppKey] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState("");

  async function load() {
    const response = await fetch("/api/shops");
    const body = await response.json();
    setShops(body.shops);
    setPlatform(Boolean(body.platformAppConfigured));
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    void fetch("/api/shops")
      .then((response) => response.json())
      .then((body) => {
        setShops(body.shops);
        setPlatform(Boolean(body.platformAppConfigured));
        if (body.redirectUri) setRedirectUri(String(body.redirectUri));
        if (params.get("connected")) setNotice("Shop connected.");
        if (params.get("error")) {
          setError("Daraz authorization did not finish. Check the redirect URI registered on the app.");
        }
      })
      .catch(() => setError("Could not load shops"));
  }, []);

  async function connect(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/shops", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label, region, appKey, appSecret }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Could not start Daraz login");
      return;
    }
    window.location.href = body.url as string;
  }

  async function disconnect(id: string) {
    if (!window.confirm("Disconnect this shop and delete its stored tokens?")) return;
    await fetch(`/api/shops?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  if (!shops) return <AdminLoading message="Loading shops…" />;

  return (
    <div className="admin-content space-y-5">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Shops</h1>
      <ol className="admin-card admin-card-body list-decimal space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">
        <li>Create an app at open.daraz.com and copy the app key and secret.</li>
        <li>
          Register this callback on the app
          {redirectUri ? (
            <>
              : <code className="text-gray-900 dark:text-white">{redirectUri}</code>
            </>
          ) : (
            " before you connect."
          )}
        </li>
        <li>Choose the Daraz country, then Connect Daraz and approve the seller login.</li>
      </ol>
      {notice && <p className="text-sm text-success-600">{notice}</p>}
      {error && <p className="text-sm text-error-500">{error}</p>}

      <form onSubmit={connect} className="admin-card admin-card-body grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Shop label</label>
          <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Region</label>
          <select className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="BD">Bangladesh</option>
            <option value="PK">Pakistan</option>
            <option value="LK">Sri Lanka</option>
            <option value="NP">Nepal</option>
            <option value="MM">Myanmar</option>
          </select>
        </div>
        {!platform && (
          <>
            <div>
              <label className="mb-1.5 block text-sm font-medium">App key</label>
              <input className={inputClass} value={appKey} onChange={(e) => setAppKey(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">App secret</label>
              <input className={inputClass} type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} required />
            </div>
          </>
        )}
        <div className="md:col-span-2">
          <button className="h-11 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600" type="submit">
            Connect Daraz
          </button>
          <p className="mt-2 text-xs text-gray-500">
            {platform
              ? "This server uses the platform Daraz app. You will sign in as the seller."
              : "Register the callback shown after submit on your Daraz app. Secrets are encrypted before they are stored."}
          </p>
        </div>
      </form>

      <div className="admin-card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Shop</th>
              <th className="px-4 py-3 font-medium">Region</th>
              <th className="px-4 py-3 font-medium">Seller</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {shops.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-gray-500" colSpan={5}>
                  No shops yet. Finish the three steps above. Each country is a separate seller login.
                </td>
              </tr>
            )}
            {shops.map((shop) => (
              <tr key={shop.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{shop.label}</td>
                <td className="px-4 py-3">{shop.region}</td>
                <td className="px-4 py-3">{shop.sellerId || "—"}</td>
                <td className="px-4 py-3 capitalize">{shop.status}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="text-sm font-medium text-error-500" onClick={() => disconnect(shop.id)}>
                    Disconnect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
