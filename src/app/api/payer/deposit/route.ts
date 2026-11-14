import { NextResponse } from "next/server";
import { createDeposit, createIdempotencyKey } from "@/lib/agentApi";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export async function POST(req: Request) {
  try {
    const admin = getServiceSupabase();
    let agentId = "ag_default";

    if (admin) {
      const { data } = await admin
        .from("agents")
        .select("agent_id, wallet_account_id")
        .limit(1)
        .maybeSingle();
      if (data?.agent_id) agentId = data.agent_id;
    }

    const idemKey = createIdempotencyKey();
    let depositResult: any;

    try {
      depositResult = await createDeposit(
        agentId,
        {
          origin_asset: "nep141:usdt.tether-token.near",
        },
        { idempotencyKey: idemKey }
      );
    } catch (apiErr: any) {
      throw new Error(`Agent deposit address unavailable: ${apiErr?.message || "request failed"}`);
    }

    const address =
      depositResult?.details?.deposit_address ||
      depositResult?.deposit_address ||
      undefined;

    if (!address) {
      throw new Error("Agent API did not return a deposit address");
    }

    // QR code data format
    const qrData = `near:${address}?asset=nep141:usdt.tether-token.near`;

    return NextResponse.json({
      deposit_address: address,
      memo: depositResult?.details?.memo || null,
      min_amount: depositResult?.details?.min_amount || "10000",
      expires_at: depositResult?.details?.expires_at || null,
      qr_data: qrData,
      status: depositResult?.status || "PENDING_DEPOSIT",
    });
  } catch (err: any) {
    console.error("[/api/payer/deposit] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate deposit address" },
      { status: 500 }
    );
  }
}
