'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('dist/style.css','utf8');
const marker='/* Rodada 25/11: contadores NUMÉRICOS em azul-marinho no tema claro.';
test('indicadores numéricos do tema claro são padronizados em azul-marinho',()=>{
 const start=css.indexOf(marker);
 assert.notEqual(start,-1,'pacote de paleta precisa estar registrado');
 const tail=css.slice(start);
 for(const selector of [
  '.community-badge','.community-badge.has-news','.notification-count',
  '.nav-shop-count','.nav-community-count','.admin-signup-badge','.support-thread-meta b',
  '.tab-unread','.primary .tab-unread','.notification-toast-main > b'
 ]){
  assert.ok(tail.includes(selector),selector+' não coberto');
 }
 assert.match(tail,/\[data-theme=light\] :is\(/);
 assert.match(tail,/background:#142743/);
 assert.match(tail,/color:#fff/);
 assert.match(tail,/border:1px solid #223F63/);
 assert.match(tail,/box-shadow:0 0 0 2px #223F63/);
});
test('a alteração de badges não modifica status nem regras do tema escuro',()=>{
 const start=css.indexOf(marker);
 const added=css.slice(start);
 assert.ok(!added.includes('[data-theme=dark]'));
 for(const forbidden of ['.status-pill','.shop-deal-badge','.library-featured-badge','.agent-inbox-badge']){
  assert.ok(!added.includes(' '+forbidden+',')&&!added.includes('\n '+forbidden+','));
 }
 assert.ok(css.slice(0,start).includes('[data-theme=dark]'));
});


test('varredura dos contadores que aparecem na Comunidade, Grupos, Conversas, Atendimento e Loja',()=>{
 const app=fs.readFileSync('src/app.js','utf8');
 const community=fs.readFileSync('dist/community.js','utf8');
 const alerts=fs.readFileSync('dist/community-alerts.js','utf8');
 const support=fs.readFileSync('dist/support.js','utf8');
 const notification=fs.readFileSync('dist/notification-center.js','utf8');
 const tail=css.slice(css.indexOf(marker));
 const cases=[
  ['Comunidade na navegação',app,'.nav-community-count','nav-community-count'],
  ['Comunidade no cabeçalho',alerts,'.community-badge','community-badge'],
  ['Grupos e Conversas',community,'.tab-unread','tab-unread'],
  ['Atendimento com mensagens não lidas',support,'.support-thread-meta b','support-thread-meta'],
  ['Loja na navegação',notification,'.nav-shop-count','nav-shop-count'],
  ['Avisos que descem na tela',notification,'.notification-toast-main > b','notification-toast-main'],
  ['Novos cadastros no administrativo',app,'.admin-signup-badge','admin-signup-badge']
 ];
 for(const [name,source,selector,className] of cases){
  assert.ok(source.includes(className),name+': contador não existe mais no HTML');
  assert.ok(tail.includes(selector),name+': contador faltando na paleta clara');
 }
 assert.ok(alerts.includes('data-message-badge'),'Grupo e conversa devem receber contagem');
 assert.ok(community.includes("id==='feed'?'group':'direct'"),'Ambas as abas devem receber o estilo');
 assert.ok(tail.includes('.primary .tab-unread'),'Abas selecionadas não podem voltar ao dourado');
 assert.ok(tail.includes('.community-badge.has-news'),'Novas mensagens não podem voltar ao dourado');
});
