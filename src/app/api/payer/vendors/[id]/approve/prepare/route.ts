import { NextResponse } from "next/server";
import { generateIntent, getPolicy, createIdempotencyKey } from "@/lib/agentApi";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: vendorId } = params;
    const admin = getServiceSupabase();

    if (!admin) {
      return NextResponse.json({
        correlation_id: `corr_vendor_appr_${Date.now()}`,
        intent: {
          type: "policy_update",
          standard: "nep413",
          payload: { nonce: Date.now() },
        },
        preview: {
          summary: "Approve vendor to receive payments in USDT on NEAR.",
        },
      });
    }

    // 1. Fetch vendor
    const { data: vendor, error: vErr } = await admin
      .from("vendors")
      .select("id, name, wallet_address, status")
      .eq("id", vendorId)
      .single();

    if (vErr || !vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    if (vendor.wallet_address === "unassigned.near") {
      return NextResponse.json(
        { error: "Contractor has not submitted a payout account yet" },
        { status: 400 }
      );
    }

    // 2. Fetch agent info
    const { data: agent } = await admin
      .from("agents")
      .select("agent_id")
      .limit(1)
      .maybeSingle();

    const agentId = agent?.agent_id || "ag_default";
    let currentPolicy: any = null;
    let expectedRevision = 0;

    try {
      const polView = await getPolicy(agentId);
      if (polView) {
        currentPolicy = (polView as any).policy;
        expectedRevision = (polView as any).revision || 0;
      }
    } catch (apiErr: any) {
      console.warn("[/approve/prepare] Get policy fallback:", apiErr?.message);
    }

    // Fallback baseline policy if not yet on-chain
    if (!currentPolicy) {
      currentPolicy = {
        budget: { monthly_usd: "5" },
        limits: { per_transaction: "1000000" },
        assets: ["nep141:usdt.tether-token.near"],
        destinations: [],
      };
    }

    // 3. Add vendor destination entry: chain 'near', address, memo null (Section 14)
    const existingDests = currentPolicy.destinations || [];
    const destinationExists = existingDests.some(
      (d: any) => d.chain === "near" && d.address === vendor.wallet_address
    );

    const updatedDestinations = destinationExists
      ? existingDests
      : [
          ...existingDests,
          {
            chain: "near",
            address: vendor.wallet_address,
            memo: null,
          },
        ];

    const updatedPolicy = {
      ...currentPolicy,
      destinations: updatedDestinations,
    };

    const intentPayload = {
      type: "policy_update",
      agent_id: agentId,
      policy: updatedPolicy,
      expected_revision: expectedRevision,
    };

    const idemKey = createIdempotencyKey();
    let result: any;

    try {
      result = await generateIntent(intentPayload, { idempotencyKey: idemKey });
    } catch (apiErr: any) {
      console.warn("[/approve/prepare] Generate intent fallback:", apiErr?.message);
      result = {
        correlation_id: `corr_vendor_appr_${Date.now()}`,
        intent: {
          type: "policy_update",
          standard: "nep413", // nep413 message signing for vendor approval per Section 13
          payload: { ...intentPayload, nonce: Date.now() },
        },
        preview: {
          summary: `Approve ${vendor.name} to receive payments at ${vendor.wallet_address}.`,
        },
      };
    }

    // 4. Record pending intent
    await admin.from("pending_intents").upsert({
      correlation_id: result.correlation_id,
      kind: "policy_update",
      payload: {
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        wallet_address: vendor.wallet_address,
        policy: updatedPolicy,
      },
    });

    return NextResponse.json({
      correlation_id: result.correlation_id,
      intent: result.intent,
      preview: result.preview,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        wallet_address: vendor.wallet_address,
      },
    });
  } catch (err: any) {
    console.error("[/api/payer/vendors/[id]/approve/prepare] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to prepare vendor approval" },
      { status: 500 }
    );
  }
}
