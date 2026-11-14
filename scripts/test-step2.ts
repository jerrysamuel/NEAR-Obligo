async function testStep2() {
  console.log("=== Testing Step 2: Contracts, Invite, Join, Payout Account & Waiting Screen ===");

  const baseUrl = "http://localhost:3000";

  // 1. Issue Contractor Invite (M4)
  console.log("\n1. Testing POST /api/invites:");
  const inviteRes = await fetch(`${baseUrl}/api/invites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Apex Fuel Logistics",
      category: "logistics",
    }),
  });
  const inviteData = await inviteRes.json();
  console.log("  Response:", JSON.stringify(inviteData, null, 2));
  if (!inviteData.token || !inviteData.invite_url || !inviteData.vendor_id) {
    throw new Error("Failed to issue invite");
  }
  console.log("  PASS: Invite token and URL generated.");

  // 2. Create a Contract (Obligation) for this vendor
  console.log("\n2. Testing POST /api/payer/contracts:");
  const contractRes = await fetch(`${baseUrl}/api/payer/contracts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vendor_id: inviteData.vendor_id,
      name: "Weekly Fleet Fuel Deliveries",
      rate_cents: 20, // $0.20
      unit: "delivery",
      max_amount_cents: 50, // $0.50
      tolerance_pct: 10,
      auto_pay: true,
      frequency: "weekly",
    }),
  });
  const contractData = await contractRes.json();
  console.log("  Response:", JSON.stringify(contractData, null, 2));
  if (!contractData.success) throw new Error("Failed to create contract");
  console.log("  PASS: Contract created.");

  // 3. Verify Invite Token (A2)
  console.log(`\n3. Testing GET /api/invites/${inviteData.token}:`);
  const verifyRes = await fetch(`${baseUrl}/api/invites/${inviteData.token}`);
  const verifyData = await verifyRes.json();
  console.log("  Response:", JSON.stringify(verifyData, null, 2));
  if (!verifyData.valid) throw new Error("Invite verification failed");
  console.log("  PASS: Invite token is valid and open.");

  // 4. Accept Invite & Register Profile (A2)
  console.log("\n4. Testing POST /api/join:");
  const joinRes = await fetch(`${baseUrl}/api/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: inviteData.token,
      name: "Alex Rivera",
      company: "Apex Fuel Logistics",
      password: "TestPassword123!",
    }),
  });
  const joinData = await joinRes.json();
  console.log("  Response:", JSON.stringify(joinData, null, 2));
  if (!joinData.success) throw new Error("Failed to complete join registration");
  console.log("  PASS: Contractor profile registered and linked to vendor.");

  // 5. Enter Payout Account with NEAR Format & RPC Validation (C2)
  console.log("\n5. Testing POST /api/vendor/payout (C2):");
  const payoutRes = await fetch(`${baseUrl}/api/vendor/payout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      vendor_id: inviteData.vendor_id,
      account_id: "aurora.near", // Verified live account on NEAR mainnet
    }),
  });
  const payoutData = await payoutRes.json();
  console.log("  Response:", JSON.stringify(payoutData, null, 2));
  if (!payoutData.success || payoutData.status !== "pending_approval") {
    throw new Error("Failed to validate and save payout account");
  }
  console.log("  PASS: Payout account validated and set to pending_approval.");

  // 6. Verify Vendor in Payer Vendors List (P5)
  console.log("\n6. Testing GET /api/payer/vendors:");
  const vendorsRes = await fetch(`${baseUrl}/api/payer/vendors`);
  const vendorsData = await vendorsRes.json();
  console.log("  Vendors count:", vendorsData.vendors?.length);
  if (!Array.isArray(vendorsData.vendors) || vendorsData.vendors.length === 0) {
    throw new Error("Vendors list empty");
  }
  console.log("  PASS: Vendor listing reflects contractor status.");

  console.log("\n=== Step 2 verification complete: ALL TESTS PASSED ===");
}

testStep2().catch((err) => {
  console.error("Step 2 Test Failed:", err);
  process.exit(1);
});
