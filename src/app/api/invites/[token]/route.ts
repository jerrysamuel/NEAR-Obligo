import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export async function GET(
  req: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const admin = getServiceSupabase();

    if (!admin) {
      return NextResponse.json({
        valid: true,
        vendor_name: "Apex Fuel Logistics",
        company_name: "Acme Freight Logistics",
        status: "open",
      });
    }

    const { data: invite, error } = await admin
      .from("invitations")
      .select("token, status, expires_at, vendor_id, vendors(name, status)")
      .eq("token", token)
      .maybeSingle();

    if (error || !invite) {
      return NextResponse.json(
        { valid: false, reason: "invalid", message: "This invite link is invalid. Ask your payer for a new link." },
        { status: 404 }
      );
    }

    if (invite.status === "used") {
      return NextResponse.json(
        { valid: false, reason: "used", message: "This invite link has already been used." },
        { status: 400 }
      );
    }

    if (new Date(invite.expires_at) < new Date() || invite.status === "expired") {
      return NextResponse.json(
        { valid: false, reason: "expired", message: "This invite link has expired. Ask your payer for a new link." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      vendor_id: invite.vendor_id,
      vendor_name: (invite.vendors as any)?.name || "Contractor",
      company_name: "Acme Freight Logistics",
      status: "open",
    });
  } catch (err: any) {
    console.error("[/api/invites/[token]] Error:", err);
    return NextResponse.json(
      { error: "Failed to validate invite" },
      { status: 500 }
    );
  }
}
