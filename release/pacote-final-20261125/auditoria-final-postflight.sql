-- Read-only. Stop release promotion if any assertion fails.
begin read only;
do $check$
begin
 if not exists(select 1 from information_schema.columns
  where table_schema='neo_private' and table_name='campaign_central_publications'
    and column_name='deleted_at' and data_type='timestamp with time zone') then
  raise exception 'publication deletion column missing';
 end if;
 if position('campaign_publication_deleted' in pg_get_functiondef('neo_private.campaign_central_guard()'::regprocedure))=0
 or position('delete_publication' in pg_get_functiondef('public.neo_campaign_central_v1(text,jsonb)'::regprocedure))=0
 or position('campaign_weekly_occurrence_conflict' in pg_get_functiondef('public.neo_campaign_weekly_v1(text,jsonb)'::regprocedure))=0 then
  raise exception 'campaign contract missing';
 end if;
 if has_function_privilege('anon','public.neo_campaign_central_v1(text,jsonb)','execute')
 or has_function_privilege('anon','public.neo_campaign_weekly_v1(text,jsonb)','execute')
 or not has_function_privilege('authenticated','public.neo_campaign_central_v1(text,jsonb)','execute')
 or not has_function_privilege('authenticated','public.neo_campaign_weekly_v1(text,jsonb)','execute') then
  raise exception 'unexpected campaign permissions';
 end if;
end;
$check$;
commit;
