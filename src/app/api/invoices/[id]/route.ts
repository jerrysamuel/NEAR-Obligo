import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(
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
    const { data: invoice, error } = await admin
      .from("invoices")
      .select("*, obligations(*), vendors(*), payment_attempts(*)")
      .eq("id", invoiceId)
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Also fetch audit log entries for timeline
    const { data: auditLogs } = await admin
      .from("audit_log")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      invoice,
      auditLogs: auditLogs || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
