-- Blog posts, gallery photos and the photo storage for prasanna.lol.
-- Run once in Supabase → SQL editor, AFTER now.sql and the now_can_edit() snippet.
-- Everyone can read published posts and all photos. Only now_can_edit() (the owner's two emails) can write.

create table if not exists public.blog_posts (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  title         text not null check (char_length(title) between 1 and 120),
  summary       text not null default '' check (char_length(summary) <= 240),
  body          text not null default '' check (char_length(body) <= 60000),
  cover_url     text not null default '' check (cover_url = '' or cover_url like 'https://orhlwvmxnsztwhfimjru.supabase.co/storage/v1/object/public/portfolio/%'),
  tags          text not null default '' check (char_length(tags) <= 80),
  published     boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.gallery_photos (
  id          uuid primary key default gen_random_uuid(),
  url         text not null check (url like 'https://orhlwvmxnsztwhfimjru.supabase.co/storage/v1/object/public/portfolio/%'),
  caption     text not null default '' check (char_length(caption) <= 200),
  tags        text not null default '' check (char_length(tags) <= 80),     -- like "🏔️ trek, ☕ cafe"
  taken_on    date,
  width       int, height int,
  created_at  timestamptz not null default now()
);

-- keep updated_at and published_at honest
create or replace function public.blog_posts_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.published and new.published_at is null then new.published_at := now(); end if;
  return new;
end; $$;
drop trigger if exists blog_posts_touch on public.blog_posts;
create trigger blog_posts_touch before insert or update on public.blog_posts for each row execute function public.blog_posts_touch();

alter table public.blog_posts enable row level security;
alter table public.gallery_photos enable row level security;

drop policy if exists "published posts are public" on public.blog_posts;
create policy "published posts are public" on public.blog_posts for select to anon, authenticated using (published or public.now_can_edit());
drop policy if exists "owner writes posts" on public.blog_posts;
create policy "owner writes posts" on public.blog_posts for all to authenticated using (public.now_can_edit()) with check (public.now_can_edit());

drop policy if exists "photos are public" on public.gallery_photos;
create policy "photos are public" on public.gallery_photos for select to anon, authenticated using (true);
drop policy if exists "owner manages photos" on public.gallery_photos;
create policy "owner manages photos" on public.gallery_photos for all to authenticated using (public.now_can_edit()) with check (public.now_can_edit());

revoke all on public.blog_posts, public.gallery_photos from anon, authenticated;
grant select on public.blog_posts, public.gallery_photos to anon, authenticated;
grant insert, update, delete on public.blog_posts, public.gallery_photos to authenticated;

-- photo storage: anyone can view, only the owner can upload or delete. Images only, 8 MB max.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "owner uploads portfolio images" on storage.objects;
create policy "owner uploads portfolio images" on storage.objects for insert to authenticated with check (bucket_id = 'portfolio' and public.now_can_edit());
drop policy if exists "owner changes portfolio images" on storage.objects;
create policy "owner changes portfolio images" on storage.objects for update to authenticated using (bucket_id = 'portfolio' and public.now_can_edit());
drop policy if exists "owner deletes portfolio images" on storage.objects;
create policy "owner deletes portfolio images" on storage.objects for delete to authenticated using (bucket_id = 'portfolio' and public.now_can_edit());
