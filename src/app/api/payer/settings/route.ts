import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();
  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({
      policy: { per_tx_cap: 100, monthly_limit: 500, expires_at: null, frozen: false },
      agent: { soft_paused: false, status: "not_configured" },
    });
  }

  try {
    const { data: policy } = await admin
      .from("policies")
      .select("*")
      .limit(1)
      .maybeSingle();

    const { data: agent } = await admin
      .from("agents")
      .select("*")
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      policy: policy || {
        per_tx_cap: 100,
        monthly_limit: 500,
        expires_at: new Date(Date.now() + 86400000 * 90).toISOString(),
        frozen: false,
      },
      agent: agent || { soft_paused: false, status: "not_configured" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  noStore();
  const admin = getServiceSupabase();
  if (!admin) {
    return NextResponse.json({ success: true });
  }

  try {
    const body = await req.json();
    const { per_tx_cap, monthly_limit } = body;

    // Update or insert into policies
    const { data: existing } = await admin
      .from("policies")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (existing) {
      await admin
        .from("policies")
        .update({
          per_tx_cap: Number(per_tx_cap),
          monthly_limit: Number(monthly_limit),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await admin.from("policies").insert({
        per_tx_cap: Number(per_tx_cap),
        monthly_limit: Number(monthly_limit),
      });
    }

    await admin.from("audit_log").insert({
      actor: "payer",
      action: "UPDATE_POLICY",
      decision: "update",
      reason: `Updated policy: max per-tx $${(per_tx_cap / 100).toFixed(2)}, monthly limit $${(monthly_limit / 100).toFixed(2)}`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
