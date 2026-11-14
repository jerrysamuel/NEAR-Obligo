async function testStep1() {
  console.log("=== Testing Step 1: Payer Setup Wizard, Signatures & Deposit Flow ===");

  const baseUrl = "http://localhost:3000";

  // 1. Prepare Agent Rules
  console.log("\n1. Testing POST /api/payer/agent/prepare:");
  const prepAgentRes = await fetch(`${baseUrl}/api/payer/agent/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner: {
        type: "near",
        account_id: "acme-freight.near",
        public_key: "ed25519:6E8sCci9badyRkXb3JoRpAxTMwxDoW7QA45qTCTNWDDG",
      },
      perTxCapCents: 100, // $1.00
      monthlyBudgetUsd: 5, // $5.00
      companyName: "Acme Freight Logistics",
    }),
  });
  const prepAgent = await prepAgentRes.json();
  console.log("  Response:", JSON.stringify(prepAgent, null, 2));
  if (!prepAgent.correlation_id) throw new Error("prepareAgent did not return correlation_id");
  console.log("  PASS: Agent rules prepared.");

  // 2. Submit Agent Rules (Signature 1)
  console.log("\n2. Testing POST /api/payer/agent/submit:");
  const subAgentRes = await fetch(`${baseUrl}/api/payer/agent/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      correlation_id: prepAgent.correlation_id,
      signed_data: { standard: "nep366", payload: { nonce: Date.now() } },
    }),
  });
  const subAgent = await subAgentRes.json();
  console.log("  Response:", JSON.stringify(subAgent, null, 2));
  if (!subAgent.success || subAgent.status !== "rules_signed") {
    throw new Error("submitAgent did not succeed");
  }
  console.log("  PASS: First signature submitted and rules active.");

  // 3. Prepare Grant Permission
  console.log("\n3. Testing POST /api/payer/grant/prepare:");
  const prepGrantRes = await fetch(`${baseUrl}/api/payer/grant/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_id: subAgent.agent_id,
      durationDays: 90,
    }),
  });
  const prepGrant = await prepGrantRes.json();
  console.log("  Response:", JSON.stringify(prepGrant, null, 2));
  if (!prepGrant.correlation_id) throw new Error("prepareGrant did not return correlation_id");
  console.log("  PASS: Grant permission prepared.");

  // 4. Submit Grant Permission (Signature 2)
  console.log("\n4. Testing POST /api/payer/grant/submit:");
  const subGrantRes = await fetch(`${baseUrl}/api/payer/grant/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      correlation_id: prepGrant.correlation_id,
      signed_data: { standard: "nep413", payload: { nonce: Date.now() } },
    }),
  });
  const subGrant = await subGrantRes.json();
  console.log("  Response:", JSON.stringify(subGrant, null, 2));
  if (!subGrant.success || subGrant.status !== "permission_signed") {
    throw new Error("submitGrant did not succeed");
  }
  console.log("  PASS: Second signature submitted and grant live.");

  // 5. Generate Deposit Address
  console.log("\n5. Testing POST /api/payer/deposit:");
  const depRes = await fetch(`${baseUrl}/api/payer/deposit`, { method: "POST" });
  const depData = await depRes.json();
  console.log("  Response:", JSON.stringify(depData, null, 2));
  if (!depData.deposit_address) throw new Error("deposit endpoint did not return deposit_address");
  console.log("  PASS: Deposit address and QR data generated.");

  console.log("\n=== Step 1 verification complete: ALL TESTS PASSED ===");
}

testStep1().catch((err) => {
  console.error("Step 1 Test Failed:", err);
  process.exit(1);
});
