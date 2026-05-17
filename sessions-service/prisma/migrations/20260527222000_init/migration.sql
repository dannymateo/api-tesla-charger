CREATE TABLE IF NOT EXISTS charging_sessions (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  station_id TEXT NOT NULL,
  requested_kwh DECIMAL(10,2) NOT NULL,
  delivered_kwh DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_per_kwh_snapshot DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL,
  rejection_reason TEXT,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  last_progress_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,
  consumer TEXT NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
