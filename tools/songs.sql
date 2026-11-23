-- "Suggest a song" on prasanna.lol. Run once in Supabase → SQL editor (after the now_can_edit() snippet).
-- Anyone can see suggestions and add one. Only the owner (now_can_edit) can delete them.

create table if not exists public.song_suggestions (
  id            uuid primary key default gen_random_uuid(),
  track_id      text not null check (track_id ~ '^[A-Za-z0-9]{22}$'),
  title         text not null check (char_length(title) between 1 and 200),
  artist        text not null default '' check (char_length(artist) <= 200),
  image         text not null default '' check (image = '' or image like 'https://i.scdn.co/image/%'),
  suggested_by  text not null default '' check (char_length(suggested_by) <= 40),
  note          text not null default '' check (char_length(note) <= 140),
  created_at    timestamptz not null default now()
);

alter table public.song_suggestions enable row level security;
drop policy if exists "anyone can suggest" on public.song_suggestions;
create policy "anyone can suggest" on public.song_suggestions for insert to anon, authenticated with check (true);
drop policy if exists "owner reads suggestions" on public.song_suggestions;
drop policy if exists "suggestions are public" on public.song_suggestions;
create policy "suggestions are public" on public.song_suggestions for select to anon, authenticated using (true);
drop policy if exists "owner deletes suggestions" on public.song_suggestions;
create policy "owner deletes suggestions" on public.song_suggestions for delete to authenticated using (public.now_can_edit());

revoke all on public.song_suggestions from anon, authenticated;
grant insert (track_id, title, artist, image, suggested_by, note) on public.song_suggestions to anon, authenticated;
grant select on public.song_suggestions to anon, authenticated;
grant delete on public.song_suggestions to authenticated;

-- stop floods: at most 30 suggestions in any 10 minutes, from everyone together
create or replace function public.song_suggestions_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.song_suggestions where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'too many suggestions right now, try again later';
  end if;
  return new;
end; $$;
drop trigger if exists song_suggestions_limit on public.song_suggestions;
create trigger song_suggestions_limit before insert on public.song_suggestions for each row execute function public.song_suggestions_limit();
