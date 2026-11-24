-- "Suggest a book" on prasanna.lol. Run once in Supabase → SQL editor (after the now_can_edit() snippet).
-- Anyone can see suggestions and add one. Only the owner (now_can_edit) can delete them.
create table if not exists public.book_suggestions (
  id            uuid primary key default gen_random_uuid(),
  work_key      text not null check (work_key ~ '^/works/OL[0-9]+W$'),
  title         text not null check (char_length(title) between 1 and 200),
  author        text not null default '' check (char_length(author) <= 200),
  cover_id      int check (cover_id is null or cover_id > 0),
  suggested_by  text not null default '' check (char_length(suggested_by) <= 40),
  created_at    timestamptz not null default now()
);
alter table public.book_suggestions enable row level security;
drop policy if exists "anyone can suggest books" on public.book_suggestions;
create policy "anyone can suggest books" on public.book_suggestions for insert to anon, authenticated with check (true);
drop policy if exists "book suggestions are public" on public.book_suggestions;
create policy "book suggestions are public" on public.book_suggestions for select to anon, authenticated using (true);
drop policy if exists "owner deletes book suggestions" on public.book_suggestions;
create policy "owner deletes book suggestions" on public.book_suggestions for delete to authenticated using (public.now_can_edit());
revoke all on public.book_suggestions from anon, authenticated;
grant insert (work_key, title, author, cover_id, suggested_by) on public.book_suggestions to anon, authenticated;
grant select on public.book_suggestions to anon, authenticated;
grant delete on public.book_suggestions to authenticated;
-- stop floods: at most 30 in any 10 minutes, from everyone together
create or replace function public.book_suggestions_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.book_suggestions where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'too many suggestions right now, try again later';
  end if;
  return new;
end; $$;
drop trigger if exists book_suggestions_limit on public.book_suggestions;
create trigger book_suggestions_limit before insert on public.book_suggestions for each row execute function public.book_suggestions_limit();
