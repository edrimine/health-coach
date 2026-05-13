create table if not exists workout_log (
  id           uuid default gen_random_uuid() primary key,
  logged_at    date not null default current_date,
  type         text not null check (type in ('strength', 'run')),
  workout_id   text,           -- 'A', 'B', or 'C'; null for runs
  distance_mi  numeric(5,2),   -- null for strength
  duration_min integer,        -- null for strength
  created_at   timestamptz default now()
);

alter table workout_log enable row level security;

create policy "allow all for anon" on workout_log
  for all using (true) with check (true);
