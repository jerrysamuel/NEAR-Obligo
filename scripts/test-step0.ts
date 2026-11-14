import { centsToUnits, unitsToCents, formatCents, parseDollarsToCents } from "../src/lib/money";
import { getPlainCopy, getStatusPresentation } from "../src/lib/copy";

console.log("=== Testing Step 0: Theme, Helpers, Copy, and Shell Separation ===");

// 1. Money tests (Section 7.2)
console.log("\n1. Testing Money Helpers (integer minor units):");
const cents = 20; // 20 cents ($0.20)
const units = centsToUnits(cents);
console.log(`  centsToUnits(20) = "${units}" (expected: "200000")`);
if (units !== "200000") throw new Error("centsToUnits failed");

const backToCents = unitsToCents(units);
console.log(`  unitsToCents("200000") = ${backToCents} (expected: 20)`);
if (backToCents !== 20) throw new Error("unitsToCents failed");

const formatted = formatCents(cents);
console.log(`  formatCents(20) = "${formatted}" (expected: "$0.20")`);
if (formatted !== "$0.20") throw new Error("formatCents failed");

const parsed = parseDollarsToCents("$1.50");
console.log(`  parseDollarsToCents("$1.50") = ${parsed} (expected: 150)`);
if (parsed !== 150) throw new Error("parseDollarsToCents failed");
console.log("  PASS: Money helpers verified.");

// 2. Copy dictionary tests (Section 8)
console.log("\n2. Testing Plain-Language Copy & Status Presentation:");
const sampleCodes = [
  { code: "AGENT_FROZEN", expected: "Payments are paused" },
  { code: "OVER_TX_CAP", expected: "Over the limit for one invoice" },
  { code: "OVER_MONTHLY_LIMIT", expected: "Monthly limit reached" },
  { code: "WALLET_MISMATCH", expected: "Payout account not approved" },
  { code: "DUPLICATE_INVOICE", expected: "This invoice was already sent" },
  { code: "VARIANCE", expected: "Amount differs from the contract. Waiting for review" },
  { code: "MANDATE_EXPIRED", expected: "Payment permission expired. Payer must renew" },
  { code: "settled", expected: "Paid" },
];

for (const s of sampleCodes) {
  const plain = getPlainCopy(s.code);
  console.log(`  ${s.code} -> "${plain}"`);
  if (plain !== s.expected) throw new Error(`Copy mismatch for ${s.code}`);
}

const presSettled = getStatusPresentation("settled");
console.log(`  Status presentation "settled": label="${presSettled.label}", icon="${presSettled.icon}"`);
if (presSettled.label !== "Paid" || presSettled.icon !== "CheckCircle2") {
  throw new Error("Status presentation failed");
}

const presWaiting = getStatusPresentation("needs_approval");
console.log(`  Status presentation "needs_approval": label="${presWaiting.label}", icon="${presWaiting.icon}"`);
if (presWaiting.label !== "Waiting for review" || presWaiting.icon !== "Clock") {
  throw new Error("Status presentation failed");
}
console.log("  PASS: Plain language copy verified.");

console.log("\n=== Step 0 verification complete: ALL TESTS PASSED ===");
