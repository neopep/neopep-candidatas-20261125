begin;
set local lock_timeout='5s';
alter table neo_private.campaign_central_publications add column deleted_at timestamptz;
do $patch$
declare
 definition text:=pg_get_functiondef('public.neo_campaign_central_v1(text,jsonb)'::regprocedure);
 guard_definition text:=pg_get_functiondef('neo_private.campaign_central_guard()'::regprocedure);
 anchor text;
begin
 anchor:=$old$'editor_id',pub.editor_id,$old$;
 if cardinality(string_to_array(definition,anchor))<>2 then
  raise exception 'campaign_central_unexpected_definition';
 end if;
 definition:=replace(definition,anchor,$new$'editor_id',pub.editor_id,'deleted_at',pub.deleted_at,$new$);
 anchor:=$old$where pub.campaign_id=g.campaign_id$old$;
 if cardinality(string_to_array(definition,anchor))<>6 then
  raise exception 'campaign_central_unexpected_definition';
 end if;
 definition:=replace(definition,anchor,$new$where pub.campaign_id=g.campaign_id and pub.deleted_at is null$new$);
 anchor:=$old$ if p_action='load' then$old$;
 if cardinality(string_to_array(definition,anchor))<>2 then
  raise exception 'campaign_central_unexpected_definition';
 end if;
 definition:=replace(definition,anchor,$new$ if p_action='delete_publication' then
  if p_data->'confirmed' is distinct from 'true'::jsonb then
   raise exception 'campaign_delete_confirmation_required' using errcode='22023';
  end if;
  if publication.deleted_at is not null then return '{}'::jsonb; end if;
  if publication.id is null then
   raise exception 'campaign_publication_not_found' using errcode='22023';
  end if;
  if exists(select 1 from neo_private.campaign_weekly_series
    where source_publication=publication.id and state<>'cancelled') then
   raise exception 'campaign_publication_cancel_series_first' using errcode='55000';
  end if;
  perform 1 from neo_private.campaign_wa_rich_messages m
   join neo_private.campaign_wa_rich_batches b on b.id=m.batch_id
   join neo_private.campaign_central_publications pub on pub.editor_id=b.editor_id
   where pub.id=publication.id and m.state in ('waiting','leased','started')
   order by m.id for update of m;
  if exists(select 1 from neo_private.campaign_wa_rich_messages m
   join neo_private.campaign_wa_rich_batches b on b.id=m.batch_id
   join neo_private.campaign_central_publications pub on pub.editor_id=b.editor_id
   where pub.id=publication.id and m.state='started') then
   raise exception 'campaign_delete_dispatch_in_progress' using errcode='55000';
  end if;
  -- Manual legacy dispatch has independent semantics. Fail closed if present.
  if exists(select 1 from neo_private.campaign_dispatch_batch b
   join neo_private.campaign_central_publications pub on pub.editor_id=b.editor_id
   join neo_private.campaign_wa_publications p on p.dispatch_batch=b.id
   where pub.id=publication.id and p.dispatch_state in ('waiting','leased','started')) then
   raise exception 'campaign_delete_legacy_dispatch_pending' using errcode='55000';
  end if;
  with cancelled as (
   update neo_private.campaign_wa_rich_messages m
   set state='cancelled',lease_until=null
   from neo_private.campaign_wa_rich_batches b,neo_private.campaign_central_publications pub
   where m.batch_id=b.id and b.editor_id=pub.editor_id and pub.id=publication.id
   and m.state in ('waiting','leased') returning m.id
  )
  insert into neo_private.campaign_wa_rich_audit(message_id,event)
   select id,'cancelled' from cancelled;
  update neo_private.campaign_wa_rich_batches b set cancelled_at=coalesce(b.cancelled_at,now())
   where b.editor_id=publication.editor_id
   and not exists(select 1 from neo_private.campaign_wa_rich_messages m where m.batch_id=b.id and m.state<>'cancelled');
  update neo_private.campaign_central_publications set deleted_at=now() where id=publication.id;
  insert into neo_private.campaign_central_events(campaign_id,publication_id,actor_id,event)
   values(campaign_key,publication.id,actor,'publication_deleted');
  return '{}'::jsonb;
 end if;
 if publication.deleted_at is not null and p_action<>'load' then
  raise exception 'campaign_publication_deleted' using errcode='55000';
 end if;
 if p_action='load' then$new$);
 execute definition;
 anchor:=' if not found then return new; end if;';
 if cardinality(string_to_array(guard_definition,anchor))<>2 then
  raise exception 'campaign_publication_unexpected_guard';
 end if;
 execute replace(guard_definition,anchor,anchor||$guard$
 if linked.deleted_at is not null then
  raise exception 'campaign_publication_deleted' using errcode='55000';
 end if;
$guard$);
end;
$patch$;
commit;
