import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, name, company, email, password } = body;

    const admin = getServiceSupabase();

    if (!admin) {
      return NextResponse.json({
        success: true,
        user_id: `usr_${Date.now()}`,
        vendor_id: `v_${Date.now()}`,
      });
    }

    // Verify invite token
    const { data: invite, error: invErr } = await admin
      .from("invitations")
      .select("token, status, expires_at, vendor_id")
      .eq("token", token)
      .maybeSingle();

    if (invErr || !invite || invite.status !== "open" || new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired invite token" },
        { status: 400 }
      );
    }

    // Create user or assign contractor role
    const contractorEmail = email || `contractor_${token.slice(0, 8)}@example.com`;
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: contractorEmail,
      password: password || "ContractorPass123!",
      email_confirm: true,
    });

    const userId = authData?.user?.id || `usr_${Date.now()}`;

    // Create contractor profile
    await admin.from("profiles").upsert({
      user_id: userId,
      role: "contractor",
      display_name: name || "Contractor",
      company: company || "Contractor Business",
    });

    // Link user to vendor
    await admin.from("vendor_users").upsert({
      vendor_id: invite.vendor_id,
      user_id: userId,
    });

    // Mark invitation used
    await admin
      .from("invitations")
      .update({ status: "used" })
      .eq("token", token);

    return NextResponse.json({
      success: true,
      user_id: userId,
      vendor_id: invite.vendor_id,
    });
  } catch (err: any) {
    console.error("[/api/join] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to complete signup" },
      { status: 500 }
    );
  }
}
