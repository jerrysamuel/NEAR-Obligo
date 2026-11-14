import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: vendorId } = params;
    const body = await req.json().catch(() => ({}));
    const reason = body?.reason || "Declined by payer";

    const admin = getServiceSupabase();
    if (admin) {
      await admin
        .from("vendors")
        .update({
          status: "paused",
          wallet_verified: false,
        })
        .eq("id", vendorId);

      await admin.from("audit_log").insert({
        actor: "payer",
        action: "DECLINE_VENDOR",
        decision: "refuse",
        reason: `Payer declined vendor: ${reason}`,
      });
    }

    return NextResponse.json({ success: true, status: "paused" });
  } catch (err: any) {
    console.error("[/api/payer/vendors/[id]/decline] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to decline vendor" },
      { status: 500 }
    );
  }
}
