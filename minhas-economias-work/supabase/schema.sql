-- Minhas Economias: schema inicial multiusuário para Supabase.
-- Execute em projeto novo. Não contém comandos para apagar tabelas ou registros.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint categories_user_name_unique unique (user_id, name),
  constraint categories_id_user_unique unique (id, user_id)
);

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid null references public.categories(id) on delete set null,
  data_hora timestamptz not null,
  movimento text not null check (movimento in ('Entrada', 'Saída')),
  banco text,
  responsavel text,
  descricao text,
  valor numeric(15,2) not null check (valor >= 0),
  confirmado boolean not null default false,
  created_at timestamptz not null default now(),
  constraint transactions_id_user_unique unique (id, user_id)
);

-- Valida que a categoria associada pertence ao mesmo usuário do lançamento.
create or replace function public.validate_transaction_category_owner()
returns trigger language plpgsql security invoker set search_path = public
as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.categories c where c.id = new.category_id and c.user_id = new.user_id
  ) then
    raise exception 'A categoria precisa pertencer ao mesmo usuário do lançamento.';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_transaction_category_owner_trigger on public.transactions;
create trigger validate_transaction_category_owner_trigger
before insert or update of category_id, user_id on public.transactions
for each row execute function public.validate_transaction_category_owner();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Garante perfil também para contas que já existiam antes da instalação do trigger.
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "profile_select_own" on public.profiles;
create policy "profile_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own" on public.categories for select to authenticated using (auth.uid() = user_id);
drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own" on public.categories for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own" on public.categories for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own" on public.categories for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions for select to authenticated using (auth.uid() = user_id);
drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions for delete to authenticated using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
