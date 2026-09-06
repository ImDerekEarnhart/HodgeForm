create table discovery_experiments (
  id text primary key,
  tenant_id text not null,
  discovery_id text not null unique references discovery_commits(id),
  candidate_id text not null references release_candidates(id),
  frozen_json jsonb not null,
  experiment_hash text not null unique,
  created_by text not null,
  created_at timestamptz not null default clock_timestamp()
);
create index discovery_experiments_tenant_idx on discovery_experiments(tenant_id,created_at desc);
create table discovery_evaluations (
  id text primary key,
  tenant_id text not null,
  experiment_id text not null references discovery_experiments(id),
  result_json jsonb not null,
  result_hash text not null,
  created_by text not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(experiment_id,result_hash)
);
alter table evidence_receipts add column attestation_verified boolean not null default false;

create function hodgeform_preserve_experiment() returns trigger language plpgsql as $$
begin
  raise exception 'Frozen experiments and evaluations are append-only; create a successor instead';
end;
$$;
create trigger frozen_experiment_immutable before update or delete on discovery_experiments
  for each row execute function hodgeform_preserve_experiment();
create trigger experiment_evaluation_immutable before update or delete on discovery_evaluations
  for each row execute function hodgeform_preserve_experiment();
