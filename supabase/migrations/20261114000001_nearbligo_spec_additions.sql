-- Stage 2: Nearbligo Build Spec Additions (Idempotent)
-- Expands schema with profiles, vendor_users, invitations, agents, pending_intents, api_tokens, mcp_calls

-- 1. profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('payer', 'contractor')),
  display_name TEXT,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. vendor_users table (one contractor per vendor for MVP)
CREATE TABLE IF NOT EXISTS vendor_users (
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vendor_id, user_id)
);

-- 3. invitations table
CREATE TABLE IF NOT EXISTS invitations (
  token TEXT PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('open', 'used', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. agents table (with passkey columns from Section 12)
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_account_id TEXT,
  owner_public_key TEXT,
  agent_id TEXT,
  wallet_account_id TEXT,
  status TEXT NOT NULL DEFAULT 'none',
  created_intent_id TEXT,
  grant_token_enc TEXT,
  grant_expires_at TIMESTAMPTZ,
  soft_paused BOOLEAN NOT NULL DEFAULT false,
  locked BOOLEAN NOT NULL DEFAULT false,
  credential_id TEXT,
  public_key TEXT,
  rp_id TEXT,
  origin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Add additions to existing tables
ALTER TABLE obligations ADD COLUMN IF NOT EXISTS rate_cents BIGINT CHECK (rate_cents >= 0);
ALTER TABLE obligations ADD COLUMN IF NOT EXISTS unit TEXT;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1 CHECK (quantity >= 1);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS proof_path TEXT;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_source_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_source_check
  CHECK (source IN ('generated', 'uploaded', 'form', 'webhook'));

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS wallet_ownership_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'invited'
  CHECK (status IN ('invited', 'pending_approval', 'active', 'paused'));

-- 6. pending_intents table
CREATE TABLE IF NOT EXISTS pending_intents (
  correlation_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. api_tokens table (for developers / MCP)
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('read', 'write', 'full')),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. mcp_calls table
CREATE TABLE IF NOT EXISTS mcp_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_users_user_id ON vendor_users(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_vendor_id ON invitations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_pending_intents_user_id ON pending_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_calls_token_id ON mcp_calls(token_id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_calls ENABLE ROW LEVEL SECURITY;

-- Idempotent Service Role Policies
DROP POLICY IF EXISTS "service_role_write_profiles" ON profiles;
CREATE POLICY "service_role_write_profiles" ON profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_write_vendor_users" ON vendor_users;
CREATE POLICY "service_role_write_vendor_users" ON vendor_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_write_invitations" ON invitations;
CREATE POLICY "service_role_write_invitations" ON invitations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_write_agents" ON agents;
CREATE POLICY "service_role_write_agents" ON agents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_write_pending_intents" ON pending_intents;
CREATE POLICY "service_role_write_pending_intents" ON pending_intents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_write_api_tokens" ON api_tokens;
CREATE POLICY "service_role_write_api_tokens" ON api_tokens
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_write_mcp_calls" ON mcp_calls;
CREATE POLICY "service_role_write_mcp_calls" ON mcp_calls
  FOR ALL TO service_role USING (true) WITH CHECK (true);
