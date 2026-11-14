export interface DecidePaymentInvoice {
  amount: number;
  wallet_address?: string;
  vendor_wallet?: string;
  invoice_number?: string;
  due_date?: string;
}

export interface DecidePaymentVendor {
  wallet_address: string;
  wallet_verified: boolean;
}

export interface DecidePaymentObligation {
  expected_amount: number;
  max_amount: number;
  tolerance_pct: number;
  auto_pay: boolean;
  status: "active" | "paused" | string;
}

export interface DecidePaymentPolicy {
  per_tx_cap: number;
  monthly_limit: number;
  expires_at: string | Date | number;
  frozen: boolean;
}

export interface DecidePaymentInput {
  invoice: DecidePaymentInvoice;
  vendor: DecidePaymentVendor;
  obligation: DecidePaymentObligation;
  policy: DecidePaymentPolicy;
  monthlySpentSoFar: number;
  duplicateExists: boolean;
  now: string | Date | number;
}

export interface DecidePaymentResult {
  decision: "pay" | "needs_approval" | "refuse";
  reason: string;
}

/**
 * Pure function evaluating payment decisions with deterministic integer arithmetic.
 * Returns at the first failure check in strict order (1 to 10).
 */
export function decidePayment(input: DecidePaymentInput): DecidePaymentResult {
  const {
    invoice,
    vendor,
    obligation,
    policy,
    monthlySpentSoFar,
    duplicateExists,
    now,
  } = input;

  // 1. policy.frozen -> refuse, 'AGENT_FROZEN'
  if (policy.frozen) {
    return { decision: "refuse", reason: "AGENT_FROZEN" };
  }

  // 2. policy.expires_at <= now -> refuse, 'MANDATE_EXPIRED'
  const expiresAtMs = new Date(policy.expires_at).getTime();
  const nowMs = new Date(now).getTime();
  if (expiresAtMs <= nowMs) {
    return { decision: "refuse", reason: "MANDATE_EXPIRED" };
  }

  // 3. obligation.status is not 'active' -> refuse, 'OBLIGATION_INACTIVE'
  if (obligation.status !== "active") {
    return { decision: "refuse", reason: "OBLIGATION_INACTIVE" };
  }

  // 4. duplicateExists -> refuse, 'DUPLICATE_INVOICE'
  if (duplicateExists) {
    return { decision: "refuse", reason: "DUPLICATE_INVOICE" };
  }

  // 5. invoice wallet differs from vendor.wallet_address, or vendor.wallet_verified is false -> refuse, 'WALLET_MISMATCH'
  const invoiceWallet = invoice.wallet_address ?? invoice.vendor_wallet ?? "";
  if (invoiceWallet !== vendor.wallet_address || !vendor.wallet_verified) {
    return { decision: "refuse", reason: "WALLET_MISMATCH" };
  }

  // 6. amount > policy.per_tx_cap -> refuse, 'OVER_TX_CAP'
  if (invoice.amount > policy.per_tx_cap) {
    return { decision: "refuse", reason: "OVER_TX_CAP" };
  }

  // 7. monthlySpentSoFar + amount > policy.monthly_limit -> refuse, 'OVER_MONTHLY_LIMIT'
  if (monthlySpentSoFar + invoice.amount > policy.monthly_limit) {
    return { decision: "refuse", reason: "OVER_MONTHLY_LIMIT" };
  }

  // 8. amount > obligation.max_amount, or amount differs from expected_amount by more than tolerance_pct -> needs_approval, 'VARIANCE'
  const diff = Math.abs(invoice.amount - obligation.expected_amount);
  const exceedsTolerance =
    diff * 100 > obligation.expected_amount * obligation.tolerance_pct;
  if (invoice.amount > obligation.max_amount || exceedsTolerance) {
    return { decision: "needs_approval", reason: "VARIANCE" };
  }

  // 9. obligation.auto_pay is false -> needs_approval, 'AUTO_PAY_OFF'
  if (!obligation.auto_pay) {
    return { decision: "needs_approval", reason: "AUTO_PAY_OFF" };
  }

  // 10. otherwise -> pay, 'OK'
  return { decision: "pay", reason: "OK" };
}
