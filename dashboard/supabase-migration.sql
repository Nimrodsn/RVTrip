-- RVTrip Dashboard - Supabase Migration
-- Run this in Supabase SQL Editor to create all required tables and storage buckets.

create extension if not exists "uuid-ossp";

create table if not exists checklist (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  checked boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default uuid_generate_v4(),
  amount numeric not null,
  currency text not null check (currency in ('CZK', 'EUR')),
  category text not null check (category in ('fuel', 'camping', 'food', 'supplies', 'activity', 'other')),
  note text not null default '',
  day integer not null,
  timestamp bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists photos (
  id uuid primary key default uuid_generate_v4(),
  storage_path text not null,
  location_name text not null default '',
  day integer not null,
  timestamp bigint not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  storage_path text not null,
  mime_type text not null default '',
  size bigint,
  category text not null check (category in ('flight', 'insurance', 'reservation', 'rental', 'passport', 'license', 'other')),
  note text not null default '',
  timestamp bigint not null,
  created_at timestamptz not null default now()
);

create table if not exists day_notes (
  id uuid primary key default uuid_generate_v4(),
  day integer not null,
  time text not null default '',
  text text not null default '',
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists stop_edits (
  id uuid primary key default uuid_generate_v4(),
  stop_key text unique not null,
  edited_note text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists hidden_stops (
  id uuid primary key default uuid_generate_v4(),
  stop_key text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists custom_stops (
  id uuid primary key default uuid_generate_v4(),
  day integer not null,
  name text not null,
  type text not null check (type in ('campsite', 'attraction', 'supply')),
  lat double precision not null,
  lng double precision not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- Enable realtime
alter publication supabase_realtime add table checklist;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table photos;
alter publication supabase_realtime add table documents;
alter publication supabase_realtime add table day_notes;
alter publication supabase_realtime add table stop_edits;
alter publication supabase_realtime add table hidden_stops;
alter publication supabase_realtime add table custom_stops;

-- RLS: allow all (no auth for this trip app)
alter table checklist enable row level security;
alter table expenses enable row level security;
alter table photos enable row level security;
alter table documents enable row level security;
alter table day_notes enable row level security;
alter table stop_edits enable row level security;
alter table hidden_stops enable row level security;
alter table custom_stops enable row level security;

create policy "Allow all on checklist" on checklist for all using (true) with check (true);
create policy "Allow all on expenses" on expenses for all using (true) with check (true);
create policy "Allow all on photos" on photos for all using (true) with check (true);
create policy "Allow all on documents" on documents for all using (true) with check (true);
create policy "Allow all on day_notes" on day_notes for all using (true) with check (true);
create policy "Allow all on stop_edits" on stop_edits for all using (true) with check (true);
create policy "Allow all on hidden_stops" on hidden_stops for all using (true) with check (true);
create policy "Allow all on custom_stops" on custom_stops for all using (true) with check (true);

-- Storage buckets
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('documents', 'documents', true) on conflict do nothing;

create policy "Allow public upload to photos" on storage.objects for insert with check (bucket_id = 'photos');
create policy "Allow public read from photos" on storage.objects for select using (bucket_id = 'photos');
create policy "Allow public delete from photos" on storage.objects for delete using (bucket_id = 'photos');
create policy "Allow public upload to documents" on storage.objects for insert with check (bucket_id = 'documents');
create policy "Allow public read from documents" on storage.objects for select using (bucket_id = 'documents');
create policy "Allow public delete from documents" on storage.objects for delete using (bucket_id = 'documents');

-- RV live location sharing
create table if not exists rv_locations (
  rv_id text primary key check (rv_id in ('rv1', 'rv2')),
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

alter publication supabase_realtime add table rv_locations;
alter table rv_locations enable row level security;
create policy "Allow all on rv_locations" on rv_locations for all using (true) with check (true);
