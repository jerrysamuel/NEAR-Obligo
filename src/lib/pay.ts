import { getServiceSupabase } from "@/infrastructure/supabase/client";
import { decidePayment, DecidePaymentInput } from "./decide-payment";
import { centsToUnits } from "./money";
import { withdraw, createIdempotencyKey } from "./agentApi";
import { recordInvoiceEvent } from "./invoice-events";
import { directUsdtTransfer } from "@/infrastructure/near/autonomous-worker";

export interface ProcessInvoiceResult {
  invoiceId: string;
  decision: "pay" | "needs_approval" | "refuse";
  reason: string;
  status: string;
  attemptId?: string;
  txRef?: string;
}

function describePaymentError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") {
    const trimmed = error.trim();
    return trimmed && trimmed !== "{}" ? trimmed : "Unknown NEAR execution error";
  }
  const candidate = error as any;
  if (candidate?.message) return String(candidate.message);
  if (candidate?.cause?.message) return String(candidate.cause.message);
  try {
    const serialized = JSON.stringify(error);
    return serialized && serialized !== "{}" ? serialized : "Unknown NEAR execution error";
  } catch {
    return "Unknown NEAR execution error";
  }
}

/**
 * The payment pipeline (Section 7.4 of Build Spec)
 *
 * 1. Lock: update status to 'verified' where status in ('generated','authorised')
 * 2. Gather: vendor, obligation, policy, monthly settled spend, duplicate check, agents.soft_paused
 * 3. Decide: call decidePayment (or bypass if overrideApproval is true)
 * 4. Audit: write an audit_log row for every decision
 * 5. Refuse: status 'refused' with refusal_reason
 * 6. Needs Approval: status 'needs_approval'
 * 7. Pay: insert payment_attempts (created, idempotency_key), call Agent API withdraw action, update attempt and invoice
 * 8. Settle: report final success, invoice 'settled', store transaction reference
 */
export async function processInvoice(
  invoiceId: string,
  options?: { overrideApproval?: boolean; actor?: string }
): Promise<ProcessInvoiceResult> {
  const admin = getServiceSupabase();
  if (!admin) {
    return {
      invoiceId,
      decision: "refuse",
      reason: "PAYMENT_BACKEND_NOT_CONFIGURED",
      status: "failed",
    };
  }

  // 1. Lock: atomic update to 'verified'
  const { data: lockedInvoice, error: lockErr } = await admin
    .from("invoices")
    .update({ status: "verified" })
    .eq("id", invoiceId)
    .in("status", ["generated", "authorised", "needs_approval"])
    .select("*, obligations(*), vendors(*)")
    .maybeSingle();

  if (lockErr || !lockedInvoice) {
    // Another worker has it, or invoice is not in a processable state
    const { data: currentInv } = await admin
      .from("invoices")
      .select("status, refusal_reason")
      .eq("id", invoiceId)
      .single();

    return {
      invoiceId,
      decision: currentInv?.status === "settled" ? "pay" : "refuse",
      reason: currentInv?.refusal_reason || "ALREADY_PROCESSING",
      status: currentInv?.status || "processing",
    };
  }

  const invoice = lockedInvoice;
  const obligation = (invoice as any).obligations;
  const vendor = (invoice as any).vendors;

  // 2. Gather context
  const { data: agent } = await admin
    .from("agents")
    .select("soft_paused, agent_id, grant_token_enc")
    .limit(1)
    .maybeSingle();

  const isSoftPaused = Boolean(agent?.soft_paused);
  const agentId = agent?.agent_id;
  const grantToken = agent?.grant_token_enc;

  const { data: policy } = await admin
    .from("policies")
    .select("per_tx_cap, monthly_limit, expires_at, frozen")
    .limit(1)
    .maybeSingle();

  const activePolicy = policy || {
    per_tx_cap: 100, // $1.00
    monthly_limit: 500, // $5.00
    expires_at: new Date(Date.now() + 86400000 * 90).toISOString(),
    frozen: false,
  };

  // Calculate monthly settled spend
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: monthlyInvoices } = await admin
    .from("invoices")
    .select("amount")
    .eq("status", "settled")
    .gte("created_at", startOfMonth.toISOString());

  const monthlySpentSoFar = (monthlyInvoices || []).reduce(
    (sum: number, row: any) => sum + (Number(row.amount) || 0),
    0
  );

  // Check duplicate invoice (vendor_id + invoice_number)
  let duplicateExists = false;
  if (invoice.invoice_number) {
    const { count } = await admin
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("vendor_id", invoice.vendor_id)
      .eq("invoice_number", invoice.invoice_number)
      .neq("id", invoice.id);
    duplicateExists = Boolean(count && count > 0);
  }

  // 3. Decide: evaluate with decidePayment
  let decisionResult: { decision: "pay" | "needs_approval" | "refuse"; reason: string };

  if (options?.overrideApproval) {
    // Payer explicitly reviewed and approved this invoice
    decisionResult = { decision: "pay", reason: "PAYER_MANUAL_APPROVAL" };
  } else {
    // Soft pause check halts payments immediately with AGENT_FROZEN
    if (isSoftPaused) {
      decisionResult = { decision: "refuse", reason: "AGENT_FROZEN" };
    } else {
      const decisionInput: DecidePaymentInput = {
        invoice: {
          amount: Number(invoice.amount),
          wallet_address: invoice.wallet_address,
          invoice_number: invoice.invoice_number,
          due_date: invoice.due_date,
        },
        vendor: {
          wallet_address: vendor.wallet_address,
          wallet_verified: Boolean(vendor.wallet_verified),
        },
        obligation: {
          expected_amount: Number(obligation.expected_amount || obligation.rate_cents),
          max_amount: Number(obligation.max_amount),
          tolerance_pct: Number(obligation.tolerance_pct || 0),
          auto_pay: Boolean(obligation.auto_pay),
          status: obligation.status,
        },
        policy: {
          per_tx_cap: Number(activePolicy.per_tx_cap),
          monthly_limit: Number(activePolicy.monthly_limit),
          expires_at: activePolicy.expires_at,
          frozen: Boolean(activePolicy.frozen),
        },
        monthlySpentSoFar,
        duplicateExists,
        now: new Date().toISOString(),
      };

      decisionResult = decidePayment(decisionInput);
    }
  }

  // 4. Audit: write audit_log row for every decision
  await admin.from("audit_log").insert({
    actor: options?.actor || (options?.overrideApproval ? "payer" : "agent"),
    action: "EVALUATE_INVOICE",
    invoice_id: invoice.id,
    decision: decisionResult.decision,
    reason: decisionResult.reason,
  });

  // 5. Refuse
  if (decisionResult.decision === "refuse") {
    await admin
      .from("invoices")
      .update({
        status: "refused",
        refusal_reason: decisionResult.reason,
      })
      .eq("id", invoice.id);
    await recordInvoiceEvent({ invoiceId: invoice.id, type: "invoice.refused", status: "refused", payload: { reason: decisionResult.reason } });

    return {
      invoiceId: invoice.id,
      decision: "refuse",
      reason: decisionResult.reason,
      status: "refused",
    };
  }

  // 6. Needs Approval
  if (decisionResult.decision === "needs_approval") {
    await admin
      .from("invoices")
      .update({
        status: "needs_approval",
        refusal_reason: decisionResult.reason,
      })
      .eq("id", invoice.id);
    await recordInvoiceEvent({ invoiceId: invoice.id, type: "invoice.needs_approval", status: "needs_approval", payload: { reason: decisionResult.reason } });

    return {
      invoiceId: invoice.id,
      decision: "needs_approval",
      reason: decisionResult.reason,
      status: "needs_approval",
    };
  }

  // 7. Pay: insert payment_attempts & call Agent API withdraw
  const idempotencyKey = createIdempotencyKey();
  const { data: attempt } = await admin
    .from("payment_attempts")
    .insert({
      invoice_id: invoice.id,
      idempotency_key: idempotencyKey,
      amount: invoice.amount,
      status: "created",
    })
    .select("id")
    .single();

  const attemptId = attempt?.id;
  const rawUnits = centsToUnits(invoice.amount);

  let agentOpRef: string | undefined;
  let txRef: string | undefined;
  let callSucceeded = false;
  let callSubmitted = false;
  let paymentFailureDetail = "PAYMENT_FAILED";
  const hasAgentApiCredentials = Boolean(process.env.NEAR_INTENTS_AGENT_API_KEY?.trim());
  const hasAutonomousWorker = Boolean(
    process.env.NEAR_AUTONOMOUS_ACCOUNT_ID?.trim() &&
    process.env.NEAR_AUTONOMOUS_PRIVATE_KEY?.trim()
  );

  try {
    // Prefer the configured self-hosted worker. This prevents stale/demo Agent
    // rows or a newly available Agent API key from diverting production payouts.
    if (hasAutonomousWorker) {
      const direct = await directUsdtTransfer({
        recipient: vendor.wallet_address,
        amount: rawUnits,
        invoiceId: invoice.id,
      });
      txRef = direct.transactionHash;
      agentOpRef = `near-direct:${direct.transactionHash}`;
      callSucceeded = true;
      callSubmitted = true;
    } else if (hasAgentApiCredentials && agentId && grantToken) {
      const withdrawRes = await withdraw(
        agentId,
        {
          asset: "nep141:usdt.tether-token.near",
          amount: rawUnits,
          chain: "near",
          recipient: vendor.wallet_address,
        },
        grantToken,
        idempotencyKey
      );

      if (withdrawRes) {
        agentOpRef = (withdrawRes as any).operation_id;
        txRef = (withdrawRes as any).tx_ref;
        const providerStatus = String((withdrawRes as any).status || "").toLowerCase();
        callSucceeded = Boolean(txRef && ["success", "succeeded", "settled", "completed"].includes(providerStatus));
        callSubmitted = Boolean(agentOpRef || txRef);
      }
    } else {
      throw new Error("Neither Agent API credentials nor autonomous worker credentials are configured");
    }
  } catch (apiErr: any) {
    paymentFailureDetail = `PAYMENT_FAILED: ${describePaymentError(apiErr).slice(0, 240)}`;
    console.warn("[processInvoice] Agent withdraw API execution:", paymentFailureDetail);
  }

  if (callSubmitted && !callSucceeded) {
    await admin.from("payment_attempts").update({
      status: "submitted",
      agent_operation_ref: agentOpRef,
      tx_ref: txRef,
    }).eq("id", attemptId);
    await admin.from("invoices").update({ status: "submitted", refusal_reason: null }).eq("id", invoice.id);
    await recordInvoiceEvent({ invoiceId: invoice.id, type: "payment.submitted", status: "submitted", payload: { operation_id: agentOpRef, tx_ref: txRef } });
    return {
      invoiceId: invoice.id,
      decision: "pay",
      reason: "PAYMENT_SUBMITTED",
      status: "submitted",
      attemptId,
      txRef,
    };
  }

  if (callSucceeded) {
    // 8. Settle: only when status is successful
    await admin
      .from("payment_attempts")
      .update({
        status: "settled",
        agent_operation_ref: agentOpRef,
        tx_ref: txRef,
      })
      .eq("id", attemptId);

    await admin
      .from("invoices")
      .update({
        status: "settled",
        refusal_reason: null,
      })
      .eq("id", invoice.id);
    await recordInvoiceEvent({ invoiceId: invoice.id, type: "payment.settled", status: "settled", payload: { operation_id: agentOpRef, tx_ref: txRef } });

    await admin.from("audit_log").insert({
      actor: process.env.NEAR_AUTONOMOUS_ACCOUNT_ID && !hasAgentApiCredentials ? "autonomous-worker" : "agent",
      action: "SETTLE_PAYMENT",
      invoice_id: invoice.id,
      decision: "settled",
      reason: `Paid ${vendor.name} (${vendor.wallet_address}) ${rawUnits} units USDT. Op: ${agentOpRef}. Tx: ${txRef}`,
    });

    return {
      invoiceId: invoice.id,
      decision: "pay",
      reason: "OK",
      status: "settled",
      attemptId,
      txRef,
    };
  } else {
    await admin
      .from("payment_attempts")
      .update({ status: "failed" })
      .eq("id", attemptId);

    await admin
      .from("invoices")
      .update({ status: "failed", refusal_reason: "PAYMENT_FAILED" })
      .eq("id", invoice.id);
    await admin.from("audit_log").insert({
      actor: process.env.NEAR_AUTONOMOUS_ACCOUNT_ID && !hasAgentApiCredentials ? "autonomous-worker" : "agent",
      action: "SETTLE_PAYMENT",
      invoice_id: invoice.id,
      decision: "refuse",
      reason: paymentFailureDetail,
    });
    await recordInvoiceEvent({ invoiceId: invoice.id, type: "payment.failed", status: "failed", payload: { reason: "PAYMENT_FAILED" } });

    return {
      invoiceId: invoice.id,
      decision: "refuse",
      reason: "PAYMENT_FAILED",
      status: "failed",
    };
  }
}
