import { store, Subscription } from "@/infrastructure/store/persistent-store";
import { calculateMonthlyEquivalent, formatCurrency, BillingCycle } from "@/lib/format";
import { SubscriptionService } from "./subscription.service";

export interface SubscriptionInsightReport {
  summary: string;
  monthlyTotalFormatted: string;
  annualTotalFormatted: string;
  topSubscriptions: { name: string; monthlyCost: number; formatted: string }[];
  potentialSavings: {
    suggestion: string;
    amountToSave: number;
    formatted: string;
  };
  recommendations: string[];
}

export class SubscriptionInsightsEngine {
  public static generateInsights(userId?: string): SubscriptionInsightReport {
    const subs = store.getSubscriptions(userId).filter((s) => s.status === "active");
    const stats = SubscriptionService.getStats(userId);

    const sortedByCost = [...subs].map((s) => ({
      name: s.name,
      monthlyCost: calculateMonthlyEquivalent(s.amount, s.billingCycle as BillingCycle),
      category: s.category,
    })).sort((a, b) => b.monthlyCost - a.monthlyCost);

    const topSubscriptions = sortedByCost.slice(0, 3).map((s) => ({
      name: s.name,
      monthlyCost: s.monthlyCost,
      formatted: formatCurrency(s.monthlyCost),
    }));

    // Calculate potential savings if user pauses the top 2 expensive non-infrastructure subs or entertainment
    const potentialSavingSubs = sortedByCost.filter((s) => s.category.toLowerCase().includes("entertainment") || s.monthlyCost > 10000).slice(0, 2);
    const amountToSave = potentialSavingSubs.reduce((acc, curr) => acc + curr.monthlyCost, 0);

    const recommendations: string[] = [];
    if (stats.upcomingCount > 0) {
      recommendations.push(`You have ${stats.upcomingCount} subscription(s) renewing within the next 10 days.`);
    }
    if (topSubscriptions.length > 0) {
      recommendations.push(
        `Your largest recurring expense is ${topSubscriptions[0].name} at ${topSubscriptions[0].formatted}/mo.`
      );
    }
    if (amountToSave > 0) {
      recommendations.push(
        `Auditing ${potentialSavingSubs.map((s) => s.name).join(" and ")} could save up to ${formatCurrency(amountToSave)} monthly (${formatCurrency(amountToSave * 12)}/year).`
      );
    }

    return {
      summary: `You are currently spending ${formatCurrency(stats.monthlyTotal)} monthly (${formatCurrency(stats.annualizedTotal)} annualized) across ${stats.activeCount} active subscriptions.`,
      monthlyTotalFormatted: formatCurrency(stats.monthlyTotal),
      annualTotalFormatted: formatCurrency(stats.annualizedTotal),
      topSubscriptions,
      potentialSavings: {
        suggestion: potentialSavingSubs.map((s) => s.name).join(" + "),
        amountToSave,
        formatted: formatCurrency(amountToSave),
      },
      recommendations,
    };
  }
}
