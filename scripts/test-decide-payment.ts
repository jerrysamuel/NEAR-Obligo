import { decidePayment, DecidePaymentInput } from "../src/lib/decide-payment";

function createBaseInput(overrides: Partial<DecidePaymentInput> = {}): DecidePaymentInput {
  const base: DecidePaymentInput = {
    invoice: {
      amount: 20,
      wallet_address: "vendor.near",
      invoice_number: "INV-001",
      due_date: "2026-11-20",
    },
    vendor: {
      wallet_address: "vendor.near",
      wallet_verified: true,
    },
    obligation: {
      expected_amount: 20,
      max_amount: 50,
      tolerance_pct: 10,
      auto_pay: true,
      status: "active",
    },
    policy: {
      per_tx_cap: 100,
      monthly_limit: 500,
      expires_at: "2026-12-31T23:59:59Z",
      frozen: false,
    },
    monthlySpentSoFar: 0,
    duplicateExists: false,
    now: "2026-11-14T00:00:00Z",
  };

  return {
    ...base,
    ...overrides,
    invoice: { ...base.invoice, ...overrides.invoice },
    vendor: { ...base.vendor, ...overrides.vendor },
    obligation: { ...base.obligation, ...overrides.obligation },
    policy: { ...base.policy, ...overrides.policy },
  };
}

interface TestCase {
  name: string;
  input: DecidePaymentInput;
  expected: {
    decision: "pay" | "needs_approval" | "refuse";
    reason: string;
  };
}

const tests: TestCase[] = [
  // 1. expected 20, tolerance 10, amount 21 -> pay
  {
    name: "expected 20, tolerance 10, amount 21 -> pay",
    input: createBaseInput({
      obligation: {
        expected_amount: 20,
        max_amount: 50,
        tolerance_pct: 10,
        auto_pay: true,
        status: "active",
      },
      invoice: {
        amount: 21,
      },
    }),
    expected: { decision: "pay", reason: "OK" },
  },

  // 2. same, amount 28 -> needs_approval VARIANCE
  {
    name: "same, amount 28 -> needs_approval VARIANCE",
    input: createBaseInput({
      obligation: {
        expected_amount: 20,
        max_amount: 50,
        tolerance_pct: 10,
        auto_pay: true,
        status: "active",
      },
      invoice: {
        amount: 28,
      },
    }),
    expected: { decision: "needs_approval", reason: "VARIANCE" },
  },

  // 3. amount 60 with cap 50 -> refuse OVER_TX_CAP
  {
    name: "amount 60 with cap 50 -> refuse OVER_TX_CAP",
    input: createBaseInput({
      invoice: {
        amount: 60,
      },
      policy: {
        per_tx_cap: 50,
        monthly_limit: 500,
        expires_at: "2026-12-31T23:59:59Z",
        frozen: false,
      },
      obligation: {
        expected_amount: 60,
        max_amount: 100,
        tolerance_pct: 10,
        auto_pay: true,
        status: "active",
      },
    }),
    expected: { decision: "refuse", reason: "OVER_TX_CAP" },
  },

  // 4. duplicateExists true -> refuse DUPLICATE_INVOICE
  {
    name: "duplicateExists true -> refuse DUPLICATE_INVOICE",
    input: createBaseInput({
      duplicateExists: true,
    }),
    expected: { decision: "refuse", reason: "DUPLICATE_INVOICE" },
  },

  // 5. wallet differs -> refuse WALLET_MISMATCH
  {
    name: "wallet differs -> refuse WALLET_MISMATCH",
    input: createBaseInput({
      invoice: {
        amount: 20,
        wallet_address: "attacker.near",
      },
      vendor: {
        wallet_address: "vendor.near",
        wallet_verified: true,
      },
    }),
    expected: { decision: "refuse", reason: "WALLET_MISMATCH" },
  },

  // 6. frozen true -> refuse AGENT_FROZEN
  {
    name: "frozen true -> refuse AGENT_FROZEN",
    input: createBaseInput({
      policy: {
        frozen: true,
        per_tx_cap: 100,
        monthly_limit: 500,
        expires_at: "2026-12-31T23:59:59Z",
      },
    }),
    expected: { decision: "refuse", reason: "AGENT_FROZEN" },
  },

  // 7. expired -> refuse MANDATE_EXPIRED
  {
    name: "expired -> refuse MANDATE_EXPIRED",
    input: createBaseInput({
      policy: {
        per_tx_cap: 100,
        monthly_limit: 500,
        expires_at: "2026-11-10T00:00:00Z",
        frozen: false,
      },
      now: "2026-11-14T00:00:00Z",
    }),
    expected: { decision: "refuse", reason: "MANDATE_EXPIRED" },
  },

  // 8. monthlySpentSoFar 290, amount 20, limit 300 -> refuse OVER_MONTHLY_LIMIT
  {
    name: "monthlySpentSoFar 290, amount 20, limit 300 -> refuse OVER_MONTHLY_LIMIT",
    input: createBaseInput({
      monthlySpentSoFar: 290,
      invoice: {
        amount: 20,
      },
      policy: {
        per_tx_cap: 100,
        monthly_limit: 300,
        expires_at: "2026-12-31T23:59:59Z",
        frozen: false,
      },
      obligation: {
        expected_amount: 20,
        max_amount: 50,
        tolerance_pct: 10,
        auto_pay: true,
        status: "active",
      },
    }),
    expected: { decision: "refuse", reason: "OVER_MONTHLY_LIMIT" },
  },

  // 9. two failures at once (frozen and duplicate) -> AGENT_FROZEN, proving order
  {
    name: "two failures at once (frozen and duplicate) -> AGENT_FROZEN, proving order",
    input: createBaseInput({
      policy: {
        frozen: true,
        per_tx_cap: 100,
        monthly_limit: 500,
        expires_at: "2026-12-31T23:59:59Z",
      },
      duplicateExists: true,
    }),
    expected: { decision: "refuse", reason: "AGENT_FROZEN" },
  },
];

let passed = 0;
let failed = 0;

for (const t of tests) {
  const result = decidePayment(t.input);
  const match =
    result.decision === t.expected.decision && result.reason === t.expected.reason;

  if (match) {
    console.log(`PASS: ${t.name} -> { decision: '${result.decision}', reason: '${result.reason}' }`);
    passed++;
  } else {
    console.error(
      `FAIL: ${t.name}\n  Expected: { decision: '${t.expected.decision}', reason: '${t.expected.reason}' }\n  Received: { decision: '${result.decision}', reason: '${result.reason}' }`
    );
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
