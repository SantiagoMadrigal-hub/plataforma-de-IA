alter table users add column if not exists reset_token text;
alter table users add column if not exists reset_token_expires timestamptz;
