const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');

test('central adota revisões, salva publicações separadas e protege os agendamentos',async()=>{
 const db=new PGlite();
 const apply=path=>db.exec(fs.readFileSync(path,'utf8'));
 try{
  const fixture=fs.readFileSync('tests/shop.test.cjs','utf8').match(/db\.exec\(`(create role service_role;[^\x60]+)`\)/)[1];
  await db.exec(fixture+`create function auth.jwt() returns jsonb language sql stable as $$
   select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;`);
  for(const file of fs.readdirSync('supabase/migrations').sort())await apply('supabase/migrations/'+file);
  await apply('tests/fixtures/connect/whatsapp-grupos.sql');
  for(const path of [
   'campaign-editor/20261124233000_campaign_editor_versions.sql',
   'campaign-dispatch/20261124234500_campaign_dispatch.sql',
   'campaign-wa-homologation/20261125023000_campaign_wa_homologation.sql',
   ...fs.readdirSync('release/campaign-rich').filter(file=>file.endsWith('.sql')).sort().map(file=>'campaign-rich/'+file)
  ])await apply('release/'+path);
  await apply('tests/campaign-central-seed.sql');
  await apply('release/campaign-central/preflight.sql');
  await apply('release/campaign-central/20261125143000_campaign_central.sql');
  await apply('release/pacote-final-20261125/20261125210000_campaign_delete.sql');
  await apply('release/pacote-final-20261125/20261125211000_campaign_weekly.sql');
  await apply('release/pacote-final-20261125/auditoria-final-preflight.sql');
  await apply('release/pacote-final-20261125/20261125222000_campaign_publication_delete.sql');
  await apply('release/pacote-final-20261125/20261125223000_campaign_recurrence_times.sql');
  await apply('release/pacote-final-20261125/20261125224000_campaign_manual_delete.sql');
  await apply('release/pacote-final-20261125/auditoria-final-postflight.sql');
  await apply('tests/campaign-central.sql');
  await apply('tests/campaign-manual-delete.sql');
  await apply('release/campaign-central/postflight.sql');
  await apply('release/campaign-central/rollback.sql');
  const {rows}=await db.query(`select not has_function_privilege('authenticated','public.neo_campaign_central_v1(text,jsonb)','execute') as revoked,
   (select count(*)::int from neo_private.campaign_wa_rich_batches)=3 as preserved`);
  assert.deepEqual(rows,[{revoked:true,preserved:true}]);
 }catch(error){delete error.query;throw error;}
 finally{await db.close();}
});


test('pacote UX: orientacao da seringa e rastreamento opt-in por frasco',()=>{
 const app=fs.readFileSync('dist/app.js','utf8');
 const styles=fs.readFileSync('dist/style.css','utf8');
 assert.match(app,/Para volumes pequenos, uma seringa de menor capacidade/);
 assert.match(app,/function calcVialDosePicker/);
 assert.match(app,/function assignCalcVialDose/);
 assert.match(app,/vialMassUsed\(vial,stored\.links\)/);
 assert.match(app,/Math\.floor\(\(remaining\+1e-10\)\/dose\)/);
 assert.match(app,/if\(formKind==='dose'&&f\.has\('vialId'\)\)/);
 assert.match(app,/vinculada a um frasco físico/);
 assert.match(styles,/\.calc-tracked-vial/);
});
test('pacote UX: autorizar notificacoes apenas com escolha explicita e registrar push',()=>{
 const app=fs.readFileSync('dist/app.js','utf8');
 assert.match(app,/data-privacy-select-none/);
 assert.match(app,/Revise as opções/);
 assert.match(app,/initial\?'OK'/);
 assert.match(app,/name="skip" class="text-btn full" disabled>Agora não/);
 assert.match(app,/const nativeNotice=wantsCampaigns\?Promise\.resolve\(window\.NeoPush\?\.enable\?\.\(\)\)/);
 assert.match(app,/if\(!current\(\)\|\|saving\|\|fields\.disabled\)return/);
 assert.match(app,/Dispositivo atual:/);
});
test('pacote UX: player neutro e links completos para referencias, sem enviar na simulacao',()=>{
 const styles=fs.readFileSync('dist/style.css','utf8');
 const editor=fs.readFileSync('dist/admin/campaign-editor.js','utf8');
 assert.match(styles,/\.library-video-shell\{--video-gold:#edf0f2\}/);
 assert.match(styles,/\[data-theme=light\] \.privacy-option input::after/);
 assert.match(editor,/new URL\('\/\?material='\+encodeURIComponent\(block\.ref\)\+'#comunidade',location\.origin\)\.href/);
 assert.match(editor,/Ver prévia \(sem enviar\)/);
 assert.match(editor,/A prévia não envia mensagens/);
});
