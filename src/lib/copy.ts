/**
 * Nearbligo Copy & Plain-Language Dictionary (Section 8 & 12 of Build Spec)
 *
 * ABSOLUTE RULE: No technical jargon in the UI.
 * Never show: agent, policy, grant, signature, hash, chain, token, gas, webhook, idempotency.
 * Status always has text plus icon, never colour alone.
 */

export interface StatusPresentation {
  label: string;
  icon: "CheckCircle2" | "Clock" | "AlertCircle" | "XCircle" | "ArrowRight";
  variant: "paid" | "needs_approval" | "refused" | "info";
  className: string;
}

export const COPY_MAP: Record<string, string> = {
  // Lifecycle statuses
  generated: "Submitted",
  submitted: "Submitted",
  verified: "Checking your invoice",
  needs_approval: "Waiting for payer to review",
  authorised: "Payment on its way",
  settled: "Paid",
  refused: "Not paid",
  failed: "Not paid",

  // Failure reasons & errors
  AGENT_FROZEN: "Payments are paused",
  wallet_frozen: "Payments are paused",
  OVER_TX_CAP: "Over the limit for one invoice",
  policy_transaction_limit_exceeded: "Over the limit for one invoice",
  OVER_MONTHLY_LIMIT: "Monthly limit reached",
  spend_budget_exceeded: "Monthly limit reached",
  WALLET_MISMATCH: "Payout account not approved",
  policy_destination_denied: "Payout account not approved",
  DUPLICATE_INVOICE: "This invoice was already sent",
  VARIANCE: "Amount differs from the contract. Waiting for review",
  MANDATE_EXPIRED: "Payment permission expired. Payer must renew",
  agent_grant_required: "Payment permission expired. Payer must renew",
  policy_not_ready: "Still setting things up. Trying again shortly",
  wallet_busy: "Still setting things up. Trying again shortly",
  insufficient_balance: "Not enough funds. Payer needs to add funds",
  amount_too_low: "Invoice amount is below the network minimum",
  OBLIGATION_INACTIVE: "Contract is paused or inactive",
  AUTO_PAY_OFF: "Automatic payment is turned off for this contract",

  // Addendum errors
  intent_expired: "That took too long. Starting again...",
  policy_change_throttled: "Please wait before making another change",
  policy_revision_conflict: "Settings changed. Refreshing...",
  owner_key_not_full_access: "This account can't approve changes. Use the account you signed up with",
  signer_mismatch: "This account can't approve changes. Use the account you signed up with",
  policy_delegate_owner_mismatch: "This account can't approve changes. Use the account you signed up with",
  wallet_rpc_unavailable: "Still setting things up. Trying again shortly",
  owner_type_unsupported: "This sign-in method isn't available yet",
};

export function getPlainCopy(code: string, fallback?: string): string {
  if (!code) return fallback || "Pending";
  return COPY_MAP[code] || fallback || code;
}

export function getStatusPresentation(status: string): StatusPresentation {
  switch (status) {
    case "settled":
      return {
        label: "Paid",
        icon: "CheckCircle2",
        variant: "paid",
        className: "bg-emerald-500/10 text-[#34D399] border border-emerald-500/30",
      };
    case "needs_approval":
      return {
        label: "Waiting for review",
        icon: "Clock",
        variant: "needs_approval",
        className: "bg-amber-500/10 text-[#D97706] border border-amber-500/30",
      };
    case "refused":
    case "failed":
      return {
        label: "Not paid",
        icon: "XCircle",
        variant: "refused",
        className: "bg-red-500/10 text-[#DC2626] border border-red-500/30",
      };
    case "verified":
      return {
        label: "Checking your invoice",
        icon: "Clock",
        variant: "info",
        className: "bg-blue-500/10 text-[#2563EB] border border-blue-500/30",
      };
    case "authorised":
      return {
        label: "Payment on its way",
        icon: "ArrowRight",
        variant: "info",
        className: "bg-blue-500/10 text-[#2563EB] border border-blue-500/30",
      };
    case "generated":
    case "submitted":
    default:
      return {
        label: "Submitted",
        icon: "Clock",
        variant: "info",
        className: "bg-blue-500/10 text-[#2563EB] border border-blue-500/30",
      };
  }
}
