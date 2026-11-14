import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export async function POST() {
  try {
    const admin = getServiceSupabase();
    if (!admin) {
      return NextResponse.json({ success: true, soft_paused: false });
    }

    await admin
      .from("agents")
      .update({ soft_paused: false })
      .neq("status", "destroyed");

    // Record audit log entry
    await admin.from("audit_log").insert({
      actor: "payer",
      action: "RESUME_PAYMENTS",
      decision: "resume",
      reason: "PAYER_MANUAL_RESUME",
    });

    return NextResponse.json({ success: true, soft_paused: false });
  } catch (err: any) {
    console.error("[/api/payer/resume] Error:", err);
    return NextResponse.json({ error: "Failed to resume payments" }, { status: 500 });
  }
}
