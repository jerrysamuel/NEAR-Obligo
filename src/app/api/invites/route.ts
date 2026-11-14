import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, category = "professional_services", email } = body;

    const admin = getServiceSupabase();
    const vendorName = name?.trim() || "New Contractor";

    let vendorId: string;

    if (admin) {
      // Create vendor row
      const { data: vendor, error: vError } = await admin
        .from("vendors")
        .insert({
          name: vendorName,
          category,
          wallet_address: "unassigned.near",
          wallet_verified: false,
          status: "invited",
        })
        .select("id")
        .single();

      if (vError) throw new Error(vError.message);
      vendorId = vendor.id;

      // Generate secure 7-day invite token
      const token = crypto.randomBytes(16).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

      await admin.from("invitations").insert({
        token,
        vendor_id: vendorId,
        status: "open",
        expires_at: expiresAt,
      });

      return NextResponse.json({
        success: true,
        token,
        vendor_id: vendorId,
        vendor_name: vendorName,
        invite_url: `/join/${token}`,
        expires_at: expiresAt,
      });
    }

    // Mock fallback when offline
    const token = crypto.randomBytes(16).toString("hex");
    return NextResponse.json({
      success: true,
      token,
      vendor_id: `v_${Date.now()}`,
      vendor_name: vendorName,
      invite_url: `/join/${token}`,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
  } catch (err: any) {
    console.error("[/api/invites] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create contractor invite" },
      { status: 500 }
    );
  }
}
