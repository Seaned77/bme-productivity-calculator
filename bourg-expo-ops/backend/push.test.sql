-- Transaction rolls back subscriptions, messages, jobs AND pg_net wake requests.
-- No test notification can leave PostgreSQL.
begin;
do $$
declare ids uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
  people text[]:=array['sean','sean','jim','luis']; m uuid; i integer; n integer; a jsonb; b jsonb; rejected boolean:=false;
begin
  for i in 1..4 loop
    perform public.bourg_push_admin('subscribe',jsonb_build_object('deviceId',ids[i],'tokenHash','test-owner',
      'eventId','printing-united-2026','personId',people[i],'subscription',jsonb_build_object('endpoint','https://fcm.googleapis.com/test/'||ids[i])));
  end loop;
  insert into public.team_messages(event_id,channel,sender_id,recipient_id,body)
    values('printing-united-2026','direct','dan','sean','ROLLBACK notification routing test') returning id into m;
  select count(*) into n from private.bourg_push_jobs where message_id=m and device_id=any(ids);
  if n<>2 then raise exception 'Expected both Sean devices, got %',n; end if;
  insert into public.team_messages(event_id,channel,sender_id,body)
    values('printing-united-2026','sales','dan','ROLLBACK sales test') returning id into m;
  select count(*) into n from private.bourg_push_jobs where message_id=m and device_id=any(ids);
  if n<>3 then raise exception 'Sales routing failed: %',n; end if;
  insert into public.team_messages(event_id,channel,sender_id,body)
    values('printing-united-2026','nts','dan','ROLLBACK NTS test') returning id into m;
  select count(*) into n from private.bourg_push_jobs where message_id=m and device_id=any(ids);
  if n<>4 then raise exception 'NTS all-team access routing failed: %',n; end if;
  insert into public.team_messages(event_id,channel,sender_id,body)
    values('printing-united-2026','team','sean','ROLLBACK self exclusion test') returning id into m;
  select count(*) into n from private.bourg_push_jobs where message_id=m and device_id=any(ids);
  if n<>2 then raise exception 'Sender device exclusion failed: %',n; end if;
  insert into public.team_messages(event_id,channel,sender_id,participant_ids,body)
    values('printing-united-2026','custom','dan',array['dan','jim','sean'],'ROLLBACK custom group test') returning id into m;
  select count(*) into n from private.bourg_push_jobs where message_id=m and device_id=any(ids);
  if n<>3 then raise exception 'Custom routing failed: %',n; end if;
  begin
    perform public.bourg_push_admin('unsubscribe',jsonb_build_object('deviceId',ids[1],'tokenHash','wrong-owner'));
  exception when others then rejected:=true; end;
  if not rejected then raise exception 'Wrong device token accepted'; end if;
  perform public.bourg_push_admin('subscribe',jsonb_build_object('deviceId',ids[1],'tokenHash','test-owner',
      'eventId','printing-united-2026','personId','luis','subscription',jsonb_build_object('endpoint','https://fcm.googleapis.com/test/'||ids[1])));
  if exists(select 1 from private.bourg_push_jobs where device_id=ids[1]) then raise exception 'Old person queued alerts survived switch'; end if;
  a:=public.bourg_push_admin('claim'); b:=public.bourg_push_admin('claim');
  if jsonb_array_length(a)=0 then raise exception 'Nothing claimed'; end if;
  if jsonb_array_length(b)<>0 then raise exception 'Lease allowed duplicate delivery'; end if;
  perform public.bourg_push_admin('finish',jsonb_build_object('jobId',a->0->>'jobId','result','retry'));
  if exists(select 1 from private.bourg_push_jobs where id=(a->0->>'jobId')::bigint and done) then raise exception 'Retry marked done'; end if;
  perform public.bourg_push_admin('finish',jsonb_build_object('jobId',a->0->>'jobId','result','sent'));
  if not exists(select 1 from private.bourg_push_jobs where id=(a->0->>'jobId')::bigint and done) then raise exception 'Success not recorded'; end if;
  perform public.bourg_push_admin('finish',jsonb_build_object('jobId',a->1->>'jobId','result','gone'));
  if exists(select 1 from private.bourg_push_jobs where id=(a->1->>'jobId')::bigint) then raise exception 'Expired endpoint not removed'; end if;
end $$;
rollback;
select 'PASS: multiple devices, recipients, ownership, identity change, leases, retry, expired endpoints; no test data retained' as result;
