-- Access control for the IT Service Desk.
-- Run this after 202610130001_foundation_schema.sql.
--
-- The browser uses the anon key. These policies are the database backstop.
-- The Express API uses the service role, which bypasses Row Level Security,
-- so every privileged route must also check the verified user in application code.

create or replace function public.has_role(requested public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = requested
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('support_executive') or public.has_role('administrator');
$$;

create or replace function public.can_access_ticket(target_ticket uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tickets ticket
    where ticket.id = target_ticket
      and (
        ticket.creator_id = auth.uid()
        or ticket.assigned_executive_id = auth.uid()
        or public.has_role('administrator')
        or (
          public.has_role('support_executive')
          and exists (
            select 1
            from public.support_team_members member
            where member.user_id = auth.uid()
              and member.team_id = ticket.assigned_team_id
          )
        )
      )
  );
$$;

create or replace function public.can_read_attachment(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ticket_attachments attachment
    where attachment.storage_path = object_name
      and public.can_access_ticket(attachment.ticket_id)
      and (
        not exists (
          select 1
          from public.ticket_conversations message
          where message.id = attachment.message_id
            and message.is_internal = true
        )
        or public.is_staff()
      )
  );
$$;

create or replace function public.can_upload_attachment(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ticket_text text := split_part(object_name, '/', 1);
begin
  if ticket_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.can_access_ticket(ticket_text::uuid);
end;
$$;

-- Signup metadata can include a name and department. It cannot grant a privileged role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, employee_id, department, job_title)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    nullif(trim(new.raw_user_meta_data ->> 'employee_id'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'department'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'job_title'), '')
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'user');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.has_role('administrator') then
    new.id := old.id;
    new.email := old.email;
    new.is_active := old.is_active;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

create or replace function public.protect_notification_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.has_role('administrator') then
    new.id := old.id;
    new.recipient_id := old.recipient_id;
    new.type := old.type;
    new.title := old.title;
    new.body := old.body;
    new.ticket_id := old.ticket_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_protect on public.notifications;
create trigger notifications_protect
  before update on public.notifications
  for each row execute function public.protect_notification_update();

create or replace function public.grant_app_role(
  target_user uuid,
  requested public.app_role,
  actor uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = actor and role = 'administrator'
  ) then
    raise exception 'admin_required' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.profiles where id = target_user) then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  insert into public.user_roles (user_id, role, granted_by)
  values (target_user, requested, actor)
  on conflict (user_id, role) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count > 0 then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      'role.grant',
      'user_roles',
      target_user,
      jsonb_build_object('role', requested)
    );
  end if;
end;
$$;

create or replace function public.revoke_app_role(
  target_user uuid,
  requested public.app_role,
  actor uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_count integer;
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = actor and role = 'administrator'
  ) then
    raise exception 'admin_required' using errcode = 'P0001';
  end if;

  if requested = 'user' then
    raise exception 'base_role_required' using errcode = 'P0001';
  end if;

  if requested = 'administrator' and target_user = actor then
    raise exception 'cannot_revoke_own_admin' using errcode = 'P0001';
  end if;

  delete from public.user_roles
  where user_id = target_user
    and role = requested;

  get diagnostics removed_count = row_count;
  if removed_count > 0 then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (
      actor,
      'role.revoke',
      'user_roles',
      target_user,
      jsonb_build_object('role', requested)
    );
  end if;
end;
$$;

create or replace function public.set_profile_active(
  target_user uuid,
  active boolean,
  actor uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = actor and role = 'administrator'
  ) then
    raise exception 'admin_required' using errcode = 'P0001';
  end if;

  if target_user = actor and active = false then
    raise exception 'cannot_deactivate_self' using errcode = 'P0001';
  end if;

  update public.profiles
  set is_active = active
  where id = target_user;

  if not found then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    actor,
    'profile.active',
    'profiles',
    target_user,
    jsonb_build_object('is_active', active)
  );
end;
$$;

revoke all on function public.has_role(public.app_role) from public, anon;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.can_access_ticket(uuid) from public, anon;
revoke all on function public.can_read_attachment(text) from public, anon;
revoke all on function public.can_upload_attachment(text) from public, anon;
revoke all on function public.next_ticket_number() from public, anon, authenticated;
revoke all on function public.grant_app_role(uuid, public.app_role, uuid) from public, anon, authenticated;
revoke all on function public.revoke_app_role(uuid, public.app_role, uuid) from public, anon, authenticated;
revoke all on function public.set_profile_active(uuid, boolean, uuid) from public, anon, authenticated;

grant execute on function public.has_role(public.app_role) to authenticated, service_role;
grant execute on function public.is_staff() to authenticated, service_role;
grant execute on function public.can_access_ticket(uuid) to authenticated, service_role;
grant execute on function public.can_read_attachment(text) to authenticated, service_role;
grant execute on function public.can_upload_attachment(text) to authenticated, service_role;
grant execute on function public.next_ticket_number() to service_role;
grant execute on function public.grant_app_role(uuid, public.app_role, uuid) to service_role;
grant execute on function public.revoke_app_role(uuid, public.app_role, uuid) to service_role;
grant execute on function public.set_profile_active(uuid, boolean, uuid) to service_role;

-- A signed-in person cannot choose a privileged priority, an assignee, or the ticket number.
-- The service-role seed and later API calls run without auth.uid(), so they keep the values they set.
create or replace function public.protect_ticket_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.creator_id := auth.uid();
    new.ticket_number := public.next_ticket_number();
    new.status := 'NEW';
    new.assigned_executive_id := null;
    new.ai_summary := null;
    if new.priority is null or new.priority not in ('P3', 'P4') then
      new.priority := 'P3';
    end if;
  elsif new.ticket_number is null or btrim(new.ticket_number) = '' then
    new.ticket_number := public.next_ticket_number();
  end if;

  if new.original_report is null or btrim(new.original_report) = '' then
    new.original_report := new.description;
  end if;

  return new;
end;
$$;

drop trigger if exists tickets_protect_insert on public.tickets;
create trigger tickets_protect_insert
  before insert on public.tickets
  for each row execute function public.protect_ticket_insert();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.support_teams enable row level security;
alter table public.support_team_members enable row level security;
alter table public.technical_devices enable row level security;
alter table public.ticket_counters enable row level security;
alter table public.support_sla_policies enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_assignments enable row level security;
alter table public.ticket_conversations enable row level security;
alter table public.ticket_diagnostics enable row level security;
alter table public.ticket_status_history enable row level security;
alter table public.ticket_escalations enable row level security;
alter table public.support_knowledge_articles enable row level security;
alter table public.ticket_attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.has_role('administrator'))
  with check (public.has_role('administrator'));

drop policy if exists roles_select on public.user_roles;
create policy roles_select on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists roles_admin_write on public.user_roles;
create policy roles_admin_write on public.user_roles
  for all to authenticated
  using (public.has_role('administrator'))
  with check (public.has_role('administrator'));

drop policy if exists teams_select on public.support_teams;
create policy teams_select on public.support_teams
  for select to authenticated
  using (true);

drop policy if exists teams_admin_write on public.support_teams;
create policy teams_admin_write on public.support_teams
  for all to authenticated
  using (public.has_role('administrator'))
  with check (public.has_role('administrator'));

drop policy if exists team_members_select on public.support_team_members;
create policy team_members_select on public.support_team_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists team_members_admin_write on public.support_team_members;
create policy team_members_admin_write on public.support_team_members
  for all to authenticated
  using (public.has_role('administrator'))
  with check (public.has_role('administrator'));

drop policy if exists devices_select on public.technical_devices;
create policy devices_select on public.technical_devices
  for select to authenticated
  using (assigned_user_id = auth.uid() or public.is_staff());

drop policy if exists devices_admin_write on public.technical_devices;
create policy devices_admin_write on public.technical_devices
  for all to authenticated
  using (public.has_role('administrator'))
  with check (public.has_role('administrator'));

drop policy if exists sla_select on public.support_sla_policies;
create policy sla_select on public.support_sla_policies
  for select to authenticated
  using (true);

drop policy if exists sla_admin_write on public.support_sla_policies;
create policy sla_admin_write on public.support_sla_policies
  for all to authenticated
  using (public.has_role('administrator'))
  with check (public.has_role('administrator'));

drop policy if exists tickets_select on public.tickets;
create policy tickets_select on public.tickets
  for select to authenticated
  using (public.can_access_ticket(id));

drop policy if exists tickets_insert_own on public.tickets;
create policy tickets_insert_own on public.tickets
  for insert to authenticated
  with check (
    creator_id = auth.uid()
    and status = 'NEW'
    and assigned_executive_id is null
    and priority in ('P3', 'P4')
  );

drop policy if exists tickets_update_staff on public.tickets;
create policy tickets_update_staff on public.tickets
  for update to authenticated
  using (
    public.has_role('administrator')
    or assigned_executive_id = auth.uid()
    or (
      public.has_role('support_executive')
      and assigned_team_id in (
        select team_id from public.support_team_members where user_id = auth.uid()
      )
    )
  )
  with check (
    public.has_role('administrator')
    or assigned_executive_id = auth.uid()
    or (
      public.has_role('support_executive')
      and assigned_team_id in (
        select team_id from public.support_team_members where user_id = auth.uid()
      )
    )
  );

drop policy if exists assignments_select on public.ticket_assignments;
create policy assignments_select on public.ticket_assignments
  for select to authenticated
  using (public.can_access_ticket(ticket_id));

drop policy if exists assignments_staff_write on public.ticket_assignments;
create policy assignments_staff_write on public.ticket_assignments
  for insert to authenticated
  with check (public.is_staff() and public.can_access_ticket(ticket_id));

drop policy if exists conversations_select on public.ticket_conversations;
create policy conversations_select on public.ticket_conversations
  for select to authenticated
  using (
    public.can_access_ticket(ticket_id)
    and (is_internal = false or public.is_staff())
  );

drop policy if exists conversations_insert on public.ticket_conversations;
create policy conversations_insert on public.ticket_conversations
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.can_access_ticket(ticket_id)
    and (is_internal = false or public.is_staff())
  );

drop policy if exists diagnostics_select on public.ticket_diagnostics;
create policy diagnostics_select on public.ticket_diagnostics
  for select to authenticated
  using (
    public.can_access_ticket(ticket_id)
    and (visibility = 'shared' or public.is_staff())
  );

drop policy if exists diagnostics_insert on public.ticket_diagnostics;
create policy diagnostics_insert on public.ticket_diagnostics
  for insert to authenticated
  with check (
    public.can_access_ticket(ticket_id)
    and (visibility = 'shared' or public.is_staff())
  );

drop policy if exists status_history_select on public.ticket_status_history;
create policy status_history_select on public.ticket_status_history
  for select to authenticated
  using (public.can_access_ticket(ticket_id));

drop policy if exists status_history_staff_insert on public.ticket_status_history;
create policy status_history_staff_insert on public.ticket_status_history
  for insert to authenticated
  with check (public.is_staff() and public.can_access_ticket(ticket_id));

drop policy if exists escalations_select on public.ticket_escalations;
create policy escalations_select on public.ticket_escalations
  for select to authenticated
  using (public.can_access_ticket(ticket_id));

drop policy if exists escalations_staff_insert on public.ticket_escalations;
create policy escalations_staff_insert on public.ticket_escalations
  for insert to authenticated
  with check (public.is_staff() and public.can_access_ticket(ticket_id));

drop policy if exists knowledge_select on public.support_knowledge_articles;
create policy knowledge_select on public.support_knowledge_articles
  for select to authenticated
  using (status = 'published' or public.has_role('administrator'));

drop policy if exists knowledge_admin_write on public.support_knowledge_articles;
create policy knowledge_admin_write on public.support_knowledge_articles
  for all to authenticated
  using (public.has_role('administrator'))
  with check (public.has_role('administrator'));

drop policy if exists attachments_select on public.ticket_attachments;
create policy attachments_select on public.ticket_attachments
  for select to authenticated
  using (
    public.can_access_ticket(ticket_id)
    and (
      message_id is null
      or public.is_staff()
      or not exists (
        select 1
        from public.ticket_conversations message
        where message.id = ticket_attachments.message_id
          and message.is_internal = true
      )
    )
  );

drop policy if exists attachments_insert on public.ticket_attachments;
create policy attachments_insert on public.ticket_attachments
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.can_access_ticket(ticket_id)
  );

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid() or public.has_role('administrator'));

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists audit_admin_select on public.audit_logs;
create policy audit_admin_select on public.audit_logs
  for select to authenticated
  using (public.has_role('administrator'));

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

insert into storage.buckets (id, name, public)
values ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do nothing;

drop policy if exists attachment_objects_select on storage.objects;
create policy attachment_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and public.can_read_attachment(name)
  );

drop policy if exists attachment_objects_insert on storage.objects;
create policy attachment_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ticket-attachments'
    and public.can_upload_attachment(name)
  );

drop policy if exists attachment_objects_delete on storage.objects;
create policy attachment_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1
      from public.ticket_attachments attachment
      where attachment.storage_path = name
        and (
          attachment.uploaded_by = auth.uid()
          or public.has_role('administrator')
        )
    )
  );

do $$
begin
  begin
    alter publication supabase_realtime add table public.ticket_conversations;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

alter table public.ticket_conversations replica identity full;
alter table public.notifications replica identity full;
