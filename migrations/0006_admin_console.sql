create table if not exists platform_daily_traffic (
  day date not null,
  route_group text not null check(route_group in ('landing','auth','legal')),
  page_views bigint not null default 0 check(page_views >= 0),
  primary key(day, route_group)
);

create table if not exists platform_daily_visitors (
  day date not null,
  visitor_hash text not null check(length(visitor_hash) = 64),
  created_at timestamptz not null default now(),
  primary key(day, visitor_hash)
);
create index if not exists platform_daily_visitors_created_idx on platform_daily_visitors(created_at);

create table if not exists platform_admin_audit (
  id text primary key,
  actor_user_id text not null references "user"(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists platform_admin_audit_created_idx on platform_admin_audit(created_at desc);
