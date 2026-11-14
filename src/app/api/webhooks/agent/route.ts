import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/infrastructure/supabase/client";
import { recordInvoiceEvent } from "@/lib/invoice-events";

export const dynamic = "force-dynamic";

function validSignature(rawBody: string, signature: string | null) {
  const secret = process.env.NEAR_AGENT_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.replace(/^sha256=/, "");
  return received.length === expected.length && crypto.timingSafeEqual(
    Buffer.from(received),
    Buffer.from(expected)
  );
}

/** Provider-neutral callback endpoint for payment status reconciliation. */
export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!validSignature(rawBody, req.headers.get("x-obligo-signature"))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const invoiceId = body.invoice_id;
  const operationRef = body.operation_id || body.correlation_id;
  const status = String(body.status || "").toLowerCase();
  if (!invoiceId && !operationRef) {
    return NextResponse.json({ error: "invoice_id or operation_id is required" }, { status: 400 });
  }

  const admin = getServiceSupabase();
  if (!admin) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  let attemptQuery = admin.from("payment_attempts").select("id, invoice_id");
  if (invoiceId) attemptQuery = attemptQuery.eq("invoice_id", invoiceId);
  else attemptQuery = attemptQuery.eq("agent_operation_ref", operationRef);
  const { data: attempt } = await attemptQuery.maybeSingle();

  if (!attempt) return NextResponse.json({ error: "Payment attempt not found" }, { status: 404 });

  const settled = ["success", "succeeded", "settled", "completed"].includes(status);
  const failed = ["failed", "refunded", "cancelled", "canceled"].includes(status);
  const nextStatus = settled ? "settled" : failed ? "failed" : "submitted";
  const invoiceStatus = settled ? "settled" : failed ? "failed" : "submitted";

  await admin.from("payment_attempts").update({
    status: nextStatus,
    agent_operation_ref: operationRef || undefined,
    tx_ref: body.tx_ref || body.transaction_hash || undefined,
  }).eq("id", attempt.id);
  await admin.from("invoices").update({ status: invoiceStatus }).eq("id", attempt.invoice_id);

  await recordInvoiceEvent({
    invoiceId: attempt.invoice_id,
    type: settled ? "payment.settled" : failed ? "payment.failed" : "payment.submitted",
    status: invoiceStatus,
    payload: body,
  });

  return NextResponse.json({ received: true, invoice_id: attempt.invoice_id, status: invoiceStatus });
}
