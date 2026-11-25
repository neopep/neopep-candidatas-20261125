/* Cache limité à l'interface statique : aucune API, photo ou session. */
const CACHE='neopeptideos-shell-20261125-capas-campanhas';
const ASSETS=['./','index.html','style.css','appearance.js','core.js','cloud.js','captcha.js','push.js','community-alerts.js','notification-center.js','shop-core.js','shop-promotions.js','shop.js','support.js','media-links.js','pdf-reader.js','library-video.js','library-files.js','library-shelf.js','vendor/pdfjs/pdf.mjs','vendor/pdfjs/pdf.worker.mjs','community.js','library.js','gestures.js','arrival.js','install.js','app.js','admin/agent.js','admin/campaign-editor.js','admin/campaign-central.js','config.js','manifest.webmanifest','assets/background.svg','assets/background-gold.svg','assets/brands/mercadopago.svg','assets/photo-example-1.png','assets/photo-example-2.png','assets/logo-neopep.png','assets/favicon-32.png','assets/icon-maskable-512.png','assets/icon-192.png','assets/icon-512.png','assets/apple-touch-icon.png'];
const urls=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',e=>e.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const playerShellAssets=ASSETS.filter(asset=>asset==='./'||asset==='appearance.js'||asset==='library-video.js'||asset==='library-files.js');
 async function preload(asset){
  const url=new URL(asset,self.registration.scope);
  const response=await fetch(new Request(url,{cache:'reload'}));
  if(!response.ok||response.redirected)throw Error('Shell asset unavailable: '+asset);
  await cache.put(url,response);
 }
 // Do not activate a shell with an incomplete player/reader pair.
 await Promise.all(playerShellAssets.map(preload));
 await Promise.allSettled(ASSETS.filter(asset=>!playerShellAssets.includes(asset)).map(preload));
 await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('neopeptideos-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin||u.search||!urls.has(u.href))return;e.respondWith((async()=>{try{const response=await fetch(r);if(response.ok&&!response.redirected){const cache=await caches.open(CACHE);await cache.put(r,response.clone())}return response}catch{const cached=await (await caches.open(CACHE)).match(r);return cached||new Response('Sem conexão. Abra o app online primeiro.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})}})())});

const privatePushMessages={
 reminder:'Abra o aplicativo para consultar seus lembretes.',
 support:'Você tem uma nova mensagem privada.',
 community:'Há uma nova postagem na comunidade.',
 library:'Há um novo material disponível na Biblioteca.',
 campaign:'Confira as novidades no NeoPep.',
 shop:'Seu pedido recebeu uma atualização.'
};
self.addEventListener('push',event=>{
 let tag='neo-reminder',kind='reminder',title='NeoPep',body;
 try{
  const data=event.data?.json();
  if(/^[a-f0-9-]{36}$/.test(data?.tag))tag=data.tag;
  if(['community','support','library','shop','campaign'].includes(data?.kind))kind=data.kind;
  // Private conversation previews are shown only on devices that subscribed
  // to notifications. The server sends only messages authorized for this user.
  if(kind==='support'){
   if(typeof data?.title==='string'&&data.title.trim())title=data.title.trim().slice(0,100);
   if(typeof data?.body==='string'&&data.body.trim())body=data.body.trim().slice(0,160);
  }
 }catch{}
 event.waitUntil(self.registration.showNotification(title,{
  body:body||privatePushMessages[kind],tag,
  icon:new URL('assets/icon-192.png',self.registration.scope).href,
  badge:new URL('assets/icon-192.png',self.registration.scope).href,data:{target:kind}
 }));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const scope=new URL(self.registration.scope),target=event.notification.data?.target||'reminder',community=['community','support','library'].includes(target),shop=target==='shop';for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true})){const url=new URL(client.url);if(url.origin===scope.origin&&url.pathname.startsWith(scope.pathname)){await client.focus();if(target==='campaign')client.postMessage({type:'NEO_OPEN_CAMPAIGNS'});else if(shop)client.postMessage({type:'NEO_OPEN_SHOP_ORDERS'});else client.postMessage({type:community?'NEO_OPEN_COMMUNITY':'NEO_OPEN_REMINDERS',direct:target==='support',library:target==='library'});return}}await self.clients.openWindow(new URL(target==='campaign'?'#inicio':shop?'#loja':target==='support'?'?conversa=1#comunidade':community?'#comunidade':'#lembretes',scope).href)})())});
