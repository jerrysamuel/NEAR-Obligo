import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  noStore();
  try {
    const admin = getServiceSupabase();
    const vendorId = new URL(req.url).searchParams.get("vendor_id");
    if (!admin) {
      return NextResponse.json({
        vendor_name: "Contractor workspace",
        vendor_status: null,
        paid_this_month_cents: 0,
        contracts: [],
        invoices: [],
      });
    }

    let vendorStatus: string | null = null;
    let vendorName = "Contractor workspace";
    if (vendorId) {
      const { data: vendor } = await admin
        .from("vendors")
        .select("name, status")
        .eq("id", vendorId)
        .maybeSingle();
      vendorStatus = vendor?.status || null;
      vendorName = vendor?.name || vendorName;
    }

    // Fetch contracts (obligations)
    const { data: obligations } = await admin
      .from("obligations")
      .select("id, name, rate_cents, unit, frequency, max_amount, status")
      .eq("status", "active");

    // Fetch invoices
    const { data: invoices } = await admin
      .from("invoices")
      .select("id, invoice_number, amount, due_date, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    // Sum paid this month
    const paidSum = (invoices || [])
      .filter((inv) => inv.status === "settled")
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

    return NextResponse.json({
      vendor_name: vendorName,
      vendor_status: vendorStatus,
      paid_this_month_cents: paidSum,
      contracts: obligations || [],
      invoices: invoices || [],
    });
  } catch (err: any) {
    console.error("[/api/invoices] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
