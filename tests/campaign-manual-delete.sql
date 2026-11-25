do $test$
declare
 owner constant uuid:='00000000-0000-0000-0000-000000000001';
 other constant uuid:='00000000-0000-0000-0000-000000000002';
 campaign uuid:=gen_random_uuid();
 group_key uuid:=gen_random_uuid();
 pending uuid:=gen_random_uuid();
 completed uuid:=gen_random_uuid();
 args jsonb:=jsonb_build_object('campaign_id',campaign,'confirmed',true);
begin
 perform set_config('request.jwt.claims','{"iss":"https://cpslafpzjtbpmoxxysaa.supabase.co/auth/v1"}',true);
 perform set_config('request.jwt.claim.sub',owner::text,true);
 insert into neo_private.campaigns(id,title,whatsapp_enabled,popup_enabled) values(campaign,'Manual',true,false);
 insert into neo_private.campaign_wa_groups(id,name) values(group_key,'Grupo sintético');
 insert into neo_private.campaign_wa_publications(id,campaign_id,group_id,status,remind)
  values(pending,campaign,group_key,'pending',true),(completed,campaign,group_key,'done',false);
 begin
  perform public.neo_campaign_central_v1('delete_legacy',args);
  raise exception 'unverified ownership accepted';
 exception when insufficient_privilege then null;end;
 insert into neo_private.campaign_manual_ownership(campaign_id,owner_id,evidence_ref,verified_by)
  values(campaign,owner,'Fixture audit',other);
 assert public.neo_campaign_central_v1('legacy_states',jsonb_build_object('ids',jsonb_build_array(campaign)))
  @> '[{"can_delete":true}]'::jsonb;
 perform set_config('request.jwt.claim.sub',other::text,true);
 begin
  perform public.neo_campaign_central_v1('delete_legacy',args);
  raise exception 'another administrator deleted the campaign';
 exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',owner::text,true);
 begin
  perform public.neo_campaign_central_v1('delete_legacy',args-'confirmed');
  raise exception 'confirmation missing';
 exception when invalid_parameter_value then null;end;
 update neo_private.campaign_wa_publications set dispatch_state='started' where id=pending;
 begin
  perform public.neo_campaign_central_v1('delete_legacy',args);
  raise exception 'in-flight dispatch was ignored';
 exception when object_not_in_prerequisite_state then null;end;
 update neo_private.campaign_wa_publications set dispatch_state=null where id=pending;
 assert public.neo_campaign_central_v1('delete_legacy',args)='{"deleted":true}'::jsonb;
 assert public.neo_campaign_central_v1('delete_legacy',args)='{"deleted":true}'::jsonb;
 assert (select status='cancelled' and not remind from neo_private.campaign_wa_publications where id=pending);
 assert (select status='done' from neo_private.campaign_wa_publications where id=completed);
 assert (select deleted_by=owner from neo_private.campaign_manual_ownership where campaign_id=campaign);
 begin
  insert into neo_private.campaign_wa_publications(campaign_id,group_id) values(campaign,group_key);
  raise exception 'deleted campaign accepted a new publication';
 exception when object_not_in_prerequisite_state then null;end;
 assert not has_table_privilege('authenticated','neo_private.campaign_manual_ownership','insert');
 assert not has_table_privilege('service_role','neo_private.campaign_manual_ownership','insert');
end;
$test$;
