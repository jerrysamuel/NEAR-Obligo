-- Supabase Schema for Obligo: Private Personal Commerce Agent

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  preferred_currency text default 'NGN',
  monthly_budget numeric default 500000,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Shopping Preferences
create table if not exists public.shopping_preferences (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  preferred_brands text[] default '{}',
  product_specifications jsonb default '{}'::jsonb,
  preferred_merchants text[] default '{}',
  shopping_restrictions text[] default '{}',
  spending_limit numeric,
  approval_requirements text default 'Always require explicit approval before sharing address or payment info',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Subscriptions
create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  provider text not null,
  category text not null,
  amount numeric not null,
  currency text default 'NGN' not null,
  billing_cycle text not null check (billing_cycle in ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date date,
  next_billing_date date not null,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Saved Products
create table if not exists public.saved_products (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  merchant_id text not null,
  title text not null,
  description text,
  price numeric not null,
  currency text default 'NGN' not null,
  image_url text,
  product_url text not null,
  specifications jsonb default '{}'::jsonb,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Purchase Intents (Prepared Purchases)
create table if not exists public.purchase_intents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  product_id text not null,
  merchant_id text not null,
  title text not null,
  price numeric not null,
  currency text default 'NGN' not null,
  status text default 'draft' check (status in ('draft', 'pending_approval', 'authorised', 'completed', 'cancelled')),
  required_fields text[] default '{}',
  disclosed_fields jsonb default '{}'::jsonb,
  near_permission_hash text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Disclosure Permissions
create table if not exists public.disclosure_permissions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  recipient text not null,
  purpose text not null,
  permitted_fields text[] not null,
  expires_at timestamp with time zone not null,
  revoked_at timestamp with time zone,
  approved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Authorisation Records (NEAR Testnet verifiable records)
create table if not exists public.authorisation_records (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  permission_hash text not null,
  action_type text not null,
  spending_limit numeric not null,
  currency text not null default 'NGN',
  expiry bigint not null,
  transaction_hash text,
  contract_id text,
  revoked boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Activity Logs
create table if not exists public.activity_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  actor text not null, -- 'user' | 'agent' | 'mcp'
  action text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.shopping_preferences enable row level security;
alter table public.subscriptions enable row level security;
alter table public.saved_products enable row level security;
alter table public.purchase_intents enable row level security;
alter table public.disclosure_permissions enable row level security;
alter table public.authorisation_records enable row level security;
alter table public.activity_logs enable row level security;

-- Policies for RLS
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can operate on own subscriptions" on public.subscriptions for all using (auth.uid() = user_id);
create policy "Users can operate on own preferences" on public.shopping_preferences for all using (auth.uid() = user_id);
create policy "Users can operate on own saved products" on public.saved_products for all using (auth.uid() = user_id);
create policy "Users can operate on own purchase intents" on public.purchase_intents for all using (auth.uid() = user_id);
create policy "Users can operate on own disclosure permissions" on public.disclosure_permissions for all using (auth.uid() = user_id);
create policy "Users can operate on own authorisation records" on public.authorisation_records for all using (auth.uid() = user_id);
create policy "Users can operate on own activity logs" on public.activity_logs for all using (auth.uid() = user_id);
