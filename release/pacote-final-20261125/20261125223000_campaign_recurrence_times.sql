begin;
set local lock_timeout='5s';
do $migration$
declare
 definition text:=pg_get_functiondef('public.neo_campaign_weekly_v1(text,jsonb)'::regprocedure);
 original_block constant text:=$old$ or coalesce(p_data->>'time','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
 or jsonb_typeof(p_data->'days') is distinct from 'array'
 or exists(select 1 from jsonb_array_elements_text(p_data->'days') d where d !~ '^[0-6]$')
 then raise exception 'campaign_weekly_invalid_rule' using errcode='22023';end if;
 select array_agg(p.at order by p.at) into dates from (
  select to_char(start_date+i,'YYYY-MM-DD')||'T'||(p_data->>'time') as at
  from generate_series(0,end_date-start_date) i
  where p_data->'days' @> jsonb_build_array(extract(dow from start_date+i)::integer)
    and ((start_date+i)+(p_data->>'time')::time) at time zone 'America/Sao_Paulo'>now()
  order by i limit cutoff
$old$;
 revised_block constant text:=$new$ or frequency not in ('weekly','daily')
 or jsonb_typeof(times) is distinct from 'array'
 then raise exception 'campaign_weekly_invalid_rule' using errcode='22023';end if;
 if jsonb_array_length(times) not between 1 and 8
 or exists(select 1 from jsonb_array_elements_text(times) t where t is null or t !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
 or (select count(distinct t) from jsonb_array_elements_text(times) t)<>jsonb_array_length(times)
 then raise exception 'campaign_weekly_invalid_rule' using errcode='22023';end if;
 if frequency='weekly' then
  if jsonb_typeof(p_data->'days') is distinct from 'array' then
   raise exception 'campaign_weekly_invalid_rule' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_array_elements_text(p_data->'days') d where d is null or d !~ '^[0-6]$') then
   raise exception 'campaign_weekly_invalid_rule' using errcode='22023';
  end if;
 end if;
 select array_agg(p.at order by p.at) into dates from (
  select to_char(start_date+i,'YYYY-MM-DD')||'T'||t as at
  from generate_series(0,end_date-start_date) i
  cross join jsonb_array_elements_text(times) t
  where (frequency='daily' or p_data->'days' @> jsonb_build_array(extract(dow from start_date+i)::integer))
    and ((start_date+i)+t::time) at time zone 'America/Sao_Paulo'>now()
  order by at limit cutoff
$new$;
 series_insert constant text:=' insert into neo_private.campaign_weekly_series(id,campaign_id,source_publication,owner_id,rule)';
 original_declaration constant text:=$decl$ dates text[];$decl$;
begin
 if definition is null or cardinality(string_to_array(definition,original_block))<>2
 or cardinality(string_to_array(definition,original_declaration))<>2 then
  raise exception 'campaign_weekly_unexpected_definition';
 end if;
 definition:=replace(definition,original_declaration,original_declaration
 ||$vars$
 frequency text:=coalesce(p_data->>'frequency','weekly');
 times jsonb:=coalesce(p_data->'times',jsonb_build_array(p_data->>'time'));
$vars$);
 if cardinality(string_to_array(definition,series_insert))<>2 then
  raise exception 'campaign_weekly_unexpected_insert';
 end if;
 definition:=replace(definition,series_insert,$check$
 -- The campaign row lock serializes series changes for every source publication.
 if exists(select 1 from neo_private.campaign_weekly_occurrences o
    join neo_private.campaign_weekly_series s on s.id=o.series_id
    join neo_private.campaign_wa_rich_messages m on m.batch_id=o.batch_id
    where s.source_publication=source and o.local_time=any(dates) and m.state<>'cancelled') then
  raise exception 'campaign_weekly_occurrence_conflict' using errcode='55000';
 end if;
$check$||series_insert);
 execute replace(definition,original_block,revised_block);
end;
$migration$;
commit;
