import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export async function POST() {
  try {
    const admin = getServiceSupabase();
    if (!admin) {
      return NextResponse.json({ success: true, soft_paused: true });
    }

    await admin
      .from("agents")
      .update({ soft_paused: true })
      .neq("status", "destroyed");

    // Also record audit log entry
    await admin.from("audit_log").insert({
      actor: "payer",
      action: "PAUSE_PAYMENTS",
      decision: "refuse",
      reason: "AGENT_FROZEN",
    });

    return NextResponse.json({ success: true, soft_paused: true });
  } catch (err: any) {
    console.error("[/api/payer/pause] Error:", err);
    return NextResponse.json({ error: "Failed to pause payments" }, { status: 500 });
  }
}
