const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../dist/core.js');
const {PGlite}=require('@electric-sql/pglite');
const {render}=require('../release/production/ciclo-20261125/render-campaigns.cjs');

test('Central oficial preserva propriedade, isolamento, idempotência e cancelamento',async()=>{
 const db=new PGlite();
 const apply=path=>db.exec(fs.readFileSync(path,'utf8'));
 try{
  const fixture=fs.readFileSync('tests/shop.test.cjs','utf8').match(/db\.exec\(`(create role service_role;[^\x60]+)`\)/)[1];
  await db.exec(fixture+`create function auth.jwt() returns jsonb language sql stable as $$
   select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;`);
  for(const file of fs.readdirSync('supabase/migrations').sort())await apply('supabase/migrations/'+file);
  await apply('tests/fixtures/connect/whatsapp-grupos.sql');
  await apply('release/campaign-editor/20261124233000_campaign_editor_versions.sql');
  await apply('tests/campaign-central-seed.sql');
  const sql=render();
  assert.doesNotMatch(sql,/qnuluspqfazdppciermw|teste\.app\.neopep\.com\.br|campaign_wa_test_config/);
  await db.exec(sql);
  assert.deepEqual((await db.query(`select enabled, owner_id from neo_private.campaign_wa_official_config`)).rows,
   [{enabled:false,owner_id:null}]);
  const cases=fs.readFileSync('tests/campaign-central.sql','utf8')
   .replaceAll('qnuluspqfazdppciermw','cpslafpzjtbpmoxxysaa')
   .replaceAll('campaign_wa_test_config','campaign_wa_official_config');
  await apply('release/pacote-final-20261125/20261125210000_campaign_delete.sql');
  await apply('release/pacote-final-20261125/20261125210500_campaign_reference_jpeg.sql');
  await apply('release/pacote-final-20261125/20261125211000_campaign_weekly.sql');
  await apply('release/pacote-final-20261125/20261125222000_campaign_publication_delete.sql');
  await apply('release/pacote-final-20261125/20261125223000_campaign_recurrence_times.sql');
  await apply('release/pacote-final-20261125/20261125224000_campaign_manual_delete.sql');
  await db.exec('alter table storage.objects add column metadata jsonb');
  await db.exec(cases.replace(" desired text;"," desired text; fixture_series uuid; series_rule jsonb; result jsonb; jpeg_material uuid:=gen_random_uuid(); jpeg_publication uuid:=gen_random_uuid(); cover text;").replace(" perform public.neo_campaign_central_v1('archive',parent);",`
   fixture_series:=gen_random_uuid();
   series_rule:=parent||jsonb_build_object('publication_id',publication,'request_id',fixture_series,
    'confirmed',true,'source_revision',1,'start',(now() at time zone 'America/Sao_Paulo')::date+7,
    'end',(now() at time zone 'America/Sao_Paulo')::date+15,
    'time','10:00','count',2,
    'days',jsonb_build_array(extract(dow from (now() at time zone 'America/Sao_Paulo')::date+7)::int),
    'dates',jsonb_build_array(to_char((now() at time zone 'America/Sao_Paulo')::date+7,'YYYY-MM-DD')||'T10:00',
                             to_char((now() at time zone 'America/Sao_Paulo')::date+14,'YYYY-MM-DD')||'T10:00'));
   assert jsonb_array_length(public.neo_campaign_weekly_v1('schedule',series_rule)->'dates')=2;
   assert public.neo_campaign_weekly_v1('schedule',series_rule)->'reused'='true'::jsonb;
   perform public.neo_campaign_weekly_v1('pause',parent||jsonb_build_object('request_id',fixture_series,'confirmed',true));
   assert (select count(*) from neo_private.campaign_wa_rich_messages m join neo_private.campaign_weekly_occurrences o on o.batch_id=m.batch_id where o.series_id=fixture_series and m.state='cancelled')=2;
   insert into public.neo_consents(user_id,purpose,granted) values(actor::uuid,'terms',true) on conflict do nothing;
   perform public.neo_complete_onboarding('${JSON.stringify({...core.defaultProfile(),name:'Teste',height:174,initialWeight:80,goal:75,consent:true})}'::jsonb,'${JSON.stringify(core.blank().settings)}'::jsonb,true,true);
   insert into neo_private.community_materials(id,title,body) values(jpeg_material,'PDF sintético','Documento de teste');
   insert into neo_private.library_uploads(path,user_id,material_id,name,mime,size)
    values(actor||'/biblioteca.pdf',actor::uuid,jpeg_material,'Teste.pdf','application/pdf',100);
   cover:=actor||'/'||gen_random_uuid()||'.jpg';
   insert into storage.objects(id,name,bucket_id,metadata) values(gen_random_uuid(),cover,'neo-campaign-images','{"size":100,"mimetype":"image/jpeg"}');
   perform public.neo_campaign_central_v1('save',parent||jsonb_build_object('publication_id',jpeg_publication,'request_id',gen_random_uuid(),'revision',0,
    'draft',jsonb_build_object('title','Capa sintética','blocks',jsonb_build_array(jsonb_build_object('type','document',
     'id',gen_random_uuid(),'ref',jpeg_material,'text','Legenda da capa','media_path',cover)),
      'groups',jsonb_build_array(connection::text||':1@g.us'),'timezone','America/Sao_Paulo','audience','all','planned_local','')));
   result:=public.neo_campaign_central_v1('publish',parent||jsonb_build_object('publication_id',jpeg_publication,'request_id',gen_random_uuid(),'revision',1,'confirmed',true));
   assert exists(select 1 from neo_private.campaign_wa_rich_messages m where m.batch_id=(result->>'batch_id')::uuid
    and m.kind='image' and m.media_bucket='neo-campaign-images' and m.media_path=cover
    and m.body like '%Legenda da capa%' and m.body like '%https://app.neopep.com.br/?material='||jpeg_material||'#comunidade');
   fixture_series:=gen_random_uuid();
   series_rule:=(series_rule-'days'-'time')||jsonb_build_object('request_id',fixture_series,'frequency','daily',
    'times',jsonb_build_array('18:30','09:00'),
    'dates',jsonb_build_array(to_char((now() at time zone 'America/Sao_Paulo')::date+7,'YYYY-MM-DD')||'T09:00',
                             to_char((now() at time zone 'America/Sao_Paulo')::date+7,'YYYY-MM-DD')||'T18:30'));
   begin
    perform public.neo_campaign_weekly_v1('schedule',series_rule||'{"times":["09:00","09:00"]}'::jsonb);
    raise exception 'duplicate times were accepted';
   exception when invalid_parameter_value then null;end;
   assert public.neo_campaign_weekly_v1('schedule',series_rule)->'dates'=series_rule->'dates';
   assert public.neo_campaign_weekly_v1('schedule',series_rule)->'reused'='true'::jsonb;
   begin
    perform public.neo_campaign_weekly_v1('schedule',series_rule||jsonb_build_object('request_id',gen_random_uuid()));
    raise exception 'same source and time scheduled twice';
   exception when object_not_in_prerequisite_state then null;end;
   perform public.neo_campaign_weekly_v1('cancel',parent||jsonb_build_object('request_id',fixture_series,'confirmed',true));
   begin
    perform public.neo_campaign_central_v1('delete_publication',parent||jsonb_build_object('publication_id',jpeg_publication));
    raise exception 'delete without confirmation was accepted';
   exception when invalid_parameter_value then null;end;
   perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
   begin
    perform public.neo_campaign_central_v1('delete_publication',parent||jsonb_build_object('publication_id',jpeg_publication,'confirmed',true));
    raise exception 'another account deleted a publication';
   exception when insufficient_privilege then null;end;
   perform set_config('request.jwt.claim.sub',actor,true);
   update neo_private.campaign_wa_rich_messages set state='started' where batch_id=(result->>'batch_id')::uuid;
   begin
    perform public.neo_campaign_central_v1('delete_publication',parent||jsonb_build_object('publication_id',jpeg_publication,'confirmed',true));
    raise exception 'started dispatch cancelled';
   exception when object_not_in_prerequisite_state then null;end;
   update neo_private.campaign_wa_rich_messages set state='leased' where batch_id=(result->>'batch_id')::uuid;
   perform public.neo_campaign_central_v1('delete_publication',parent||jsonb_build_object('publication_id',jpeg_publication,'confirmed',true));
   perform public.neo_campaign_central_v1('delete_publication',parent||jsonb_build_object('publication_id',jpeg_publication,'confirmed',true));
   assert (select count(*) from neo_private.campaign_central_events where publication_id=jpeg_publication and event='publication_deleted')=1;
   assert public.neo_campaign_central_v1('get',parent)->'publications' @> jsonb_build_array(jsonb_build_object('id',jpeg_publication));
   assert (select deleted_at from neo_private.campaign_central_publications where id=jpeg_publication) is not null;
   assert (select state from neo_private.campaign_wa_rich_messages where batch_id=(result->>'batch_id')::uuid)='cancelled';
   update neo_private.campaign_wa_rich_messages set state='waiting' where batch_id=scheduled_ids[1];
   begin
    perform public.neo_campaign_central_v1('delete',parent);
    raise exception 'delete without confirmation accepted';
   exception when invalid_parameter_value then null; end;
   perform public.neo_campaign_central_v1('delete',parent||'{"confirmed":true}'::jsonb);
   perform public.neo_campaign_central_v1('delete',parent||'{"confirmed":true}'::jsonb);
   assert not (public.neo_campaign_central_v1('list','{}') @> jsonb_build_array(parent));
   assert (select count(*) from neo_private.campaign_wa_rich_messages where state='accepted' and receipt_id='simulated')=1;
   assert (select count(*) from neo_private.campaign_wa_rich_messages where state='waiting')=0;
  `));
  await apply('tests/campaign-manual-delete.sql');
  await apply('release/campaign-central/postflight.sql');
  await apply('release/campaign-central/rollback.sql');
  const {rows}=await db.query(`select not has_function_privilege('authenticated','public.neo_campaign_central_v1(text,jsonb)','execute') as revoked,
   (select count(*)::int from neo_private.campaign_wa_rich_batches)=8 as preserved`);
  assert.deepEqual(rows,[{revoked:true,preserved:true}]);
 }catch(error){delete error.query;throw error;}
 finally{await db.close();}
});
