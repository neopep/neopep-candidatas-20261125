-- Read-only. Run against the explicitly selected environment before either migration.
begin read only;
select to_regprocedure('public.neo_campaign_central_v1(text,jsonb)') as central,
       to_regprocedure('public.neo_campaign_weekly_v1(text,jsonb)') as recurrence,
       to_regprocedure('neo_private.campaign_central_guard()') as dispatch_guard;
select table_name,column_name
  from information_schema.columns
 where table_schema='neo_private' and column_name='deleted_at'
   and table_name in ('campaign_central_groups','campaign_central_publications');
select p.oid::regprocedure as rpc, p.prosecdef as security_definer,
       p.proconfig as settings, p.proacl as grants
  from pg_proc p
 where p.oid in (
  to_regprocedure('public.neo_campaign_central_v1(text,jsonb)'),
  to_regprocedure('public.neo_campaign_weekly_v1(text,jsonb)'),
  to_regprocedure('neo_private.campaign_central_guard()')
 );
commit;
