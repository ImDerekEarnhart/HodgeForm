create table if not exists workspaces (
  id text primary key,
  slug text not null unique,
  name text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id text not null references workspaces(id) on delete cascade,
  user_id text not null references "user"(id) on delete cascade,
  role text not null check(role in ('owner','admin','member')) default 'member',
  created_at timestamptz not null default now(),
  primary key(workspace_id,user_id)
);
create index if not exists workspace_members_user_idx on workspace_members(user_id);

create table if not exists user_workspace_preferences (
  user_id text primary key references "user"(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table if not exists workspace_invites (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  email text not null,
  role text not null check(role in ('admin','member')) default 'member',
  token_hash text not null unique,
  invited_by text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists workspace_invites_workspace_idx on workspace_invites(workspace_id,created_at desc);
create index if not exists workspace_invites_email_idx on workspace_invites(lower(email));
