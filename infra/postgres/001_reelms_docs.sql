create table if not exists reelms_docs (
  pk text not null,
  sk text not null,
  data jsonb not null,
  updated_at bigint not null,
  primary key (pk, sk)
);

create index if not exists reelms_docs_pk_prefix_idx on reelms_docs (pk text_pattern_ops);
create index if not exists reelms_docs_sk_prefix_idx on reelms_docs (sk text_pattern_ops);
create index if not exists reelms_docs_updated_at_idx on reelms_docs (updated_at desc);
