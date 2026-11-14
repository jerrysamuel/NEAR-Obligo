import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getServiceSupabase } from "@/infrastructure/supabase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();
  try {
    const admin = getServiceSupabase();
    if (!admin) {
      return NextResponse.json({
        vendors: [
          {
            id: "v_apex_fuel",
            name: "Apex Fuel Logistics",
            category: "logistics",
            wallet_address: "apex-fuel.near",
            status: "active",
            contracts_count: 1,
            created_at: new Date().toISOString(),
          },
        ],
      });
    }

    const { data: vendors, error } = await admin
      .from("vendors")
      .select("id, name, category, wallet_address, wallet_verified, status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const { data: obligations } = await admin.from("obligations").select("vendor_id");
    const counts: Record<string, number> = {};
    (obligations || []).forEach((o: any) => {
      counts[o.vendor_id] = (counts[o.vendor_id] || 0) + 1;
    });

    const formatted = (vendors || []).map((v: any) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      wallet_address: v.wallet_address,
      wallet_verified: v.wallet_verified,
      status: v.status,
      contracts_count: counts[v.id] || 0,
      created_at: v.created_at,
    }));

    return NextResponse.json({ vendors: formatted });
  } catch (err: any) {
    console.error("[/api/payer/vendors] Error:", err);
    return NextResponse.json(
      { error: "Failed to list vendors" },
      { status: 500 }
    );
  }
}
