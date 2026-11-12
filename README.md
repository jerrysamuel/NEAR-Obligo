# Obligo — Private Personal Commerce Agent

> A personal AI agent that helps users discover and compare products across merchants, manage recurring subscriptions, evaluate purchase affordability, and enforce cryptographic disclosure permissions with verifiable records on **NEAR Protocol**.

[![Hackathon Track: Privacy & Private AI](https://img.shields.io/badge/Track-Privacy%20%26%20Private%20AI-10b981.svg)](https://nearhackathon.com)
[![Hackathon Track: AI Security & Defense](https://img.shields.io/badge/Track-AI%20Security%20%26%20Defense-06b6d4.svg)](https://nearhackathon.com)
[![NEAR Network](https://img.shields.io/badge/NEAR-Testnet-blue.svg)](https://testnet.nearblocks.io)
[![MCP Protocol](https://img.shields.io/badge/MCP-1.0-purple.svg)](https://modelcontextprotocol.io)

---

## 1. Problem & Product Definition

### The Problem
Traditional AI assistants and commerce aggregators require users to hand over raw personal identities, delivery addresses, phone numbers, and unfiltered financial records. AI models often execute SQL queries or make external API calls directly, creating severe data-leakage vectors and unbounded spending risks.

### The Obligo Solution
Obligo introduces a **Zero-Knowledge Disclosure & Permission Architecture**:
1. **Confidential AI Inference:** Natural language shopping criteria and recurring spend inquiries are evaluated via NEAR AI Cloud in confidential hardware TEE enclaves.
2. **Deterministic Arithmetic Safeguards:** The AI never performs financial arithmetic directly. The backend computes normalized recurring obligations deterministically, passing only minimal sanitised context to the model.
3. **Cryptographic Authorisation on NEAR:** When preparing external merchant checkout, sensitive details (recipient name, shipping address, contact phone) are never exposed by default. The user must review a time-bounded disclosure policy and sign a permission hash recorded immutably on the **NEAR Testnet contract** (`obligo-permissions.testnet`).
4. **Dual Interface (Dashboard & MCP):** Both the human web dashboard and autonomous AI clients access identical capabilities through the same underlying services using the **Model Context Protocol (MCP)**.

---

## 2. High-Level Architecture

```
                    +---------------------------------------------+
                    |                    USER                     |
                    +----------------------+----------------------+
                                           |
                    +----------------------+----------------------+
                    |          WEB DASHBOARD (Next.js 14)         |
                    |          AI CLIENTS (MCP Server)            |
                    +----------------------+----------------------+
                                           |
                                   APPLICATION API
             (/api/shopping, /api/subscriptions, /api/privacy, /api/near)
                                           |
         +---------------------------------+---------------------------------+
         |                                 |                                 |
+--------v---------+             +---------v--------+              +---------v--------+
| SHOPPING MODULE  |             | SUBSCRIPTIONS    |              | PRIVACY ENGINE   |
| • Query parsing  |             | • CRUD & billing |              | • Field policies |
| • Merchant specs |             | • Run-rate math  |              | • Instant revoke |
| • Comparison     |             | • Renewal alerts |              | • TEE audit      |
+--------+---------+             +---------+--------+              +---------+--------+
         |                                 |                                 |
         +---------------------------------+---------------------------------+
                                           |
                                  CORE AI ORCHESTRATOR
                                           |
                         +-----------------+-----------------+
                         |                                   |
                +--------v--------+                 +--------v--------+
                |  NEAR AI CLOUD  |                 |  NEAR TESTNET   |
                |  Confidential   |                 |  Smart Contract |
                |  TEE Inference  |                 |  Auth Hashes    |
                +-----------------+                 +-----------------+
```

---

## 3. Hackathon Track Alignment

| Track | Track ID | How Obligo Fits In |
| :--- | :--- | :--- |
| **Privacy & Private AI** | `privacy` | Confidential inference via NEAR AI Cloud with hardware attestation verification, private memory management, and zero-knowledge field disclosure boundaries. |
| **AI Security & Defense** | `security` | Spending caps, policy engines, cryptographic permission hashing, and on-chain revocable authorizations on NEAR Testnet before external checkout. |

---

## 4. Key Capabilities & Scenarios

### Scenario A: Recurring Expense Intelligence
- Normalizes frequencies (`weekly`, `monthly`, `quarterly`, `yearly`) into monthly and annual run rates.
- Filters impending renewals (e.g., Netflix on Nov 14 at ₦7,000, Spotify on Nov 18 at ₦3,500, Hetzner VPS on Nov 22 at ₦12,000).
- Analyzes potential savings if non-essential entertainment or duplicate seats are audited.

### Scenario B: Private Hardware Shopping & Comparison
- Natural-language requirement extraction: Parses `"Find me a laptop for React Native development. I need 32GB RAM, good battery life and a budget of ₦1.2 million."` into structured criteria (RAM: 32GB, use case: mobile compilation, cap: ₦1,200,000).
- Multi-merchant adapter: Retrieves verified tech specs from local merchants (Slot Systems, Konga Tech, Jumia Express).
- Side-by-side specification matrix comparing RAM, battery endurance, CPU cores, and price.

### Scenario C: Cross-Module Budget & Affordability
- Query: *"How much of my monthly budget is committed to subscriptions, and how much can I comfortably spend on a new laptop?"*
- System cross-references recurring commitments (₦48,500/mo) against monthly capacity (₦1,500,000/mo) to prove that the user has ₦1,451,500 of uncommitted cashflow and can comfortably acquire a ₦1,195,000 Dell XPS 15 or ₦1,140,000 ThinkPad T14 without debt.

### Scenario D: On-Chain Permission & Revocation on NEAR
- Checkout preparation creates a `PurchaseIntent` requiring `recipient_name`, `delivery_address`, and `phone_number`.
- User explicitly signs the disclosure, computing an immutable SHA-256 permission hash:
  ```
  0x8fae89c09d318357493a384f8849b72d24491024849202bb91f93847291a92cf
  ```
- Stored on `obligo-permissions.testnet`. A user can click **Revoke** at any time to invalidate the authorization both on-chain and in the local privacy policy engine.

---

## 5. Technology Stack

- **Frontend & API:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide icons
- **Data Persistence:** Modular Provider (Supabase PostgreSQL Client + embedded local store)
- **AI Inference:** NEAR AI Cloud (`https://api.near.ai/v1`) with TEE hardware attestation verification & deterministic fallback
- **Blockchain:** NEAR Protocol Testnet (`near-api-js`, Rust smart contract `obligo-permissions`)
- **Agent Interoperability:** Model Context Protocol (MCP TypeScript SDK `@modelcontextprotocol/sdk`)

---

## 6. How to Run & Test (Step-by-Step for Judges)

### Prerequisites
- Node.js >= 18 (Tested on Node v22.22.1)
- pnpm (`npm install -g pnpm`)

### 1. Installation
```bash
git clone https://github.com/jerrysamuel/NEAR-Obligo.git
cd NEAR-Obligo
pnpm install
```

### 2. Environment Setup (Optional)
The application works immediately out-of-the-box with embedded fallback data. If you have NEAR AI Cloud or Supabase keys, copy the template:
```bash
cp .env.example .env.local
```

### 3. Run Automated Verification Suite
Run the comprehensive test script verifying all 17 MVP requirements:
```bash
pnpm test:mvp
```
**Expected Output:**
```
=================================================
       OBLIGO MVP TEST VERIFICATION SUITE        
=================================================
✅ PASS: Register / Load User -> Account loaded with preferences
✅ PASS: Add subscription -> Subscription saved
✅ PASS: Edit subscription -> Changes persisted
✅ PASS: Calculate monthly spending -> Correct calculation
✅ PASS: Calculate annual spending -> Correct calculation
✅ PASS: Retrieve upcoming renewals -> Correct date filtering
✅ PASS: Ask AI about subscriptions -> Answer based on actual records
✅ PASS: Search products -> Actual product results returned
✅ PASS: Compare products -> Correct prices and specifications
✅ PASS: Save product -> Product persists
✅ PASS: Prepare purchase -> Purchase intent created
✅ PASS: Approve disclosure -> Only approved fields released
✅ PASS: Revoke permission -> Subsequent disclosure rejected
✅ PASS: Create NEAR permission -> Testnet transaction confirmed
✅ PASS: Revoke NEAR permission -> Contract reflects revocation
✅ PASS: Delete subscription -> Record removed
✅ PASS: Call MCP server setup -> Server instantiated with registered tools
=================================================
TOTAL TESTS: 17 | PASSED: 17 | FAILED: 0
=================================================
🎉 ALL MVP REQUIREMENTS MET AND VERIFIED!
```

### 4. Start the Application Locally
```bash
pnpm dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 7. Verifying via UI ("Do X — See Y")

1. **Test Overview Dashboard:**
   - **Do:** Open `http://localhost:3000`.
   - **See:** Monthly subscriptions (₦48,500), Annual run-rate (₦582,000), 3 upcoming renewals due in <15 days, and AI optimization recommendations.
2. **Test Subscriptions CRUD:**
   - **Do:** Navigate to `/subscriptions`, click **Add Subscription**, enter "AWS Cloud", ₦25,000, "monthly", and submit.
   - **See:** Table updates immediately with recalculated monthly and annual totals. Click the pause icon to toggle state.
3. **Test Shopping Intent & Comparison:**
   - **Do:** Navigate to `/shopping`. The default query `"Find me a laptop for React Native development. 32GB RAM, good battery life and a budget of ₦1.2 million"` is loaded. Click **Analyze & Search**.
   - **See:** AI extracts RAM=32GB, use case=React Native, and budget cap=₦1,200,000. Verified results (Dell XPS 15, ThinkPad T14 Gen 4, Framework Laptop 13) are returned.
   - **Do:** Click **+ Compare** on 2 laptops and click **Compare Products**.
   - **See:** Modal opens with a full side-by-side specification matrix.
4. **Test Controlled Checkout & NEAR Authorization:**
   - **Do:** On any laptop card, click **Prepare Checkout**.
   - **See:** Modal displays required delivery fields and confirms that all private subscription/identity data is shielded.
   - **Do:** Click **Approve & Sign NEAR Authorisation**.
   - **See:** Cryptographic permission hash is generated and confirmed for `obligo-permissions.testnet` with a verifiable transaction hash.
5. **Test Cross-Module AI Intelligence:**
   - **Do:** Navigate to `/insights`. Click the suggested pill: *"How much of my monthly budget is committed to subscriptions, and how much can I comfortably spend on a new laptop?"*
   - **See:** AI analyzes budget (₦1.5M), committed subscriptions (₦48.5K), and outputs verified free cashflow with TEE attestation badge.
6. **Test Revoking Permissions:**
   - **Do:** Navigate to `/permissions`. Click **Revoke Access** on any active disclosure or **Revoke** on the NEAR record.
   - **See:** Status immediately updates to "REVOKED", preventing any external handoff.

---

## 8. Model Context Protocol (MCP) Interface

Obligo exposes all tools to external AI clients via MCP:

```bash
# Run standalone MCP stdio server
pnpm mcp
```
Or query the HTTP discovery endpoint:
```bash
curl http://localhost:3000/api/mcp
```

### Registered MCP Tools:
- **Shopping:** `search_products`, `compare_products`, `get_product_details`, `save_product`, `prepare_purchase`
- **Subscriptions:** `list_subscriptions`, `add_subscription`, `get_upcoming_renewals`, `get_recurring_spend`, `get_subscription_insights`
- **Privacy & Permissions:** `get_private_preferences`, `get_permissions`, `approve_disclosure`, `revoke_permission`, `get_activity_history`

---

## 9. NEAR Smart Contract

The Rust smart contract source code is located in [`contracts/obligo-permissions/src/lib.rs`](contracts/obligo-permissions/src/lib.rs).

### Contract Methods:
```rust
pub fn create_permission(permission_hash: String, action_type: String, spending_limit: U128, currency: String, expiry: u64) -> String;
pub fn revoke_permission(permission_id: String) -> bool;
pub fn get_permission(permission_id: String) -> Option<OnChainAuthorisation>;
pub fn verify_permission(permission_id: String) -> bool;
```

---

## 10. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
