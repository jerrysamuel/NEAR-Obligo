import { NextResponse } from "next/server";
import { generateIntent, createIdempotencyKey } from "@/lib/agentApi";
import { getServiceSupabase } from "@/infrastructure/supabase/client";
import { centsToUnits } from "@/lib/money";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { owner, perTxCapCents, monthlyBudgetUsd, companyName } = body;

    const admin = getServiceSupabase();
    const idemKey = createIdempotencyKey();

    // Build the initial policy structure per Section 7.2 of spec
    const perTxUnits = centsToUnits(perTxCapCents || 100); // default $1.00 = 100 cents
    const monthlyBudget = monthlyBudgetUsd || 5; // default $5.00

    const intentPayload = {
      type: "agent_create",
      owner: owner || {
        type: "near",
        account_id: "owner.near",
        public_key: "ed25519:6E8sCci9badyRkXb3JoRpAxTMwxDoW7QA45qTCTNWDDG",
      },
      policy: {
        budget: {
          monthly_usd: monthlyBudget.toString(),
        },
        limits: {
          per_transaction: perTxUnits,
        },
        assets: ["nep141:usdt.tether-token.near"],
        destinations: [],
      },
    };

    let result: any;
    try {
      result = await generateIntent(intentPayload, { idempotencyKey: idemKey });
    } catch (apiErr: any) {
      throw new Error(`Agent setup intent unavailable: ${apiErr?.message || "request failed"}`);
    }

    // Save correlation ID and pending intent payload to pending_intents table
    if (admin) {
      await admin.from("pending_intents").upsert({
        correlation_id: result.correlation_id,
        kind: "agent_create",
        payload: {
          intent: result.intent,
          perTxCapCents,
          monthlyBudgetUsd,
          companyName,
          owner,
        },
      });
    }

    return NextResponse.json({
      correlation_id: result.correlation_id,
      intent: result.intent,
      preview: result.preview,
    });
  } catch (err: any) {
    console.error("[/api/payer/agent/prepare] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to prepare setup rules" },
      { status: 500 }
    );
  }
}
