create table if not exists mqtt_events (
  id bigint generated always as identity primary key,
  topic text not null,
  payload text not null,
  qos smallint not null check (qos between 0 and 2),
  received_at timestamptz not null default now()
);

create index if not exists mqtt_events_topic_received_idx
  on mqtt_events (topic, received_at desc);

create table if not exists device_state (
  topic text primary key,
  payload text not null,
  received_at timestamptz not null
);

create table if not exists commands (
  id uuid primary key,
  device_id text not null,
  command_type text not null,
  payload jsonb not null,
  status text not null check (status in ('created', 'published', 'acknowledged', 'failed', 'expired')),
  error_message text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  expires_at timestamptz not null
);

create index if not exists commands_device_created_idx
  on commands (device_id, created_at desc);

