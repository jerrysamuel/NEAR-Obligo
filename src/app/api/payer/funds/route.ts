import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = getServiceSupabase();
    if (!admin) {
      return NextResponse.json({
        company: "Your organization",
        available_funds_cents: 0,
        paid_this_month_cents: 0,
        monthly_limit_cents: 500, // $5.00
        pending_approvals_count: 0,
        soft_paused: false,
        recent_activity: [],
      });
    }

    // Read agent state
    const { data: agent } = await admin
      .from("agents")
      .select("soft_paused, status, agent_id")
      .limit(1)
      .maybeSingle();

    // Read policy
    const { data: policy } = await admin
      .from("policies")
      .select("monthly_limit, per_tx_cap")
      .limit(1)
      .maybeSingle();

    // Read pending approvals count (invoices with status 'needs_approval' + vendors with status 'pending_approval')
    const { count: pendingInvoices } = await admin
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("status", "needs_approval");

    const { count: pendingVendors } = await admin
      .from("vendors")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_approval");

    const pendingCount = (pendingInvoices || 0) + (pendingVendors || 0);

    // Read recent settled activity
    const { data: settledInvoices } = await admin
      .from("invoices")
      .select("id, amount, created_at, vendors(name)")
      .eq("status", "settled")
      .order("created_at", { ascending: false })
      .limit(5);

    const recentActivity = (settledInvoices || []).map((inv: any) => ({
      id: inv.id,
      message: `Paid ${inv.vendors?.name || "Vendor"}, $${(inv.amount / 100).toFixed(2)} USD`,
      time: new Date(inv.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));

    return NextResponse.json({
      company: "Your organization",
      available_funds_cents: 0,
      paid_this_month_cents: 0,
      monthly_limit_cents: policy?.monthly_limit ? Number(policy.monthly_limit) : 500,
      pending_approvals_count: pendingCount,
      soft_paused: agent?.soft_paused ?? false,
      recent_activity: recentActivity,
    });
  } catch (err: any) {
    console.error("[/api/payer/funds] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch funds overview" },
      { status: 500 }
    );
  }
}
