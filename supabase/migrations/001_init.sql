create table users (
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,
  password_hash   text not null,
  name            text,
  avatar_url      text,
  plan            text not null default 'free',
  email_verified  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table refresh_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  token_hash   text not null,
  user_agent   text,
  ip           text,
  revoked      boolean not null default false,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);

create table documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  title        text not null default 'Sin título',
  content      text not null default '',
  format       text,
  tone         text,
  status       text not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table generations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  document_id   uuid references documents(id) on delete set null,
  prompt        text not null,
  tone          text,
  format        text,
  model         text not null,
  tokens_used   integer,
  created_at    timestamptz not null default now()
);

create index on documents(user_id);
create index on generations(user_id, created_at);
create index on refresh_tokens(user_id);
