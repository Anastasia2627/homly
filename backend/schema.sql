-- HOMLY store schema. Execute ONLY in HOMLY's own Supabase project.
-- All public tables use RLS. Browser never receives service_role or merchant tokens.
-- Run once in Supabase SQL Editor after selecting the correct project.
create extension if not exists pgcrypto;

create table if not exists public.homly_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
create table if not exists public.homly_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  birthday date,
  updated_at timestamptz not null default now()
);
create table if not exists public.homly_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,70}$'),
  title text not null check(length(title) between 2 and 180),
  category text not null check(category in ('beads','textile','candles','decor')),
  description text not null default '',
  price_kopeks integer not null check(price_kopeks between 100 and 100000000),
  stock integer not null default 0 check(stock>=0),
  image_urls text[] not null default '{}',
  published boolean not null default false,
  featured boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists homly_products_active_idx
  on public.homly_products(published,created_at desc);
create table if not exists public.homly_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  customer_email text not null,
  status text not null default 'pending' check(status in ('pending','paid','cancelled','failed','refunded')),
  subtotal_kopeks bigint not null check(subtotal_kopeks>=0),
  total_kopeks bigint not null check(total_kopeks>=0),
  invoice_id text unique,
  delivery jsonb not null default '{}'::jsonb,
  earned_points integer not null default 0 check(earned_points>=0),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists homly_orders_customer_idx
 on public.homly_orders(customer_id,created_at desc);
create table if not exists public.homly_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.homly_orders(id) on delete cascade,
  product_id uuid not null references public.homly_products(id) on delete restrict,
  title text not null,
  quantity integer not null check(quantity between 1 and 20),
  price_kopeks integer not null check(price_kopeks>0),
  total_kopeks bigint not null check(total_kopeks>0)
);
create index if not exists homly_order_items_order_idx on public.homly_order_items(order_id);
create table if not exists public.homly_loyalty_settings (
  id integer primary key default 1 check(id=1),
  earn_percent numeric(5,2) not null default 0 check(earn_percent>=0 and earn_percent<=25),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.homly_loyalty_settings(id) values(1) on conflict(id) do nothing;
create table if not exists public.homly_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  order_id uuid references public.homly_orders(id) on delete restrict,
  points integer not null check(points <> 0),
  reason text not null check(reason in ('purchase','refund','adjustment','redeem','signup','birthday')),
  created_at timestamptz not null default now()
);
create unique index if not exists homly_points_unique_purchase_idx
  on public.homly_points_ledger(order_id,reason)
  where order_id is not null and reason in ('purchase','refund');
create index if not exists homly_points_user_idx on public.homly_points_ledger(user_id,created_at desc);

alter table public.homly_admins enable row level security;
alter table public.homly_profiles enable row level security;
alter table public.homly_products enable row level security;
alter table public.homly_orders enable row level security;
alter table public.homly_order_items enable row level security;
alter table public.homly_loyalty_settings enable row level security;
alter table public.homly_points_ledger enable row level security;

-- An authenticated customer can discover ONLY their own admin membership.
create policy "homly_admin_self_read" on public.homly_admins
 for select to authenticated using(user_id=(select auth.uid()));
-- Admins are added by the project owner through SQL Editor or trusted server.
-- There is deliberately NO user-facing insert/update/delete policy.

create policy "homly_profile_own_read" on public.homly_profiles
 for select to authenticated using(user_id=(select auth.uid()));
create policy "homly_profile_own_insert" on public.homly_profiles
 for insert to authenticated with check(user_id=(select auth.uid()));
create policy "homly_profile_own_update" on public.homly_profiles
 for update to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()));

create policy "homly_products_read" on public.homly_products
 for select to anon,authenticated
 using(published or exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid())));
create policy "homly_products_admin_insert" on public.homly_products
 for insert to authenticated
 with check(exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid())));
create policy "homly_products_admin_update" on public.homly_products
 for update to authenticated
 using(exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid())))
 with check(exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid())));
create policy "homly_products_admin_delete" on public.homly_products
 for delete to authenticated
 using(exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid())));

create policy "homly_orders_read" on public.homly_orders
 for select to authenticated
 using(customer_id=(select auth.uid()) or
       exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid())));
create policy "homly_order_items_read" on public.homly_order_items
 for select to authenticated using(
   exists(select 1 from public.homly_orders o where o.id=order_id and
     (o.customer_id=(select auth.uid()) or
      exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid()))))
 );

create policy "homly_settings_read" on public.homly_loyalty_settings
 for select to anon,authenticated using(true);
create policy "homly_settings_admin_update" on public.homly_loyalty_settings
 for update to authenticated
 using(exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid())))
 with check(exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid())));
create policy "homly_ledger_read" on public.homly_points_ledger
 for select to authenticated
 using(user_id=(select auth.uid()) or
       exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid())));
-- No client-side INSERT/UPDATE permissions for orders, their items or points.
-- Only Edge Functions with service role create and settle orders.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('homly-products','homly-products',true,5242880,
   array['image/jpeg','image/png','image/webp','image/avif'])
 on conflict(id) do nothing;
create policy "homly_storage_public_read" on storage.objects
 for select to anon,authenticated using(bucket_id='homly-products');
create policy "homly_storage_admin_upload" on storage.objects
 for insert to authenticated
 with check(bucket_id='homly-products' and
   exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid())));
create policy "homly_storage_admin_update" on storage.objects
 for update to authenticated
 using(bucket_id='homly-products' and
   exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid())))
 with check(bucket_id='homly-products' and
   exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid())));
create policy "homly_storage_admin_delete" on storage.objects
 for delete to authenticated
 using(bucket_id='homly-products' and
   exists(select 1 from public.homly_admins a where a.user_id=(select auth.uid())));

-- Data API grants are distinct from RLS; enforce both levels.
grant usage on schema public to anon, authenticated;
grant select on public.homly_products,public.homly_loyalty_settings to anon;
grant select on public.homly_admins,public.homly_profiles,
 public.homly_products,public.homly_orders,public.homly_order_items,
 public.homly_loyalty_settings,public.homly_points_ledger to authenticated;
grant insert,update on public.homly_profiles to authenticated;
grant insert,update,delete on public.homly_products to authenticated;
grant update on public.homly_loyalty_settings to authenticated;

-- Bootstrap an admin ONLY after signing up and verifying your email:
-- insert into public.homly_admins(user_id)
-- select id from auth.users where email='YOUR_ADMIN_EMAIL';
