import { NextResponse } from "next/server";
import { submitIntent, getStatus } from "@/lib/agentApi";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { correlation_id, signed_data } = body;

    const admin = getServiceSupabase();
    let pendingRow: any = null;

    if (admin) {
      const { data } = await admin
        .from("pending_intents")
        .select("*")
        .eq("correlation_id", correlation_id)
        .maybeSingle();
      pendingRow = data;
    }

    let agentId = `ag_${Date.now().toString(36)}`;
    let walletAccountId = `agent_${Date.now().toString(36)}.near`;

    try {
      await submitIntent({
        correlation_id,
        signed_data,
      });

      const statusRes = (await getStatus(correlation_id, 10000)) as any;
      if (statusRes?.result) {
        agentId = statusRes.result.agent_id || agentId;
        walletAccountId = statusRes.result.wallet_account_id || walletAccountId;
      } else if (statusRes?.agent_id) {
        agentId = statusRes.agent_id;
        walletAccountId = statusRes.wallet_account_id || walletAccountId;
      }
    } catch (apiErr: any) {
      throw new Error(`Agent setup submission failed: ${apiErr?.message || "request failed"}`);
    }

    // Upsert into agents table (Section 6 & 12)
    if (admin) {
      await admin.from("agents").upsert({
        owner_account_id: pendingRow?.payload?.owner?.account_id || "owner.near",
        owner_public_key: pendingRow?.payload?.owner?.public_key || "",
        agent_id: agentId,
        wallet_account_id: walletAccountId,
        status: "rules_signed",
        created_intent_id: correlation_id,
      });

      // Update policies table with initial limits
      const perTx = pendingRow?.payload?.perTxCapCents || 100;
      const monthly = (pendingRow?.payload?.monthlyBudgetUsd || 5) * 100;
      await admin.from("policies").upsert({
        per_tx_cap: perTx,
        monthly_limit: monthly,
        expires_at: new Date(Date.now() + 86400000 * 90).toISOString(),
        frozen: false,
      });
    }

    return NextResponse.json({
      success: true,
      agent_id: agentId,
      wallet_account_id: walletAccountId,
      status: "rules_signed",
    });
  } catch (err: any) {
    console.error("[/api/payer/agent/submit] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to submit approved rules" },
      { status: 500 }
    );
  }
}
