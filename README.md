# Nearbligo

Policy-controlled invoice payments for businesses and contractors, powered by NEAR.

Nearbligo helps a payer define contractor obligations and payment boundaries, then automatically reviews and settles valid invoices. The same workflow works for logistics, construction, professional services, staffing, maintenance, procurement, and other invoice-based industries.

## Core flow

1. A payer creates an organization, contractor, obligation, rate, tolerance, and spending policy.
2. Nearbligo records the authorization boundary and its cryptographic reference on NEAR.
3. The payer invites a contractor to the portal.
4. The contractor submits an invoice with line items, evidence, and a verified NEAR payout account.
5. The deterministic decision engine checks expiry, pause state, duplicate invoices, contractor wallet, obligation status, amount limits, monthly limits, variance, and auto-pay settings.
6. Valid invoices are settled automatically; exceptions become `needs_approval`; unsafe invoices are refused.
7. The payer can approve exceptions or pause all automated settlement immediately.
8. Every decision and settlement receives an audit record and receipt.

## Main product areas

- Payer portal: vendors, contracts, invoices, approvals, policies, pause/resume, and settlement history.
- Contractor portal: onboarding, invoice submission, invoice status, payout profile, and receipts.
- NEAR authorization: permission hashes and revocation records.
- Agent API: scoped payment execution with idempotency keys.
- Self-hosted autonomous worker: restricted NEAR key fallback for direct USDT invoice settlement when Agent API access is unavailable.
- MCP: invoice, obligation, lifecycle-event, authorization, evaluation, and emergency-pause tools over stdio.

## Local setup

```bash
pnpm install
pnpm dev
```

Configure Supabase and NEAR credentials in `.env.local`. Use a dedicated low-balance account for demonstrations. The Rust contract is in `contracts/obligo-permissions`.

Optional server integrations:

```env
MCP_API_TOKEN=<long-random-token>
CRON_SECRET=<long-random-token>
NEARBLIGO_WEBHOOK_URL=https://your-consumer.example/webhooks/invoices
NEARBLIGO_WEBHOOK_SECRET=<long-random-secret>
NEAR_AGENT_WEBHOOK_SECRET=<provider-callback-secret>
```

The remote MCP endpoint requires `Authorization: Bearer $MCP_API_TOKEN`. The delivery and reconciliation routes require `Authorization: Bearer $CRON_SECRET`.

## Self-hosted autonomous worker fallback

Use a dedicated low-balance payer account such as `oblig.near`. Generate a worker key with:

```bash
pnpm generate:worker-key
```

Have the payer wallet add the printed public key as a FunctionCall access key with:

```text
receiver_id: usdt.tether-token.near
method_names: ft_transfer
```

Store the generated private key only on the backend:

```env
NEAR_AUTONOMOUS_ACCOUNT_ID=oblig.near
NEAR_AUTONOMOUS_PRIVATE_KEY=<restricted-worker-private-key>
NEAR_USDT_CONTRACT=usdt.tether-token.near
```

The worker rejects full-access keys, validates the on-chain key restriction, checks the invoice policy, submits the USDT transfer, and records the confirmed NEAR transaction hash. Keep only a small demonstration balance in this account.


## Verification

```bash
pnpm exec tsc --noEmit
pnpm test:mvp
pnpm mcp
```

The MCP server can provide invoice and policy context without the Agent API key. Settlement tools fail closed until live payment credentials are configured. Remote MCP requests use `/api/mcp` with `Authorization: Bearer $MCP_API_TOKEN`; stdio remains available for local clients.

Before a real-money deployment, remove all mock settlement fallbacks, build and test the contract, deploy it to the target NEAR network, and verify a small real payment end-to-end.
