import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getServiceSupabase } from "@/infrastructure/supabase/client";
import { processInvoice } from "@/lib/pay";

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
    // Check invoice exists
    const { data: invoice, error: findErr } = await admin
      .from("invoices")
      .select("*, vendors(*), obligations(*)")
      .eq("id", invoiceId)
      .single();

    if (findErr || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Call processInvoice with overrideApproval = true to bypass limits
    const result = await processInvoice(invoiceId, {
      overrideApproval: true,
      actor: "payer",
    });

    // Fetch updated invoice
    const { data: updatedInvoice } = await admin
      .from("invoices")
      .select("*, payment_attempts(*), obligations(*), vendors(*)")
      .eq("id", invoiceId)
      .single();

    return NextResponse.json({
      success: true,
      result,
      invoice: updatedInvoice,
    });
  } catch (err: any) {
    console.error("[POST /api/payer/invoices/[id]/approve] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to approve invoice" },
      { status: 500 }
    );
  }
}
