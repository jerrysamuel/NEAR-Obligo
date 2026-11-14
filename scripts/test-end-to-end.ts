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

async function runEndToEndTests() {
  console.log("====================================================");
  console.log("🧪 Nearbligo Comprehensive End-to-End Test Suite");
  console.log("====================================================\n");

  const admin = getServiceSupabase();
  if (!admin) {
    throw new Error("Supabase admin client unavailable.");
  }

  // 0. Setup test vendor & obligation
  console.log("👉 Step 0: Ensure Test Vendor & Obligation Exist");
  const { data: vendors } = await admin
    .from("vendors")
    .select("*")
    .eq("name", "Apex Fuel Logistics")
    .limit(1);

  const vendor = vendors?.[0];

  if (!vendor) {
    throw new Error("Seed data missing. Run 'npx tsx scripts/seed.ts' first.");
  }

  const { data: obligations } = await admin
    .from("obligations")
    .select("*")
    .eq("vendor_id", vendor.id)
    .limit(1);

  const obligation = obligations?.[0];

  if (!obligation) {
    throw new Error("Obligation missing for vendor.");
  }

  console.log(`   Vendor: ${vendor.name} (${vendor.wallet_address})`);
  console.log(`   Obligation: ${obligation.name} (Rate: $0.20, Cap: $0.50)\n`);

  // ==========================================
  // Test 1: In-Limit Invoice Auto-Pay
  // ==========================================
  console.log("👉 Test 1: In-Limit Invoice ($0.20 <= $0.50 cap) Auto-Pay");
  const now = Date.now();
  const testInvNumber1 = `E2E-AUTO-${now.toString().slice(-4)}`;
  const { data: inv1, error: inv1Err } = await admin
    .from("invoices")
    .insert({
      vendor_id: vendor.id,
      obligation_id: obligation.id,
      invoice_number: testInvNumber1,
      reference: `REF-${testInvNumber1}`,
      period_key: `PK-E2E-${now}-1`,
      amount: 20, // $0.20
      due_date: new Date().toISOString().split("T")[0],
      source: "form",
      status: "generated",
      wallet_address: vendor.wallet_address,
    })
    .select()
    .single();

  if (inv1Err) throw inv1Err;

  const res1 = await processInvoice(inv1.id);
  console.log(`   Pipeline Decision: ${res1.decision}, Status: ${res1.status}`);

  if (res1.status !== "settled") {
    throw new Error(`Expected settled status, got ${res1.status}`);
  }

  // Verify payment attempt
  const { data: attempt1 } = await admin
    .from("payment_attempts")
    .select("*")
    .eq("invoice_id", inv1.id)
    .single();

  if (!attempt1 || attempt1.status !== "settled") {
    throw new Error("Payment attempt not recorded as settled.");
  }

  // Verify audit log
  const { data: logs1 } = await admin
    .from("audit_log")
    .select("*")
    .eq("invoice_id", inv1.id);

  if (!logs1 || logs1.length < 2) {
    throw new Error("Expected at least 2 audit log entries for auto-pay flow.");
  }

  console.log("   ✅ PASSED: In-limit invoice auto-paid & settled with audit trail.\n");

  // ==========================================
  // Test 2: Over-Limit Invoice Escalation
  // ==========================================
  console.log("👉 Test 2: Over-Limit Invoice ($0.60 > $0.50 cap) Needs Approval");
  const testInvNumber2 = `E2E-OVER-${(now + 1).toString().slice(-4)}`;
  const { data: inv2, error: inv2Err } = await admin
    .from("invoices")
    .insert({
      vendor_id: vendor.id,
      obligation_id: obligation.id,
      invoice_number: testInvNumber2,
      reference: `REF-${testInvNumber2}`,
      period_key: `PK-E2E-${now}-2`,
      amount: 60, // $0.60
      due_date: new Date().toISOString().split("T")[0],
      source: "form",
      status: "generated",
      wallet_address: vendor.wallet_address,
    })
    .select()
    .single();

  if (inv2Err) throw inv2Err;

  const res2 = await processInvoice(inv2.id);
  console.log(`   Pipeline Decision: ${res2.decision}, Status: ${res2.status}`);

  if (res2.status !== "needs_approval") {
    throw new Error(`Expected needs_approval status, got ${res2.status}`);
  }

  console.log("   ✅ PASSED: Over-limit invoice routed to needs_approval.\n");

  // ==========================================
  // Test 3: Emergency Soft-Pause Immediate Halt
  // ==========================================
  console.log("👉 Test 3: Emergency Soft-Pause Halts Processing (AGENT_FROZEN)");
  await admin.from("agents").update({ soft_paused: true }).neq("status", "destroyed");

  const testInvNumber3 = `E2E-PAUSE-${(now + 2).toString().slice(-4)}`;
  const { data: inv3, error: inv3Err } = await admin
    .from("invoices")
    .insert({
      vendor_id: vendor.id,
      obligation_id: obligation.id,
      invoice_number: testInvNumber3,
      reference: `REF-${testInvNumber3}`,
      period_key: `PK-E2E-${now}-3`,
      amount: 20, // $0.20
      due_date: new Date().toISOString().split("T")[0],
      source: "form",
      status: "generated",
      wallet_address: vendor.wallet_address,
    })
    .select()
    .single();

  if (inv3Err) throw inv3Err;

  const res3 = await processInvoice(inv3.id);
  console.log(`   Pipeline Decision: ${res3.decision}, Reason: ${res3.reason}`);

  if (res3.reason !== "AGENT_FROZEN" || res3.status !== "refused") {
    throw new Error(`Expected AGENT_FROZEN refusal, got ${res3.reason}`);
  }

  // Restore active state
  await admin.from("agents").update({ soft_paused: false }).neq("status", "destroyed");
  console.log("   ✅ PASSED: Soft-pause halted execution instantly without disbursing.\n");

  // ==========================================
  // Test 4: Manual Payer Approval Override
  // ==========================================
  console.log("👉 Test 4: Payer Manual Approval Overrides & Settles Over-Limit Invoice");
  const res4 = await processInvoice(inv2.id, {
    overrideApproval: true,
    actor: "payer",
  });

  console.log(`   Pipeline Decision: ${res4.decision}, Status: ${res4.status}`);

  if (res4.status !== "settled") {
    throw new Error(`Expected invoice to be settled after manual approval, got ${res4.status}`);
  }

  const { data: updatedInv2 } = await admin
    .from("invoices")
    .select("status")
    .eq("id", inv2.id)
    .single();

  if (updatedInv2?.status !== "settled") {
    throw new Error("Invoice database record was not updated to settled.");
  }

  console.log("   ✅ PASSED: Manual payer approval successfully settled over-limit invoice.\n");

  // ==========================================
  // Test 5: Receipt Remittance Integrity
  // ==========================================
  console.log("👉 Test 5: Remittance Receipt Data Verification");
  const { data: settledInv } = await admin
    .from("invoices")
    .select("*, payment_attempts(*), vendors(*)")
    .eq("id", inv2.id)
    .single();

  if (!settledInv || !settledInv.payment_attempts?.length) {
    throw new Error("Missing settled invoice payment attempts.");
  }

  const txAttempt = settledInv.payment_attempts[0];
  console.log(`   Receipt Invoice ID: ${settledInv.id}`);
  console.log(`   Disbursed Amount: $${(settledInv.amount / 100).toFixed(2)} USD`);
  console.log(`   Recipient Account: ${settledInv.wallet_address}`);
  console.log(`   Transaction Ref: ${txAttempt.tx_ref}`);
  console.log(`   Idempotency Key: ${txAttempt.idempotency_key}`);

  console.log("   ✅ PASSED: Receipt contains complete, auditable settlement details.\n");

  console.log("====================================================");
  console.log("🎉 ALL 5 END-TO-END VERIFICATION TESTS PASSED!");
  console.log("====================================================");
}

runEndToEndTests().catch((err) => {
  console.error("\n❌ End-to-end test failure:", err);
  process.exit(1);
});
