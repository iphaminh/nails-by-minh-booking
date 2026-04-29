-- Run this in Supabase SQL Editor
-- Go to supabase.com → your project → SQL Editor → paste this → Run

-- BOOKINGS TABLE
create table bookings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc', now()),
  client_name text not null,
  client_phone text not null,
  client_email text,
  service text not null,
  addons text,
  inspo_style text,
  notes text,
  booking_date text not null,
  booking_time text not null,
  status text default 'pending',  -- pending, confirmed, cancelled, completed
  subscribe_text boolean default false,
  subscribe_email boolean default false
);

-- BLOCKED SLOTS TABLE (prevents double booking)
create table blocked_slots (
  id uuid default gen_random_uuid() primary key,
  booking_date text not null,
  booking_time text not null,
  booking_id uuid references bookings(id) on delete cascade,
  unique(booking_date, booking_time)
);

-- SUBSCRIBERS TABLE
create table subscribers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc', now()),
  name text,
  phone text,
  email text,
  subscribe_text boolean default false,
  subscribe_email boolean default false
);

-- Allow public read of blocked slots (so frontend can show unavailable times)
alter table blocked_slots enable row level security;
create policy "Anyone can view blocked slots" on blocked_slots for select using (true);

-- Allow public insert of bookings (clients submitting)
alter table bookings enable row level security;
create policy "Anyone can insert bookings" on bookings for insert with check (true);
create policy "Anyone can view bookings" on bookings for select using (true);

-- Allow public insert of subscribers
alter table subscribers enable row level security;
create policy "Anyone can insert subscribers" on subscribers for insert with check (true);

-- Allow public insert of blocked_slots (via API)
create policy "Anyone can insert blocked slots" on blocked_slots for insert with check (true);

select 'Database setup complete! ✅' as result;
