-- Phase 1 schema for the IT Service Desk.
-- Run this file first in the Supabase SQL Editor, then 002, then 003.
-- It is safe to run again: existing tables are left in place.

create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('user', 'support_executive', 'administrator');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ticket_status as enum (
    'NEW',
    'TRIAGED',
    'ASSIGNED',
    'IN_PROGRESS',
    'WAITING_FOR_USER',
    'WAITING_FOR_SPECIALIST',
    'ESCALATED',
    'RESOLVED',
    'CLOSED',
    'REOPENED'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ticket_priority as enum ('P1', 'P2', 'P3', 'P4');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  employee_id text unique,
  department text,
  job_title text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.support_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  support_level text not null check (support_level in ('L1', 'L2', 'L3', 'SECURITY', 'PRIORITY')),
  description text,
  manager_id uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.support_teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  is_available boolean not null default true,
  max_active_tickets integer not null default 8 check (max_active_tickets > 0),
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table if not exists public.technical_devices (
  id uuid primary key default gen_random_uuid(),
  device_identifier text not null unique,
  device_type text not null check (
    device_type in ('laptop', 'desktop', 'monitor', 'printer', 'docking_station', 'other_endpoint')
  ),
  manufacturer text,
  model text,
  operating_system text,
  assigned_user_id uuid references public.profiles (id) on delete set null,
  department text,
  status text not null default 'active' check (status in ('active', 'in_repair', 'retired', 'spare')),
  warranty_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_counters (
  year integer primary key,
  last_number integer not null check (last_number >= 0)
);

create table if not exists public.support_sla_policies (
  id uuid primary key default gen_random_uuid(),
  priority public.ticket_priority not null unique,
  first_response_minutes integer not null check (first_response_minutes > 0),
  resolution_minutes integer not null check (resolution_minutes > 0),
  is_active boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique check (ticket_number ~ '^IT-[0-9]{4}-[0-9]{5}$'),
  creator_id uuid not null references public.profiles (id) on delete restrict,
  title text not null,
  description text not null,
  original_report text not null,
  ai_summary text,
  category text not null,
  subcategory text,
  priority public.ticket_priority not null default 'P3',
  status public.ticket_status not null default 'NEW',
  device_id uuid references public.technical_devices (id) on delete set null,
  device_label text,
  service_name text,
  error_details text,
  business_impact text,
  affected_users_count integer check (affected_users_count is null or affected_users_count >= 0),
  troubleshooting_history jsonb not null default '[]'::jsonb,
  assigned_team_id uuid references public.support_teams (id) on delete restrict,
  assigned_executive_id uuid references public.profiles (id) on delete set null,
  idempotency_key text unique,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  resolution_details text,
  sla_first_response_due_at timestamptz,
  sla_resolution_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_assignments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  team_id uuid references public.support_teams (id) on delete set null,
  executive_id uuid references public.profiles (id) on delete set null,
  assigned_by uuid references public.profiles (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_conversations (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete restrict,
  body text not null check (char_length(body) > 0 and char_length(body) <= 5000),
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_diagnostics (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  source text not null check (source in ('user', 'assistant', 'executive')),
  visibility text not null default 'shared' check (visibility in ('shared', 'internal')),
  details jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_status_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  from_status public.ticket_status,
  to_status public.ticket_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_escalations (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  from_team_id uuid references public.support_teams (id) on delete set null,
  to_team_id uuid references public.support_teams (id) on delete set null,
  from_level text,
  to_level text,
  reason text not null,
  escalated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.support_knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  category text not null,
  symptoms text[] not null default '{}',
  error_messages text[] not null default '{}',
  steps jsonb not null default '[]'::jsonb,
  escalation_conditions text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  author_id uuid references public.profiles (id) on delete set null,
  author_name text not null default 'IT Knowledge Team',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  message_id uuid references public.ticket_conversations (id) on delete set null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  ticket_id uuid references public.tickets (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_department_idx on public.profiles (department);
create index if not exists user_roles_user_id_idx on public.user_roles (user_id);
create index if not exists support_team_members_user_id_idx on public.support_team_members (user_id);
create index if not exists technical_devices_assigned_user_idx on public.technical_devices (assigned_user_id);
create index if not exists tickets_creator_id_idx on public.tickets (creator_id);
create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists tickets_priority_idx on public.tickets (priority);
create index if not exists tickets_category_idx on public.tickets (category);
create index if not exists tickets_assigned_team_idx on public.tickets (assigned_team_id);
create index if not exists tickets_assigned_executive_idx on public.tickets (assigned_executive_id);
create index if not exists ticket_conversations_ticket_idx on public.ticket_conversations (ticket_id, created_at);
create index if not exists ticket_status_history_ticket_idx on public.ticket_status_history (ticket_id, created_at);
create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at);
create index if not exists knowledge_category_status_idx on public.support_knowledge_articles (category, status);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_teams_touch on public.support_teams;
create trigger support_teams_touch
  before update on public.support_teams
  for each row execute function public.touch_updated_at();

drop trigger if exists technical_devices_touch on public.technical_devices;
create trigger technical_devices_touch
  before update on public.technical_devices
  for each row execute function public.touch_updated_at();

drop trigger if exists tickets_touch on public.tickets;
create trigger tickets_touch
  before update on public.tickets
  for each row execute function public.touch_updated_at();

drop trigger if exists knowledge_touch on public.support_knowledge_articles;
create trigger knowledge_touch
  before update on public.support_knowledge_articles
  for each row execute function public.touch_updated_at();

drop trigger if exists sla_touch on public.support_sla_policies;
create trigger sla_touch
  before update on public.support_sla_policies
  for each row execute function public.touch_updated_at();

-- Locks one counter row per year, so two requests cannot receive the same ticket number.
create or replace function public.next_ticket_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_year integer := extract(year from now())::integer;
  assigned_number integer;
begin
  insert into public.ticket_counters as counters (year, last_number)
  values (current_year, 1)
  on conflict (year)
  do update set last_number = counters.last_number + 1
  returning last_number into assigned_number;

  return 'IT-' || current_year::text || '-' || lpad(assigned_number::text, 5, '0');
end;
$$;

comment on table public.profiles is
  'Employee record for a signed-in account. Privileged access lives in user_roles, not here.';
comment on column public.tickets.original_report is
  'The reporter''s own words. Keep this separate from any later assistant summary.';
comment on column public.tickets.ai_summary is
  'Optional assistant summary. It must not replace original_report.';
