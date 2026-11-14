import fs from "fs";
import path from "path";
import { UserSpendingPolicy, PolicyEvaluationResult } from "./policy.types";
import { NearAuthorisationClient } from "@/infrastructure/near/near-client";

const DB_DIR = path.join(process.cwd(), ".data");
const POLICY_FILE = path.join(DB_DIR, "spending_policy.json");

const DEFAULT_POLICY: UserSpendingPolicy = {
  id: "policy_default",
  userId: "usr_default",
  currency: "USD",
  maximum_transaction: 100,
  daily_spending_limit: 300,
  monthly_spending_limit: 1000,
  spent_today: 0,
  spent_this_month: 0,
  product_preferences: {
    minimum_rating: 4.2,
    minimum_review_count: 30,
    consider_verified_reviews: true,
    consider_review_recency: true,
    analyse_negative_reviews: true,
    prefer_reputable_sellers: true,
  },
  merchant_preferences: {
    prefer_verified_merchants: true,
    exclude_unsupported_merchants: true,
  },
  shipping_preferences: {
    delivery_address_id: "addr_default_sf",
    prefer_reliable_delivery: true,
    maximum_delivery_days: 21,
  },
  payment_preferences: {
    automatically_select_available_assets: true,
    allow_asset_conversion: true,
    prefer_lowest_total_conversion_cost: true,
    maximum_conversion_slippage_bps: 100,
    max_conversion_fee_usd: 5.0,
  },
  autonomous_execution: true,
  updated_at: new Date().toISOString(),
};

export class SpendingPolicyEngine {
  private static ensureStorage(): Record<string, UserSpendingPolicy> {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(POLICY_FILE)) {
        const raw = fs.readFileSync(POLICY_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn("[SpendingPolicyEngine] Failed to read policy file, creating default:", err);
    }

    const initial = { usr_default: DEFAULT_POLICY };
    try {
      fs.writeFileSync(POLICY_FILE, JSON.stringify(initial, null, 2), "utf-8");
    } catch {}
    return initial;
  }

  private static saveStorage(data: Record<string, UserSpendingPolicy>) {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(POLICY_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("[SpendingPolicyEngine] Failed to persist policy file:", err);
    }
  }

  public static getPolicy(userId: string = "usr_default"): UserSpendingPolicy {
    const data = this.ensureStorage();
    if (!data[userId]) {
      data[userId] = { ...DEFAULT_POLICY, userId };
      this.saveStorage(data);
    }

    const policy = data[userId];
    // Automatically reset spent_today when day rolls over
    try {
      const lastDate = new Date(policy.updated_at).toDateString();
      const todayDate = new Date().toDateString();
      if (lastDate !== todayDate) {
        policy.spent_today = 0;
        const lastMonth = new Date(policy.updated_at).getMonth();
        const thisMonth = new Date().getMonth();
        if (lastMonth !== thisMonth) {
          policy.spent_this_month = 0;
        }
        policy.updated_at = new Date().toISOString();
        data[userId] = policy;
        this.saveStorage(data);
      }
    } catch {
      // Date parse fallback
    }

    return policy;
  }

  public static resetSpendCounters(userId: string = "usr_default") {
    const data = this.ensureStorage();
    if (data[userId]) {
      data[userId].spent_today = 0;
      data[userId].spent_this_month = 0;
      data[userId].updated_at = new Date().toISOString();
      this.saveStorage(data);
    }
  }

  public static async updatePolicy(
    userId: string,
    updates: Partial<UserSpendingPolicy>
  ): Promise<UserSpendingPolicy> {
    const data = this.ensureStorage();
    const current = data[userId] || { ...DEFAULT_POLICY, userId };

    // Strictly validate numeric limits to prevent zero or negative values
    const safeMaxTx = updates.maximum_transaction !== undefined
      ? Math.max(1, Number(updates.maximum_transaction) || 1)
      : current.maximum_transaction;

    const safeDaily = updates.daily_spending_limit !== undefined
      ? Math.max(safeMaxTx, Number(updates.daily_spending_limit) || safeMaxTx)
      : current.daily_spending_limit;

    const safeMonthly = updates.monthly_spending_limit !== undefined
      ? Math.max(safeDaily, Number(updates.monthly_spending_limit) || safeDaily)
      : current.monthly_spending_limit;

    const updated: UserSpendingPolicy = {
      ...current,
      ...updates,
      userId,
      maximum_transaction: safeMaxTx,
      daily_spending_limit: safeDaily,
      monthly_spending_limit: safeMonthly,
      updated_at: new Date().toISOString(),
    };

    // Anchor cryptographic permission hash on NEAR Testnet
    try {
      const authRecord = await NearAuthorisationClient.recordPermission({
        userId,
        actionType: "autonomous_spending_policy",
        spendingLimit: updated.maximum_transaction,
        currency: updated.currency,
        expirySeconds: 86400 * 30, // 30 days
      });
      updated.near_permission_hash = authRecord.permissionHash;
      updated.near_tx_hash = authRecord.transactionHash;
    } catch (e) {
      console.warn("[SpendingPolicyEngine] Failed to broadcast NEAR permission hash:", e);
    }

    data[userId] = updated;
    this.saveStorage(data);
    return updated;
  }

  /**
   * Deterministically evaluates whether a purchase can proceed under configured policy
   */
  public static evaluatePurchase(
    amount: number,
    merchantId: string,
    category?: string,
    conversionFeeUsd?: number,
    userId: string = "usr_default"
  ): PolicyEvaluationResult {
    const policy = this.getPolicy(userId);
    const violations: string[] = [];

    // 1. Policy Expiration Check
    if (policy.expires_at && new Date(policy.expires_at) < new Date()) {
      violations.push(`Policy expired on ${policy.expires_at}`);
    }

    // 2. Strict Per-Transaction Spending Limit
    if (amount > policy.maximum_transaction) {
      violations.push(
        `Purchase total ($${amount.toFixed(2)}) strictly exceeds your configured maximum per-transaction limit ($${policy.maximum_transaction.toFixed(2)})`
      );
    }

    // 3. Daily Spending Limit
    const newDailyTotal = policy.spent_today + amount;
    if (newDailyTotal > policy.daily_spending_limit) {
      violations.push(
        `Purchase would increase daily spending to $${newDailyTotal.toFixed(2)}, exceeding daily limit of $${policy.daily_spending_limit.toFixed(2)}`
      );
    }

    // 4. Monthly Spending Limit
    const newMonthlyTotal = policy.spent_this_month + amount;
    if (newMonthlyTotal > policy.monthly_spending_limit) {
      violations.push(
        `Purchase would increase monthly spending to $${newMonthlyTotal.toFixed(2)}, exceeding monthly limit of $${policy.monthly_spending_limit.toFixed(2)}`
      );
    }

    // 5. Merchant Restrictions
    if (policy.merchant_preferences.blocked_merchants?.includes(merchantId)) {
      violations.push(`Merchant '${merchantId}' is blocked by user policy`);
    }

    if (
      policy.merchant_preferences.allowed_merchants &&
      policy.merchant_preferences.allowed_merchants.length > 0 &&
      !policy.merchant_preferences.allowed_merchants.includes(merchantId)
    ) {
      violations.push(`Merchant '${merchantId}' is not in the user's allowed merchants whitelist`);
    }

    // 6. Category Restrictions
    if (category && policy.blocked_categories?.includes(category)) {
      violations.push(`Category '${category}' is blocked by spending policy`);
    }

    // 7. Max Conversion Fee Check
    if (
      conversionFeeUsd !== undefined &&
      policy.payment_preferences.max_conversion_fee_usd !== undefined &&
      conversionFeeUsd > policy.payment_preferences.max_conversion_fee_usd
    ) {
      violations.push(
        `Asset conversion fee ($${conversionFeeUsd.toFixed(2)}) exceeds maximum allowable fee ($${policy.payment_preferences.max_conversion_fee_usd.toFixed(2)})`
      );
    }

    const remainingDailyBudget = Math.max(0, policy.daily_spending_limit - policy.spent_today);
    const remainingMonthlyBudget = Math.max(0, policy.monthly_spending_limit - policy.spent_this_month);

    return {
      isPermitted: violations.length === 0,
      violations,
      evaluatedAmount: amount,
      remainingDailyBudget: parseFloat(remainingDailyBudget.toFixed(2)),
      remainingMonthlyBudget: parseFloat(remainingMonthlyBudget.toFixed(2)),
      requiresExplicitConfirmation: !policy.autonomous_execution,
    };
  }

  /**
   * Records a confirmed transaction and updates daily/monthly spend counters
   */
  public static recordConfirmedSpend(amount: number, userId: string = "usr_default") {
    const data = this.ensureStorage();
    const policy = data[userId] || { ...DEFAULT_POLICY, userId };
    policy.spent_today += amount;
    policy.spent_this_month += amount;
    policy.updated_at = new Date().toISOString();
    data[userId] = policy;
    this.saveStorage(data);
  }
}
