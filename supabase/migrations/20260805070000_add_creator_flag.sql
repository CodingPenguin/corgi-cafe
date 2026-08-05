alter table public.corgi_messages
add column if not exists is_creator boolean not null default false;
