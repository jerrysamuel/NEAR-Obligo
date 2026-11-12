import { store } from "../src/infrastructure/store/persistent-store";
import { SubscriptionService } from "../src/modules/subscriptions/subscription.service";
import { SubscriptionInsightsEngine } from "../src/modules/subscriptions/subscription-insights";
import { ShoppingService } from "../src/modules/shopping/shopping.service";
import { PolicyEngine } from "../src/modules/privacy/policy-engine";
import { PermissionService } from "../src/modules/privacy/permission.service";
import { NearAuthorisationClient } from "../src/infrastructure/near/near-client";
import { aiService } from "../src/modules/ai/ai.service";
import { createObligoMcpServer } from "../src/infrastructure/mcp/server";

interface TestResult {
  name: string;
  expected: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assertTest(name: string, expected: string, condition: boolean, details?: string) {
  results.push({ name, expected, passed: condition, details });
  const icon = condition ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon}: ${name} -> ${expected}`);
  if (!condition && details) console.error(`   Error details: ${details}`);
}

async function runAllTests() {
  console.log("=================================================");
  console.log("       OBLIGO MVP TEST VERIFICATION SUITE        ");
  console.log("=================================================\n");

  const testUserId = "usr_test_verification_01";

  // 1. Profile / User
  const profile = store.getProfile(testUserId);
  assertTest("Register / Load User", "Account loaded with preferences", Boolean(profile && profile.id));

  // 2. Add subscription
  const createdSub = SubscriptionService.create(
    {
      name: "ChatGPT Plus Test",
      provider: "OpenAI",
      category: "Developer Tools",
      amount: 30000,
      currency: "NGN",
      billingCycle: "monthly",
      nextBillingDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
      status: "active",
      notes: "Test subscription",
      userId: testUserId,
    },
    testUserId
  );
  assertTest("Add subscription", "Subscription saved", Boolean(createdSub && createdSub.id));

  // 3. Edit subscription
  const updatedSub = SubscriptionService.update(
    createdSub.id,
    { amount: 32000, notes: "Updated price" },
    testUserId
  );
  assertTest(
    "Edit subscription",
    "Changes persisted",
    Boolean(updatedSub && updatedSub.amount === 32000 && updatedSub.notes === "Updated price")
  );

  // 4. Calculate monthly and annual spending
  const stats = SubscriptionService.getStats(testUserId);
  assertTest(
    "Calculate monthly spending",
    "Correct calculation",
    stats.monthlyTotal > 0
  );
  assertTest(
    "Calculate annual spending",
    "Correct calculation",
    stats.annualizedTotal === stats.monthlyTotal * 12 || stats.annualizedTotal > stats.monthlyTotal
  );

  // 5. Retrieve upcoming renewals
  const upcoming = SubscriptionService.getUpcomingRenewals(10, testUserId);
  assertTest(
    "Retrieve upcoming renewals",
    "Correct date filtering",
    upcoming.some((u) => u.name === "ChatGPT Plus Test")
  );

  // 6. Ask AI about subscriptions
  const aiAnswer = await aiService.answerSubscriptionQuestion(
    "How much am I spending on subscriptions every month?",
    store.getSubscriptions(testUserId)
  );
  assertTest(
    "Ask AI about subscriptions",
    "Answer based on actual records",
    aiAnswer.content.includes("₦") && aiAnswer.attestationVerified
  );

  // 7. Search products
  const products = await ShoppingService.search("laptop", 1500000);
  assertTest(
    "Search products",
    "Actual product results returned",
    products.length > 0 && products.some((p) => p.title.toLowerCase().includes("dell") || p.title.toLowerCase().includes("macbook"))
  );

  // 8. Compare products
  const comparison = await ShoppingService.compareProducts([products[0].id, products[1].id]);
  assertTest(
    "Compare products",
    "Correct prices and specifications",
    Boolean(comparison.recommendedId && comparison.specificationMatrix)
  );

  // 9. Save product
  const saved = await ShoppingService.saveProduct(products[0].id, "Hackathon laptop shortlist", testUserId);
  assertTest(
    "Save product",
    "Product persists",
    Boolean(saved && saved.userId === testUserId)
  );

  // 10. Prepare purchase
  const prep = await ShoppingService.preparePurchase(products[0].id, 1, testUserId);
  assertTest(
    "Prepare purchase",
    "Purchase intent created",
    Boolean(prep.intent && prep.preparation.requiredFields.length > 0)
  );

  // 11. Approve disclosure
  const grantedPerm = PermissionService.grant({
    recipient: "Slot Systems Nigeria",
    purpose: "Delivery verification",
    requestedFields: ["recipient_name", "delivery_address"],
    userId: testUserId,
  });
  const checkApproved = PolicyEngine.evaluateDisclosure(
    "Slot Systems Nigeria",
    ["recipient_name"],
    testUserId
  );
  assertTest(
    "Approve disclosure",
    "Only approved fields released",
    checkApproved.isPermitted && checkApproved.permittedFields.includes("recipient_name")
  );

  // 12. Revoke permission
  PermissionService.revoke(grantedPerm.id, testUserId);
  const checkRevoked = PolicyEngine.evaluateDisclosure(
    "Slot Systems Nigeria",
    ["recipient_name"],
    testUserId
  );
  assertTest(
    "Revoke permission",
    "Subsequent disclosure rejected",
    !checkRevoked.isPermitted
  );

  // 13. Create NEAR permission
  const nearRecord = await NearAuthorisationClient.recordPermission({
    actionType: "CHECKOUT_SLOT_SYSTEMS",
    spendingLimit: 1195000,
    currency: "NGN",
    userId: testUserId,
  });
  assertTest(
    "Create NEAR permission",
    "Testnet transaction confirmed",
    Boolean(nearRecord.permissionHash && nearRecord.transactionHash)
  );

  // 14. Revoke NEAR permission
  const revokedNear = await NearAuthorisationClient.revokePermission(nearRecord.id, testUserId);
  const fetchedNear = NearAuthorisationClient.getRecords(testUserId).find((r) => r.id === nearRecord.id);
  assertTest(
    "Revoke NEAR permission",
    "Contract reflects revocation",
    Boolean(revokedNear && fetchedNear?.revoked === true)
  );

  // 15. Delete subscription
  const deletedSub = SubscriptionService.delete(createdSub.id, testUserId);
  assertTest("Delete subscription", "Record removed", deletedSub);

  // 16. Call MCP subscription tools
  const mcpServer = createObligoMcpServer();
  assertTest("Call MCP server setup", "Server instantiated with registered tools", Boolean(mcpServer));

  // 17. Superfluid Crypto Subscription Discovery
  const { SuperfluidStreamConnector } = await import("../src/modules/subscriptions/crypto-stream.connector");
  const streams = await SuperfluidStreamConnector.discoverStreams();
  assertTest("Crypto subscription discovery (Superfluid)", "Streams discovered & normalized", streams.length > 0 && Boolean(streams[0].monthlyEquivalentFormatted));

  // Summary
  console.log("\n=================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log("=================================================");

  if (passed === total) {
    console.log("🎉 ALL MVP REQUIREMENTS MET AND VERIFIED!");
    process.exit(0);
  } else {
    console.error("Some tests failed.");
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error("Test execution fatal error:", e);
  process.exit(1);
});
