-- Create enums for type safety
create type public.app_role as enum ('admin', 'user');
create type public.agent_status as enum ('draft', 'active', 'paused', 'error');
create type public.execution_status as enum ('pending', 'running', 'completed', 'failed', 'cancelled');
create type public.transaction_type as enum ('buy', 'sell');
create type public.order_type as enum ('market', 'limit');
create type public.risk_tolerance as enum ('conservative', 'moderate', 'aggressive');

-- Profiles table for extended user information
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  full_name text,
  avatar_url text,
  investor_type text,
  risk_tolerance risk_tolerance default 'moderate',
  investment_goals text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.profiles enable row level security;

-- User roles table (separate for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Agents table for storing investment agent configurations
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  workflow_json jsonb not null default '{}'::jsonb,
  status agent_status not null default 'draft',
  is_paper_trading boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.agents enable row level security;

-- Workflows table for detailed workflow definitions
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade not null,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.workflows enable row level security;

-- Executions table for tracking workflow runs
create table public.executions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  status execution_status not null default 'pending',
  started_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone,
  logs jsonb default '[]'::jsonb,
  error_message text
);

alter table public.executions enable row level security;

-- Exchange connections table for storing encrypted API credentials
create table public.exchange_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  exchange_name text not null,
  api_key_encrypted text not null,
  api_secret_encrypted text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (user_id, exchange_name)
);

alter table public.exchange_connections enable row level security;

-- Portfolios table for tracking user portfolios
create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  exchange_connection_id uuid references public.exchange_connections(id) on delete cascade,
  asset_symbol text not null,
  quantity numeric not null default 0,
  average_buy_price numeric,
  current_value numeric,
  last_updated timestamp with time zone not null default now()
);

alter table public.portfolios enable row level security;

-- Transactions table for recording all trades
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  agent_id uuid references public.agents(id) on delete set null,
  execution_id uuid references public.executions(id) on delete set null,
  exchange_connection_id uuid references public.exchange_connections(id) on delete set null,
  transaction_type transaction_type not null,
  order_type order_type not null,
  asset_symbol text not null,
  quantity numeric not null,
  price numeric not null,
  total_value numeric not null,
  fees numeric default 0,
  is_paper_trade boolean not null default true,
  executed_at timestamp with time zone not null default now()
);

alter table public.transactions enable row level security;

-- Alerts table for storing user notifications
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  agent_id uuid references public.agents(id) on delete cascade,
  title text not null,
  message text not null,
  severity text not null default 'info',
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now()
);

alter table public.alerts enable row level security;

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Security definer function to check user roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$;

-- Triggers for updated_at
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create trigger update_agents_updated_at
  before update on public.agents
  for each row execute function public.update_updated_at_column();

create trigger update_workflows_updated_at
  before update on public.workflows
  for each row execute function public.update_updated_at_column();

create trigger update_exchange_connections_updated_at
  before update on public.exchange_connections
  for each row execute function public.update_updated_at_column();

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS Policies for profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
create policy "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "Admins can manage all roles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for agents
create policy "Users can view their own agents"
  on public.agents for select
  using (auth.uid() = user_id);

create policy "Users can create their own agents"
  on public.agents for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own agents"
  on public.agents for update
  using (auth.uid() = user_id);

create policy "Users can delete their own agents"
  on public.agents for delete
  using (auth.uid() = user_id);

create policy "Admins can view all agents"
  on public.agents for select
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for workflows
create policy "Users can view workflows of their agents"
  on public.workflows for select
  using (exists (
    select 1 from public.agents
    where agents.id = workflows.agent_id
    and agents.user_id = auth.uid()
  ));

create policy "Users can manage workflows of their agents"
  on public.workflows for all
  using (exists (
    select 1 from public.agents
    where agents.id = workflows.agent_id
    and agents.user_id = auth.uid()
  ));

-- RLS Policies for executions
create policy "Users can view their own executions"
  on public.executions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own executions"
  on public.executions for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all executions"
  on public.executions for select
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for exchange_connections
create policy "Users can view their own exchange connections"
  on public.exchange_connections for select
  using (auth.uid() = user_id);

create policy "Users can manage their own exchange connections"
  on public.exchange_connections for all
  using (auth.uid() = user_id);

-- RLS Policies for portfolios
create policy "Users can view their own portfolios"
  on public.portfolios for select
  using (auth.uid() = user_id);

create policy "Users can manage their own portfolios"
  on public.portfolios for all
  using (auth.uid() = user_id);

-- RLS Policies for transactions
create policy "Users can view their own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

-- RLS Policies for alerts
create policy "Users can view their own alerts"
  on public.alerts for select
  using (auth.uid() = user_id);

create policy "Users can update their own alerts"
  on public.alerts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own alerts"
  on public.alerts for delete
  using (auth.uid() = user_id);

create policy "System can create alerts for users"
  on public.alerts for insert
  with check (true);

-- Create indexes for performance
create index idx_agents_user_id on public.agents(user_id);
create index idx_agents_status on public.agents(status);
create index idx_executions_agent_id on public.executions(agent_id);
create index idx_executions_user_id on public.executions(user_id);
create index idx_executions_status on public.executions(status);
create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_agent_id on public.transactions(agent_id);
create index idx_alerts_user_id on public.alerts(user_id);
create index idx_alerts_is_read on public.alerts(is_read);
create index idx_portfolios_user_id on public.portfolios(user_id);