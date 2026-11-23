-- "Right now" cards on prasanna.lol: one row that you edit at prasanna.lol/now-edit
-- Run this once in Supabase → SQL editor. Anyone can read it; only the owner's two email addresses can change it (see now_can_edit below).

create table if not exists public.now_cards (
  id              int primary key default 1 check (id = 1),          -- only ever one row
  city            text not null default 'Bengaluru' check (char_length(city) between 1 and 40),
  status_emoji    text not null default '🟢' check (char_length(status_emoji) <= 8),
  status_text     text not null default 'Open for a chat' check (char_length(status_text) <= 40),
  building_title  text not null default 'The Moluscca API' check (char_length(building_title) <= 60),
  building_text   text not null default 'Risk maths and checked India climate and economic data, in one request. In team beta, launching soon.' check (char_length(building_text) <= 220),
  building_tags   text not null default 'Node, Supabase, Render' check (char_length(building_tags) <= 80),   -- comma separated
  reading_title   text not null default '' check (char_length(reading_title) <= 120),
  reading_author  text not null default '' check (char_length(reading_author) <= 80),
  this_week       text not null default '' check (char_length(this_week) <= 160),
  updated_at      timestamptz not null default now()
);
insert into public.now_cards (id) values (1) on conflict (id) do nothing;
alter table public.now_cards add column if not exists city text not null default 'Bengaluru' check (char_length(city) between 1 and 40);

-- keep "updated" honest
create or replace function public.now_cards_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;
drop trigger if exists now_cards_touch on public.now_cards;
create trigger now_cards_touch before update on public.now_cards for each row execute function public.now_cards_touch();

alter table public.now_cards enable row level security;
drop policy if exists "now cards are public" on public.now_cards;
create policy "now cards are public" on public.now_cards for select to anon, authenticated using (true);
-- Only the owner's own email addresses may edit. They are listed in public.now_can_edit(),
-- which is created separately in Supabase so the addresses never sit in this public repo:
--   create or replace function public.now_can_edit() returns boolean language sql stable security definer
--   set search_path = public as $ select lower(coalesce(auth.email(), '')) in ('<your email 1>', '<your email 2>') $;
drop policy if exists "admins edit now cards" on public.now_cards;
drop policy if exists "owner edits now cards" on public.now_cards;
create policy "owner edits now cards" on public.now_cards for update to authenticated using (public.now_can_edit()) with check (public.now_can_edit());

revoke all on public.now_cards from anon, authenticated;
grant select on public.now_cards to anon, authenticated;
grant update (city, status_emoji, status_text, building_title, building_text, building_tags, reading_title, reading_author, this_week) on public.now_cards to authenticated;
