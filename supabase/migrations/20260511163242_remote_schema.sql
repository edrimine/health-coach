create table if not exists weekly_logs (
  id uuid default gen_random_uuid() primary key,
  week_key text not null unique,
  cardio integer not null default 0,
  strength integer not null default 0,
  steps integer not null default 0,
  notes text default '',
  saved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists weight_entries (
  id uuid default gen_random_uuid() primary key,
  entry_date date not null unique,
  weight_lbs numeric(5,1) not null,
  created_at timestamptz default now()
);

alter table weekly_logs enable row level security;
alter table weight_entries enable row level security;

create policy "allow all for anon" on weekly_logs
  for all using (true) with check (true);

create policy "allow all for anon" on weight_entries
  for all using (true) with check (true);

-- Seed data
insert into weekly_logs (week_key, cardio, strength, steps, notes, saved_at)
values ('2026-05-04', 2, 0, 3, 'Two runs (May 7 + May 9). Missed strength. 3 of 4 step days.', '2026-05-10T14:32:00Z')
on conflict (week_key) do nothing;

insert into weight_entries (entry_date, weight_lbs)
values ('2026-05-07', 213.8), ('2026-05-10', 215.3)
on conflict (entry_date) do nothing;