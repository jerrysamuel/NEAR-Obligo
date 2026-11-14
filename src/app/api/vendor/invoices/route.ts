import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getServiceSupabase } from "@/infrastructure/supabase/client";
import { processInvoice } from "@/lib/pay";
import { recordInvoiceEvent } from "@/lib/invoice-events";

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();
  try {
    const admin = getServiceSupabase();
    if (!admin) {
      return NextResponse.json({ invoices: [] });
    }

    const { data: invoices, error } = await admin
      .from("invoices")
      .select("*, obligations(*), vendors(*)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invoices: invoices || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  noStore();
  try {
    const body = await req.json();
    const { obligation_id, quantity, invoice_number, due_date, vendor_id } = body;

    const admin = getServiceSupabase();
    if (!admin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 1. Look up obligation
    let obligationQuery = admin.from("obligations").select("*, vendors(*)");
    if (obligation_id) {
      obligationQuery = obligationQuery.eq("id", obligation_id);
    }
    const { data: obligations, error: oblErr } = await obligationQuery.limit(1);

    if (oblErr || !obligations || obligations.length === 0) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    const obligation = obligations[0];
    const qty = Math.max(1, parseInt(quantity || 1, 10));
    const rateCents = Number(obligation.rate_cents) || 20;
    const totalAmount = qty * rateCents;

    // 2. Identify vendor
    let vendor = obligation.vendors;
    if (!vendor) {
      const vId = vendor_id || obligation.vendor_id;
      const { data: vData } = await admin
        .from("vendors")
        .select("*")
        .eq("id", vId)
        .maybeSingle();
      vendor = vData;
    }

    const vendorAddress = vendor?.wallet_address || "aurora.near";
    const invNumber =
      invoice_number ||
      `INV-${Date.now().toString().slice(-6)}`;
    const dueDate =
      due_date || new Date(Date.now() + 86400000 * 14).toISOString().split("T")[0];

    // 3. Create invoice with source='form', status='generated'
    const timestamp = Date.now();
    const periodKey = `${new Date().toISOString().slice(0, 7)}-${timestamp}`;
    const reference = `REF-${invNumber}`;

    const { data: newInvoice, error: invErr } = await admin
      .from("invoices")
      .insert({
        vendor_id: vendor?.id || obligation.vendor_id,
        obligation_id: obligation.id,
        invoice_number: invNumber,
        reference,
        period_key: periodKey,
        amount: totalAmount,
        due_date: dueDate,
        source: "form",
        status: "generated",
        wallet_address: vendorAddress,
      })
      .select("*, obligations(*), vendors(*)")
      .single();

    if (invErr || !newInvoice) {
      return NextResponse.json(
        { error: invErr?.message || "Failed to create invoice" },
        { status: 500 }
      );
    }

    await recordInvoiceEvent({
      invoiceId: newInvoice.id,
      type: "invoice.created",
      status: "generated",
      payload: { source: "form", invoice_number: invNumber },
    });

    // 4. Run payment pipeline immediately
    const pipelineResult = await processInvoice(newInvoice.id);

    // 5. Fetch updated invoice
    const { data: updatedInvoice } = await admin
      .from("invoices")
      .select("*, obligations(*), vendors(*), payment_attempts(*)")
      .eq("id", newInvoice.id)
      .single();

    return NextResponse.json({
      invoice: updatedInvoice || newInvoice,
      pipeline: pipelineResult,
    });
  } catch (err: any) {
    console.error("[POST /api/vendor/invoices] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process invoice submission" },
      { status: 500 }
    );
  }
}
