-- Generated from data/players.csv by data/scripts/generate_insert_players_sql.py
-- Legacy BEG values are normalized to INT.

insert into public.players (
  display_name,
  slug,
  level,
  initial_mu,
  initial_sigma,
  is_active
)




values
  ('Gopinath S', 'gopinath-s', 'INT', 10, 8.33, true),
  ('Karthikeya Manivel', 'karthikeya-manivel', 'INT', 10, 8.33, true),
  ('Jai Ganesh', 'jai-ganesh', 'INT', 10, 8.33, true),
  ('Yeshwant', 'yeshwant', 'PLUS', 35, 8.33, true),
  ('Kunal', 'kunal', 'PLUS', 35, 8.33, true),
  ('Manish', 'manish', 'PLUS', 35, 8.33, true),
on conflict (slug) do update
set
  display_name = excluded.display_name,
  level = excluded.level,
  initial_mu = excluded.initial_mu,
  initial_sigma = excluded.initial_sigma,
  is_active = excluded.is_active,
  updated_at = now();
