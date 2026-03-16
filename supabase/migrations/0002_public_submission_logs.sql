create table if not exists public.public_submission_logs (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  fingerprint_hash text not null,
  source text not null default 'homepage-score-entry',
  status text not null,
  reason_code text,
  request_payload jsonb not null,
  match_id uuid references public.matches(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_public_submission_logs_created_at
  on public.public_submission_logs (created_at desc);

create index if not exists idx_public_submission_logs_ip_hash_created_at
  on public.public_submission_logs (ip_hash, created_at desc);

create index if not exists idx_public_submission_logs_fingerprint_hash_created_at
  on public.public_submission_logs (fingerprint_hash, created_at desc);
