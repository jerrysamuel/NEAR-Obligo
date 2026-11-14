import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  noStore();
  const invoiceId = params.id;
  const admin = getServiceSupabase();

  if (!admin) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  }

  try {
    let reason = "REJECTED_BY_PAYER";
    try {
      const body = await req.json();
      if (body?.reason) reason = body.reason;
    } catch {
      // Body may be empty
    }

    const { data: updated, error } = await admin
      .from("invoices")
      .update({
        status: "refused",
        refusal_reason: reason,
      })
      .eq("id", invoiceId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await admin.from("audit_log").insert({
      actor: "payer",
      action: "REJECT_INVOICE",
      invoice_id: invoiceId,
      decision: "refuse",
      reason: `Payer rejected invoice: ${reason}`,
    });

    return NextResponse.json({ success: true, invoice: updated });
  } catch (err: any) {
    console.error("[POST /api/payer/invoices/[id]/reject] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reject invoice" },
      { status: 500 }
    );
  }
}
