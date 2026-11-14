export interface ProductPreferences {
  minimum_rating: number;
  minimum_review_count: number;
  consider_verified_reviews: boolean;
  consider_review_recency: boolean;
  analyse_negative_reviews: boolean;
  prefer_reputable_sellers: boolean;
}

export interface MerchantPreferences {
  prefer_verified_merchants: boolean;
  exclude_unsupported_merchants: boolean;
  allowed_merchants?: string[];
  blocked_merchants?: string[];
}

export interface ShippingPreferences {
  delivery_address_id: string;
  prefer_reliable_delivery: boolean;
  maximum_delivery_days: number;
}

export interface PaymentPreferences {
  automatically_select_available_assets: boolean;
  allow_asset_conversion: boolean;
  prefer_lowest_total_conversion_cost: boolean;
  maximum_conversion_slippage_bps?: number; // e.g. 100 bps = 1%
  max_conversion_fee_usd?: number;
}

export interface UserSpendingPolicy {
  id: string;
  userId: string;
  currency: string;
  maximum_transaction: number;
  daily_spending_limit: number;
  monthly_spending_limit: number;
  spent_today: number;
  spent_this_month: number;
  product_preferences: ProductPreferences;
  merchant_preferences: MerchantPreferences;
  shipping_preferences: ShippingPreferences;
  payment_preferences: PaymentPreferences;
  autonomous_execution: boolean;
  allowed_categories?: string[];
  blocked_categories?: string[];
  expires_at?: string;
  near_permission_hash?: string;
  near_tx_hash?: string;
  updated_at: string;
}

export interface PolicyEvaluationResult {
  isPermitted: boolean;
  violations: string[];
  evaluatedAmount: number;
  remainingDailyBudget: number;
  remainingMonthlyBudget: number;
  requiresExplicitConfirmation: boolean;
}
