import fs from "fs";
import path from "path";

// Load .env.local if present
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    for (const line of envConfig.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  // ignore
}

import { getServiceSupabase } from "../src/infrastructure/supabase/client";
import { processInvoice } from "../src/lib/pay";

async function main() {
  console.log("🌱 Starting Nearbligo Demo Seeding...");

  const admin = getServiceSupabase();
  if (!admin) {
    console.error("❌ Failed to obtain Supabase admin client. Check environment variables.");
    process.exit(1);
  }

  // 1. Upsert Agent
  console.log("1. Seeding agent record...");
  const { data: agent, error: agentErr } = await admin
    .from("agents")
    .upsert({
      agent_id: "ag_demo_apex_01",
      grant_token_enc: "enc_demo_grant_token",
      status: "active",
      soft_paused: false,
    })
    .select()
    .single();

  if (agentErr) console.warn("Agent upsert warning:", agentErr.message);

  // 2. Upsert Policy: $1.00 per-tx, $5.00 monthly
  console.log("2. Seeding spending policy ($1.00 per tx, $5.00 monthly)...");
  const { data: policy, error: policyErr } = await admin
    .from("policies")
    .upsert({
      per_tx_cap: 100, // $1.00
      monthly_limit: 500, // $5.00
      expires_at: new Date(Date.now() + 86400000 * 90).toISOString(),
      frozen: false,
    })
    .select()
    .single();

  if (policyErr) console.warn("Policy upsert warning:", policyErr.message);

  // 3. Upsert Vendor: Apex Fuel Logistics (aurora.near)
  console.log("3. Seeding vendor: Apex Fuel Logistics (aurora.near)...");
  const { data: existingVendor } = await admin
    .from("vendors")
    .select("*")
    .eq("name", "Apex Fuel Logistics")
    .maybeSingle();

  let vendor = existingVendor;
  if (!vendor) {
    const { data: newV, error: vErr } = await admin
      .from("vendors")
      .insert({
        name: "Apex Fuel Logistics",
        category: "Fuel & Freight Logistics",
        wallet_address: "aurora.near",
        wallet_verified: true,
        status: "active",
      })
      .select()
      .single();
    if (vErr) throw vErr;
    vendor = newV;
  } else {
    await admin
      .from("vendors")
      .update({
        wallet_address: "aurora.near",
        wallet_verified: true,
        status: "active",
      })
      .eq("id", vendor.id);
  }

  // 4. Upsert Obligation: Per-mile fuel surcharge ($0.20 rate, $0.50 cap)
  console.log("4. Seeding obligation: Per-mile fuel surcharge...");
  const { data: existingObl } = await admin
    .from("obligations")
    .select("*")
    .eq("vendor_id", vendor.id)
    .eq("name", "Per-mile fuel surcharge")
    .maybeSingle();

  let obligation = existingObl;
  if (!obligation) {
    const { data: newObl, error: oErr } = await admin
      .from("obligations")
      .insert({
        vendor_id: vendor.id,
        name: "Per-mile fuel surcharge",
        frequency: "weekly",
        day_rule: "monday",
        starts_on: new Date().toISOString().split("T")[0],
        expected_amount: 20,
        rate_cents: 20, // $0.20
        unit: "mile",
        max_amount: 50, // $0.50 cap
        tolerance_pct: 0,
        auto_pay: true,
        status: "active",
      })
      .select()
      .single();
    if (oErr) throw oErr;
    obligation = newObl;
  }

  // 5. Create in-limit invoice ($0.20) and settle it
  console.log("5. Seeding settled in-limit invoice ($0.20)...");
  const now = Date.now();
  const invNumber1 = `INV-SETTLED-${now.toString().slice(-4)}`;
  const { data: inv1, error: inv1Err } = await admin
    .from("invoices")
    .insert({
      vendor_id: vendor.id,
      obligation_id: obligation.id,
      invoice_number: invNumber1,
      reference: `REF-${invNumber1}`,
      period_key: `PK-${now}-1`,
      amount: 20, // $0.20
      due_date: new Date().toISOString().split("T")[0],
      source: "form",
      status: "generated",
      wallet_address: "aurora.near",
    })
    .select()
    .single();

  if (inv1Err) throw inv1Err;

  const res1 = await processInvoice(inv1.id);
  console.log(`   Invoice ${invNumber1} status: ${res1.status} (Reason: ${res1.reason})`);

  // 6. Create over-limit invoice ($0.60) that triggers needs_approval
  console.log("6. Seeding over-limit invoice ($0.60 > $0.50 cap)...");
  const invNumber2 = `INV-OVERLIMIT-${(now + 1).toString().slice(-4)}`;
  const { data: inv2, error: inv2Err } = await admin
    .from("invoices")
    .insert({
      vendor_id: vendor.id,
      obligation_id: obligation.id,
      invoice_number: invNumber2,
      reference: `REF-${invNumber2}`,
      period_key: `PK-${now}-2`,
      amount: 60, // $0.60
      due_date: new Date().toISOString().split("T")[0],
      source: "form",
      status: "generated",
      wallet_address: "aurora.near",
    })
    .select()
    .single();

  if (inv2Err) throw inv2Err;

  const res2 = await processInvoice(inv2.id);
  console.log(`   Invoice ${invNumber2} status: ${res2.status} (Reason: ${res2.reason})`);

  console.log("\n✅ Database seeding complete!");
  console.log(`- Vendor: Apex Fuel Logistics (${vendor.wallet_address})`);
  console.log(`- Contract: ${obligation.name} ($0.20/mile, cap $0.50)`);
  console.log(`- Settled Invoice: #${invNumber1} ($0.20)`);
  console.log(`- Pending Review Invoice: #${invNumber2} ($0.60)`);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
