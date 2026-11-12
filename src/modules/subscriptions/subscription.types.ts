import { Subscription } from "@/infrastructure/store/persistent-store";

export type { Subscription };

export interface SubscriptionStats {
  monthlyTotal: number;
  annualizedTotal: number;
  activeCount: number;
  upcomingCount: number;
  byCategory: Record<string, number>;
}

export interface UpcomingRenewal {
  id: string;
  name: string;
  provider: string;
  amount: number;
  currency: string;
  nextBillingDate: string;
  daysRemaining: number;
}
