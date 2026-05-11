create table if not exists health_metrics (
  id uuid default gen_random_uuid() primary key,
  recorded_at date not null unique,
  
  -- Body
  weight_lbs        numeric(5,1),
  
  -- Cardio
  vo2_max           numeric(4,1),
  resting_hr        integer,
  hrv_ms            integer,
  
  -- Activity
  avg_daily_steps   integer,
  
  -- Notes
  notes             text,
  
  created_at timestamptz default now()
);

alter table health_metrics enable row level security;

create policy "allow all for anon" on health_metrics
  for all using (true) with check (true);

-- Seed historical data from Apple Health
insert into health_metrics (recorded_at, weight_lbs, vo2_max, resting_hr, hrv_ms, avg_daily_steps, notes)
values
  ('2026-01-01', null,  36.9, null, null, null, 'VO₂ max baseline — January'),
  ('2026-03-01', null,  35.8, null, null, null, 'VO₂ max — March'),
  ('2026-04-07', null,  33.7, 66,   51,   6900, 'Full baseline — start of tracking'),
  ('2026-05-07', 213.8, null, null, null, null, 'First weight log'),
  ('2026-05-10', 215.3, 35.8, 64,   54,   7600, 'Latest full sync')
on conflict (recorded_at) do nothing;