-- Chess leaderboard on prasanna.lol: lets chess wins against the bot be saved. Run once in Supabase → SQL editor.
alter table public.game_scores drop constraint if exists game_scores_game_check;
alter table public.game_scores add constraint game_scores_game_check check (game in ('sudoku-easy','sudoku-medium','sudoku-hard','quick','bigger','sequence','wordle','memory','chess-easy','chess-medium','chess-hard'));
drop policy if exists "anyone can log a game" on public.game_scores;
create policy "anyone can log a game" on public.game_scores for insert to anon, authenticated
  with check ((game like 'sudoku-%' and score >= 15) or (game in ('quick','bigger','sequence') and score <= 150)
    or (game = 'wordle' and score between 1000 and 6999) or (game = 'memory' and score between 8000 and 99999)
    or (game like 'chess-%' and score between 2 and 400));   -- score = your moves to checkmate the bot
