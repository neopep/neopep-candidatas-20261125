'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/cloud.js'),'utf8');
const built=fs.readFileSync(path.join(root,'dist/cloud.js'),'utf8');
const editor=fs.readFileSync(path.join(root,'dist/admin/campaign-editor.js'),'utf8');
const admin=fs.readFileSync(path.join(root,'dist/admin/index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');

test('rich WhatsApp API exists in the source of truth AND in the esbuild artifact',()=>{
 for(const [name,body] of [['source',source],['esbuild output',built]]){
  assert.match(body,/async campaignRich\(/,name+' missing campaignRich');
  assert.match(body,/async campaignMediaUpload\(/,name+' missing campaignMediaUpload');
  assert.match(body,/neo_campaign_rich_admin_v1/,name+' missing RPC');
  assert.match(body,/neo-campaign-images/,name+' missing private storage bucket');
 }
});

test('upload always stays on the authenticated actor in the TESTE JPEG bucket',()=>{
 assert.match(source,/path\.split\('\/'\)\[0\]!==owner/);
 assert.match(source,/jpeg\.type!=='image\/jpeg'/);
 assert.match(source,/jpeg\.size>1048576/);
 assert.match(source,/upsert:false/);
 assert.match(editor,/block\.media_path=stored/);
 assert.match(editor,/typeof cloud\.campaignMediaUpload==='function'/);
 assert.match(editor,/typeof cloud\.uploadCampaignImage==='function'/);
});

test('iPhone PWA and admin load the current cache-busted SDK',()=>{
 assert.match(app,/cloud\.js\?v=20261125mediahotfix1/);
 assert.match(admin,/cloud\.js\?v=20261125mediahotfix1/);
 assert.match(admin,/campaign-editor\.js\?v=campanhas-capas-2/);
});
