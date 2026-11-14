import { NextResponse } from "next/server";
import { submitIntent, getStatus } from "@/lib/agentApi";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: vendorId } = params;
    const body = await req.json();
    const { correlation_id, signed_data } = body;

    const admin = getServiceSupabase();
    let pendingRow: any = null;

    if (admin && correlation_id) {
      const { data } = await admin
        .from("pending_intents")
        .select("*")
        .eq("correlation_id", correlation_id)
        .maybeSingle();
      pendingRow = data;
    }

    const hasAgentApiKey = Boolean(process.env.NEAR_INTENTS_AGENT_API_KEY?.trim());

    try {
      // Agent API approval is optional in self-hosted worker mode. The signed
      // approval is still recorded locally, while payment execution is handled
      // later by the restricted NEAR FunctionCall key.
      if (hasAgentApiKey && correlation_id && signed_data) {
        await submitIntent({
          correlation_id,
          signed_data,
        });
        await getStatus(correlation_id, 10000);
      }
    } catch (apiErr: any) {
      throw new Error(`Vendor approval submission failed: ${apiErr?.message || "request failed"}`);
    }

    // Update vendor: wallet_verified = true, status = 'active'
    if (admin) {
      const { data: updatedVendor, error: vErr } = await admin
        .from("vendors")
        .update({
          wallet_verified: true,
          status: "active",
        })
        .eq("id", vendorId)
        .select("id, name, wallet_address, status, wallet_verified")
        .single();

      if (vErr) throw new Error(vErr.message);

      // Record audit log
      await admin.from("audit_log").insert({
        actor: "payer",
        action: "APPROVE_VENDOR",
        decision: "approved",
        reason: `Payer approved payout address ${updatedVendor.wallet_address} for ${updatedVendor.name}. Added to allowed destinations.`,
      });

      return NextResponse.json({
        success: true,
        vendor: updatedVendor,
        status: "active",
      });
    }

    return NextResponse.json({
      success: true,
      status: "active",
    });
  } catch (err: any) {
    console.error("[/api/payer/vendors/[id]/approve/submit] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to submit vendor approval" },
      { status: 500 }
    );
  }
}
