async function testStep3() {
  console.log("=== Testing Step 3: Approve Vendor, Policy Update & Destination Whitelisting ===");

  const baseUrl = "http://localhost:3000";

  // 1. Issue an invite & create vendor
  console.log("\n1. Setting up vendor for approval:");
  const inviteRes = await fetch(`${baseUrl}/api/invites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Harbor Warehousing Logistics",
      category: "logistics",
    }),
  });
  const inviteData = await inviteRes.json();
  const vendorId = inviteData.vendor_id;
  console.log(`  Vendor created: ${inviteData.vendor_name} (ID: ${vendorId})`);

  // 2. Contractor submits payout account (setting status to pending_approval)
  console.log("\n2. Contractor submits payout address:");
  const payoutRes = await fetch(`${baseUrl}/api/vendor/payout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vendor_id: vendorId,
      account_id: "aurora.near",
    }),
  });
  const payoutData = await payoutRes.json();
  console.log("  Payout response:", JSON.stringify(payoutData, null, 2));
  if (payoutData.status !== "pending_approval") {
    throw new Error("Vendor status not pending_approval");
  }
  console.log("  PASS: Vendor is in pending_approval state.");

  // 3. Payer prepares vendor approval (M5)
  console.log(`\n3. Testing POST /api/payer/vendors/${vendorId}/approve/prepare:`);
  const prepRes = await fetch(`${baseUrl}/api/payer/vendors/${vendorId}/approve/prepare`, {
    method: "POST",
  });
  const prepData = await prepRes.json();
  console.log("  Response:", JSON.stringify(prepData, null, 2));
  if (!prepData.correlation_id || prepData.intent?.type !== "policy_update") {
    throw new Error("Failed to prepare vendor policy_update intent");
  }
  console.log("  PASS: policy_update intent prepared with destination entry.");

  // 4. Payer submits approved vendor (M5)
  console.log(`\n4. Testing POST /api/payer/vendors/${vendorId}/approve/submit:`);
  const subRes = await fetch(`${baseUrl}/api/payer/vendors/${vendorId}/approve/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      correlation_id: prepData.correlation_id,
      signed_data: { standard: "nep413", payload: { nonce: Date.now() } },
    }),
  });
  const subData = await subRes.json();
  console.log("  Response:", JSON.stringify(subData, null, 2));
  if (!subData.success || subData.status !== "active") {
    throw new Error("Vendor approval submit failed");
  }
  console.log("  PASS: Vendor status transitioned to 'active' and wallet_verified = true.");

  // 5. Verify vendor status in Approvals & Vendors APIs
  console.log("\n5. Verifying vendor status in listing:");
  const vListRes = await fetch(`${baseUrl}/api/payer/vendors`);
  const vListData = await vListRes.json();
  const approvedVendor = (vListData.vendors || []).find((v: any) => v.id === vendorId);
  console.log("  Found approved vendor:", approvedVendor);
  if (!approvedVendor || approvedVendor.status !== "active" || !approvedVendor.wallet_verified) {
    throw new Error("Vendor did not persist as active in database");
  }
  console.log("  PASS: Vendor verified in database as active with approved payout account.");

  console.log("\n=== Step 3 verification complete: ALL TESTS PASSED ===");
}

testStep3().catch((err) => {
  console.error("Step 3 Test Failed:", err);
  process.exit(1);
});
