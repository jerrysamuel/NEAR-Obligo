# Nearbligo

Policy-controlled invoice payments for businesses and contractors, powered by NEAR Mainnet.

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
- Self-hosted autonomous worker: a restricted NEAR FunctionCall key on `oblig.near` that can call only `ft_transfer` on the USDT contract.
- MCP: invoice, obligation, lifecycle-event, authorization, evaluation, and emergency-pause tools over stdio or authenticated HTTP.
- Webhooks: invoice lifecycle delivery and provider callback endpoints for event-driven integrations.

## Mainnet deployment

The permissions contract is deployed at `obligoo.near` on NEAR Mainnet. The payout account is separate:

```text
Permissions contract: obligoo.near
Autonomous payout account: oblig.near
USDT contract: usdt.tether-token.near
Network: mainnet
```

`obligoo.near` stores authorization state. `oblig.near` holds USDT and NEAR for gas and signs payouts through its restricted worker key. Never use a FullAccess key as the autonomous worker key.

## Local setup

```bash
pnpm install
pnpm dev
```

Configure Supabase and NEAR credentials in `.env.local`. Use a dedicated low-balance account for demonstrations. The Rust contract is in `contracts/obligo-permissions`.

Required backend variables include:

```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEAR_NETWORK_ID=mainnet
NEAR_NODE_URL=https://rpc.mainnet.near.org
NEAR_ACCOUNT_ID=obligoo.near
NEAR_PRIVATE_KEY=<permissions-owner-key>
NEAR_CONTRACT_ID=obligoo.near
NEAR_AUTONOMOUS_ACCOUNT_ID=oblig.near
NEAR_AUTONOMOUS_PRIVATE_KEY=<restricted-worker-private-key>
NEAR_USDT_CONTRACT=usdt.tether-token.near
```

Keep all private keys server-side. Do not expose them through `NEXT_PUBLIC_*` variables or commit `.env.local`.

Optional server integrations:

```env
MCP_API_TOKEN=<long-random-token>
CRON_SECRET=<long-random-token>
NEARBLIGO_WEBHOOK_URL=https://your-consumer.example/webhooks/invoices
NEARBLIGO_WEBHOOK_SECRET=<long-random-secret>
NEAR_AGENT_WEBHOOK_SECRET=<provider-callback-secret>
```

The remote MCP endpoint requires `Authorization: Bearer $MCP_API_TOKEN`. The delivery and reconciliation routes require `Authorization: Bearer $CRON_SECRET`.

## Self-hosted autonomous worker

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

The worker rejects FullAccess keys, validates the on-chain key restriction, checks the invoice policy, submits the USDT transfer, and records the confirmed NEAR transaction hash. Keep only a small demonstration balance in this account.

The worker currently settles invoices in USDT only. NEAR is used for gas and token-storage registration. Before a contractor can receive USDT, their payout account must be registered with `usdt.tether-token.near` through `storage_deposit`; this can be paid by the contractor or by the platform setup account. The worker payout key itself remains limited to `ft_transfer`.

The payment path prefers the self-hosted worker whenever its credentials are configured. The external Agent API is optional and is used only when no autonomous worker credentials are available.


## Verification and testing

```bash
pnpm exec tsc --noEmit
pnpm build
pnpm check:worker-key
pnpm test:mainnet-contract
pnpm test:mvp
pnpm mcp
```

For a full browser test:

1. Start the app with `pnpm dev`.
2. Create a payer contractor invitation and an active contract.
3. Have the contractor submit a real NEAR payout account.
4. Approve the exact vendor record linked to that invitation.
5. Register the payout account with the USDT contract.
6. Ensure `oblig.near` has NEAR for gas and USDT for settlement.
7. Submit a small invoice and verify `settled`, the transaction hash, and the recipient balance.

The MCP server can provide invoice and policy context without the Agent API key. Remote MCP requests use `/api/mcp` with `Authorization: Bearer $MCP_API_TOKEN`; stdio remains available for local clients. Webhook delivery and reconciliation routes require `Authorization: Bearer $CRON_SECRET`.

Do not use `scripts/seed.ts` for the production database: it creates demonstration vendors, contracts, and invoices. Use fresh payer and contractor records for a real demo.
