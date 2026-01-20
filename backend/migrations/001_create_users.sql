-- Create users table for OTP auth + profile updates
create table if not exists public.users (
  id uuid primary key,
  phone text not null unique,
  first_name text,
  last_name text,
  email text,
  date_of_birth date,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_phone_idx on public.users (phone);
