export function formatCurrency(amount: number, currency: string = "NGN"): string {
  if (currency === "NGN") {
    return `₦${amount.toLocaleString()}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

export const BILLING_MULTIPLIERS = {
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
} as const;

export type BillingCycle = keyof typeof BILLING_MULTIPLIERS;

export function calculateMonthlyEquivalent(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case "weekly":
      return Math.round((amount * 52) / 12);
    case "monthly":
      return amount;
    case "quarterly":
      return Math.round(amount / 3);
    case "yearly":
      return Math.round(amount / 12);
    default:
      return amount;
  }
}

export function calculateAnnualCost(amount: number, cycle: BillingCycle): number {
  return amount * (BILLING_MULTIPLIERS[cycle] || 12);
}
