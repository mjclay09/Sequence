-- North Star Peptide: saved quiz results. Run once in Supabase → SQL Editor.
create table if not exists public.results (
  id            text primary key,                 -- random 16-char private link id
  created_at    timestamptz not null default now(),
  name          text not null,
  email         text not null,
  address       text,
  goal          text not null,
  answers       jsonb not null,                   -- quiz answer codes, used to rebuild the stack and pre-fill a retake
  answer_labels jsonb,                            -- human-readable answers (for your records)
  stack         jsonb not null,                   -- what was suggested
  notes         jsonb
);
create index if not exists results_email_idx on public.results (email);

-- Lock it down: no public access at all. Only the site's server (service role key) can read or write.
alter table public.results enable row level security;
revoke all on public.results from anon, authenticated;

-- "Ask for something specific" requests (added later; safe to run on its own).
create table if not exists public.requests (
  id          text primary key,
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  phone       text,
  referrer    text,
  experience  text,
  peptides    jsonb,
  message     text
);
alter table public.requests enable row level security;
revoke all on public.requests from anon, authenticated;

-- Request form now collects a mailing address (same as the quiz).
alter table public.requests add column if not exists address text;
