# Nearbligo

Nearbligo is a policy-controlled invoice payment platform for businesses and contractors. A payer defines contractors, contracts, spending limits, payout accounts, and approval rules. Nearbligo evaluates each invoice deterministically, settles valid invoices automatically, routes exceptions to payer review, and records an auditable payment history.

The workflow is industry agnostic and applies to logistics, construction, staffing, maintenance, procurement, professional services, and any business that uses recurring invoices.

## Product flow

1. A payer creates an active contractor contract with a rate, tolerance, frequency, and maximum invoice amount.
2. The payer invites a contractor.
3. The contractor creates a profile and submits a real NEAR payout account.
4. The payer approves that exact contractor record and payout account.
5. The contractor submits an invoice under the approved contract.
6. Nearbligo checks pause state, policy expiry, duplicate invoices, contract status, payout-wallet approval, amount limits, monthly limits, variance, and auto-pay settings.
7. Valid invoices are settled in USDT on NEAR Mainnet. Unusual invoices become `needs_approval`; unsafe invoices are refused.
8. The invoice, decision, payment attempt, transaction hash, and receipt remain available in the audit trail.

## Architecture

| Component | Purpose |
| --- | --- |
| Next.js application | Payer and contractor portals, API routes, MCP HTTP endpoint |
| Supabase | Application data, invoices, vendors, obligations, policies, audit logs, and events |
| `obligoo.near` | Deployed NEAR permissions/authorization contract |
| `oblig.near` | Separate payer settlement account holding NEAR and USDT |
| Autonomous worker | Backend process that signs USDT transfers with a restricted FunctionCall key |
| `usdt.tether-token.near` | NEP-141 USDT contract used for settlement |
| MCP server | Invoice, policy, authorization, evaluation, and emergency-pause tools |
| Webhook routes | Event delivery and provider callback integration |

## Mainnet addresses

```text
Network:                 mainnet
Permissions contract:    obligoo.near
Settlement account:      oblig.near
USDT contract:            usdt.tether-token.near
RPC:                     https://rpc.mainnet.near.org
```

`obligoo.near` and `oblig.near` have different responsibilities. Do not overwrite the permissions contract account with the payout worker. Keep the worker account funded only with the balance required for the demonstration or operating period.

## Prerequisites

- Node.js 20 or newer
- pnpm 9 or newer
- A Supabase project
- A funded NEAR Mainnet account
- Rust and `wasm32-unknown-unknown` only when rebuilding the contract
- A funded `oblig.near` account with NEAR for gas and USDT for payouts

Install dependencies:

```bash
corepack enable
pnpm install
```

## Environment configuration

Create `.env.local` for local development. Never commit it and never expose private keys through `NEXT_PUBLIC_*` variables.

### Required variables

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Nearbligo

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLIC_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLIC_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

NEAR_NETWORK_ID=mainnet
NEAR_NODE_URL=https://rpc.mainnet.near.org
NEAR_RPC_URL=https://rpc.mainnet.near.org
NEAR_CONTRACT_ID=obligoo.near
NEAR_ACCOUNT_ID=obligoo.near
NEAR_PRIVATE_KEY=YOUR_OBLIGOO_OWNER_PRIVATE_KEY

NEAR_AUTONOMOUS_ACCOUNT_ID=oblig.near
NEAR_AUTONOMOUS_PRIVATE_KEY=YOUR_RESTRICTED_WORKER_PRIVATE_KEY
NEAR_AUTONOMOUS_PUBLIC_KEY=YOUR_RESTRICTED_WORKER_PUBLIC_KEY
NEAR_USDT_CONTRACT=usdt.tether-token.near
```

`NEAR_PRIVATE_KEY` is used for owner-authorized contract operations. `NEAR_AUTONOMOUS_PRIVATE_KEY` must be a different restricted key. The worker key must not be FullAccess.

### Optional integrations

```env
NEAR_AI_API_URL=https://api.near.ai/v1
NEAR_AI_MODEL=YOUR_MODEL
NEAR_AI_API_KEY=YOUR_NEAR_AI_KEY

MCP_API_TOKEN=LONG_RANDOM_TOKEN
CRON_SECRET=LONG_RANDOM_TOKEN
NEARBLIGO_WEBHOOK_URL=https://your-consumer.example/webhooks/invoices
NEARBLIGO_WEBHOOK_SECRET=LONG_RANDOM_SECRET
NEAR_AGENT_WEBHOOK_SECRET=PROVIDER_CALLBACK_SECRET

# Only needed if the external Agent API is intentionally used.
NEAR_INTENTS_AGENT_API_KEY=YOUR_AGENT_API_KEY
NEAR_INTENTS_AGENT_API_URL=YOUR_AGENT_API_URL
```

The self-hosted worker is preferred whenever its account and private key are configured. The external Agent API is optional.

## Database setup

The repository contains three migrations:

```text
supabase/migrations/20261114000000_init_nearbligo.sql
supabase/migrations/20261114000001_nearbligo_spec_additions.sql
supabase/migrations/20261114000002_invoice_events.sql
```

Apply them using one of these methods.

### Supabase SQL Editor

Open the Supabase project’s SQL Editor and run the migration files in filename order. Wait for each file to finish before running the next one.

### Supabase CLI

From the project root, after linking the local directory to the correct Supabase project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Do not run `scripts/seed.ts` against production. It creates demonstration vendors, contracts, policies, and invoices.

## NEAR contract

The permissions contract is already deployed and initialized at `obligoo.near` on Mainnet. Verify it with:

```bash
pnpm test:mainnet-contract
```

Only rebuild and redeploy the Rust contract when the contract source changes. The contract source is in `contracts/obligo-permissions`.

To build the contract locally:

```bash
rustup target add wasm32-unknown-unknown
cd contracts/obligo-permissions
cargo test
cargo near build
cd ../..
```

Do not redeploy over `obligoo.near` during a demo without checking the target account, contract state, and migration plan.

## Autonomous settlement worker

The worker runs in the Next.js backend process; its permission is enforced on NEAR. It validates that its key is:

```text
Permission: FunctionCall
Receiver:  usdt.tether-token.near
Methods:   ft_transfer only
```

Generate a new key pair locally:

```bash
pnpm generate:worker-key
```

Store the private key only in the backend environment. Add the public key to `oblig.near` as a restricted FunctionCall key using the existing `oblig.near` FullAccess owner key. The key must target only `usdt.tether-token.near` and allow only `ft_transfer`.

Verify the installed worker key:

```bash
pnpm check:worker-key
```

The settlement account needs both NEAR for gas and storage registration costs, and USDT on `usdt.tether-token.near` for contractor payouts.

## USDT recipient registration

A NEAR account can exist and still be unable to receive a NEP-141 token. Each contractor payout account must be registered with the USDT contract using `storage_deposit`.

The contractor or platform setup account can register it. For example, a payer setup account can register `CONTRACTOR_ACCOUNT.near`:

```bash
near contract call-function as-transaction \
  usdt.tether-token.near \
  storage_deposit \
  json-args \
  '{"account_id":"CONTRACTOR_ACCOUNT.near","registration_only":true}' \
  prepaid-gas '30 Tgas' \
  attached-deposit '0.00125 NEAR' \
  sign-as oblig.near \
  network-config mainnet \
  sign-with-keychain \
  send
```

The exact required deposit is token-contract state and can change; use the amount returned by `storage_balance_bounds` when implementing an automated setup flow. The payout worker remains limited to `ft_transfer`; it does not receive permission to call `storage_deposit`.

## Run locally

Start the development server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

Production build and server:

```bash
pnpm build
pnpm start
```

For a host that supplies a `PORT` environment variable:

```bash
pnpm exec next start -p $PORT
```

## Verification commands

```bash
pnpm exec tsc --noEmit
pnpm build
pnpm check:worker-key
pnpm test:mainnet-contract
pnpm test:mvp
```

The browser test scripts expect a running server at `http://localhost:3000`:

```bash
pnpm dev
# In another terminal, use the relevant scripts under scripts/test-*.ts.
```

Some test scripts create Supabase rows. Use a disposable Supabase project or clean test records after running them.

## End-to-end Mainnet smoke test

1. Apply all Supabase migrations.
2. Configure `.env.local` and restart the server after every environment change.
3. Run `pnpm check:worker-key`.
4. Confirm `oblig.near` has NEAR and USDT.
5. Create a payer contract for a real contractor.
6. Send the invite to the contractor.
7. Have the contractor submit a real NEAR payout account.
8. Approve the exact vendor record linked to that invitation; duplicate vendor rows are not interchangeable.
9. Register the payout account with USDT using `storage_deposit`.
10. Submit a small invoice, such as `$0.20`.
11. Confirm the invoice passes policy evaluation and reaches `settled`.
12. Verify the NEAR transaction hash and the recipient’s USDT balance.

If an invoice is refused, inspect the audit timeline. `WALLET_MISMATCH` means the invoice wallet, vendor wallet, or approval state does not match. `PAYMENT_FAILED` means policy passed but the blockchain transfer failed; check USDT registration, payer USDT balance, gas, and the recorded settlement error.

## MCP and webhooks

Run the stdio MCP server locally:

```bash
pnpm mcp
```

The authenticated HTTP MCP endpoint is:

```text
POST /api/mcp
Authorization: Bearer $MCP_API_TOKEN
```

The endpoint exposes invoice, obligation, event, authorization, evaluation, permission, and emergency-pause tools. Webhook delivery and reconciliation endpoints require `Authorization: Bearer $CRON_SECRET`.

## Render deployment

Create a Render **Web Service**, not a Static Site.

```text
Build command: corepack enable && pnpm install --frozen-lockfile && pnpm build
Start command: pnpm start
```

Copy the required variables into Render’s Environment settings. Do not upload `.env.local` or commit secrets. After Render gives the service a URL, update:

```env
NEXT_PUBLIC_APP_URL=https://YOUR-SERVICE.onrender.com
```

Redeploy after changing environment variables. Keep the service awake during a live demo or use a suitable Render plan for background/event-driven work.

## Security notes

- Never commit `.env.local`.
- Never expose `NEAR_PRIVATE_KEY`, `NEAR_AUTONOMOUS_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or API keys to the browser.
- Use separate owner and worker keys.
- Keep the worker key limited to the USDT `ft_transfer` method.
- Keep `oblig.near` low-balance and monitor its USDT balance.
- Treat invoice refusal as a security result, not an error to bypass.
- Rotate any secret that has been pasted into chat, logs, screenshots, or source control.
