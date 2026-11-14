import { getServiceSupabase } from "@/infrastructure/supabase/client";

export type InvoiceEventType =
  | "invoice.created"
  | "invoice.evaluated"
  | "invoice.needs_approval"
  | "invoice.refused"
  | "payment.submitted"
  | "payment.settled"
  | "payment.failed";

/** Writes an append-only lifecycle event. Event persistence never blocks payment. */
export async function recordInvoiceEvent(input: {
  invoiceId: string;
  type: InvoiceEventType;
  status?: string;
  payload?: Record<string, unknown>;
}) {
  const admin = getServiceSupabase();
  if (!admin) return;

  const { data: event, error } = await admin.from("invoice_events").insert({
    invoice_id: input.invoiceId,
    event_type: input.type,
    status: input.status || null,
    payload: input.payload || {},
  }).select("id").single();

  if (error) {
    console.warn("[invoice-events] Could not persist event:", error.message);
    return;
  }

  const endpoint = process.env.NEARBLIGO_WEBHOOK_URL;
  if (endpoint && event?.id) {
    await admin.from("webhook_deliveries").insert({
      event_id: event.id,
      endpoint,
      status: "pending",
    });
  }
}
