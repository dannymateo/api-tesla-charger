CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  kwh DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY,
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL,
  raw_payload TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_invoices (
  payment_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  PRIMARY KEY (payment_id, invoice_id),
  CONSTRAINT fk_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,
  consumer TEXT NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
