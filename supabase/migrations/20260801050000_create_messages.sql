create table public.corgi_messages (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 30),
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now(),
  via text not null check (via in ('wifi', 'geo'))
);

create index corgi_messages_created_at_idx on public.corgi_messages (created_at desc);

alter table public.corgi_messages enable row level security;

create policy "Anyone can read recent corgi messages"
on public.corgi_messages
for select
to anon, authenticated
using (created_at > now() - interval '24 hours');

alter publication supabase_realtime add table public.corgi_messages;
