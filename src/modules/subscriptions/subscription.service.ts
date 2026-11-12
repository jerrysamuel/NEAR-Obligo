import { store, Subscription } from "@/infrastructure/store/persistent-store";
import { calculateMonthlyEquivalent, calculateAnnualCost, BillingCycle } from "@/lib/format";
import { SubscriptionStats, UpcomingRenewal } from "./subscription.types";

export class SubscriptionService {
  public static getAll(userId?: string): Subscription[] {
    return store.getSubscriptions(userId);
  }

  public static getById(id: string, userId?: string): Subscription | null {
    return store.getSubscriptionById(id, userId);
  }

  public static create(
    data: Omit<Subscription, "id" | "createdAt" | "updatedAt">,
    userId?: string
  ): Subscription {
    return store.addSubscription({
      ...data,
      userId: userId || store.getDefaultUserId(),
    });
  }

  public static update(
    id: string,
    updates: Partial<Subscription>,
    userId?: string
  ): Subscription | null {
    return store.updateSubscription(id, updates, userId);
  }

  public static delete(id: string, userId?: string): boolean {
    return store.deleteSubscription(id, userId);
  }

  public static getStats(userId?: string): SubscriptionStats {
    const subs = store.getSubscriptions(userId).filter((s) => s.status === "active");

    let monthlyTotal = 0;
    let annualizedTotal = 0;
    const byCategory: Record<string, number> = {};

    const now = new Date();
    const tenDaysFromNow = new Date(now.getTime() + 10 * 86400000);
    let upcomingCount = 0;

    for (const sub of subs) {
      const monthly = calculateMonthlyEquivalent(sub.amount, sub.billingCycle as BillingCycle);
      const annual = calculateAnnualCost(sub.amount, sub.billingCycle as BillingCycle);

      monthlyTotal += monthly;
      annualizedTotal += annual;

      byCategory[sub.category] = (byCategory[sub.category] || 0) + monthly;

      const billingDate = new Date(sub.nextBillingDate);
      if (billingDate >= now && billingDate <= tenDaysFromNow) {
        upcomingCount++;
      }
    }

    return {
      monthlyTotal,
      annualizedTotal,
      activeCount: subs.length,
      upcomingCount,
      byCategory,
    };
  }

  public static getUpcomingRenewals(days: number = 30, userId?: string): UpcomingRenewal[] {
    const subs = store.getSubscriptions(userId).filter((s) => s.status === "active");
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 86400000);

    const renewals: UpcomingRenewal[] = [];

    for (const sub of subs) {
      const billingDate = new Date(sub.nextBillingDate);
      const diffTime = billingDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysRemaining >= 0 && billingDate <= threshold) {
        renewals.push({
          id: sub.id,
          name: sub.name,
          provider: sub.provider,
          amount: sub.amount,
          currency: sub.currency,
          nextBillingDate: sub.nextBillingDate,
          daysRemaining,
        });
      }
    }

    // Sort ascending by next billing date
    return renewals.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }
}
