import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export const dynamic = "force-dynamic";

async function getUsdtBalanceCents(accountId: string): Promise<number> {
  const contractId = process.env.NEAR_USDT_CONTRACT || "usdt.tether-token.near";
  const nodeUrl = process.env.NEAR_NODE_URL || "https://rpc.mainnet.near.org";
  const argsBase64 = Buffer.from(JSON.stringify({ account_id: accountId })).toString("base64");
  const response = await fetch(nodeUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `usdt-balance-${accountId}`,
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: contractId,
        method_name: "ft_balance_of",
        args_base64: argsBase64,
      },
    }),
  });
  const json = await response.json();
  if (!response.ok || json.error || !json.result?.result) return 0;
  const rawUnits = BigInt(JSON.parse(Buffer.from(json.result.result).toString("utf8")) || "0");
  return Number(rawUnits / 10000n);
}

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

    const settlementAccount = process.env.NEAR_AUTONOMOUS_ACCOUNT_ID || "oblig.near";
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    // Read recent settled activity
    const { data: settledInvoices } = await admin
      .from("invoices")
      .select("id, amount, created_at, vendors(name)")
      .eq("status", "settled")
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: monthlySettledInvoices } = await admin
      .from("invoices")
      .select("amount")
      .eq("status", "settled")
      .gte("created_at", monthStart.toISOString());
    const paidThisMonth = (monthlySettledInvoices || [])
      .reduce((sum: number, invoice: any) => sum + Number(invoice.amount || 0), 0);
    const availableFunds = await getUsdtBalanceCents(settlementAccount).catch((error) => {
      console.warn("[/api/payer/funds] Could not read USDT balance:", error instanceof Error ? error.message : error);
      return 0;
    });

    const recentActivity = (settledInvoices || []).map((inv: any) => ({
      id: inv.id,
      message: `Paid ${inv.vendors?.name || "Vendor"}, $${(inv.amount / 100).toFixed(2)} USD`,
      time: new Date(inv.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));

    return NextResponse.json({
      company: "Your organization",
      available_funds_cents: availableFunds,
      paid_this_month_cents: paidThisMonth,
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
