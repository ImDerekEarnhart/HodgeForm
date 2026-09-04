create table if not exists verifier_principals (
  id text primary key,
  tenant_id text not null,
  name text not null,
  trust_level text not null check(trust_level in ('same_team','independent')),
  allowed_evidence_kinds_json jsonb not null default '[]'::jsonb,
  created_by text not null,
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);
create unique index if not exists verifier_principals_name_idx on verifier_principals(tenant_id, lower(name)) where disabled_at is null;
create index if not exists verifier_principals_tenant_idx on verifier_principals(tenant_id, created_at desc);

alter table api_tokens add column if not exists verifier_principal_id text references verifier_principals(id) on delete set null;
alter table api_tokens add column if not exists scopes_json jsonb not null default '["repository:read","repository:write","candidate:read","candidate:write","evidence:write","receipt:read"]'::jsonb;
create index if not exists api_tokens_verifier_idx on api_tokens(tenant_id, verifier_principal_id) where verifier_principal_id is not null;

alter table evidence_receipts add column if not exists verifier_principal_id text references verifier_principals(id) on delete set null;
create index if not exists evidence_verifier_idx on evidence_receipts(tenant_id, verifier_principal_id) where verifier_principal_id is not null;
