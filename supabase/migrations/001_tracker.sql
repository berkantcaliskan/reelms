-- Kayıtlı hesaplar tablosu (Sheet 1)
CREATE TABLE IF NOT EXISTS tracked_accounts (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  uid         text        NOT NULL UNIQUE,
  email       text        NOT NULL,
  username    text,
  display_name text,
  platform    text        DEFAULT 'web',
  registered_at timestamptz NOT NULL DEFAULT now()
);

-- Tüm etkinlikler tablosu (Sheet 2 + 3)
CREATE TABLE IF NOT EXISTS tracked_events (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  uid         text,
  session_id  text,
  event_type  text        NOT NULL,
  category    text,
  page        text,
  element     text,
  metadata    jsonb,
  ip          text,
  user_agent  text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracked_events_uid          ON tracked_events(uid);
CREATE INDEX IF NOT EXISTS idx_tracked_events_occurred_at  ON tracked_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracked_events_event_type   ON tracked_events(event_type);
