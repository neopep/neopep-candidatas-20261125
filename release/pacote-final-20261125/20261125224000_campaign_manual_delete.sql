begin;
set local lock_timeout='5s';

-- Provision only after a trusted operator verifies the original owner against
-- external evidence. Neither web administrators nor the service API can claim ownership.
create table neo_private.campaign_manual_ownership (
 campaign_id uuid primary key references neo_private.campaigns(id),
 owner_id uuid not null,
 evidence_ref text not null check (length(btrim(evidence_ref)) between 1 and 200),
 verified_by uuid not null,
 verified_at timestamptz not null default now(),
 deleted_at timestamptz,
 deleted_by uuid,
 check ((deleted_at is null)=(deleted_by is null)),
 check (deleted_by is null or deleted_by=owner_id)
);
alter table neo_private.campaign_manual_ownership enable row level security;
revoke all on neo_private.campaign_manual_ownership from public,anon,authenticated,service_role;

-- Account removal must remain possible after a past verification or deletion.
create function neo_private.campaign_manual_verify_users() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from auth.users where id=new.owner_id)
 or not exists(select 1 from auth.users where id=new.verified_by) then
  raise exception 'campaign_manual_unknown_user' using errcode='23503';
 end if;
 return new;
end;
$$;
revoke all on function neo_private.campaign_manual_verify_users() from public,anon,authenticated,service_role;
create trigger campaign_manual_verify_users before insert or update of owner_id,verified_by
 on neo_private.campaign_manual_ownership for each row execute function neo_private.campaign_manual_verify_users();

create function neo_private.campaign_manual_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.campaign_id is null or not exists(select 1 from neo_private.campaign_manual_ownership
   where campaign_id=new.campaign_id) then return new; end if;
 -- Serialize new references with deletion even when the FK key is unchanged.
 perform 1 from neo_private.campaigns where id=new.campaign_id for update;
 if exists(select 1 from neo_private.campaign_manual_ownership
   where campaign_id=new.campaign_id and deleted_at is not null) then
  raise exception 'campaign_manual_deleted' using errcode='55000';
 end if;
 return new;
end;
$$;
revoke all on function neo_private.campaign_manual_guard() from public,anon,authenticated,service_role;
create trigger campaign_manual_guard_publication before insert or update of campaign_id
 on neo_private.campaign_wa_publications for each row execute function neo_private.campaign_manual_guard();
create trigger campaign_manual_guard_editor before insert or update of campaign_id
 on neo_private.campaign_editor_versions for each row execute function neo_private.campaign_manual_guard();
create trigger campaign_manual_guard_central before insert
 on neo_private.campaign_central_groups for each row execute function neo_private.campaign_manual_guard();

do $patch$
declare
 definition text:=pg_get_functiondef('public.neo_campaign_central_v1(text,jsonb)'::regprocedure);
 anchor constant text:=' if p_action=''list'' then';
begin
 if cardinality(string_to_array(definition,anchor))<>2 then
  raise exception 'campaign_manual_unexpected_central_definition';
 end if;
 execute replace(definition,anchor,$new$
 if p_action='legacy_states' then
  if jsonb_typeof(p_data->'ids') is distinct from 'array' then
   raise exception 'campaign_manual_invalid_ids' using errcode='22023';
  end if;
  if jsonb_array_length(p_data->'ids')>50 then
   raise exception 'campaign_manual_invalid_ids' using errcode='22023';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',o.campaign_id,
    'deleted',o.deleted_at is not null,'can_delete',o.owner_id=actor and o.deleted_at is null
      and c.structured_review_only is not true and not c.push_requested and not c.popup_enabled
      and not exists(select 1 from neo_private.campaign_central_groups g where g.campaign_id=c.id)
      and not exists(select 1 from neo_private.campaign_editor_versions v where v.campaign_id=c.id)))
   from neo_private.campaign_manual_ownership o join neo_private.campaigns c on c.id=o.campaign_id
   where o.campaign_id in (select value::uuid from jsonb_array_elements_text(p_data->'ids'))
   and (o.owner_id=actor or o.deleted_at is not null)),'[]'::jsonb);
 end if;
 if p_action='delete_legacy' then
  if p_data->'confirmed' is distinct from 'true'::jsonb then
   raise exception 'campaign_manual_confirmation_required' using errcode='22023';
  end if;
  campaign_key:=(p_data->>'campaign_id')::uuid;
  perform 1 from neo_private.campaigns where id=campaign_key and whatsapp_enabled
   and structured_review_only is not true and not push_requested and not popup_enabled for update;
  if not found then raise exception 'campaign_manual_not_eligible' using errcode='42501';end if;
  perform 1 from neo_private.campaign_manual_ownership where campaign_id=campaign_key and owner_id=actor for update;
  if not found then raise exception 'campaign_manual_owner_required' using errcode='42501';end if;
  if exists(select 1 from neo_private.campaign_manual_ownership where campaign_id=campaign_key and deleted_at is not null) then
   return jsonb_build_object('deleted',true);
  end if;
  if exists(select 1 from neo_private.campaign_central_groups where campaign_id=campaign_key)
   or exists(select 1 from neo_private.campaign_editor_versions where campaign_id=campaign_key) then
   raise exception 'campaign_manual_use_central' using errcode='55000';
  end if;
  perform 1 from neo_private.campaign_wa_publications where campaign_id=campaign_key order by id for update;
  if exists(select 1 from neo_private.campaign_wa_publications where campaign_id=campaign_key
    and dispatch_state in ('waiting','leased','started','uncertain')) then
   raise exception 'campaign_manual_dispatch_unresolved' using errcode='55000';
  end if;
  update neo_private.campaign_wa_publications set status='cancelled',remind=false
   where campaign_id=campaign_key and dispatch_batch is null and status='pending';
  update neo_private.campaigns set status='archived',updated_at=now() where id=campaign_key;
  update neo_private.campaign_manual_ownership set deleted_at=now(),deleted_by=actor
   where campaign_id=campaign_key;
  return jsonb_build_object('deleted',true);
 end if;
$new$||anchor);
end;
$patch$;
commit;
