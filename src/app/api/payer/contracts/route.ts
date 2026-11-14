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
        contracts: [
          {
            id: "ob_default_fuel",
            name: "Weekly Fleet Fuel Logistics",
            vendor_name: "Apex Fuel Logistics",
            vendor_id: "v_apex_fuel",
            rate_cents: 20,
            unit: "delivery",
            frequency: "weekly",
            day_rule: "monday",
            expected_amount: 20,
            max_amount: 50,
            tolerance_pct: 10,
            auto_pay: true,
            status: "active",
            starts_on: "2026-11-01",
          },
        ],
      });
    }

    const { data: obligations, error } = await admin
      .from("obligations")
      .select("*, vendors(name)")
      .order("starts_on", { ascending: false });

    if (error) throw new Error(error.message);

    const contracts = (obligations || []).map((o: any) => ({
      ...o,
      vendor_name: o.vendors?.name || "Contractor",
    }));

    return NextResponse.json({ contracts });
  } catch (err: any) {
    console.error("[/api/payer/contracts] Error:", err);
    return NextResponse.json(
      { error: "Failed to list contracts" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      vendor_id,
      name,
      rate_cents,
      unit = "delivery",
      max_amount_cents,
      tolerance_pct = 10,
      auto_pay = true,
      frequency = "weekly",
      day_rule = "immediate",
      starts_on,
    } = body;

    const rate = Number(rate_cents);
    const maxAmount = Number(max_amount_cents);

    // Validation: limit at least the rate
    if (isNaN(rate) || rate <= 0) {
      return NextResponse.json({ error: "Rate must be greater than zero" }, { status: 400 });
    }
    if (isNaN(maxAmount) || maxAmount < rate) {
      return NextResponse.json(
        { error: "Per-invoice limit must be at least equal to the contract rate" },
        { status: 400 }
      );
    }

    const admin = getServiceSupabase();
    if (!admin) {
      return NextResponse.json({
        success: true,
        contract: { id: `ob_${Date.now()}`, name, rate_cents: rate, max_amount: maxAmount },
      });
    }

    let targetVendorId = vendor_id;
    if (!targetVendorId) {
      const { data: defaultVendor } = await admin
        .from("vendors")
        .select("id")
        .limit(1)
        .maybeSingle();
      targetVendorId = defaultVendor?.id;
    }

    if (!targetVendorId) {
      return NextResponse.json(
        { error: "A vendor is required to create a contract. Please select or invite a vendor first." },
        { status: 400 }
      );
    }

    const { data: newContract, error } = await admin
      .from("obligations")
      .insert({
        vendor_id: targetVendorId,
        name: name || "Logistics Service Agreement",
        rate_cents: rate,
        unit,
        frequency: frequency === "monthly" ? "monthly" : "weekly",
        day_rule,
        expected_amount: rate,
        max_amount: maxAmount,
        tolerance_pct: Number(tolerance_pct) || 10,
        auto_pay: Boolean(auto_pay),
        starts_on: starts_on || new Date().toISOString().split("T")[0],
        status: "active",
      })
      .select("*, vendors(name)")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      contract: {
        ...newContract,
        vendor_name: (newContract as any).vendors?.name || "Contractor",
      },
    });
  } catch (err: any) {
    console.error("[/api/payer/contracts] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create contract" },
      { status: 500 }
    );
  }
}
