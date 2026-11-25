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
  await db.exec(fs.readFileSync('tests/campaign-manual-delete.sql','utf8').replaceAll('cpslafpzjtbpmoxxysaa','qnuluspqfazdppciermw'));
  await apply('release/campaign-central/postflight.sql');
  await apply('release/campaign-central/rollback.sql');
  const {rows}=await db.query(`select not has_function_privilege('authenticated','public.neo_campaign_central_v1(text,jsonb)','execute') as revoked,
   (select count(*)::int from neo_private.campaign_wa_rich_batches)=3 as preserved`);
  assert.deepEqual(rows,[{revoked:true,preserved:true}]);
 }catch(error){delete error.query;throw error;}
 finally{await db.close();}
});

test('selecao de grupos no editor oficial aceita a allowlist multigrupos no iPhone',()=>{
 const vm=require('node:vm');
 const source=fs.readFileSync('dist/admin/campaign-editor.js','utf8');
 const declaration=source.match(/const groupSelectable=id=>([^;\n]+);/);
 assert.ok(declaration,'helper de selecao de grupos precisa existir');
 const choose=(id,{testWA,officialWA,destinations=[],pinned=null})=>
  vm.runInNewContext('(id)=>'+declaration[1],{
   testWA,officialWA,officialDestinations:()=>destinations,
   authorizedDestination:()=>pinned
  })(id);
 const first='12345678-1234-1234-1234-123456789012:111@g.us';
 const second='12345678-1234-1234-1234-123456789012:222@g.us';
 const unknown='12345678-1234-1234-1234-123456789012:333@g.us';
 for(const id of [first,second])assert.equal(choose(id,{testWA:true,officialWA:true,destinations:[first,second]}),true);
 assert.equal(choose(unknown,{testWA:true,officialWA:true,destinations:[first,second]}),false);
 assert.equal(choose(first,{testWA:true,officialWA:true,destinations:[]}),false);
 assert.equal(choose(second,{testWA:true,officialWA:false,pinned:first}),false);
 assert.equal(choose(first,{testWA:true,officialWA:false,pinned:first}),true);
 assert.equal(choose(unknown,{testWA:false,officialWA:false}),true);
 assert.match(source,/groupSelectable\(row\.id\)/,'checkbox e autorizacao devem coincidir');
 assert.match(source,/else if\(groupSelectable\(id\)&&groups\.some/,'clique deve usar mesma allowlist');
});

test('central atualiza recibo aceito sem reconstruir os controles de agenda',()=>{
 const editor=fs.readFileSync('dist/admin/campaign-central.js','utf8');
 assert.match(editor,/async function refreshVisibleStatus\(force=false\)/);
 assert.match(editor,/await cloud\.campaignCentral\('get',\{campaign_id:campaignId\}\)/);
 assert.match(editor,/if\(badge\)badge\.textContent=status\(pub\)/);
 assert.match(editor,/scheduleStatusPoll\(\)/);
 assert.match(editor,/action==='refresh_status'/);
 assert.match(editor,/document\.visibilityState==='hidden'/);
 assert.match(editor,/if\(!pub\.batches\[0\]\?\.states\?\.includes\('waiting'\)\)/);
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
