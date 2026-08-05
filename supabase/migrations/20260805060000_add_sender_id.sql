alter table public.corgi_messages
add column if not exists sender_id uuid;
