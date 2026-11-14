import { store } from "../src/infrastructure/store/persistent-store";
import { SubscriptionService } from "../src/modules/subscriptions/subscription.service";
import { NearAuthorisationClient } from "../src/infrastructure/near/near-client";
import { createObligoMcpServer } from "../src/infrastructure/mcp/server";

function assertTest(name: string, condition: boolean) {
  console.log(`${condition ? "✅ PASS" : "❌ FAIL"}: ${name}`);
  if (!condition) process.exitCode = 1;
}

async function run() {
  const userId = "usr_test_verification_01";
  const profile = store.getProfile(userId);
  assertTest("Register / load user", Boolean(profile?.id));

  const subscription = SubscriptionService.create({
    name: "Test recurring obligation",
    provider: "Test provider",
    category: "Operations",
    amount: 30000,
    currency: "NGN",
    billingCycle: "monthly",
    nextBillingDate: new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0],
    status: "active",
    userId,
  }, userId);
  assertTest("Persist recurring obligation", Boolean(subscription?.id));

  const stats = SubscriptionService.getStats(userId);
  assertTest("Calculate recurring spend", stats.monthlyTotal > 0);

  if (process.env.NEAR_ACCOUNT_ID && process.env.NEAR_PRIVATE_KEY) {
    const permission = await NearAuthorisationClient.recordPermission({
      actionType: "INVOICE_SETTLEMENT",
      spendingLimit: 100,
      currency: "USD",
      userId,
    });
    assertTest("Create NEAR authorization record", Boolean(permission.permissionHash && permission.transactionHash));
  } else {
    console.log("⏭️ BLOCKED: Create NEAR authorization record (configure funded NEAR_ACCOUNT_ID, NEAR_PRIVATE_KEY, and deployed contract)");
  }
  assertTest("Initialize invoice MCP server", Boolean(createObligoMcpServer()));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
