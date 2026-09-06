create table verifier_workers (
  id text primary key,
  tenant_id text not null,
  verifier_principal_id text not null references verifier_principals(id),
  image text not null,
  evidence_kind text not null check(evidence_kind in ('deterministic_test','sandbox_run','static_analysis','independent_verifier')),
  public_key_pem text not null,
  allowed_requirements_json jsonb not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);
create index verifier_workers_tenant_idx on verifier_workers(tenant_id);
create table verifier_jobs (
  id text primary key,
  tenant_id text not null,
  worker_id text not null references verifier_workers(id),
  candidate_id text not null references release_candidates(id),
  job_json jsonb not null,
  job_hash text not null unique,
  expires_at timestamptz not null,
  completed_at timestamptz,
  evidence_id text unique references evidence_receipts(id),
  result_json jsonb,
  created_by text not null,
  created_at timestamptz not null default now()
);
create index verifier_jobs_pending_idx on verifier_jobs(tenant_id,worker_id,expires_at) where completed_at is null;
