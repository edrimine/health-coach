-- Drop surrogate PK and unique constraint; promote recorded_at to PK
alter table health_metrics drop constraint health_metrics_pkey;
alter table health_metrics drop constraint health_metrics_recorded_at_key;
alter table health_metrics drop column id;
alter table health_metrics add primary key (recorded_at);

-- Rename column
alter table health_metrics rename column avg_daily_steps to total_daily_steps;

-- Drop notes (populated programmatically, not manually)
alter table health_metrics drop column notes;
