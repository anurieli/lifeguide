-- Create admin_users table if it doesn't exist
create table if not exists public.admin_users (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.admin_users enable row level security;

-- Create policy to allow admins to view the table
create policy "Allow admins to view admin_users"
on public.admin_users
for select
to authenticated
using (
  auth.jwt()->>'email' in (
    select email from public.admin_users
  )
);

-- Insert your email as admin
insert into public.admin_users (email)
values ('anurieli365@gmail.com')
on conflict (email) do nothing; 