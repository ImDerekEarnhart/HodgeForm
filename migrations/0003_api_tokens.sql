create table if not exists api_tokens (
  id text primary key,
  tenant_id text not null,
  user_id text not null,
  name text not null,
  token_hash text not null unique,
  token_prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists api_tokens_tenant_idx on api_tokens(tenant_id, user_id, created_at desc);
