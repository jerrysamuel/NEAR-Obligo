-- Stage 1: Initial Supabase Schema for Nearbligo
-- All monetary amounts stored as integer cents (minor units)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  wallet_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. obligations table
CREATE TABLE IF NOT EXISTS obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly')),
  day_rule TEXT NOT NULL,
  expected_amount BIGINT NOT NULL CHECK (expected_amount >= 0),
  max_amount BIGINT NOT NULL CHECK (max_amount >= 0),
  tolerance_pct INTEGER NOT NULL DEFAULT 0 CHECK (tolerance_pct >= 0),
  auto_pay BOOLEAN NOT NULL DEFAULT false,
  starts_on DATE NOT NULL,
  ends_on DATE,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused'))
);

-- 3. invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  invoice_number TEXT,
  period_key TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('generated', 'verified', 'needs_approval', 'authorised', 'submitted', 'settled', 'refused', 'failed')),
  source TEXT NOT NULL CHECK (source IN ('generated', 'uploaded')),
  refusal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_invoices_obligation_period UNIQUE (obligation_id, period_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_vendor_invoice_number
  ON invoices (vendor_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

-- 4. policies table
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  per_tx_cap BIGINT NOT NULL CHECK (per_tx_cap >= 0),
  monthly_limit BIGINT NOT NULL CHECK (monthly_limit >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  frozen BOOLEAN NOT NULL DEFAULT false
);

-- 5. payment_attempts table
CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  amount BIGINT NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL CHECK (status IN ('created', 'submitted', 'settled', 'failed')),
  agent_operation_ref TEXT,
  tx_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  decision TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign Key and Query Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_obligations_vendor_id ON obligations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_obligation_id ON invoices(obligation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_id ON invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_invoice_id ON payment_attempts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_invoice_id ON audit_log(invoice_id);

-- Enable Row Level Security on all tables
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Service role write policies
CREATE POLICY "service_role_write_vendors" ON vendors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_write_obligations" ON obligations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_write_invoices" ON invoices
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_write_policies" ON policies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_write_payment_attempts" ON payment_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_write_audit_log" ON audit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);
