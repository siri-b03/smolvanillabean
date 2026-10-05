create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  type text not null check (type in ('book', 'movie', 'essay', 'other')),
  title text not null check (char_length(title) between 1 and 140),
  note text not null default '' check (char_length(note) <= 200),
  emoji text not null default '🐠',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 80),
  text text not null default '' check (char_length(text) <= 500),
  image_path text,
  source text not null default 'board' check (source in ('board', 'photobooth')),
  style text not null default 'sky' check (style in ('sky', 'peach', 'pink')),
  rotate numeric(4, 1) not null default 0 check (rotate between -8 and 8),
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  check (char_length(text) > 0 or image_path is not null)
);

create index if not exists recommendations_public_feed
  on public.recommendations (created_at desc) where approved;
create index if not exists memories_public_feed
  on public.memories (created_at desc) where approved;

alter table public.recommendations enable row level security;
alter table public.memories enable row level security;

grant select, insert on public.recommendations to anon;
grant select, insert on public.memories to anon;

create policy "Public can read approved recommendations"
  on public.recommendations for select to anon using (approved);
create policy "Public can submit recommendations for review"
  on public.recommendations for insert to anon with check (not approved);
create policy "Public can read approved memories"
  on public.memories for select to anon using (approved);
create policy "Public can submit memories for review"
  on public.memories for insert to anon with check (not approved);

create policy "Public can view memory images"
  on storage.objects for select to anon using (bucket_id = 'memory-images');

create policy "Public can upload memory images"
  on storage.objects for insert to anon
  with check (bucket_id = 'memory-images');
