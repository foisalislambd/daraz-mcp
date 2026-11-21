export const PLANS = {
  free: { id: "free", label: "Free", shops: 2, keys: 3, monthlyCalls: 1_000, priceUsd: 0 },
  pro: { id: "pro", label: "Pro", shops: 10, keys: 20, monthlyCalls: 50_000, priceUsd: 29 },
  business: {
    id: "business",
    label: "Business",
    shops: 50,
    keys: 100,
    monthlyCalls: 500_000,
    priceUsd: 99,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlan(id: string) {
  if (id in PLANS) return PLANS[id as PlanId];
  return PLANS.free;
}
