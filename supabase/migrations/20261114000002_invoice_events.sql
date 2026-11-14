-- Append-only invoice lifecycle events and outbound delivery queue.
-- Apply after the two base Nearbligo migrations.

CREATE TABLE IF NOT EXISTS invoice_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  status TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES invoice_events(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_events_invoice_created
  ON invoice_events(invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status
  ON webhook_deliveries(status, created_at);

ALTER TABLE invoice_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_invoice_events ON invoice_events;
CREATE POLICY service_role_invoice_events ON invoice_events
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS service_role_webhook_deliveries ON webhook_deliveries;
CREATE POLICY service_role_webhook_deliveries ON webhook_deliveries
  FOR ALL USING (auth.role() = 'service_role');
