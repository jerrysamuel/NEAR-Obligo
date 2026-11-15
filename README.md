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
| `oblig.near` router | Deployed payout router that calls the USDT contract on behalf of `oblig.near` |
| Autonomous worker | Backend process that signs router calls with a restricted FunctionCall key |
| `usdt.tether-token.near` | NEP-141 USDT contract used for settlement |
| MCP server | Invoice, policy, authorization, evaluation, and emergency-pause tools |
| Webhook routes | Event delivery and provider callback integration |

## Mainnet addresses

```text
Network:                 mainnet
Permissions contract:    obligoo.near
Settlement account:      oblig.near
Payment router:          oblig.near (`pay` method)
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
NEAR_PAYMENT_ROUTER_ACCOUNT_ID=oblig.near
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

## Autonomous payment architecture

The autonomous payment is intentionally split into three layers:

```text
Next.js backend
    │ signs with restricted worker key
    ▼
oblig.near.pay(receiver_id, amount, memo)
    │ router attaches 1 yoctoNEAR internally
    ▼
usdt.tether-token.near.ft_transfer(receiver_id, amount, memo)
    │
    ▼
contractor NEAR account receives NEAR-native USDT
```

### Why the router is required

NEP-141 `ft_transfer` requires exactly `1 yoctoNEAR` attached to the token call. A restricted FunctionCall access key cannot safely perform that direct call in this setup; Mainnet rejects it with:

```text
DepositWithFunctionCall
```

The router solves this without giving the backend a FullAccess key. The worker key makes a zero-deposit call to `oblig.near.pay`. The router contract, which is deployed on the settlement account itself, creates the cross-contract USDT transfer and attaches the required 1 yoctoNEAR internally. USDT remains owned by `oblig.near` and NEAR is used only for gas/storage.

### On-chain permissions

The production worker key must be:

```text
Account:   oblig.near
Permission: FunctionCall
Receiver:  oblig.near
Methods:   pay only
Allowance: enough NEAR for the operating period
```

The router method is marked private, so only calls whose predecessor is `oblig.near` can invoke it. The access key additionally limits the backend to the single `pay` method. The owner FullAccess key is used only for deployment, initialization, and key administration.

### Router source and build

The router source is in `contracts/obligo-payment-router`. It is a minimal Rust/near-sdk contract with no invoice or business state. It validates a positive amount, rejects attached deposits, and calls the fixed token contract `usdt.tether-token.near` with 30 Tgas and 1 yoctoNEAR.

Build and test it with:

```bash
cd contracts/obligo-payment-router
cargo test --lib
cargo near build non-reproducible-wasm --no-abi
cd ../..
```

The artifact is generated at:

```text
contracts/obligo-payment-router/target/near/obligo_payment_router.wasm
```

### Deploy and initialize the router

Deploy it to the settlement account, not `obligoo.near`:

```bash
cd contracts/obligo-payment-router
near contract deploy oblig.near \
  use-file target/near/obligo_payment_router.wasm \
  with-init-call init json-args '{}' \
  prepaid-gas '30 Tgas' \
  attached-deposit '0 NEAR' \
  network-config mainnet \
  sign-with-keychain send
cd ../..
```

The deployment requires NEAR for contract storage in addition to transaction gas. Check the balance before deploying:

```bash
near account view-account-summary oblig.near network-config mainnet now
```

If the account is short on storage funding, transfer NEAR from another account owned by the payer. Do not move the USDT balance; the router must be deployed on the account that owns the USDT.

### Create and install the worker key

The worker key is generated once and its private key is stored only in the backend environment:

```bash
pnpm generate:worker-key
```

Using the owner FullAccess key, add the worker public key with only the router method:

```bash
near account add-key oblig.near \
  grant-function-call-access \
  --allowance '0.2 NEAR' \
  --contract-account-id oblig.near \
  --function-names pay \
  use-manually-provided-public-key YOUR_WORKER_PUBLIC_KEY \
  network-config mainnet \
  sign-with-keychain send
```

If an old worker key is already installed with the USDT receiver or `ft_transfer` permission, delete that key and add it again with the router receiver and `pay` method. The private key may remain the same when deliberately re-scoping the same public key.

Verify the exact on-chain permission:

```bash
pnpm check:worker-key
```

Expected output:

```text
Restricted worker key verified for oblig.near
router: oblig.near
methods: pay
```

The allowance is not the invoice amount. It is the NEAR budget that pays for worker transaction gas. A 60-Tgas outer call can cost approximately 0.061 NEAR, so a 0.05 NEAR allowance is insufficient after even one attempt. Keep the allowance capped and replenish/re-scope it deliberately.

### Backend signing flow

`src/infrastructure/near/autonomous-worker.ts` performs these checks before signing:

1. `NEAR_AUTONOMOUS_ACCOUNT_ID` and the restricted private key exist.
2. The private key derives the expected public key.
3. The on-chain access key is a FunctionCall key.
4. Its receiver is `NEAR_PAYMENT_ROUTER_ACCOUNT_ID` or `oblig.near`.
5. Its only method is `pay`.
6. It signs a call to `oblig.near.pay` with `receiver_id`, raw USDT `amount`, and memo.
7. It attaches zero NEAR to the outer call and provides 60 Tgas.
8. It requires a successful final transaction outcome and stores the transaction hash.

`src/lib/pay.ts` prefers this self-hosted worker whenever the autonomous account and private key are configured. The external Agent API is only a fallback when the self-hosted credentials are absent.

### End-to-end settlement sequence

For each invoice, the backend performs the following sequence:

```text
Invoice submitted
  → lock invoice and load vendor/contract/policy
  → evaluate deterministic rules
  → write EVALUATE_INVOICE audit event
  → create payment_attempts record
  → worker validates restricted key
  → worker calls oblig.near.pay
  → router calls USDT ft_transfer with 1 yoctoNEAR
  → NEAR returns final transaction outcome
  → update payment_attempts and invoice to settled/failed
  → write SETTLE_PAYMENT audit event and invoice lifecycle event
```

`EVALUATE_INVOICE: pay` means only that policy evaluation passed. The invoice is settled only after the final NEAR transaction succeeds. A later `SETTLE_PAYMENT: refuse` means the blockchain action failed and must be diagnosed from its NEAR error.

### Autonomous payment troubleshooting

Use the symptom to identify the layer that failed:

| Log or symptom | Meaning | Fix |
| --- | --- | --- |
| `Worker key is not a restricted FunctionCall key` | The backend key is FullAccess or the wrong key is loaded | Replace the environment key with the restricted worker key and run `pnpm check:worker-key` |
| `Worker key must target payment router` | The key still targets `usdt.tether-token.near` | Re-scope it to receiver `oblig.near`, method `pay` |
| `DepositWithFunctionCall` | The worker tried to attach 1 yoctoNEAR directly | Use the router flow; never allow the worker to call `ft_transfer` directly |
| `Exceeded the prepaid gas` | The outer worker call does not leave enough gas for the router plus its USDT cross-call | Use the 60-Tgas worker call and keep the router’s internal call at 30 Tgas |
| `does not have enough balance ... for transaction costing` | The FunctionCall key allowance is too low | Increase the restricted key allowance, not the worker’s permissions; 0.2 NEAR is a practical demo allowance |
| `PAYMENT_FAILED` after policy `pay` | Policy passed but settlement failed | Read the server log and `SETTLE_PAYMENT` audit reason; do not change policy rules to hide it |
| Contractor submission says account not approved | Vendor approval is linked to a different vendor row or wallet | Approve the exact vendor record and exact payout account used by the invoice |
| `invoice_events` not found in schema cache | The event migration is missing | Apply `20261114000002_invoice_events.sql`, then restart the app |
| Payer dashboard remains at zero | Dashboard API is stale or the server was not restarted | Restart `pnpm dev`; `/api/payer/funds` reads settled invoices and the live USDT balance |

For an invoice that evaluated as `pay` but did not settle, inspect these records in order:

1. `audit_log` row with action `EVALUATE_INVOICE`.
2. `payment_attempts` row and its `tx_ref`.
3. `audit_log` row with action `SETTLE_PAYMENT`.
4. Server output from `[processInvoice] NEAR worker transfer failed`.
5. The transaction hash in NEAR Explorer, when one was produced.

Do not assume that a browser status alone proves settlement. The source of truth is a successful final NEAR transaction plus the stored transaction hash.

### Reproducing the autonomous setup from a clean account

For another deployment, reproduce the sequence below in order:

1. Create or select a dedicated settlement account, for example `payer-settlement.near`.
2. Fund it with enough NEAR for contract storage, gas, and the FunctionCall allowance.
3. Fund the same account with NEAR-native USDT from contract `usdt.tether-token.near`.
4. Build the router from `contracts/obligo-payment-router`.
5. Deploy and initialize the router on the settlement account.
6. Generate a restricted worker key and add it to the settlement account with receiver equal to the settlement account and method `pay`.
7. Put the worker private key, account ID, router account ID, and token contract in the backend environment.
8. Run `pnpm check:worker-key` and confirm the receiver/method output.
9. Register every contractor payout account with the token contract using `storage_deposit`.
10. Restart the backend and submit a small real invoice.
11. Verify the contractor’s USDT balance, the stored transaction hash, and the payer dashboard.

Do not copy the owner FullAccess key into the worker environment. Do not give the worker key `storage_deposit`, `add_key`, `deploy`, or arbitrary function-call permissions. The security boundary is the combination of the NEAR access-key permission and the router’s private method.

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
Build command: pnpm install --frozen-lockfile && pnpm build
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
