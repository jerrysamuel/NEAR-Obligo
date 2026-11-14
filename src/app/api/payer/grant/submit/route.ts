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

    try {
      await submitIntent({
        correlation_id,
        signed_data,
      });
      await getStatus(correlation_id, 10000);
    } catch (apiErr: any) {
      throw new Error(`Payment grant submission failed: ${apiErr?.message || "request failed"}`);
    }

    // Mark grant live and store encrypted grant token
    if (admin && pendingRow?.payload?.token) {
      await admin
        .from("agents")
        .update({
          grant_token_enc: pendingRow.payload.token,
          grant_expires_at: pendingRow.payload.expires_at,
          status: "permission_signed",
        })
        .neq("status", "destroyed");
    }

    return NextResponse.json({
      success: true,
      status: "permission_signed",
    });
  } catch (err: any) {
    console.error("[/api/payer/grant/submit] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to submit payment permission" },
      { status: 500 }
    );
  }
}
