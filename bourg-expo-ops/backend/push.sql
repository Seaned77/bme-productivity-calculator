-- Apply as the bourg_chat_web_push migration. No credentials belong in this file.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table private.bourg_push_devices (
  device_id uuid primary key,
  token_hash text not null,
  event_id text not null references public.events(id),
  person_id text not null,
  subscription jsonb not null,
  endpoint text not null unique,
  updated_at timestamptz not null default now(),
  test_at timestamptz
);
alter table private.bourg_push_devices enable row level security;
revoke all on private.bourg_push_devices from public, anon, authenticated;

create table private.bourg_push_jobs (
  id bigint generated always as identity primary key,
  message_id uuid not null references public.team_messages(id) on delete cascade,
  device_id uuid not null references private.bourg_push_devices(device_id) on delete cascade,
  person_id text not null,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  done boolean not null default false,
  result text,
  unique(message_id,device_id)
);
alter table private.bourg_push_jobs enable row level security;
revoke all on private.bourg_push_jobs from public, anon, authenticated;
create index bourg_push_pending on private.bourg_push_jobs(available_at) where not done;
create index bourg_push_device_jobs on private.bourg_push_jobs(device_id);
create index bourg_push_event_person on private.bourg_push_devices(event_id,person_id);

-- This gateway is callable ONLY by the Edge Function's service credential.
-- All browser requests are authenticated by the existing team key, plus a
-- random device token for subscription ownership. Never expose its output.
create or replace function public.bourg_push_admin(action text, args jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare cfg jsonb; device_record private.bourg_push_devices; answer jsonb;
begin
  if action = 'config' then
    perform pg_advisory_xact_lock(792632001);
    select decrypted_secret::jsonb into cfg from vault.decrypted_secrets where name='bourg_web_push';
    if cfg is null then
      if args->>'privateKey' is null then raise exception 'Push not configured'; end if;
      perform vault.create_secret(args::text, 'bourg_web_push', 'Expo web push VAPID and dispatcher keys');
      cfg := args;
    end if;
    return cfg;
  elsif action = 'authorize' then
    return jsonb_build_object('allowed', exists (
      select 1 from private.shared_access_keys k join public.team_roster r on r.event_id=k.event_id
      where k.event_id=args->>'eventId' and k.active and k.access_key=args->>'teamKey'
        and r.active and r.id=args->>'personId'
    ));
  elsif action in ('subscribe','status','unsubscribe','test') then
    perform pg_advisory_xact_lock(hashtextextended(args->>'deviceId',0));
    select * into device_record from private.bourg_push_devices where device_id=(args->>'deviceId')::uuid for update;
    if device_record.device_id is not null and device_record.token_hash <> args->>'tokenHash' then
      raise exception 'Device ownership mismatch';
    end if;
    if action='unsubscribe' then
      delete from private.bourg_push_devices where device_id=(args->>'deviceId')::uuid;
      return '{"enabled":false}'::jsonb;
    elsif action='status' then
      return jsonb_build_object('enabled', device_record.device_id is not null and device_record.person_id=args->>'personId' and device_record.event_id=args->>'eventId');
    elsif action='test' then
      if device_record.device_id is null or device_record.person_id<>args->>'personId' or device_record.event_id<>args->>'eventId' then raise exception 'Enable alerts first'; end if;
      if device_record.test_at > now()-interval '30 seconds' then raise exception 'Wait 30 seconds before another test'; end if;
      update private.bourg_push_devices set test_at=now() where device_id=device_record.device_id;
      return device_record.subscription;
    end if;
    if (select count(*) from private.bourg_push_devices where event_id=args->>'eventId') >= 100 and device_record.device_id is null then
      raise exception 'Device limit reached';
    end if;
    -- A person change must cancel already queued notifications for the old person.
    if device_record.person_id is distinct from args->>'personId' then
      delete from private.bourg_push_jobs where device_id=device_record.device_id;
    end if;
    insert into private.bourg_push_devices(device_id,token_hash,event_id,person_id,subscription,endpoint)
    values ((args->>'deviceId')::uuid,args->>'tokenHash',args->>'eventId',args->>'personId',args->'subscription',args->'subscription'->>'endpoint')
    on conflict(device_id) do update set person_id=excluded.person_id,event_id=excluded.event_id,
      subscription=excluded.subscription,endpoint=excluded.endpoint,updated_at=now();
    return '{"enabled":true}'::jsonb;
  elsif action='claim' then
    -- Recheck recipients against the live roster before exposing message content.
    update private.bourg_push_jobs j set done=true,result='expired or recipient changed'
    where not done and exists (select 1 from public.team_messages m join private.bourg_push_devices d on d.device_id=j.device_id
      where m.id=j.message_id and (m.created_at<now()-interval '1 hour' or d.person_id<>j.person_id or
      not private.person_exists(m.event_id,d.person_id) or
      (m.channel='sales' and not private.person_in_group(m.event_id,d.person_id,'Sales'))));
    with picked as (
      select id from private.bourg_push_jobs where not done and attempts<5 and available_at<=now()
      order by available_at for update skip locked limit 30
    ), claimed as (
      update private.bourg_push_jobs j set attempts=attempts+1,available_at=now()+interval '2 minutes'
      from picked where j.id=picked.id returning j.*
    ) select coalesce(jsonb_agg(jsonb_build_object('jobId',c.id,'subscription',d.subscription,
      'personId',c.person_id,'message',jsonb_build_object('id',m.id,'body',left(m.body,240),'urgent',m.urgent,
      'sender',coalesce(r.name,'Teammate')))), '[]'::jsonb) into answer
    from claimed c join private.bourg_push_devices d on d.device_id=c.device_id
      join public.team_messages m on m.id=c.message_id
      left join public.team_roster r on r.id=m.sender_id and r.event_id=m.event_id;
    return answer;
  elsif action='finish' then
    if args->>'result'='gone' then
      delete from private.bourg_push_devices where device_id=(select device_id from private.bourg_push_jobs where id=(args->>'jobId')::bigint);
    else
      update private.bourg_push_jobs set done=(args->>'result'='sent' or attempts>=5),result=args->>'result',
        available_at=now()+interval '1 minute'*greatest(1,attempts)
      where id=(args->>'jobId')::bigint;
    end if;
    return '{}'::jsonb;
  end if;
  raise exception 'Unknown push operation';
end;
$$;
revoke all on function public.bourg_push_admin(text,jsonb) from public,anon,authenticated;
grant execute on function public.bourg_push_admin(text,jsonb) to service_role;

create function private.bourg_wake_push() returns void
language plpgsql security definer set search_path = '' as $$
declare cfg jsonb;
begin
  -- No network calls while idle; old delivery records are bounded.
  delete from private.bourg_push_jobs j using public.team_messages m
    where m.id=j.message_id and m.created_at<now()-interval '7 days';
  if not exists(select 1 from private.bourg_push_jobs where not done and attempts<5 and available_at<=now()) then return; end if;
  select decrypted_secret::jsonb into cfg from vault.decrypted_secrets where name='bourg_web_push';
  if cfg is null then return; end if;
  perform net.http_post(url:=cfg->>'dispatchUrl',
    headers:=jsonb_build_object('Content-Type','application/json','x-bourg-dispatch',cfg->>'dispatchSecret'),
    body:='{"action":"dispatch"}'::jsonb, timeout_milliseconds:=10000);
end;
$$;
revoke all on function private.bourg_wake_push() from public,anon,authenticated;

create function private.bourg_enqueue_push() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.bourg_push_jobs(message_id,device_id,person_id)
  select new.id,d.device_id,d.person_id from private.bourg_push_devices d
  join public.team_roster r on r.event_id=d.event_id and r.id=d.person_id and r.active
  where d.event_id=new.event_id and d.person_id<>new.sender_id and (
    new.channel in ('team','nts') or
    (new.channel='sales' and r.team_group='Sales') or
    (new.channel='direct' and d.person_id=new.recipient_id) or
    (new.channel='custom' and d.person_id=any(new.participant_ids))
  ) on conflict do nothing;
  begin
    perform private.bourg_wake_push();
  exception when others then
    -- Chat delivery must succeed even if the push service is temporarily down.
    -- The minute job retries pending work after the transaction commits.
    raise warning 'Push wake deferred';
  end;
  return new;
end;
$$;
revoke all on function private.bourg_enqueue_push() from public,anon,authenticated;
create trigger bourg_message_push after insert on public.team_messages
for each row execute function private.bourg_enqueue_push();
select cron.schedule('bourg-push-retry','* * * * *','select private.bourg_wake_push()');
