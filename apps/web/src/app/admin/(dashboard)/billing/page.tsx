"use client";

import { AdminLoading } from "@/components/admin/ui/admin-loading";
import { useEffect, useState } from "react";

type Plan = { id: string; label: string; shops: number; keys: number; monthlyCalls: number; priceUsd: number };

const FALLBACK: Plan[] = [
  { id: "free", label: "Free", shops: 2, keys: 3, monthlyCalls: 1000, priceUsd: 0 },
  { id: "pro", label: "Pro", shops: 10, keys: 20, monthlyCalls: 50000, priceUsd: 29 },
  { id: "business", label: "Business", shops: 50, keys: 100, monthlyCalls: 500000, priceUsd: 99 },
];

export default function BillingPage() {
  const [current, setCurrent] = useState<string>("free");
  const [used, setUsed] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/usage")
      .then((response) => response.json())
      .then((body) => {
        setCurrent(body.plan.id);
        setUsed(body.used);
        setReady(true);
      });
  }, []);

  if (!ready) return <AdminLoading message="Loading plan…" />;

  return (
    <div className="admin-content space-y-5">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Billing</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {FALLBACK.map((plan) => {
          const active = plan.id === current;
          return (
            <div key={plan.id} className={`admin-card admin-card-body ${active ? "ring-2 ring-brand-500" : ""}`}>
              <p className="text-sm font-medium text-gray-500">{plan.label}</p>
              <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                {plan.priceUsd === 0 ? "Free" : `$${plan.priceUsd}`}
                {plan.priceUsd > 0 && <span className="text-base font-normal text-gray-500"> / month</span>}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>{plan.shops} shops</li>
                <li>{plan.keys} API keys</li>
                <li>{plan.monthlyCalls.toLocaleString()} MCP calls / month</li>
              </ul>
              <button
                type="button"
                disabled
                className="mt-5 h-10 w-full rounded-lg bg-gray-100 text-sm font-medium text-gray-500 dark:bg-white/10"
              >
                {active ? `Current plan · ${used.toLocaleString()} calls used` : "Upgrade unavailable"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
