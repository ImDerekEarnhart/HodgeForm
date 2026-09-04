create table if not exists repositories (
  id text primary key,
  tenant_id text not null,
  slug text not null,
  name text not null,
  description text not null default '',
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table if not exists release_candidates (
  id text primary key,
  tenant_id text not null,
  repository_id text not null references repositories(id) on delete cascade,
  version text not null,
  artifact_hash text not null,
  manifest_json jsonb not null,
  capabilities_json jsonb not null,
  policy_intent_json jsonb not null,
  semantic_diff_json jsonb not null default '{}'::jsonb,
  risk text not null,
  status text not null check (status in ('draft','frozen','evaluating','released','blocked')),
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, repository_id, version)
);
create index if not exists release_candidates_repo_idx on release_candidates(tenant_id, repository_id, created_at desc);

create table if not exists gate_plans (
  id text primary key,
  tenant_id text not null,
  candidate_id text not null unique references release_candidates(id) on delete cascade,
  pack_id text not null,
  pack_version integer not null,
  compiled_policy_json jsonb not null,
  policy_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists evidence_receipts (
  id text primary key,
  tenant_id text not null,
  candidate_id text not null references release_candidates(id) on delete cascade,
  requirement_id text not null,
  evidence_kind text not null,
  outcome text not null check (outcome in ('pass','fail','inconclusive')),
  independence text not null check (independence in ('self','same_team','independent','formal')),
  source text not null,
  payload_json jsonb not null,
  payload_hash text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists evidence_candidate_idx on evidence_receipts(tenant_id, candidate_id, requirement_id);

create table if not exists approvals (
  id text primary key,
  tenant_id text not null,
  candidate_id text not null unique references release_candidates(id) on delete cascade,
  expected_policy_hash text not null,
  approved_by text not null,
  confirmation text not null,
  approved_at timestamptz not null default now()
);

create table if not exists release_receipts (
  id text primary key,
  tenant_id text not null,
  candidate_id text not null unique references release_candidates(id) on delete cascade,
  verdict text not null check (verdict in ('RELEASE','BLOCK')),
  receipt_json jsonb not null,
  receipt_hash text not null unique,
  signer_id text not null,
  signature_b64 text not null,
  public_key_fingerprint text not null,
  created_at timestamptz not null default now()
);

create table if not exists discovery_commits (
  id text primary key,
  tenant_id text not null,
  repository_id text not null references repositories(id) on delete cascade,
  parent_id text references discovery_commits(id) on delete set null,
  branch text not null,
  title text not null,
  claim text not null,
  status text not null check (status in ('proposed','falsified','trusted','superseded')),
  content_hash text not null,
  evidence_refs_json jsonb not null default '[]'::jsonb,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index if not exists discovery_repo_idx on discovery_commits(tenant_id, repository_id, created_at desc);
