CREATE TABLE IF NOT EXISTS reelms_docs (
  pk TEXT NOT NULL,
  sk TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (pk, sk)
);

CREATE INDEX IF NOT EXISTS idx_reelms_docs_pk ON reelms_docs (pk);
CREATE INDEX IF NOT EXISTS idx_reelms_docs_updated_at ON reelms_docs (updated_at DESC);
