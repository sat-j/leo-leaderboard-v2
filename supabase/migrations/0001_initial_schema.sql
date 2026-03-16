create extension if not exists pgcrypto;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text
);

create table if not exists public.profiles (
  id uuid primary key,
  display_name text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role_id)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  slug text not null unique,
  level text not null check (level in ('PLUS', 'INT', 'ADV')),
  initial_mu numeric(8,3) not null,
  initial_sigma numeric(8,3) not null,
  is_active boolean not null default true,
  joined_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.play_dates (
  id uuid primary key default gen_random_uuid(),
  play_date date not null unique,
  label_short text,
  label_long text,
  match_count integer not null default 0,
  is_processed boolean not null default false,
  last_processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  play_date_id uuid not null references public.play_dates(id) on delete cascade,
  played_at timestamptz not null,
  score1 integer not null check (score1 >= 0),
  score2 integer not null check (score2 >= 0),
  submitted_by_user_id uuid references public.profiles(id) on delete set null,
  submitted_via text not null default 'admin',
  source text not null default 'manual',
  status text not null default 'pending',
  validation_notes jsonb,
  external_source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_number smallint not null check (team_number in (1, 2)),
  seat_number smallint not null check (seat_number in (1, 2)),
  created_at timestamptz not null default now(),
  unique (match_id, player_id),
  unique (match_id, team_number, seat_number)
);

create table if not exists public.processing_runs (
  id uuid primary key default gen_random_uuid(),
  triggered_by_user_id uuid references public.profiles(id) on delete set null,
  trigger_type text not null,
  scope text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb,
  error_message text
);

create table if not exists public.rating_snapshots (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  play_date_id uuid not null references public.play_dates(id) on delete cascade,
  processing_run_id uuid references public.processing_runs(id) on delete set null,
  mu numeric(8,3) not null,
  sigma numeric(8,3) not null,
  skill_rating numeric(8,3) not null,
  rating_change numeric(8,3),
  rank_overall integer,
  created_at timestamptz not null default now(),
  unique (player_id, play_date_id)
);

create table if not exists public.player_date_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  play_date_id uuid not null references public.play_dates(id) on delete cascade,
  matches_played integer not null default 0,
  matches_won integer not null default 0,
  win_rate numeric(5,2) not null default 0,
  points_scored integer not null default 0,
  points_conceded integer not null default 0,
  points_difference integer not null default 0,
  rating_change numeric(8,3) not null default 0,
  created_at timestamptz not null default now(),
  unique (player_id, play_date_id)
);

create table if not exists public.player_narratives (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  code text not null,
  scope text not null,
  play_date_id uuid references public.play_dates(id) on delete set null,
  title text not null,
  description text not null,
  value_numeric numeric(10,3),
  value_text text,
  metadata jsonb,
  computed_at timestamptz not null default now()
);

create or replace function public.increment_play_date_match_count(play_date_id_input uuid)
returns void
language sql
as $$
  update public.play_dates
  set match_count = match_count + 1
  where id = play_date_id_input;
$$;

create table if not exists public.partnership_summaries (
  id uuid primary key default gen_random_uuid(),
  player_a_id uuid not null references public.players(id) on delete cascade,
  player_b_id uuid not null references public.players(id) on delete cascade,
  matches_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  win_rate numeric(5,2) not null default 0,
  last_played_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.rivalry_summaries (
  id uuid primary key default gen_random_uuid(),
  player_a_id uuid not null references public.players(id) on delete cascade,
  player_b_id uuid not null references public.players(id) on delete cascade,
  matches_against integer not null default 0,
  player_a_wins integer not null default 0,
  player_b_wins integer not null default 0,
  last_played_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists rivalry_pair_unique_idx
  on public.rivalry_summaries (least(player_a_id, player_b_id), greatest(player_a_id, player_b_id));

create unique index if not exists partnership_pair_unique_idx
  on public.partnership_summaries (least(player_a_id, player_b_id), greatest(player_a_id, player_b_id));

create index if not exists idx_play_dates_date_desc on public.play_dates (play_date desc);
create index if not exists idx_matches_play_date_id on public.matches (play_date_id);
create index if not exists idx_matches_played_at_desc on public.matches (played_at desc);
create index if not exists idx_matches_status on public.matches (status);
create index if not exists idx_match_participants_player_id on public.match_participants (player_id);
create index if not exists idx_rating_snapshots_play_date_id on public.rating_snapshots (play_date_id);
create index if not exists idx_player_date_stats_play_date_id on public.player_date_stats (play_date_id);
create index if not exists idx_player_narratives_player_id on public.player_narratives (player_id);
create index if not exists idx_player_narratives_code on public.player_narratives (code);

insert into public.roles (code, name, description)
values
  ('admin', 'Admin', 'Full platform administration'),
  ('scorekeeper', 'Scorekeeper', 'Can submit and manage match results'),
  ('member', 'Member', 'Authenticated club member'),
  ('viewer', 'Viewer', 'Read-only access')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;
