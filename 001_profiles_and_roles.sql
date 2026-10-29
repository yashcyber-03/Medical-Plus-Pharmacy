-- Two roles for the system
create type public.app_role as enum ('admin', 'pharmacist');

-- One profile row per login account
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text,
  role        public.app_role not null default 'pharmacist',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Helper: is the logged-in user an active admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- Helper: is the logged-in user an active staff member (any role)?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_staff() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;

-- New sign-ups always become 'pharmacist'. Role is never taken from user input.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Block non-admins from changing role or active status (even on their own row)
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.id is distinct from old.id then
      raise exception 'Only an administrator can change role or active status';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_trg
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- Row Level Security
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- No insert or delete policies: profiles are created only by the trigger above.
