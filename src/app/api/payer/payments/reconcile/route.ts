import { NextResponse } from "next/server";
import { getStatus } from "@/lib/agentApi";
import { getServiceSupabase } from "@/infrastructure/supabase/client";
import { recordInvoiceEvent } from "@/lib/invoice-events";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = getServiceSupabase();
  if (!admin) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { data: attempts } = await admin
    .from("payment_attempts")
    .select("id, invoice_id, agent_operation_ref")
    .eq("status", "submitted")
    .not("agent_operation_ref", "is", null)
    .limit(50);

  let settled = 0;
  let failed = 0;
  for (const attempt of attempts || []) {
    try {
      const result: any = await getStatus(attempt.agent_operation_ref, 1000);
      const status = String(result?.status || result?.result?.status || result?.operation?.status || "").toLowerCase();
      const txRef = result?.tx_ref || result?.result?.tx_ref || result?.transaction_hash || result?.result?.transaction_hash;
      const isSettled = ["success", "succeeded", "settled", "completed"].includes(status);
      const isFailed = ["failed", "refunded", "cancelled", "canceled"].includes(status);
      if (!isSettled && !isFailed) continue;

      const nextStatus = isSettled ? "settled" : "failed";
      await admin.from("payment_attempts").update({ status: nextStatus, tx_ref: txRef || null }).eq("id", attempt.id);
      await admin.from("invoices").update({ status: nextStatus, refusal_reason: isFailed ? "PAYMENT_FAILED" : null }).eq("id", attempt.invoice_id);
      await recordInvoiceEvent({
        invoiceId: attempt.invoice_id,
        type: isSettled ? "payment.settled" : "payment.failed",
        status: nextStatus,
        payload: { operation_id: attempt.agent_operation_ref, tx_ref: txRef, provider_status: status },
      });
      if (isSettled) settled++;
      else failed++;
    } catch (error) {
      console.warn(`[reconcile] Could not inspect ${attempt.agent_operation_ref}:`, error);
    }
  }

  return NextResponse.json({ inspected: attempts?.length || 0, settled, failed });
}
