window.NeoShop=(()=>{
 const C=window.NeoShopCore,e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const bag='<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10 15h28l3 28H7l3-28Z"/><path d="M17 17V12a7 7 0 0 1 14 0v5"/></svg>';
 const statusNames={awaiting_payment:'Aguardando pagamento',pending:'Pagamento em análise',paid:'Pagamento aprovado',test_paid:'Teste aprovado · sem cobrança real',paid_review:'Pagamento em conferência pela loja',expired:'Pedido expirado',rejected:'Pagamento não aprovado',cancelled:'Pagamento cancelado',refunded:'Pagamento reembolsado',charged_back:'Pagamento contestado'};
 let context={},owner='',generation=0,data=null,busy=false,error='',mode='catalog',selected=null,search='',category='',sort='recent',cart=[],quote=null,orders=[],orderID=null,requestKey='',address={},savedAddresses=[],addressError='',addressEditing=false,product={},productImages=[],photoIndex=0,mediaBusy=false,mediaVersion=0,lastLoad=0,searchTimer,cepTimer,cepRequest=0,paymentReturned=false,paymentReturnOrder='',orderFilter='all',orderSearch='';
 let homeProducts=[],homeLast=0,homeBusy=false,homeIndex=0,homePaused=false,homeRequest=0,pendingProduct=null;const photoCache=new Map();
 let visibilityUnsubscribe,visibilityEpoch=0,visibilityTimer=0,visibilityPoll=0;
 const visibilityPanels=new WeakMap(),duplicateRequests=new Map();
 let visibilityDirty=false;
 const visibilityNames={public:'Visível para todos',blocklist:'Bloquear membros específicos',allowlist:'Ocultar para todos, exceto'};
 const rpc=(action,payload={})=>window.NeoCloud.shop(action,payload);
 function clearPhoto(){mediaVersion++;mediaBusy=false;for(const image of productImages)if(image.local)URL.revokeObjectURL(image.url);productImages=[]}
 const photoPaths=p=>[...new Set((p.photo_paths?.length?p.photo_paths:p.photo_path?[p.photo_path]:[]).filter(x=>typeof x==='string'&&x))];
 async function hydratePhotos(p,all=false){const paths=photoPaths(p),token=generation;const photos=await Promise.all(paths.slice(0,all?6:1).map(async path=>{const cached=photoCache.get(path);if(cached&&cached.expires>Date.now())return {path,url:cached.url};try{const url=await window.NeoCloud.shopPhotoURL(path);if(token===generation)photoCache.set(path,{url,expires:Date.now()+120000});return {path,url}}catch{return {path,url:''}}}));if(token!==generation)return;p.photos=photos;p.photo_url=photos[0]?.url||'';}
 const trash='<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7m4-7v7"/></svg>';
 function session(user){window.NeoShopPromotions?.session(user);const key=user?.id||'';if(key===owner)return;visibilityUnsubscribe?.();visibilityUnsubscribe=null;clearTimeout(visibilityTimer);if(visibilityPoll)clearInterval(visibilityPoll);visibilityPoll=0;visibilityTimer=0;owner=key;generation++;data=null;homeProducts=[];homeLast=0;homeBusy=false;homeIndex=0;pendingProduct=null;homeRequest++;busy=false;error='';mode='catalog';selected=null;search='';category='';cart=[];quote=null;orders=[];orderFilter='all';orderSearch='';orderID=null;requestKey='';address={};savedAddresses=[];addressError='';addressEditing=false;product={};clearPhoto();photoCache.clear();duplicateRequests.clear();costRetries.clear();lastLoad=0;
  if(owner&&window.NeoCloud.watchShopVisibility){
   const token=generation;
   let revision=null,reading=false;
   const poll=async()=>{
    if(reading||document.visibilityState==='hidden'||!document.querySelector('[data-shop-root],[data-shop-home]'))return;
    reading=true;
    try{
     const next=await window.NeoCloud.shopVisibilityRevision();
     if(token===generation&&next!==revision){revision=next;refreshVisibility(true);}
    }catch{}finally{reading=false;}
   };
   const fallback=()=>{
    if(!visibilityPoll&&window.NeoCloud.shopVisibilityRevision)visibilityPoll=setInterval(poll,15000);
   };
   try{visibilityUnsubscribe=window.NeoCloud.watchShopVisibility(()=>refreshVisibility(true),status=>{
    if(token!==generation)return;
    if(status==='SUBSCRIBED'){
     if(visibilityPoll)clearInterval(visibilityPoll);visibilityPoll=0;
     if(data||homeLast)refreshVisibility(false);
    }else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status))fallback();
   });}catch{fallback();}
  }
 }
 function refreshVisibility(changed){
  if(!owner||mode==='product'||mode==='bulk')return;
  if(context.admin){
   lastLoad=homeLast=0;
   if(document.querySelector('[data-shop-home]'))void loadHome(context);
   if(document.querySelector('[data-shop-root]')&&!busy)void load(true);
   return;
  }
  if(changed){
   visibilityEpoch++;homeRequest++;homeBusy=false;homeProducts=[];
   if(data){
    data={...data,products:[]};cart=[];quote=null;draw();
   }
   paintHome();
  }
  homeLast=lastLoad=0;
  if(document.querySelector('[data-shop-home]'))void loadHome(context);
  if(!document.querySelector('[data-shop-root]'))return;
  if(!busy){void load(true);return;}
  clearTimeout(visibilityTimer);
  visibilityTimer=setTimeout(()=>refreshVisibility(false),150);
 }
 window.addEventListener?.('focus',()=>refreshVisibility(false));

 function draw(){const root=document.querySelector('[data-shop-root]');if(root)root.outerHTML=view(context)}
 const button=(action,label,extra='',cls='secondary')=>`<button class="${cls}" data-shop="${action}" ${extra} ${busy?'disabled':''}>${label}</button>`;
 const field=(name,label,type='text',value='',extra='')=>`<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${extra}></label>`;
 const digits=(value,max=99)=>String(value||'').replace(/\D/g,'').slice(0,max);
 const formatCEP=value=>digits(value,8).replace(/(\d{5})(\d)/,'$1-$2');
 const formatCPF=value=>digits(value,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
 const formatCNPJ=value=>digits(value,14).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2');
 const formatPhone=value=>{const d=digits(value,11);return d.length>10?d.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3'):d.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3')};
 const countries=[['55','🇧🇷 Brasil +55'],['1','🇺🇸 EUA/Canadá +1'],['54','🇦🇷 Argentina +54'],['56','🇨🇱 Chile +56'],['57','🇨🇴 Colômbia +57'],['51','🇵🇪 Peru +51'],['598','🇺🇾 Uruguai +598'],['595','🇵🇾 Paraguai +595'],['591','🇧🇴 Bolívia +591'],['593','🇪🇨 Equador +593'],['58','🇻🇪 Venezuela +58'],['351','🇵🇹 Portugal +351'],['34','🇪🇸 Espanha +34'],['33','🇫🇷 França +33'],['39','🇮🇹 Itália +39'],['44','🇬🇧 Reino Unido +44'],['49','🇩🇪 Alemanha +49'],['41','🇨🇭 Suíça +41'],['353','🇮🇪 Irlanda +353'],['31','🇳🇱 Países Baixos +31'],['32','🇧🇪 Bélgica +32'],['81','🇯🇵 Japão +81'],['86','🇨🇳 China +86'],['61','🇦🇺 Austrália +61'],['64','🇳🇿 Nova Zelândia +64']];
 function phoneField(){return `<label>Celular com DDD<div class="shop-phone-field"><select name="phone_country" aria-label="País do telefone">${countries.map(([code,label])=>`<option value="${code}" ${(address.phone_country||'55')===code?'selected':''}>${label}</option>`).join('')}</select><input name="phone" type="tel" value="${e(formatPhone(address.phone||''))}" required maxlength="16" inputmode="tel" autocomplete="tel-national" placeholder="(11) 99999-9999"></div></label>`}
 const mp=()=>`<div class="shop-mp"><img src="assets/brands/mercadopago.svg" width="38" height="38" alt="Mercado Pago"><div><strong>Mercado Pago</strong><small>${data?.settings.payments_ready?'Pagamento no ambiente do provedor':'Integração de pagamento em preparação'}</small></div></div>`;
 function lines(){return cart.map(row=>({row,p:data?.products.find(p=>p.id===row.product_id)})).filter(x=>x.p)}
 const subtotal=()=>lines().reduce((sum,{row,p})=>sum+p.price_cents*row.quantity,0);
 const cartCount=()=>cart.reduce((n,r)=>n+r.quantity,0);
 const empty=(title,text)=>`<div class="empty">${bag}<strong>${e(title)}</strong><p>${e(text)}</p></div>`;
 function cartLines(compact=false){return lines().map(({row,p})=>`<div class="shop-cart-row"><div><strong>${e(p.name)}</strong><small>${C.money(p.price_cents)} · ${row.quantity} un.</small>${!compact?button('remove','Remover',`data-id="${e(p.id)}"`,'text-btn'):''}</div><div class="shop-quantity">${!compact?button('minus','−',`data-id="${e(p.id)}" aria-label="Diminuir quantidade de ${e(p.name)}"`):''}<b>${C.money(p.price_cents*row.quantity)}</b>${!compact?button('add','+',`data-id="${e(p.id)}" aria-label="Aumentar quantidade de ${e(p.name)}"`):''}</div></div>`).join('')}
 function discountDetails(q){return (q?.discounts||[]).map(d=>`<div class="shop-total shop-saving"><span>${e(d.name)}${d.code?' · '+e(d.code):''}</span><b>− ${C.money(d.amount_cents)}</b></div>`).join('');}
 function discountOptions(){if(!data?.promotions_ready)return '';return `<div class="shop-discount-options space"><h3>Descontos e cupom</h3><form data-shop-form="discount_options"><label>Forma de pagamento para calcular descontos<select name="payment_method">${[['any','Escolher no Mercado Pago'],['pix','Pix'],['credit_card','Cartão de crédito'],['boleto','Boleto']].map(([v,t])=>`<option value="${v}" ${(quote?.payment_method||data.payment_method||'any')===v?'selected':''}>${t}</option>`).join('')}</select></label><label>Cupom (opcional)<input name="coupon_code" value="${e(quote?.coupon_code??data.coupon_code??'')}" maxlength="32" autocapitalize="characters" autocomplete="off" placeholder="Digite seu cupom"></label><div class="shop-admin-actions space"><button class="secondary" ${busy?'disabled':''}>Aplicar</button>${quote?.coupon_code?button('clear_coupon','Remover cupom','type="button"','text-btn'):''}</div><p class="sub">O desconto acompanha a forma escolhida. A cobrança será feita no Mercado Pago.</p></form><p role="status">${e(quote?.coupon_message||'Promoções válidas são aplicadas automaticamente.')}</p></div>`;}
 function totals(){const settings=data.settings,shipping=quote?.shipping_cents??settings.shipping_cents,calculated=!!address?.state&&!!quote,shippingLabel=!settings.shipping_ready?'A configurar pela loja':!calculated?'A calcular':shipping===0?'Grátis':C.money(shipping),totalLabel=!settings.shipping_ready?'Disponível após configurar entrega':!calculated?'A calcular':C.money(quote.total_cents);return `<div class="shop-total"><span>Produtos</span><b>${C.money(quote?.subtotal_cents??subtotal())}</b></div>${discountDetails(quote)}${quote?.discount_cents>0?`<div class="shop-total shop-saving"><strong>Você economiza</strong><strong>${C.money(quote.discount_cents)}</strong></div>`:''}<div class="shop-total"><span>Entrega</span><b>${shippingLabel}</b></div><div class="shop-total shop-grand"><span>Total</span><b>${totalLabel}</b></div>`}
 function summary(editable=false){return `<aside class="card shop-summary"><h2>Seu carrinho <span class="tag">${cartCount()}</span></h2>${cartLines(!editable)}${totals()}${mp()}</aside>`}
 function catalogue(){let products=data.products.filter(p=>p.active&&p.shop_store_hidden!==true&&(p.name+' '+p.description).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))&&(!category||p.category===category));if(sort==='low')products.sort((a,b)=>a.price_cents-b.price_cents);if(sort==='high')products.sort((a,b)=>b.price_cents-a.price_cents);const categories=[...new Set(data.products.filter(p=>p.active&&p.shop_store_hidden!==true).map(p=>p.category))];return `<section class="card shop-hero"><div><span class="eyebrow">LOJA NEOPEP</span><h2>Encontre o que você procura.</h2>${homeSupport(context)}</div><span class="shop-hero-bag">${bag}</span></section><form data-shop-search class="shop-search"><label class="sr-only" for="shopQuery">Buscar produtos</label><input id="shopQuery" name="q" type="search" placeholder="O que você procura?" value="${e(search)}"><select name="sort" aria-label="Ordenar produtos"><option value="recent">Novidades</option><option value="low" ${sort==='low'?'selected':''}>Menor preço</option><option value="high" ${sort==='high'?'selected':''}>Maior preço</option></select></form><div class="shop-categories">${button('category','Todos',`data-category="" aria-pressed="${!category}"`)}${categories.map(c=>button('category',e(c),`data-category="${e(c)}" aria-pressed="${category===c}"`)).join('')}</div><div class="shop-market-layout"><div class="shop-products">${products.map(p=>`<article class="card shop-product"><button class="shop-product-visual" data-shop="detail" data-id="${e(p.id)}" aria-label="Ver ${e(p.name)}">${p.photo_url?`<img class="shop-product-image" src="${e(p.photo_url)}" alt="${e(p.name)}" width="400" height="400" loading="lazy">`:bag}</button><div class="shop-product-copy"><small>${e(p.category)}</small><h3>${e(p.name)}</h3><strong class="shop-price">${C.money(p.price_cents)}</strong><span class="sub">${p.stock>0?'Disponível em estoque':'Esgotado'}</span><div class="shop-product-actions">${button('buy','Comprar',`data-id="${e(p.id)}" ${p.stock<1?'disabled':''}`,'primary')}${button('add','＋ Carrinho',`data-id="${e(p.id)}" ${p.stock<1?'disabled':''}`)}</div></div></article>`).join('')||empty('Seu catálogo está começando.','Os produtos publicados pela loja aparecerão aqui.')}</div>${cart.length?`<div class="shop-mini-basket">${summary()}${button('cart','Ver carrinho completo','','primary full')}</div>`:''}</div>`}
 function detail(){const p=data.products.find(p=>p.id===selected&&p.active&&p.shop_store_hidden!==true);if(!p)return empty('Produto indisponível','Volte ao catálogo para consultar os produtos disponíveis.');const photos=p.photos?.length?p.photos:p.photo_url?[{url:p.photo_url}]:[],current=photos[photoIndex]||photos[0];return `${button('catalog','‹ Voltar aos produtos')}<section class="card shop-detail"><div><div class="shop-detail-photo">${current?.url?`<img src="${e(current.url)}" alt="${e(p.name)} — foto ${photoIndex+1}" width="600" height="600">`:bag}</div>${photos.length>1?`<div class="shop-gallery-thumbnails" aria-label="Fotos do produto">${photos.map((photo,index)=>button('gallery',photo.url?`<img src="${e(photo.url)}" alt="Foto ${index+1}" width="64" height="64">`:`${index+1}`,`data-index="${index}" aria-label="Ver foto ${index+1}" aria-pressed="${photoIndex===index}"`,'shop-gallery-thumb')).join('')}</div>`:''}</div><div><span class="tag">${e(p.category)}</span><h2>${e(p.name)}</h2><p class="shop-description">${e(p.description)}</p><strong class="shop-price">${C.money(p.price_cents)}</strong><p class="sub">${p.stock>0?'Produto disponível':'Produto esgotado'}</p><div class="space shop-product-actions">${button('buy','Comprar agora',`data-id="${e(p.id)}" ${p.stock<1?'disabled':''}`,'primary')}${button('add','Adicionar ao carrinho',`data-id="${e(p.id)}" ${p.stock<1?'disabled':''}`)}</div>${mp()}</div></section>`}
 function billingFields(){return `<h3 class="space">Dados de faturamento</h3><div class="shop-billing-fields"><label>Tipo de documento<select name="document_type" required><option value="CPF" ${address.document_type!=='CNPJ'?'selected':''}>CPF</option><option value="CNPJ" ${address.document_type==='CNPJ'?'selected':''}>CNPJ</option></select></label>${field('document_number',address.document_type==='CNPJ'?'CNPJ':'CPF','text',address.document_type==='CNPJ'?formatCNPJ(address.document_number||''):formatCPF(address.document_number||''),'required maxlength="18" inputmode="numeric" autocomplete="off"')}</div>`}
 const freshAddress=()=>({name:context.profileName||context.user?.user_metadata?.full_name||context.user?.user_metadata?.name||'',email:context.user?.email||'',document_type:'CPF',phone_country:'55',label:'Casa'});
 async function loadAddresses(){addressError='';try{savedAddresses=await window.NeoCloud.shopAddress('list');if(savedAddresses.length&&!address.id){address={...savedAddresses[0]};addressEditing=false}else if(!address.name){address={...freshAddress(),...address};addressEditing=true}}catch(err){savedAddresses=[];address={...freshAddress(),...address};addressEditing=true;if(!['PGRST202','42883'].includes(err.code))addressError='Os endereços salvos não puderam ser carregados. Você ainda pode preencher os dados abaixo.';}}
 function addressPicker(){if(!savedAddresses.length)return '';return `<div class="shop-saved-addresses"><div class="between"><h3>Endereço de entrega</h3>${button('new_address','＋ Adicionar outro','type="button"','secondary')}</div>${savedAddresses.map(a=>`<div class="shop-address-option ${address.id===a.id?'active':''}"><button type="button" class="shop-address-select" data-shop="select_address" data-id="${e(a.id)}"><strong>${e(a.label||'Casa')} ${a.is_default?'<span class="tag">Principal</span>':''}</strong><span>${e(a.street)}, ${e(a.number)} · ${e(a.city)}/${e(a.state)}</span></button><button type="button" class="icon-btn shop-address-edit" data-shop="edit_address" data-id="${e(a.id)}" aria-label="Editar ${e(a.label||'endereço')}">✎</button></div>`).join('')}</div>`}
 async function lookupCEP(value){const cep=digits(value,8),request=++cepRequest,status=document.querySelector('[data-cep-status]');if(cep.length!==8)return;if(status)status.textContent='Buscando endereço…';try{const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{headers:{Accept:'application/json'}});if(!response.ok)throw Error();const result=await response.json();if(request!==cepRequest)return;if(result.erro)throw Error('CEP não encontrado.');address={...address,postal_code:cep,street:result.logradouro||address.street||'',district:result.bairro||address.district||'',city:result.localidade||address.city||'',state:result.uf||address.state||'',complement:address.complement||result.complemento||''};for(const name of ['street','district','city','state','complement']){const input=document.querySelector(`[data-shop-form=address] [name=${name}]`);if(input)input.value=address[name]||'';}if(status)status.textContent='Endereço preenchido pelo CEP. Confira o número e o complemento.';document.querySelector('[data-shop-form=address] [name=number]')?.focus();}catch(err){if(request===cepRequest&&status)status.textContent=err.message||'Não foi possível consultar o CEP. Preencha o endereço manualmente.';}}
 function addressEditor(){return `<form data-shop-form="address" class="space"><label>Identificação do endereço<select name="label" required><option ${address.label==='Casa'?'selected':''}>Casa</option><option ${address.label==='Trabalho'?'selected':''}>Trabalho</option><option ${!['Casa','Trabalho'].includes(address.label)?'selected':''}>Outro</option></select></label>${field('name','Nome completo ou razão social','text',address.name||'', 'required maxlength="100" autocomplete="shipping name"')}${field('email','E-mail de contato','email',address.email||context.user?.email||'','required maxlength="254" autocomplete="email"')}<div class="form-grid shop-contact-grid">${phoneField()}${field('postal_code','CEP','text',formatCEP(address.postal_code||''),'required maxlength="9" inputmode="numeric" autocomplete="shipping postal-code" placeholder="00000-000"')}<p class="shop-cep-status" data-cep-status role="status"></p></div>${field('street','Rua ou avenida','text',address.street||'','required maxlength="150" autocomplete="shipping address-line1"')}<div class="form-grid">${field('number','Número','text',address.number||'','required maxlength="20"')}${field('complement','Complemento (opcional)','text',address.complement||'','maxlength="100" autocomplete="shipping address-line2"')}${field('district','Bairro','text',address.district||'','required maxlength="100"')}${field('city','Cidade','text',address.city||'','required maxlength="100" autocomplete="shipping address-level2"')}</div><label>Estado<select name="state" required autocomplete="shipping address-level1"><option value="">Selecione</option>${['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(s=>`<option value="${s}" ${address.state===s?'selected':''}>${s}</option>`).join('')}</select></label>${billingFields()}<label class="shop-accept"><input name="is_default" type="checkbox" ${address.is_default||!savedAddresses.length?'checked':''}> Usar como endereço principal</label><p class="notice error shop-address-error" data-address-error role="alert">${e(addressError)}</p><button class="primary full space">Salvar e continuar</button></form>`}
 function deliveryStep(){return `<h2>Onde você quer receber?</h2>${addressPicker()}${addressEditing||!savedAddresses.length?addressEditor():`${button('use_address','Usar este endereço','','primary full space')}`}`}
 function paymentStep(){const applied=quote?.coupon_code||quote?.discounts?.length?`<div class="shop-applied-discount"><strong>Desconto aplicado</strong>${quote.coupon_code?`<span>Cupom ${e(quote.coupon_code)}</span>`:''}${discountDetails(quote)}</div>`:'';return `<h2>Resumo da compra</h2>${applied}<div class="shop-address shop-payment-address"><div><strong>${e(address.label||'Endereço de entrega')}</strong><p>${e(address.name)}<br>${e(address.street)}, ${e(address.number)}${address.complement?' · '+e(address.complement):''}<br>${e(address.city)} / ${e(address.state)} · CEP ${e(formatCEP(address.postal_code))}</p></div>${button('address','Editar','type="button"','secondary')}</div><form data-shop-form="pay" class="shop-finalize"><input name="accept" type="hidden" value="on"><button class="primary full" ${!data.settings.payments_ready||!data.settings.shipping_ready?'disabled':''}>${data.settings.payments_ready?'Finalizar minha compra':'Pagamento indisponível'}</button></form>`}
 function checkout(){if(!cart.length&&!orderID)return empty('Seu carrinho está vazio','Escolha um produto para continuar.');const step=mode==='cart'?0:mode==='address'?1:2;return `<ol class="shop-steps">${['Carrinho','Entrega','Pagamento'].map((s,i)=>`<li class="${i===step?'active':''}"><button type="button" data-shop="${['cart','address','payment'][i]}" ${i===2&&step<2?'disabled':''}><b>${i+1}</b>${s}</button></li>`).join('')}</ol><div class="shop-checkout-layout"><section class="card">${mode==='cart'?`<h2>Confira seus produtos</h2>${cartLines()}${discountOptions()}${button('address','Continuar para entrega','','primary full space')}`:mode==='address'?`${deliveryStep()}`:`${paymentStep()}`}</section>${summary(mode==='address')}</div>`}
 function orderCards(manage=false){const returned=paymentReturned&&!manage?orders.find(o=>o.id===paymentReturnOrder):null,returnNotice=returned?`<div class="notice ${['paid','test_paid'].includes(returned.status)?'':'shop-payment-wait'}"><strong>${['paid','test_paid'].includes(returned.status)?'Pagamento confirmado':'Confirmando seu pagamento'}</strong><p>${['paid','test_paid'].includes(returned.status)?'Seu pedido foi atualizado com sucesso.':'A confirmação pode levar alguns instantes. Você pode fechar esta tela e voltar ao NeoPep instalado.'}</p>${button('refresh','Atualizar pedido','','secondary')}</div>`:'';return `${returnNotice}${button(manage?'manage':'catalog','‹ Voltar')}<div class="shop-orders-head"><h2>${manage?'Pedidos da loja':'Meus pedidos'}</h2>${manage?button('export_orders','Exportar pedidos','','secondary'):''}</div>${manage?orderDashboard()+`<label class="shop-order-search"><span class="sr-only">Buscar pedidos</span><input data-order-search type="search" value="${e(orderSearch)}" placeholder="Buscar por pedido, nome, CPF/CNPJ ou endereço"></label>`:''}${filteredOrders(manage).map(o=>`<article class="card shop-order"><div class="between"><div><strong>Pedido ${e(o.id.slice(0,8).toUpperCase())}</strong><small class="sub">${e(new Date(o.created_at).toLocaleString('pt-BR'))}</small></div><span class="tag shop-order-status status-${e(o.status)}">${o.environment==='test'?'TESTE · ':''}${e(statusNames[o.status]||o.status)}</span></div>${manage&&o.customer_email?`<p class="sub">Cliente: ${e(o.customer_email)}</p>`:''}${o.items.map(i=>`<div class="shop-total"><span>${e(i.name)} × ${i.quantity}</span><b>${C.money(i.unit_price_cents*i.quantity)}</b></div>`).join('')}${discountDetails(o)}<div class="shop-total shop-grand"><span>Total com entrega</span><b>${C.money(o.total_cents)}</b></div>${o.tracking?`<p class="shop-tracking"><strong>Rastreio:</strong> ${e(o.tracking)} ${o.tracking_url?`<a href="${e(o.tracking_url)}" target="_blank" rel="noopener">Acompanhar entrega</a>`:''}</p>`:''}<details><summary>Dados de entrega</summary><p>${e(o.address?.name||'')}<br>${e(o.address?.street||'')}, ${e(o.address?.number||'')} · ${e(o.address?.district||'')}<br>${e(o.address?.city||'')} / ${e(o.address?.state||'')} · ${e(formatCEP(o.address?.postal_code||''))}<br>${e(o.address?.phone||'')} · ${e(o.address?.email||'')}</p></details>${o.cancellation_status==='requested'?`<div class="notice error shop-cancellation"><strong>Cancelamento solicitado</strong><p>${e(o.cancellation_reason||'Solicitação do cliente.')}</p>${manage?`<label>Observação da loja<input data-cancel-note="${e(o.id)}" maxlength="500" placeholder="Informe a decisão ao cliente"></label><div class="shop-admin-actions">${button('cancel_approve','Aprovar',`data-id="${e(o.id)}"`,'primary')}${button('cancel_reject','Recusar',`data-id="${e(o.id)}"`,'secondary')}</div>`:''}</div>`:o.cancellation_status==='approved'?'<p class="notice">Cancelamento aprovado pela loja.</p>':o.cancellation_status==='rejected'?`<p class="notice">Cancelamento não aprovado. ${e(o.cancellation_note||'')}</p>`:''}${!manage&&['awaiting_payment','pending'].includes(o.status)?`<div class="shop-order-actions">${button('resume','Continuar pagamento',`data-id="${e(o.id)}"`,'primary')}${button('cancel_order','Cancelar pedido',`data-id="${e(o.id)}"`,'secondary')}</div>`:''}${!manage&&['paid','test_paid'].includes(o.status)&&o.fulfillment!=='delivered'&&o.cancellation_status==='none'?button('request_cancel','Solicitar cancelamento',`data-id="${e(o.id)}"`,'secondary space'):''}${manage&&['paid','test_paid','paid_review'].includes(o.status)?`<form data-shop-form="fulfill" data-id="${e(o.id)}" class="space"><label>Status do envio<select name="fulfillment">${[['processing','Em preparação'],['dispatched','Enviado'],['delivered','Entregue']].map(([id,label])=>`<option value="${id}" ${id===o.fulfillment?'selected':''}>${label}</option>`).join('')}</select></label>${field('tracking','Código de rastreamento','text',o.tracking||'','maxlength="150"')}${field('tracking_url','Link para acompanhar','url',o.tracking_url||'','maxlength="500" placeholder="https://..."')}<button class="secondary space">Salvar envio</button></form>`:''}</article>`).join('')||empty('Nenhum pedido por aqui','Seus pedidos aparecerão após iniciar uma compra.')}`}
 function orderStats(){const paid=orders.filter(o=>['paid','test_paid','paid_review'].includes(o.status)),processing=paid.filter(o=>o.fulfillment==='processing'),dispatched=paid.filter(o=>o.fulfillment==='dispatched'),delivered=paid.filter(o=>o.fulfillment==='delivered'),pending=orders.filter(o=>['awaiting_payment','pending'].includes(o.status)),cancel=orders.filter(o=>o.cancellation_status==='requested');return {total:orders.length,paid:paid.length,processing:processing.length,dispatched:dispatched.length,delivered:delivered.length,pending:pending.length,cancel:cancel.length}}
 function newOrderCount(){let seen='';try{seen=localStorage.getItem('neo-shop-orders-seen:'+owner)||''}catch{}return orders.filter(o=>!seen||o.created_at>seen).length}
 const financialStates={...statusNames,partially_refunded:'Reembolso parcial'};
 function reconciliationPanel(){
  return `<details data-shop-reconciliation>
   <summary>Conciliação e auditoria</summary>
   <form data-reconciliation-filter>
    <div class="form-grid">
     ${field('from','Eventos desde','date','','')}
     ${field('to','Eventos até','date','','')}
     ${field('order_id','ID completo do pedido','text','','maxlength="36"')}
     <label>Produto<select name="product_id"><option value="">Todos</option>${data.products.map(p=>`<option value="${e(p.id)}">${e(p.name)}</option>`).join('')}</select></label>
    </div>
    <button class="secondary" type="submit">Consultar auditoria</button>
   </form>
   <p class="sub" role="status" data-reconciliation-status></p>
   <div data-reconciliation-results></div>
   <button class="secondary" type="button" data-reconciliation-next hidden>Eventos anteriores</button>
   <form class="space" data-reconciliation-evidence hidden>
    <h3>Registrar total comprovado do pedido</h3>
    <p class="sub">Cada lançamento substitui o total vigente da mesma categoria no cálculo e preserva o anterior no histórico.</p>
    <div class="form-grid">
     <label>Tipo<select name="kind"><option value="fee">Taxa</option><option value="shipping_cost">Frete próprio</option><option value="tax">Imposto</option><option value="other">Outras despesas</option><option value="refund">Valor devolvido</option></select></label>
     ${field('amount','Total em BRL','text','','required inputmode="decimal" maxlength="16"')}
     ${field('effective_on','Data do comprovante','date','','required')}
     ${field('source_ref','Referência interna do comprovante','text','','required maxlength="160"')}
    </div>
    <button class="secondary" type="submit">Registrar comprovante</button>
   </form>
   <form class="space" data-reconciliation-return hidden>
    <h3>Confirmar devolução física</h3>
    <p class="sub">Use para itens recebidos de volta e aptos à venda. A confirmação soma unidades ao saldo disponível.</p>
    <div class="form-grid">
     ${field('line_position','Posição do item no pedido','number','','required min="1" step="1"')}
     ${field('units','Unidades recebidas','number','','required min="1" step="1"')}
     ${field('source_ref','Referência interna do recebimento','text','','required maxlength="160"')}
    </div>
    <button class="secondary" type="submit">Confirmar recebimento</button>
   </form>
  </details>`;
 }
 const reconciliationNames={order:'Estado do pedido',payment:'Evento de pagamento',financial_evidence:'Comprovante',
  physical_return:'Devolução física',stock_event_missing:'Movimento sem correspondência',
  legacy_refund_release:'Liberação legada sem devolução física comprovada'};
 const evidenceNames={fee:'Taxa',shipping_cost:'Frete próprio',tax:'Imposto',other:'Outras despesas',refund:'Valor devolvido'};
 const stockMovementNames={reserve:'Reserva',release:'Liberação',acquisition:'Aquisição',return:'Devolução física',unclassified:'Variação sem vínculo'};
 function reconciliationResults(result,order){
  return `${order?`<p>Despesas comprovadas: ${e(financialMoney(result.known_expense_cents))} · ${e(result.expense_coverage)}/4 categorias</p>
    <p>Reembolso comprovado: ${e(financialMoney(result.known_refund_cents))} · Resultado líquido estimado: ${e(financialMoney(result.estimated_net_cents))}</p>
    ${result.evidence.length?`<ul>${result.evidence.map(row=>`<li>${e(evidenceNames[row.kind])} · ${e(financialMoney(row.amount_cents))} · ${e(row.effective_on)} · ${e(row.source_ref)}</li>`).join('')}</ul>`:''}`:''}
   <h3>Movimentações recentes do estoque</h3>
   ${result.stock.length?`<ul>${result.stock.map(row=>`<li>${e(row.name)} · ${e(stockMovementNames[row.movement_kind])} · ${e(row.balance_before)} → ${e(row.balance_after)} · ${e(new Date(row.recorded_at).toLocaleString('pt-BR'))}</li>`).join('')}</ul>`:'<p class="sub">Nenhuma movimentação no recorte.</p>'}
   <h3>Eventos de conciliação</h3>
   ${result.events.length?`<ul>${result.events.map(row=>`<li><strong>${e(reconciliationNames[row.event_type]||row.event_type)}</strong>
    · ${e(new Date(row.recorded_at).toLocaleString('pt-BR'))} · pedido ${e(row.order_id)}
    ${row.state.status?' · '+e(financialStates[row.state.status]||row.state.status):''}
    ${row.state.kind?' · '+e(evidenceNames[row.state.kind]||stockMovementNames[row.state.kind]||row.state.kind):''}
    ${row.state.reference?' · '+e(row.state.reference):''}</li>`).join('')}</ul>`:'<p class="sub">Nenhum evento no recorte.</p>'}`;
 }
 const reconciliationPanels=new WeakSet();
 function mountReconciliation(host){
  const token=generation,filter=host.querySelector('[data-reconciliation-filter]');
  const status=host.querySelector('[data-reconciliation-status]'),results=host.querySelector('[data-reconciliation-results]');
  const next=host.querySelector('[data-reconciliation-next]');
  const evidence=host.querySelector('[data-reconciliation-evidence]'),physical=host.querySelector('[data-reconciliation-return]');
  const controls=Array.from(host.querySelectorAll('button'));
  let filters={},cursor,working=false,request;
  const current=()=>host.isConnected&&generation===token;
  function setBusy(value){
   working=value;
   controls.forEach(button=>{button.disabled=value;});
   results.setAttribute('aria-busy',String(value));
  }
  async function read(before){
   if(working||!current())return;
   setBusy(true);results.replaceChildren();next.hidden=true;evidence.hidden=physical.hidden=true;
   status.textContent='Consultando conciliação…';
   try{
    const result=await window.NeoCloud.shopReconciliation('read',{...filters,before_event:before});
    if(!current())return;
    cursor=result.next;next.hidden=!cursor;
    results.innerHTML=reconciliationResults(result,filters.order_id);
    evidence.hidden=physical.hidden=!result.order_found;
    status.textContent=filters.order_id&&!result.order_found?'Pedido não encontrado.':'Conciliação atualizada.';
   }catch(err){
    if(!current())return;
    if(err.code==='42501')host.hidden=true;
    else status.textContent=['PGRST202','42883'].includes(err.code)?'Conciliação indisponível neste ambiente.':'Não foi possível consultar. Confira os filtros.';
   }finally{setBusy(false);}
  }
  filter.addEventListener('submit',event=>{
   event.preventDefault();
   if(working)return;
   filters=Object.fromEntries(new FormData(filter));void read();
  });
  next.addEventListener('click',()=>read(cursor));
  for(const [form,action] of [[evidence,'record_evidence'],[physical,'confirm_return']]){
   form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(working||!current()||!filters.order_id)return;
    const payload={...Object.fromEntries(new FormData(form)),order_id:filters.order_id};
    if(action==='record_evidence'){
     try{payload.amount_cents=C.cents(payload.amount,true);}catch(err){status.textContent=err.message;return;}
     delete payload.amount;
    }
    const signature=JSON.stringify([action,payload]);
    if(!request||request.signature!==signature){
     if(action==='confirm_return'&&!window.confirm('Confirma o recebimento físico destas unidades para revenda?'))return;
     request={signature,key:crypto.randomUUID()};
    }
    setBusy(true);
    status.textContent='Registrando conciliação…';
    try{
     await window.NeoCloud.shopReconciliation(action,{...payload,request_key:request.key});
     if(!current())return;
     request=null;form.reset();setBusy(false);await read();
    }catch(err){
     if(current())status.textContent=err.code?.startsWith('22')?'Dados recusados. Confira o pedido, o comprovante e as unidades.':'Registro não confirmado. Repita os mesmos dados.';
    }finally{setBusy(false);}
   });
  }
  void read();
 }
 document.addEventListener('toggle',event=>{
  const host=event.target;
  if(host.open&&host.matches?.('[data-shop-reconciliation]')&&!reconciliationPanels.has(host)){
   reconciliationPanels.add(host);mountReconciliation(host);
  }
 },true);
 function financialPanel(){
  if(!data?.can_manage)return '';
  const options=(dict)=>Object.entries(dict).map(([value,label])=>`<option value="${e(value)}">${e(label)}</option>`).join('');
  const products=data.products.map(p=>`<option value="${e(p.id)}">${e(p.name)}</option>`).join('');
  const categories=[...new Set(data.products.map(p=>p.category).filter(Boolean))].sort();
  return `<details class="card shop-financial" data-shop-financial>
   <summary>Indicadores financeiros</summary>
   <p class="sub">Período pela criação do pedido, no horário de São Paulo. Valores de vendas reais confirmadas; frete cobrado separado.</p>
   <form data-financial-filters class="space" hidden>
    <div class="form-grid">
     ${field('from','De','date','','required')}
     ${field('to','Até','date','','required')}
     <label>Produto<select name="product_id"><option value="">Todos</option>${products}</select></label>
     <label>Categoria atual<select name="category"><option value="">Todas</option>${categories.map(category=>`<option>${e(category)}</option>`).join('')}</select></label>
     <label>Pagamento<select name="environment"><option value="">Todos</option>${options({production:'Real',test:'Teste'})}</select></label>
     <label>Status<select name="status"><option value="">Todos</option>${options(financialStates)}</select></label>
     <label>Atendimento<select name="fulfillment"><option value="">Todos</option>${options({processing:'A enviar',dispatched:'Enviado',delivered:'Entregue'})}</select></label>
     <label>Detalhar por<select name="group_by">${options({day:'Dia',product:'Produto',category:'Categoria atual'})}</select></label>
    </div>
    <button class="secondary" type="submit">Aplicar filtros</button>
   </form>
   <p class="sub" role="status" data-financial-status></p>
   <button class="secondary" type="button" data-financial-retry hidden>Tentar novamente</button>
   <div data-financial-results></div>
   <div class="inline-actions" data-financial-pages hidden>
    <button class="secondary" type="button" data-financial-prev>Anterior</button>
    <span class="sub" data-financial-page></span>
    <button class="secondary" type="button" data-financial-next>Próxima</button>
   </div>
   ${reconciliationPanel()}
  </details>`;
 }
 function financialMoney(value){
  if(value==null)return 'Indisponível';
  const text=String(value),negative=text.startsWith('-'),digits=text.replace(/^-/,'').padStart(3,'0');
  return `${negative?'−':''}R$ ${digits.slice(0,-2).replace(/\B(?=(\d{3})+(?!\d))/g,'.')},${digits.slice(-2)}`;
 }
 function financialResults(result){
  const s=result.sales,stock=result.stock;
  const card=(label,value)=>`<div><dt>${label}</dt><dd>${e(value)}</dd></div>`;
  return `<dl class="shop-financial-totals">
   ${card('Receita bruta',financialMoney(s.gross_cents))}
   ${card('Descontos',financialMoney(s.discount_cents))}
   ${card('Receita comercial',financialMoney(s.commercial_cents))}
   ${card('Frete cobrado',s.shipping_cents==null?'Somente no total sem recorte de produto ou categoria':financialMoney(s.shipping_cents))}
   ${card('Vendas reais no recorte',s.orders)}
   ${card('Unidades vendidas',s.units)}
   ${card('CMV conhecido',financialMoney(s.known_cmv_cents))}
   ${card('Cobertura de custo',`${s.covered_units} de ${s.units} unidades${s.coverage_percent==null?'':' · '+s.coverage_percent.replace('.',',')+'%'}`)}
   ${card('Lucro bruto estimado',financialMoney(s.profit_cents))}
   ${card('Margem bruta',s.margin_percent==null?'Indisponível':String(s.margin_percent).replace('.',',')+'%')}
   ${card('Estoque disponível hoje',stock.units)}
   ${card('Produtos publicados com até 5 unidades',stock.alert_count)}
  </dl>
  ${s.covered_units<s.units?'<p class="sub">Faltam custos históricos. O CMV conhecido cobre apenas as unidades com snapshot.</p>':''}
  <p class="sub">Valores devolvidos, taxas, frete próprio, impostos e lucro líquido indisponíveis. Pedidos devolvidos ou em revisão ficam fora da receita.</p>
  ${stock.alerts.length?`<ul aria-label="Alertas prioritários de estoque">${stock.alerts.map(row=>`<li>${e(row.name)} · ${e(row.stock)} un.</li>`).join('')}</ul>`:''}
  ${result.states.length?`<h3>Pedidos por ambiente e situação</h3><ul>${result.states.map(row=>`<li>${row.environment==='test'?'Teste':'Real'} · ${e(financialStates[row.status]||row.status)} · ${e(row.orders)}</li>`).join('')}</ul>`:''}
  ${result.details.length?`<div class="table-wrap"><table>
    <caption>Vendas reais no detalhamento selecionado</caption>
    <thead><tr><th scope="col">Grupo</th><th scope="col">Receita comercial</th><th scope="col">Vendas</th><th scope="col">Unidades</th></tr></thead>
    <tbody>${result.details.map(row=>`<tr><th scope="row">${e(row.label)}</th><td>${e(financialMoney(row.commercial_cents))}</td><td>${e(row.orders)}</td><td>${e(row.units)}</td></tr>`).join('')}</tbody>
   </table></div>`:'<p class="sub">Nenhuma venda real confirmada neste recorte.</p>'}`;
 }
 const financialPanels=new WeakSet();
 function mountFinancial(host){
  const token=generation,form=host.querySelector('[data-financial-filters]');
  const results=host.querySelector('[data-financial-results]'),status=host.querySelector('[data-financial-status]');
  const retry=host.querySelector('[data-financial-retry]'),pages=host.querySelector('[data-financial-pages]');
  const previous=host.querySelector('[data-financial-prev]'),next=host.querySelector('[data-financial-next]');
  let filters={},page=1,pending=false,ready=false;
  const current=()=>host.isConnected&&generation===token;
  async function read(requestedPage=1){
   if(pending||!current())return;
   pending=true;retry.hidden=true;
   form.querySelector('button').disabled=true;previous.disabled=next.disabled=true;
   results.replaceChildren();pages.hidden=true;
   status.textContent='Consultando indicadores…';
   results.setAttribute('aria-busy','true');
   try{
    const result=await window.NeoCloud.shopFinancial({...filters,page:requestedPage});
    if(!current())return;
    page=result.page;
    if(!ready){
     form.querySelector('[name=from]').value=result.from;
     form.querySelector('[name=to]').value=result.to;
     filters=Object.fromEntries(new FormData(form));
     ready=true;
    }
    form.hidden=false;
    results.innerHTML=financialResults(result);
    pages.hidden=result.detail_pages<2;
    previous.disabled=page<=1;next.disabled=page>=result.detail_pages;
    host.querySelector('[data-financial-page]').textContent=`Página ${page} de ${result.detail_pages}`;
    status.textContent='Indicadores atualizados.';
   }catch(err){
    if(!current())return;
    if(err.code==='42501'){
     host.hidden=true;
     return;
    }
    if(['PGRST202','42883'].includes(err.code)){
     status.textContent='Indicadores financeiros indisponíveis neste ambiente.';
     return;
    }
    status.textContent=err.code?.startsWith('22')?'Confira os filtros. O período pode abranger até 366 dias, sem datas futuras.':'Falha ao consultar indicadores.';
    retry.hidden=false;
   }finally{
    pending=false;form.querySelector('button').disabled=false;results.removeAttribute('aria-busy');
   }
  }
  form.addEventListener('submit',event=>{
   event.preventDefault();
   if(pending)return;
   filters=Object.fromEntries(new FormData(form));
   void read();
  });
  retry.addEventListener('click',()=>read());
  previous.addEventListener('click',()=>read(page-1));
  next.addEventListener('click',()=>read(page+1));
  void read();
 }
 document.addEventListener('toggle',event=>{
  const host=event.target;
  if(host.open&&host.matches?.('[data-shop-financial]')&&!financialPanels.has(host)){
   financialPanels.add(host);mountFinancial(host);
  }
 },true);
 function orderDashboard(operational=true){if(!operational)return financialPanel();const s=orderStats(),card=(id,label,value,extra='')=>`<button type="button" data-shop="order_filter" data-filter="${id}" class="${extra} ${orderFilter===id?'active':''}" aria-pressed="${orderFilter===id}"><small>${label}</small><strong>${value}</strong></button>`;return `<div class="shop-order-dashboard">${card('all','Total',s.total)}${card('paid','Pagos',s.paid)}${card('processing','A enviar',s.processing)}${card('dispatched','Enviados',s.dispatched)}${card('delivered','Entregues',s.delivered)}${card('pending','Aguardando pagamento',s.pending)}${s.cancel?card('cancel','Cancelamentos',s.cancel):''}</div>${financialPanel()}`}
 function filteredOrders(manage){if(!manage)return orders;const q=orderSearch.trim().toLocaleLowerCase('pt-BR'),digitsOnly=q.replace(/\D/g,'');return orders.filter(o=>{const paid=['paid','test_paid','paid_review'].includes(o.status),matches=orderFilter==='all'||orderFilter==='paid'&&paid||orderFilter==='processing'&&paid&&o.fulfillment==='processing'||orderFilter==='dispatched'&&paid&&o.fulfillment==='dispatched'||orderFilter==='delivered'&&paid&&o.fulfillment==='delivered'||orderFilter==='pending'&&['awaiting_payment','pending'].includes(o.status)||orderFilter==='cancel'&&o.cancellation_status==='requested';if(!matches)return false;if(!q)return true;const hay=[o.id,o.id?.slice(0,8),o.customer_email,o.address?.name,o.address?.email,o.address?.phone,o.address?.document_number,o.address?.cpf,o.address?.cnpj,o.address?.postal_code,o.address?.street,o.address?.number,o.address?.district,o.address?.city,o.address?.state,...(o.items||[]).map(i=>i.name)].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');return hay.includes(q)||(digitsOnly.length>=3&&hay.replace(/\D/g,'').includes(digitsOnly))})}
 const duplicateIcon='<svg class="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
 const bulkMounted=new WeakSet();
 function bulkPage(){
  return `${button('back','‹ Voltar')}<section class="card shop-bulk" data-bulk>
   <h2>Gerenciamento em massa</h2>
   <div class="segmented" role="group" aria-label="Campos a alterar">
    <button type="button" data-bulk-mode="prices" aria-pressed="true" class="active">Preços</button>
    <button type="button" data-bulk-mode="stock" aria-pressed="false">Estoque</button>
    <button type="button" data-bulk-mode="both" aria-pressed="false">Ambos</button>
   </div>
   <form class="space" data-bulk-filters>
    <div class="form-grid">
     ${field('query','Nome ou identificador','search','','maxlength="120"')}
     <label>Categoria<select name="category"><option value="">Todas</option></select></label>
     <label>Status<select name="status"><option value="">Todos</option><option value="published">Publicado</option><option value="draft">Rascunho</option><option value="hidden">Oculto para membros</option><option value="restricted">Restrito</option></select></label>
    </div>
    <button type="submit" class="secondary">Buscar</button>
   </form>
   <p role="status" class="sub" data-bulk-status></p>
   <div class="inline-actions">
    <button type="button" class="secondary" data-bulk-action="page">Selecionar página</button>
    <button type="button" class="secondary" data-bulk-action="all">Selecionar todos os resultados</button>
    <button type="button" class="text-btn" data-bulk-action="clear">Limpar seleção</button>
   </div>
   <p class="sub" data-bulk-selection aria-live="polite"></p>
   <div data-bulk-products></div>
   <div class="inline-actions">
    <button type="button" class="secondary" data-bulk-action="prev">Anterior</button>
    <button type="button" class="secondary" data-bulk-action="next">Próxima</button>
    <span class="sub" data-bulk-page></span>
   </div>
   <form class="space" data-bulk-rules>
    <fieldset data-bulk-prices>
     <legend>Operação de preço</legend>
     <label>Método<select name="price_op">
      <option value="">Usar somente campos das linhas</option><option value="set">Definir preço</option>
      <option value="add">Aumentar valor fixo</option><option value="subtract">Reduzir valor fixo</option>
      <option value="percent_add">Aumentar percentual</option><option value="percent_subtract">Reduzir percentual</option>
      <option value="fx">Corrigir por câmbio</option></select></label>
     <div data-bulk-price-value hidden>${field('price','Valor em BRL ou percentual','text','','inputmode="decimal"')}</div>
     <div class="form-grid" data-bulk-fx hidden>${field('old_fx','Câmbio anterior','text','','inputmode="decimal"')}${field('new_fx','Câmbio novo','text','','inputmode="decimal"')}</div>
     <label>Arredondamento<select name="rounding"><option value="cent">Centavo</option><option value="ten">Múltiplo de R$ 0,10</option><option value="whole">Real inteiro</option><option value="99">Final ,99</option></select></label>
    </fieldset>
    <fieldset data-bulk-stock hidden>
     <legend>Operação de estoque</legend>
     <label>Método<select name="stock_op"><option value="">Usar somente campos das linhas</option>
      <option value="set">Definir saldo final</option><option value="add">Acrescentar</option><option value="subtract">Reduzir</option></select></label>
     <div data-bulk-stock-value hidden>${field('quantity','Quantidade inteira','number','','min="0" max="1000000" step="1"')}</div>
    </fieldset>
    <div class="form-grid">
     ${field('reason','Motivo do lote','text','','required maxlength="500"')}
     ${field('reference','Referência de documento ou lote','text','','maxlength="160"')}
    </div>
    <button type="submit" class="primary">Gerar prévia</button>
   </form>
   <div class="space" data-bulk-result></div>
   <details class="space" data-bulk-history><summary>Histórico de lotes</summary><div data-bulk-history-list></div></details>
  </section>`;
 }

 function bulkNumber(value,money=false){
  const number=String(value).trim().replace(',','.');
  if(!/^\d{1,10}(?:\.\d{1,10})?$/.test(number))throw Error('Informe um valor decimal válido, sem separador de milhar.');
  return money?C.cents(number,true):number;
 }
 function mountBulk(host){
  if(!host||bulkMounted.has(host))return;
  bulkMounted.add(host);
  const token=generation,filter=host.querySelector('[data-bulk-filters]');
  const rules=host.querySelector('[data-bulk-rules]'),products=host.querySelector('[data-bulk-products]');
  const summary=host.querySelector('[data-bulk-selection]'),status=host.querySelector('[data-bulk-status]');
  const results=host.querySelector('[data-bulk-result]'),history=host.querySelector('[data-bulk-history]');
  const historyList=host.querySelector('[data-bulk-history-list]');
  let modeName='prices',filters={},page=1,total=0,rows=[],working=false,all=false,result=null,revision=0,historyPage=1;
  const selected=new Set(),excluded=new Set(),overrides=new Map();
  const current=()=>host.isConnected&&token===generation&&mode==='bulk';
  const active=id=>all?!excluded.has(id):selected.has(id);
  const count=()=>all?Math.max(total-excluded.size,0):selected.size;
  const setSelection=(id,checked)=>{
   if(all){if(checked)excluded.delete(id);else excluded.add(id);}
   else if(checked)selected.add(id);else selected.delete(id);
  };
  const stockMode=()=>modeName!=='prices',priceMode=()=>modeName!=='stock';
  function clearPreview(){revision++;result=null;results.replaceChildren();}
  function toggleRuleFields(){
   host.querySelector('[data-bulk-prices]').hidden=!priceMode();
   host.querySelector('[data-bulk-stock]').hidden=!stockMode();
   const op=rules.elements.price_op.value;
   host.querySelector('[data-bulk-price-value]').hidden=!op||op==='fx';
   host.querySelector('[data-bulk-fx]').hidden=op!=='fx';
   host.querySelector('[data-bulk-stock-value]').hidden=!rules.elements.stock_op.value;
  }
  function renderProducts(){
   summary.textContent=`${count()} selecionado(s) de ${total} resultado(s).${all?' Seleção inclui resultados de outras páginas.':''}`;
   host.querySelector('[data-bulk-page]').textContent=`Página ${page} de ${Math.max(1,Math.ceil(total/20))}`;
   host.querySelector('[data-bulk-action=prev]').disabled=page===1;
   host.querySelector('[data-bulk-action=next]').disabled=page*20>=total;
   products.innerHTML=rows.length?`<table class="shop-bulk-table"><thead><tr><th scope="col">Selecionar</th><th scope="col">Produto</th><th scope="col">Dados atuais</th><th scope="col">Proposta por linha</th></tr></thead><tbody>${rows.map(p=>{
    const line=overrides.get(p.id)||{};
    return `<tr data-bulk-id="${e(p.id)}"><td><input type="checkbox" aria-label="Selecionar ${e(p.name)}" data-bulk-select ${active(p.id)?'checked':''}></td>
     <td><div class="shop-bulk-product"><img width="40" height="40" alt="" data-bulk-photo hidden><div><strong>${e(p.name)}</strong><small>${e(p.category)} · ${e(p.id)}</small></div></div></td>
     <td>${C.money(p.price_cents)} · ${e(p.stock)} un.<br><small>${p.active?'Publicado':'Rascunho'} · ${p.visibility==='public'?'Público':p.visibility==='allowlist'?'Lista de permitidos':'Lista de bloqueados'}</small></td>
     <td>${priceMode()?`<label>Novo preço<input data-bulk-override="price_cents" inputmode="decimal" value="${e(line.price_cents||'')}"></label>`:''}
       ${stockMode()?`<label>Novo estoque<input data-bulk-override="stock" type="number" min="0" max="1000000" step="1" value="${e(line.stock||'')}"></label>`:''}</td></tr>`;
   }).join('')}</tbody></table>`:'<p class="sub">Nenhum produto no recorte.</p>';
   if(window.NeoCloud.shopPhotoURL)for(const [index,p] of rows.entries()){
    const image=products.querySelectorAll('[data-bulk-photo]')[index];
    if(p.photo_path)void window.NeoCloud.shopPhotoURL(p.photo_path).then(src=>{
     if(current()&&image.isConnected&&src){image.src=src;image.hidden=false;}
    }).catch(()=>{});
   }
  }
  function renderResult(response){
   result=response;
   const labels={preview:'Prévia pronta para confirmação',invalid:'Prévia com erros. Nenhum item aplicado.',conflict:'Conflito. Nenhum item aplicado.',applied:'Lote aplicado',reversed:'Lote revertido',history:'Detalhes do lote'};
   const priceOnly=response.rows.every(row=>row.stock===row.next_stock);
   const changed=response.rows.filter(row=>!row.error&&(row.price_cents!==row.next_price_cents||row.stock!==row.next_stock)).length;
   results.innerHTML=`<h3>${e(labels[response.status])}</h3><p>${response.rows.length} item(ns) · ${changed} com alteração proposta</p>
    ${response.audit?`<p class="sub">Motivo: ${e(response.audit.reason)} · Referência: ${e(response.audit.reference||'Não informada')} · Administrador: ${e(response.audit.actor_id)} · ${e(new Date(response.audit.applied_at).toLocaleString('pt-BR'))}</p>`:''}
    <div class="shop-bulk-result-list"><ul>${response.rows.map(row=>`<li><strong>${e(row.name||row.id)}</strong> · ${row.error?e(row.error):
     `${C.money(row.price_cents)} → ${C.money(row.next_price_cents)} (${e(row.price_percent)}%) · ${e(row.stock)} → ${e(row.next_stock)} un.`}</li>`).join('')}</ul></div>
    <div class="inline-actions">
     ${response.status==='preview'?'<button type="button" class="primary" data-bulk-action="apply">Confirmar lote</button>':''}
     ${response.status==='applied'&&priceOnly&&response.canUndo!==false?'<button type="button" class="secondary" data-bulk-action="undo">Desfazer preços</button>':''}
     <button type="button" class="secondary" data-bulk-action="export">Exportar resultado</button>
    </div>`;
  }
  async function run(action,handler){
   if(working||!current())return;
   working=true;host.setAttribute('aria-busy','true');status.textContent=action;
   try{await handler();}
   catch(err){
    if(current())status.textContent=err.code==='42501'?'Acesso administrativo necessário.':
      err.code==='PGRST202'?'Gerenciamento em massa indisponível neste ambiente.':
      err.code==='40001'?'Produtos ou prévia mudaram. Consulte novamente.':
      err.message==='shop_bulk_selection_limit'?'Selecione de 1 a 1.000 produtos por lote.':
      err.message==='shop_bulk_no_changes'?'Defina pelo menos uma alteração de preço ou estoque.':
      err.message==='shop_bulk_undo_unavailable'?'A reversão de estoque exige conciliação separada.':err.message;
   }finally{working=false;host.removeAttribute('aria-busy');}
  }
  const call=(action,payload)=>window.NeoCloud.shopBulk(action,payload);
  async function list(wanted){
   const response=await call('list',{filters,page:wanted});
   if(!current())return;
   page=response.page;total=response.total;rows=response.rows;
   filter.elements.category.innerHTML='<option value="">Todas</option>'+response.categories.map(c=>`<option>${e(c)}</option>`).join('');
   filter.elements.category.value=filters.category||'';
   status.textContent='';
   renderProducts();
  }
  async function loadHistory(){
   const batches=await call('history',{page:historyPage});
   if(!current())return;
   historyList.innerHTML=`<ul>${batches.map(batch=>`<li><button type="button" class="text-btn" data-bulk-action="details" data-batch-id="${e(batch.id)}">${e(batch.reason)} · ${e(batch.item_count)} itens · ${e(new Date(batch.applied_at).toLocaleString('pt-BR'))} ${batch.reversed_at?'· Revertido':''}</button></li>`).join('')}</ul>
    ${historyPage>1?'<button type="button" class="secondary" data-bulk-action="history-prev">Histórico anterior</button>':''}
    ${batches.length===20?'<button type="button" class="secondary" data-bulk-action="history-next">Mais lotes</button>':''}`;
   status.textContent='';
  }
  function resetSelection(){all=false;selected.clear();excluded.clear();overrides.clear();clearPreview();}
  function absoluteOverrides(){
   return Object.fromEntries([...overrides].filter(([id])=>active(id)).map(([id,line])=>[id,{
    ...(priceMode()&&line.price_cents?{price_cents:bulkNumber(line.price_cents,true)}:{}),
    ...(stockMode()&&line.stock?{stock:line.stock}:{})
   }]));
  }
  filter.addEventListener('submit',event=>{
   event.preventDefault();if(working)return;
   filters=Object.fromEntries(new FormData(filter));resetSelection();
   void run('Consultando produtos…',()=>list(1));
  });
  rules.addEventListener('input',()=>{clearPreview();toggleRuleFields();});
  rules.addEventListener('submit',event=>{
   event.preventDefault();
   const version=revision;
   void run('Calculando prévia…',async()=>{
    const values=Object.fromEntries(new FormData(rules));
    const priceOp=values.price_op;
    const price=priceMode()&&priceOp?{
     operation:priceOp,rounding:values.rounding,
     ...(priceOp==='fx'?{previous_fx:bulkNumber(values.old_fx),next_fx:bulkNumber(values.new_fx)}:
       {value:bulkNumber(values.price,!priceOp.startsWith('percent_'))})
    }:undefined;
    const stock=stockMode()&&values.stock_op?{operation:values.stock_op,value:values.quantity}:undefined;
    const response=await call('preview',{mode:modeName,filters,price,stock,
     reason:values.reason,reference:values.reference,overrides:absoluteOverrides(),
     selection:all?{kind:'all',excluded:[...excluded],count:count()}:{kind:'explicit',ids:[...selected]}});
    if(current()&&version===revision){renderResult(response);status.textContent='';}
   });
  });
  products.addEventListener('input',event=>{
   const input=event.target,id=input.closest('[data-bulk-id]')?.dataset.bulkId;
   if(!id)return;
   clearPreview();
   if(input.hasAttribute('data-bulk-select'))setSelection(id,input.checked);
   if(input.dataset.bulkOverride){
    const line=overrides.get(id)||{};
    line[input.dataset.bulkOverride]=input.value;overrides.set(id,line);setSelection(id,true);
    input.closest('tr').querySelector('[data-bulk-select]').checked=true;
   }
   summary.textContent=`${count()} selecionado(s) de ${total} resultado(s).${all?' Seleção inclui outras páginas.':''}`;
  });
  history.addEventListener('toggle',()=>{if(history.open)void run('Consultando histórico…',loadHistory);});
  host.addEventListener('click',event=>{
   const control=event.target.closest('[data-bulk-action],[data-bulk-mode]');
   if(!control||working)return;
   if(control.dataset.bulkMode){
    modeName=control.dataset.bulkMode;clearPreview();toggleRuleFields();
    for(const tab of host.querySelectorAll('[data-bulk-mode]')){
     const chosen=tab===control;tab.classList.toggle('active',chosen);tab.setAttribute('aria-pressed',String(chosen));
    }
    renderProducts();return;
   }
   const action=control.dataset.bulkAction;
   if(action==='page'){for(const row of rows)setSelection(row.id,true);clearPreview();renderProducts();}
   if(action==='all'&&total&&window.confirm(`Selecionar os ${total} resultados, incluindo páginas que não estão na tela?`)){
    all=true;selected.clear();excluded.clear();clearPreview();renderProducts();
   }
   if(action==='clear'){resetSelection();renderProducts();}
   if(action==='prev'||action==='next')void run('Consultando produtos…',()=>list(page+(action==='next'?1:-1)));
   if(action==='history-prev'||action==='history-next'){
    historyPage+=action==='history-next'?1:-1;void run('Consultando histórico…',loadHistory);
   }
   if(action==='details')void run('Consultando lote…',async()=>{
    const batch=await call('get',{id:control.dataset.batchId});
    if(current()){
     renderResult({id:batch.id,rows:batch.lines,status:batch.reversed_at?'reversed':'applied',canUndo:batch.actor_id===owner,audit:batch});
     status.textContent='';
    }
   });
   if((action==='apply'||action==='undo')&&result?.id){
    const batch=result;
    if(!window.confirm(action==='apply'?`Aplicar este lote a ${batch.rows.length} produto(s)?`:'Reverter os preços deste lote se os produtos continuarem na mesma revisão?'))return;
    void run('Executando lote…',async()=>{
     const response=await call(action,{id:batch.id});
     if(!current())return;
     if(response.status==='applied'||response.status==='reversed'){
      homeLast=lastLoad=0;visibilityDirty=true;homeRequest++;homeBusy=false;homeProducts=[];paintHome();
      await list(page);
      if(!current())return;
      if(history.open)await loadHistory();
     }
     if(current()){renderResult(response);status.textContent='';}
    });
   }
   if(action==='export'&&result){
    const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='lote-loja.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
   }
  });
  toggleRuleFields();
  void run('Consultando produtos…',()=>list(1));
 }
 function manager(){const fresh=newOrderCount();return `<div class="shop-admin-head"><h2>Gerenciar loja</h2><div class="shop-admin-actions">${button('new','＋ Adicionar produto','','primary')}${button('bulk','Gerenciamento em massa')}${data.can_manage_orders===false?'':button('manage_orders',`Pedidos${fresh?` (${fresh} novos)`:''}`)+button('settings','Entrega e condições')+button('promotions','Promoções',data.promotions_ready?'':'disabled')+button('coupons','Cupons e origem',data.promotions_ready?'':'disabled')}</div></div>${!data.shop_extensions?.gallery?'<p class="sub">Atualize a estrutura da loja no Supabase para ativar várias fotos e exclusão de produtos.</p>':''}${!data.promotions_ready?'<p class="sub">Promoções e cupons precisam da atualização de descontos no Supabase.</p>':''}${orderDashboard(false)}<div class="shop-manage-list">${data.products.map(p=>`<div class="card shop-manage-row">${p.photo_url?`<img class="shop-manage-photo" src="${e(p.photo_url)}" alt="" width="64" height="64">`:''}<div class="shop-manage-copy"><strong>${e(p.name)}</strong><p class="sub">${C.money(p.price_cents)} · ${p.stock} disponíveis · ${p.active?'Publicado':'Rascunho'}</p></div><div class="shop-manage-tools">${button('edit','Editar',`data-id="${e(p.id)}"`)}${data.shop_extensions?.duplicate_product?button('duplicate_product',duplicateIcon,`data-id="${e(p.id)}" aria-label="Duplicar produto" title="Duplicar produto"`,'icon-btn'):''}${button('delete_product',trash,`data-id="${e(p.id)}" aria-label="Excluir ${e(p.name)}" title="Excluir produto" ${data.shop_extensions?.delete_product?'':'disabled'}`,'icon-btn shop-delete-product')}</div></div>`).join('')||empty('Cadastre seu primeiro produto','Adicione fotos, descrição, preço e estoque para publicar.')}</div>`}
 function visibilityEditor(){
  if(!product.id||!data.shop_extensions?.member_visibility)return '';
  return `<details class="shop-product-visibility" data-shop-visibility="${e(product.id)}">
   <summary aria-label="Visibilidade do produto" title="Visibilidade do produto"><span aria-hidden="true">›</span></summary>
   <div class="shop-visibility-content">
    <label>Visibilidade<select data-visibility-mode disabled>${Object.entries(visibilityNames).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>
    <div data-visibility-recipients hidden>
     <label>Pesquisar por nome ou e-mail<input type="search" maxlength="120" autocomplete="off" data-visibility-search></label>
     <p class="sub" data-visibility-count></p>
     <div class="shop-visibility-members" data-visibility-members></div>
     <button type="button" class="secondary" data-visibility-more hidden>Carregar mais</button>
    </div>
    <p class="sub" role="status" data-visibility-status></p>
   </div>
  </details>`;
 }
 function mountVisibility(host){
  const token=generation,id=host.dataset.shopVisibility;
  const selector=host.querySelector('[data-visibility-mode]');
  const recipients=host.querySelector('[data-visibility-recipients]');
  const search=host.querySelector('[data-visibility-search]');
  const members=host.querySelector('[data-visibility-members]');
  const more=host.querySelector('[data-visibility-more]');
  const status=host.querySelector('[data-visibility-status]');
  const count=host.querySelector('[data-visibility-count]');
  let sequence=0,after=null,mode=null,total=0,timer,writing=false;
  const current=()=>host.isConnected&&generation===token;
  async function read(append=false){
   if(!current()||!host.open)return;
   const request=++sequence;
   more.hidden=true;
   if(!append){after=null;members.replaceChildren();}
   status.textContent='Consultando visibilidade…';
   try{
    const result=await rpc('visibility_members',{product_id:id,search:search.value,after});
    if(!current()||request!==sequence)return;
    mode=result.mode;selector.value=mode;selector.disabled=false;
    recipients.hidden=mode==='public';
    total=result.selected_count;count.textContent=`${total} selecionado(s)`;
    if(mode!=='public'){
     members.insertAdjacentHTML('beforeend',result.members.map(row=>`<label class="check shop-visibility-member">
      <input type="checkbox" data-visibility-user="${e(row.id)}" aria-label="${mode==='blocklist'?'Bloquear':'Autorizar'} ${e(row.display_name)}" ${row.selected?'checked':''}>
      <span data-visibility-avatar></span><span>${e(row.display_name)}</span>
     </label>`).join('')||(!append?'<p class="sub">Nenhum membro encontrado.</p>':''));
     for(const row of result.members){
      if(!row.avatar_path||!window.NeoCloud.communityAvatarURL)continue;
      const input=[...members.querySelectorAll('[data-visibility-user]')].find(node=>node.dataset.visibilityUser===row.id);
      const slot=input?.parentElement.querySelector('[data-visibility-avatar]');
      void window.NeoCloud.communityAvatarURL(row.avatar_path).then(url=>{
       if(!current()||request!==sequence||!slot?.isConnected||!/^https:\/\//i.test(url))return;
       const img=document.createElement('img');img.src=url;img.alt='';slot.replaceChildren(img);
      }).catch(()=>{});
     }
     after=result.members.at(-1)?.id??after;
     more.hidden=result.members.length<30;
    }
    status.textContent='';
   }catch{
    if(!current()||request!==sequence)return;
    status.textContent='Não foi possível consultar. Reabra a seção para tentar novamente.';
   }
  }
  host.addEventListener('toggle',()=>{if(host.open)void read();else {sequence++;clearTimeout(timer);}});
  search.addEventListener('input',()=>{sequence++;clearTimeout(timer);timer=setTimeout(()=>void read(),240);});
  more.addEventListener('click',()=>void read(true));
  selector.addEventListener('change',async()=>{
   if(writing||!mode)return;
   writing=true;sequence++;clearTimeout(timer);
   const next=selector.value;
   selector.disabled=true;recipients.hidden=true;status.textContent='Salvando…';
   try{
    await rpc('visibility_mode',{product_id:id,mode:next});
    visibilityDirty=true;
    if(current()){mode=next;await read();}
   }catch{if(current()){selector.value=mode;recipients.hidden=mode==='public';status.textContent='Falha ao salvar o modo. Tente novamente.';}}
   finally{writing=false;if(current())selector.disabled=false;}
  });
  members.addEventListener('change',async event=>{
   const field=event.target;
   if(!field.dataset.visibilityUser||writing||!mode)return;
   writing=true;clearTimeout(timer);
   const controls=[...members.querySelectorAll('input'),search,more,selector];
   for(const control of controls)control.disabled=true;
   const requested=field.checked;
   status.textContent='Salvando…';
   try{
    const saved=await rpc('visibility_set',{product_id:id,user_id:field.dataset.visibilityUser,list:mode,selected:requested});
    visibilityDirty=true;
    if(current()){
     field.checked=saved.selected===true;total=saved.selected_count;
     count.textContent=`${total} selecionado(s)`;status.textContent='Salvo.';
    }
   }catch{if(current()){field.checked=!requested;status.textContent='Falha ao salvar. Tente novamente.';}}
   finally{writing=false;if(current())for(const control of controls)control.disabled=false;}
  });
  return read;
 }
 document.addEventListener('click',event=>{
  const summary=event.target.closest?.('[data-shop-visibility] > summary');
  const host=summary?.parentElement;
  if(host&&!visibilityPanels.has(host))visibilityPanels.set(host,mountVisibility(host));
 },true);
 function costEditor(){
  if(!data.can_manage)return '';
  return `<details class="shop-cost-editor" data-shop-cost="${e(product.id||'')}"><summary>Custos e aquisições</summary>
   ${product.id?`<p role="status" class="sub" data-cost-status></p>
   <form class="space" data-cost-form hidden>
    <fieldset class="space" data-cost-fields>
     <label>Tipo de lançamento<select name="entry_kind" required><option value="">Selecione</option><option value="cost_only">Informar custo sem alterar estoque</option><option value="acquisition">Registrar aquisição e aumentar estoque</option></select></label>
     <div class="form-grid">
      <label>Moeda<select name="currency"><option value="BRL">Real (BRL)</option><option value="USD">Dólar (USD)</option></select></label>
      ${field('unit_cost','Custo unitário','text','','required inputmode="decimal" maxlength="20"')}
      ${field('quantity','Quantidade de referência ou adquirida','number','','required min="1" max="1000000" step="1"')}
      ${field('acquired_on','Data de referência ou aquisição','date','','required')}
     </div>
     <fieldset class="form-grid" data-cost-fx hidden disabled><legend>Câmbio histórico</legend>
      ${field('fx_rate','Reais por dólar','text','','required inputmode="decimal" maxlength="18"')}
      ${field('fx_source','Fonte do câmbio','text','','required maxlength="160"')}
      ${field('fx_on','Data do câmbio','date','','required')}
     </fieldset>
    </fieldset>
    <output class="sub" data-cost-preview></output>
    <button type="submit" class="secondary" data-cost-save>Registrar lançamento</button>
   </form>
   <button type="button" class="secondary" data-cost-refresh hidden>Atualizar dados</button>
   <ul class="shop-cost-history" data-cost-history></ul>
   <button type="button" class="secondary" data-cost-more hidden>Ver lançamentos anteriores</button>`:'<p class="sub">Salve o produto para registrar custos e aquisições.</p>'}
   </details>`;
 }
 function costDecimal(value,integer,fraction){
  const text=value.trim().replace(',','.');
  if(!new RegExp(`^[0-9]{1,${integer}}(?:\\.[0-9]{1,${fraction}})?$`).test(text))throw Error('Informe um valor decimal sem separador de milhar.');
  return text;
 }
 function costMoney(value){
  const [whole,fraction='']=String(value).split('.');
  return 'R$ '+whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+fraction.padEnd(2,'0');
 }
 function costPreview(unit,rate,quantity){
  const parts=[unit,rate].map(value=>value.split('.'));
  const scale=parts.reduce((sum,p)=>sum+(p[1]?.length||0),0);
  const amount=parts.reduce((total,p)=>total*BigInt(p.join('')),1n);
  const decimal=value=>{
   const digits=value.toString().padStart(scale+1,'0');
   return scale?digits.slice(0,-scale)+'.'+digits.slice(-scale).replace(/0+$/,''):digits;
  };
  return [costMoney(decimal(amount)),costMoney(decimal(amount*BigInt(quantity)))];
 }
 function mountCosts(host){
  const token=generation,id=host.dataset.shopCost;
  const form=host.querySelector('[data-cost-form]'),fields=host.querySelector('[data-cost-fields]');
  const fx=host.querySelector('[data-cost-fx]'),status=host.querySelector('[data-cost-status]');
  const history=host.querySelector('[data-cost-history]'),preview=host.querySelector('[data-cost-preview]');
  const save=host.querySelector('[data-cost-save]'),refresh=host.querySelector('[data-cost-refresh]');
  const more=host.querySelector('[data-cost-more]');
  const field=name=>form.querySelector('[name='+name+']');
  const sameEditor=()=>token===generation&&mode==='product'&&product.id===id;
  const current=()=>sameEditor()&&host.isConnected;
  let latest,next,working=false;
  function syncStock(stock){
   const input=document.querySelector('[data-shop-form=product] [name=stock]');
   const row=data.products.find(row=>row.id===id);
   if(input&&row&&input.value!==''&&Number(input.value)===row.stock){
    input.value=String(stock);
    product.stock=stock;
   }
   if(row)row.stock=stock;
  }
  function render(result,append=false){
   if(!append){latest=result;syncStock(result.stock);history.replaceChildren();}
   next=result.next;
   more.hidden=!next;
   for(const row of result.history){
    const item=document.createElement('li');
    const original=row.currency==='USD'?` · USD ${row.unit_cost.replace('.',',')} · câmbio ${row.fx_rate.replace('.',',')} · ${row.fx_on} · ${row.fx_source}`:'';
    item.textContent=`${row.acquired_on} · ${row.entry_kind==='acquisition'?'Entrada de estoque':'Somente custo'} · ${row.quantity} un. · ${costMoney(row.brl_unit)} / un. · ${costMoney(row.brl_total)} total${original}`;
    history.append(item);
   }
  }
  async function read(append=false){
   if(working||!current())return;
   working=true;refresh.hidden=true;more.disabled=true;
   status.textContent='Consultando custos…';
   try{
    const result=await window.NeoCloud.shopCosts('read',{product_id:id,...(append?{before:next}:{})});
    if(!current())return;
    render(result,append);
    form.hidden=false;
    status.textContent=history.childElementCount?'Histórico de lançamentos':'Custo não informado.';
   }catch(err){
    if(current()){
     status.textContent=['PGRST202','42883'].includes(err.code)?'Custos indisponíveis neste ambiente.':'Não foi possível consultar os custos.';
     refresh.hidden=false;
    }
   }finally{working=false;more.disabled=false;}
  }
  function updatePreview(){
   const usd=field('currency').value==='USD';
   fx.hidden=!usd;fx.disabled=!usd;
   try{
    const quantity=field('quantity').value;
    if(!/^[1-9][0-9]{0,6}$/.test(quantity))return void(preview.textContent='');
    const [unit,total]=costPreview(costDecimal(field('unit_cost').value,11,8),usd?costDecimal(field('fx_rate').value,7,10):'1',quantity);
    preview.textContent=`Prévia · ${unit} por unidade · ${total} total`;
   }catch{preview.textContent='';}
  }
  async function register(event){
   event.preventDefault();
   if(working||busy||mediaBusy||!latest||!current())return;
   let request=costRetries.get(id);
   if(!request){
    const mode=field('entry_kind').value,currency=field('currency').value;
    const stockInput=document.querySelector('[data-shop-form=product] [name=stock]');
    if(mode==='acquisition'&&Number(stockInput?.value)!==latest.stock){
     status.textContent='Resolva a alteração de estoque no formulário do produto antes de registrar uma entrada.';
     return;
    }
    try{
     request={
      product_id:id,request_key:crypto.randomUUID(),revision:latest.revision,expected_stock:latest.stock,
      entry_kind:mode,currency,quantity:field('quantity').value,acquired_on:field('acquired_on').value,
      unit_cost:costDecimal(field('unit_cost').value,11,8),
      ...(currency==='USD'?{fx_rate:costDecimal(field('fx_rate').value,7,10),fx_source:field('fx_source').value,fx_on:field('fx_on').value}:{})
     };
    }catch(err){status.textContent=err.message;return;}
    costRetries.set(id,request);
   }
   busy=true;working=true;save.disabled=true;fields.disabled=true;refresh.hidden=true;
   status.textContent='Registrando lançamento…';
   try{
    const result=await window.NeoCloud.shopCosts('register',request);
    if(token!==generation)return;
    costRetries.delete(id);
    if(!current()){
     if(sameEditor())syncStock(result.stock);
     return;
    }
    render(result);
    form.reset();updatePreview();
    status.textContent='Lançamento registrado.';
   }catch(err){
    if(!current())return;
    const rejected=/^(22|23)/.test(err.code||'')||['40001','42501','PGRST202','42883'].includes(err.code);
    if(rejected)costRetries.delete(id);
    if(err.code==='40001'){latest=null;refresh.hidden=false;}
    status.textContent=err.code==='40001'?'O custo ou estoque mudou. Atualize os dados antes de registrar.':rejected?'Lançamento recusado. Confira os campos e as permissões.':'Não foi possível confirmar. Repita o mesmo envio para consultar o resultado sem duplicar a entrada.';
   }finally{
    if(token===generation)busy=false;
    working=false;save.disabled=false;fields.disabled=costRetries.has(id);
    save.textContent=fields.disabled?'Repetir envio':'Registrar lançamento';
   }
  }
  for(const type of ['input','change'])form.addEventListener(type,updatePreview);
  form.addEventListener('submit',register);
  refresh.addEventListener('click',()=>read());
  more.addEventListener('click',()=>read(true));
  if(costRetries.has(id)){fields.disabled=true;save.textContent='Repetir envio';}
  void read();
 }
 const costPanels=new WeakSet(),costRetries=new Map();
 document.addEventListener('toggle',event=>{
  const host=event.target;
  if(host.open&&host.matches?.('[data-shop-cost]')&&host.dataset.shopCost&&!costPanels.has(host)){
   costPanels.add(host);mountCosts(host);
  }
 },true);
 function productForm(){const max=data.shop_extensions?.gallery?6:1,categories=[...new Set(data.products.map(p=>p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));return `${button('manage','‹ Voltar')}<section class="card space"><div class="shop-product-form-head"><h2>${product.id?'Editar produto':'Adicionar produto'}</h2>${product.id?button('delete_product',trash,`data-id="${e(product.id)}" aria-label="Excluir produto" title="Excluir produto" ${data.shop_extensions?.delete_product?'':'disabled'}`,'icon-btn shop-delete-product'):''}</div>${visibilityEditor()}<form data-shop-form="product" class="space"><fieldset class="shop-editor-photos"><legend>Fotos do produto <small>${productImages.length}/${max}</small></legend><p class="sub">${max>1?'Adicione até 6 fotos. A primeira será a capa do produto.':'Foto de capa. Outras fotos ficam disponíveis após atualizar a estrutura da loja.'}</p><div class="shop-photo-editor-grid">${productImages.map((image,index)=>`<div class="shop-editor-photo">${image.url?`<img src="${e(image.url)}" alt="Foto ${index+1} do produto" width="150" height="150">`:'<span class="sub">Prévia indisponível</span>'}<div>${index===0?'<span class="tag">Capa</span>':button('photo_cover','Usar como capa',`type="button" data-index="${index}"`,'text-btn')}${button('photo_remove',trash,`type="button" data-index="${index}" aria-label="Remover foto ${index+1}"`,'icon-btn shop-delete-product')}</div></div>`).join('')}</div><label class="secondary file-label shop-add-photos">${mediaBusy?'Preparando fotos…':'＋ Adicionar '+(max>1?'fotos':'foto')}<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" ${max>1?'multiple':''} data-shop-photo ${mediaBusy||productImages.length>=max?'disabled':''} hidden></label><p class="sub">As alterações nas fotos só entram no catálogo ao salvar o produto.</p></fieldset>${field('name','Nome do produto','text',product.name||'','required minlength="3" maxlength="120"')}${field('payment_name','Nome no pagamento','text',product.payment_name||product.name||'','required minlength="2" maxlength="120" placeholder="Ex.: Protocolo"')}<p class="sub">Este segundo nome aparece no checkout e no comprovante do Mercado Pago.</p><label>Descrição<textarea name="description" rows="5" maxlength="5000">${e(product.description||'')}</textarea></label><div class="form-grid">${field('category','Categoria','text',product.category||'','required maxlength="40" list="shop-category-list" autocomplete="off" placeholder="Selecione ou escreva uma nova"')}<datalist id="shop-category-list">${categories.map(c=>`<option value="${e(c)}"></option>`).join('')}</datalist>${field('price','Preço em reais','text',product.price??(product.price_cents?String(product.price_cents/100).replace('.',','):''),'required inputmode="decimal"')}${field('stock','Estoque disponível','number',product.stock??0,'required min="0" max="1000000" step="1"')}</div><label class="shop-featured-choice"><input name="featured" type="checkbox" ${product.featured?'checked':''}><span aria-hidden="true">★</span><span>Destacar na tela inicial</span></label><label class="shop-accept"><input name="active" type="checkbox" ${product.active?'checked':''}> Publicar no catálogo</label><button class="primary full space" ${mediaBusy?'disabled':''}>Salvar produto</button></form>${costEditor()}</section>`}
 const states=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
 function shippingRules(){const rules=data.settings.shipping_by_state||{},available=states.filter(state=>!Object.hasOwn(rules,state));return `<section class="shop-shipping-rules"><div><h3>Frete por estado</h3><p class="sub">Cadastre somente as exceções. Nos demais estados será usado o frete padrão do Brasil.</p></div><div class="form-grid shop-shipping-add"><label>Estado<select data-shipping-state><option value="">Selecione</option>${available.map(state=>`<option>${state}</option>`).join('')}</select></label>${field('shipping_state_value','Valor do frete (R$)','text','','inputmode="decimal" placeholder="0,00"')}<button type="button" class="secondary" data-shop="add_shipping_rule" ${available.length?'':'disabled'}>Adicionar estado</button></div><div class="shop-shipping-list">${Object.entries(rules).sort().map(([state,cents])=>`<div class="shop-shipping-row"><strong>${e(state)}</strong><span>${Number(cents)===0?'Grátis':C.money(Number(cents))}</span>${button('remove_shipping_rule','Remover',`type="button" data-state="${e(state)}"`,'text-btn')}</div>`).join('')||'<p class="sub">Nenhuma exceção cadastrada.</p>'}</div></section>`}
 function preserveSettingsForm(){const form=document.querySelector('[data-shop-form=settings]');if(!form)return;const values=Object.fromEntries(new FormData(form)),s=data.settings;for(const key of ['seller_name','seller_document','business_address','support_email','returns_policy'])if(Object.hasOwn(values,key))s[key]=values[key];if(values.shipping!==undefined)try{s.shipping_cents=C.cents(values.shipping,true)}catch{}if(values.delivery_min)s.delivery_min=Number(values.delivery_min);if(values.delivery_max)s.delivery_max=Number(values.delivery_max);s.shipping_ready=values.shipping_ready==='on';}
 function settingsForm(){const s=data.settings;return `${button('manage','‹ Voltar')}<section class="card space"><h2>Entrega e condições da loja</h2><form data-shop-form="settings" class="space">${field('seller_name','Nome da loja ou responsável','text',s.seller_name,'required maxlength="120"')}${field('seller_document','CPF ou CNPJ do responsável','text',s.seller_document||'','required inputmode="numeric" maxlength="14"')}${field('business_address','Endereço comercial','text',s.business_address||'','required maxlength="250"')}${field('support_email','E-mail de atendimento','email',s.support_email,'required maxlength="254"')}<label>Condições de troca e devolução<textarea name="returns_policy" required minlength="10" maxlength="4000" rows="5">${e(s.returns_policy)}</textarea></label><div class="form-grid">${field('shipping','Frete padrão para o Brasil (R$)','text',String(s.shipping_cents/100).replace('.',','),'required inputmode="decimal"')}${field('delivery_min','Prazo mínimo (dias úteis)','number',s.delivery_min,'required min="1" max="90"')}${field('delivery_max','Prazo máximo (dias úteis)','number',s.delivery_max,'required min="1" max="120"')}</div>${shippingRules()}<label class="shop-accept"><input name="shipping_ready" type="checkbox" ${s.shipping_ready?'checked':''}> Entrega e prazo conferidos pela loja</label><p class="notice">Mercado Pago: ${s.payments_ready?'habilitado em '+e(s.payment_environment):'integração pendente de configuração e validação no servidor'}.</p><button class="primary full">Salvar configurações</button></form></section>`}
 function homeSupport(ctx){
  const available=ctx.cloud&&ctx.user?.id&&typeof window.NeoSupport?.view==='function'&&typeof window.NeoCloud?.support==='function';
  const icon='<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M3 14v-2a9 9 0 0 1 18 0v3a4 4 0 0 1-4 4h-3"/><rect x="3" y="12" width="4" height="5" rx="1"/><rect x="17" y="12" width="4" height="5" rx="1"/></svg>';
  const message=icon+'<span>Não encontrou o que procura? Fale com nosso atendimento para consultar a disponibilidade.</span>';
  return available
   ? `<button type="button" class="shop-home-support" data-shop-home-support data-go="comunidade" data-support-shortcut="true">${message}</button>`
   : `<div class="shop-home-support">${message}<small>Atendimento indisponível nesta sessão.</small></div>`;
 }
 function home(ctx=context){const p=homeProducts[homeIndex];return `<section class="card shop-home" data-shop-home aria-label="Destaques da loja" aria-roledescription="carrossel"><div class="between"><div><span class="eyebrow">LOJA NEOPEP</span><h2>Encontre o que você procura.</h2></div><button class="text-btn" data-go="loja">Ver loja ↗</button></div>${p?`<div class="shop-home-slide"><button class="shop-home-image" data-featured-product="${e(p.id)}" aria-label="Ver ${e(p.name)}">${p.photo_url?`<img src="${e(p.photo_url)}" alt="${e(p.name)}" width="300" height="240" loading="lazy">`:bag}</button><div><span class="tag">Em destaque</span><h3>${e(p.name)}</h3><strong class="shop-price">${C.money(p.price_cents)}</strong><button class="primary space" data-featured-product="${e(p.id)}">Comprar</button></div></div>${homeProducts.length>1?`<div class="shop-carousel-controls"><button class="icon-btn" data-featured-step="-1" aria-label="Produto anterior">‹</button><span>${homeIndex+1} / ${homeProducts.length}</span><button class="icon-btn" data-featured-step="1" aria-label="Próximo produto">›</button><button class="text-btn" data-featured-pause aria-pressed="${homePaused}" aria-label="${homePaused?'Retomar':'Pausar'} carrossel">${homePaused?'▶':'Ⅱ'}</button></div>`:''}`:'<div class="shop-home-empty"><span class="shop-home-bag" aria-hidden="true">'+bag+'</span><p>Conheça os produtos disponíveis e escolha o que combina com você.</p><button class="secondary" data-go="loja">Explorar loja</button></div>'}${homeSupport(ctx)}</section>`}
 function paintHome(){const root=document.querySelector('[data-shop-home]');if(!root)return;const active=document.activeElement,step=active?.dataset?.featuredStep,pause=active?.hasAttribute?.('data-featured-pause');root.outerHTML=home();if(step)document.querySelector('[data-featured-step="'+step+'"]')?.focus({preventScroll:true});else if(pause)document.querySelector('[data-featured-pause]')?.focus({preventScroll:true});else if(active?.hasAttribute?.('data-shop-home-support'))document.querySelector('[data-shop-home-support]')?.focus({preventScroll:true})}
 async function loadHome(ctx){context=ctx;session(ctx.user);if(!owner||homeBusy||homeLast&&Date.now()-homeLast<60000)return;homeBusy=true;const token=generation,request=++homeRequest;try{const result=await rpc('featured');if(token!==generation||request!==homeRequest)return;const rows=result.products||[];await Promise.all(rows.map(async p=>{if(!p.photo_path)return;try{p.photo_url=await window.NeoCloud.shopPhotoURL(p.photo_path)}catch{p.photo_url=''}}));if(token!==generation||request!==homeRequest)return;homeProducts=rows;homeIndex=Math.min(homeIndex,Math.max(0,rows.length-1));homeLast=Date.now();paintHome()}catch{if(token===generation)homeLast=Date.now()}finally{if(token===generation&&request===homeRequest)homeBusy=false}}
 document.addEventListener('click',event=>{const step=event.target.closest('[data-featured-step]'),pause=event.target.closest('[data-featured-pause]'),buy=event.target.closest('[data-featured-product]');if(step&&homeProducts.length){homeIndex=(homeIndex+Number(step.dataset.featuredStep)+homeProducts.length)%homeProducts.length;homePaused=true;paintHome()}if(pause){homePaused=!homePaused;paintHome()}if(buy){pendingProduct=buy.dataset.featuredProduct;if(data?.products.some(p=>p.id===pendingProduct&&p.shop_store_hidden!==true)){selected=pendingProduct;pendingProduct=null;mode='detail'}lastLoad=0;const button=document.createElement('button');button.dataset.go='loja';button.hidden=true;document.body.append(button);button.click();button.remove()}});
 setInterval(()=>{if(document.visibilityState!=='visible'||homePaused||homeProducts.length<2||!document.querySelector('[data-shop-home]')||document.querySelector('[data-shop-home]:focus-within')||document.querySelector('[data-shop-home]:hover')||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;homeIndex=(homeIndex+1)%homeProducts.length;paintHome()},6500);
 let lastMeasuredShopMode=null;
 function view(ctx){context=ctx;session(ctx.cloud?ctx.user:null);if(mode!==lastMeasuredShopMode&&data&&ctx.cloud){lastMeasuredShopMode=mode;if(mode==='catalog')window.NeoEngagement?.track('product_list_view','loja')}let content;if(!ctx.cloud)content=empty('Entre na sua conta para acessar a loja','O catálogo e o carrinho são vinculados à conta.');else if(!data)content=`<section class="card">${empty('Preparando sua loja',error||'Carregando os produtos disponíveis…')}${button('refresh','Tentar novamente')}</section>`;else content=mode==='bulk'&&data.can_manage?(requestAnimationFrame(()=>mountBulk(document.querySelector('[data-bulk]'))),bulkPage()):mode==='catalog'?catalogue():mode==='detail'?detail():['cart','address','payment'].includes(mode)?checkout():mode==='orders'?orderCards():mode==='manage_orders'?orderCards(true):mode==='manage'?manager():mode==='product'?productForm():mode==='promotions'?window.NeoShopPromotions?.view()||'':settingsForm();return `<section data-shop-root class="shop-page"><button class="text-btn shop-back-home" ${mode==='catalog'?'data-go="inicio"':'data-shop="back"'} aria-label="Voltar">‹ Voltar</button><div class="page-head"><div><span class="eyebrow">SEU ESPAÇO DE COMPRAS</span><h1>Loja NeoPep</h1></div><div class="shop-header-actions">${button('orders','Meus pedidos')}${button('cart',`Carrinho (${cartCount()})`,'','secondary')}${data?.can_manage?button('manage','Gerenciar','','primary'):''}</div></div>${data&&error?`<p class="notice error" role="alert">${e(error)}</p>`:''}<div data-shop-error role="alert"></div>${content}</section>`}
 async function load(force=false){if(!owner||busy||(!force&&data&&Date.now()-lastLoad<30000))return;busy=true;const token=generation,epoch=visibilityEpoch;try{const result=await rpc('catalog');if(token!==generation||epoch!==visibilityEpoch)return;await Promise.all(result.products.map(p=>hydratePhotos(p)));if(token!==generation||epoch!==visibilityEpoch)return;data=result;cart=result.cart||[];if(result.promotions_ready&&cart.length){await getQuote();if(token!==generation||epoch!==visibilityEpoch)return;}if(pendingProduct){if(!data.products.some(p=>p.id===pendingProduct&&p.shop_store_hidden!==true)){const detail=await rpc('product_detail',{id:pendingProduct});if(token!==generation||epoch!==visibilityEpoch)return;if(detail.product){await hydratePhotos(detail.product,true);if(token!==generation||epoch!==visibilityEpoch)return;data.products.push(detail.product)}}const found=data.products.some(p=>p.id===pendingProduct&&p.shop_store_hidden!==true);if(found){selected=pendingProduct;photoIndex=0;await hydratePhotos(data.products.find(p=>p.id===selected),true);if(token!==generation||epoch!==visibilityEpoch)return;mode='detail';window.NeoEngagement?.track('product_detail_view','loja')}pendingProduct=null;}lastLoad=Date.now();error='';const returned=new URL(location.href).searchParams.get('order');if(returned&&/^[a-f0-9-]{36}$/.test(returned)){paymentReturned=true;paymentReturnOrder=returned;orders=await rpc('orders');if(token!==generation||epoch!==visibilityEpoch)return;mode='orders';const current=new URL(location.href);for(const key of ['order','collection_id','collection_status','payment_id','status','external_reference','payment_type','merchant_order_id','preference_id','site_id','processing_mode','merchant_account_id'])current.searchParams.delete(key);history.replaceState(null,'',current.href)}if(mode==='detail'){const current=data.products.find(p=>p.id===selected);if(current){await hydratePhotos(current,true);if(token!==generation||epoch!==visibilityEpoch)return;photoIndex=Math.min(photoIndex,Math.max(0,(current.photos?.length||1)-1));}}if(mode==='orders'||mode==='manage_orders'){orders=await rpc(mode==='manage_orders'?'manage_orders':'orders');if(token!==generation||epoch!==visibilityEpoch)return}}catch(err){if(token===generation&&epoch===visibilityEpoch)error=['PGRST202','42883'].includes(err.code)?'Falta executar a configuração da loja no Supabase.':err.message}finally{if(token===generation){busy=false;draw()}}}
 async function getQuote(){const token=generation,result=await rpc('quote',address?.state?{state:address.state}:{});if(token!==generation)throw Error('A conta mudou.');quote=result;for(const item of quote.items||[]){const p=data?.products.find(p=>p.id===item.product_id);if(p)p.price_cents=item.unit_price_cents;}if(data?.settings)for(const key of ['shipping_ready','payments_ready','payment_environment','delivery_min','delivery_max','seller_name','seller_document','business_address','support_email','returns_policy'])if(Object.hasOwn(quote,key))data.settings[key]=quote[key];return quote}
 const report=message=>{const target=document.querySelector('[data-shop-error]');if(target)target.textContent=message};
 async function changeCart(id,delta,buy=false){const token=generation;const p=data.products.find(p=>p.id===id);if(!p)throw Error('Produto indisponível.');const next=cart.map(r=>({...r})),row=next.find(r=>r.product_id===id);if(row)row.quantity=buy?Math.max(row.quantity,1):row.quantity+delta;else if(delta>0)next.push({product_id:id,quantity:1});const clean=next.filter(r=>r.quantity>0);if(clean.some(r=>r.quantity>20))throw Error('Limite de 20 unidades por produto.');const result=await rpc('cart',{items:clean});if(token!==generation)throw Error('A conta mudou.');cart=result;if(delta>0)window.NeoEngagement?.track('cart_add','loja');requestKey='';orderID=null;quote=null;if(buy&&!address.state)await loadAddresses();if(data.promotions_ready||buy)await getQuote();if(buy){mode='cart';window.NeoEngagement?.track('checkout_started','loja')}draw()}
 function paymentRedirect(show=true){let overlay=document.querySelector('[data-payment-redirect]');if(!show){overlay?.remove();return}if(overlay)return;overlay=document.createElement('div');overlay.className='shop-payment-redirect';overlay.dataset.paymentRedirect='';overlay.setAttribute('role','alertdialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','paymentRedirectTitle');overlay.innerHTML=`<div class="card shop-payment-redirect-card"><img src="assets/brands/mercadopago.svg" alt=""><p class="eyebrow">PAGAMENTO SEGURO</p><h2 id="paymentRedirectTitle">Redirecionando para o Mercado Pago</h2><p class="sub">Estamos preparando o ambiente seguro para você efetuar o pagamento.</p><div class="shop-payment-progress" role="progressbar" aria-label="Preparando pagamento"><span></span></div><small>Não feche esta tela.</small></div>`;document.body.append(overlay)}
 async function pay(id){const token=generation;paymentRedirect();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));try{const result=await window.NeoCloud.shopPayment(id);if(token!==generation)throw Error('A conta mudou.');if(!C.paymentURL(result.payment_url))throw Error('O link de pagamento retornado não é válido.');window.location.assign(result.payment_url)}catch(err){paymentRedirect(false);throw err}}
 async function exportOrders(){const rows=await rpc('export_orders'),quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"',header=['pedido','data','cliente','status','ambiente','produtos','subtotal','desconto','frete','total','nome_entrega','email_entrega','telefone','endereco','cidade','estado','cep','rastreio','link_rastreio','cancelamento'],lines=rows.map(o=>[o.id,o.created_at,o.customer_email,o.status,o.environment,(o.items||[]).map(i=>`${i.name} x ${i.quantity}`).join(' | '),(o.subtotal_cents||0)/100,(o.discount_cents||0)/100,(o.shipping_cents||0)/100,(o.total_cents||0)/100,o.address?.name,o.address?.email,o.address?.phone,`${o.address?.street||''}, ${o.address?.number||''}`,o.address?.city,o.address?.state,o.address?.postal_code,o.tracking,o.tracking_url,o.cancellation_status].map(quote).join(';')),blob=new Blob(['\ufeff'+[header.join(';'),...lines].join('\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='pedidos-neopeptideos-'+new Date().toISOString().slice(0,10)+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 document.addEventListener('click',async event=>{const b=event.target.closest('[data-shop]');if(!b||busy||mediaBusy)return;const action=b.dataset.shop;if(action==='refresh')return load(true);if(!data)return;if(action==='order_filter'){orderFilter=b.dataset.filter||'all';draw();return;}const token=generation;busy=true;b.disabled=true;try{error='';if(mode==='product'&&['back','manage','catalog','orders','cart','settings'].includes(action))clearPhoto();if(action==='gallery'){const index=Number(b.dataset.index),p=data.products.find(p=>p.id===selected);if(Number.isInteger(index)&&index>=0&&index<(p?.photos?.length||0))photoIndex=index;}else if(action==='photo_cover'||action==='photo_remove'){if(!data.can_manage||mode!=='product')throw Error('Sem permissão para gerenciar.');const index=Number(b.dataset.index);if(!Number.isInteger(index)||!productImages[index])throw Error('Foto inválida.');const [image]=productImages.splice(index,1);if(action==='photo_cover')productImages.unshift(image);else if(image.local)URL.revokeObjectURL(image.url);}else if(action==='delete_product'){if(!data.can_manage||!data.shop_extensions?.delete_product)throw Error('Atualize a estrutura da loja no Supabase para excluir produtos.');const p=data.products.find(p=>p.id===b.dataset.id);if(!p)throw Error('Produto indisponível.');if(!window.confirm('Excluir “'+p.name+'” da loja? Ele sairá do catálogo e dos destaques. Os pedidos anteriores serão preservados.'))return;await rpc('delete_product',{id:p.id});if(token!==generation)return;clearPhoto();homeProducts=homeProducts.filter(row=>row.id!==p.id);homeIndex=0;homeLast=0;mode='manage';busy=false;await load(true);}else if(action==='back'){const wasBulk=mode==='bulk';mode=({detail:'catalog',cart:'catalog',address:'cart',payment:'address',orders:'catalog',manage:'catalog',bulk:'manage',product:'manage',settings:'manage',promotions:'manage',manage_orders:'manage'})[mode]||'catalog';if(wasBulk||visibilityDirty){visibilityDirty=false;setTimeout(()=>{lastLoad=0;void load(true)},0)}}else if(action==='add'||action==='minus'||action==='buy'){await changeCart(b.dataset.id,action==='minus'?-1:1,action==='buy')}else if(action==='promotions'||action==='coupons'){if(!data.can_manage)throw Error('Sem permissão para gerenciar.');mode='promotions';await window.NeoShopPromotions.open({admin:true,products:data.products},draw,action==='coupons'?'coupons':'automatic');}else if(action==='add_shipping_rule'){preserveSettingsForm();const state=document.querySelector('[data-shipping-state]')?.value,value=document.querySelector('[name=shipping_state_value]')?.value;if(!state)throw Error('Selecione o estado.');const cents=C.cents(value,true);data.settings.shipping_by_state={...(data.settings.shipping_by_state||{}),[state]:cents};}else if(action==='remove_shipping_rule'){preserveSettingsForm();const rules={...(data.settings.shipping_by_state||{})};delete rules[b.dataset.state];data.settings.shipping_by_state=rules;}else if(action==='clear_coupon'){await rpc('discount_options',{coupon_code:'',payment_method:quote?.payment_method||'any'});requestKey='';orderID=null;await getQuote();}else if(action==='remove'){cart=await rpc('cart',{items:cart.filter(r=>r.product_id!==b.dataset.id)});quote=null;orderID=null;requestKey='';if(data.promotions_ready)await getQuote();}else if(action==='detail'){selected=b.dataset.id;photoIndex=0;await hydratePhotos(data.products.find(p=>p.id===selected),true);if(token!==generation)return;mode='detail';window.NeoEngagement?.track('product_detail_view','loja')}else if(action==='category'){category=b.dataset.category;mode='catalog'}else if(action==='duplicate_product'){
   if(!data.shop_extensions?.duplicate_product)throw Error('Duplicação indisponível.');
   const id=b.dataset.id,key=duplicateRequests.get(id)||crypto.randomUUID();
   duplicateRequests.set(id,key);
   const duplicate=await rpc('duplicate_product',{id,request_key:key});
   if(token!==generation)return;
   duplicateRequests.delete(id);
   clearPhoto();product={...duplicate};mode='product';
   data.products.unshift(duplicate);
   await hydratePhotos(product,true);
   if(token!==generation)return;
   productImages=(product.photos||[]).map(image=>({...image}));
  }else if(action==='edit'||action==='new'){if(!data.can_manage)throw Error('Sem permissão para gerenciar.');clearPhoto();product=action==='edit'?{...data.products.find(p=>p.id===b.dataset.id)}:{active:true,stock:0};if(action==='edit'){await hydratePhotos(product,true);if(token!==generation)return;productImages=(product.photos||[]).map(image=>({...image}))}mode='product'}else if(action==='orders'||action==='manage_orders'){orders=await rpc(action==='manage_orders'?'manage_orders':'orders');mode=action;if(action==='manage_orders')try{localStorage.setItem('neo-shop-orders-seen:'+owner,new Date().toISOString())}catch{}}else if(action==='select_address'){const saved=savedAddresses.find(a=>a.id===b.dataset.id);if(saved)address={...saved};addressEditing=false;addressError=''}else if(action==='edit_address'){const saved=savedAddresses.find(a=>a.id===b.dataset.id);if(saved)address={...saved};addressEditing=true;addressError=''}else if(action==='new_address'){address=freshAddress();addressEditing=true;addressError=''}else if(action==='use_address'){address=C.address(address);await getQuote();mode='payment';window.NeoEngagement?.track('checkout_step_completed','loja')}else if(action==='address'){await loadAddresses();await getQuote();addressEditing=false;mode='address';window.NeoEngagement?.track('checkout_started','loja')}else if(action==='payment'){address=C.address(address);await getQuote();mode='payment';window.NeoEngagement?.track('checkout_step_completed','loja')}else if(action==='export_orders'){await exportOrders()}else if(action==='cancel_order'||action==='request_cancel'){const paid=action==='request_cancel',reason=window.prompt(paid?'Informe o motivo da solicitação de cancelamento:':'Deseja cancelar este pedido? Você pode informar o motivo:','');if(reason===null)return;await rpc('cancel_order',{id:b.dataset.id,reason});orders=await rpc('orders')}else if(action==='cancel_approve'||action==='cancel_reject'){const note=document.querySelector('[data-cancel-note="'+b.dataset.id+'"]')?.value||'';if(!window.confirm(action==='cancel_approve'?'Aprovar esta solicitação? O reembolso ainda deve ser conferido no Mercado Pago.':'Recusar esta solicitação?'))return;await rpc('cancellation_decision',{id:b.dataset.id,decision:action==='cancel_approve'?'approved':'rejected',note});orders=await rpc('manage_orders')}else if(action==='resume'){orderID=b.dataset.id;await pay(orderID)}else if(action==='bulk'){if(data.can_manage)mode='bulk';}else if(action==='manage'){orders=await rpc('manage_orders');mode='manage';if(visibilityDirty){visibilityDirty=false;setTimeout(()=>{lastLoad=0;void load(true)},0)}}else if(action==='cart'){if(!address.state)await loadAddresses();await getQuote();mode='cart'}else if(['catalog','settings'].includes(action))mode=action;}catch(err){if(token===generation)error=err.message}finally{if(token===generation){busy=false;draw()}}});
 document.addEventListener('input',event=>{if(event.target.matches('[data-order-search]')){orderSearch=event.target.value;const position=event.target.selectionStart;draw();const next=document.querySelector('[data-order-search]');next?.focus({preventScroll:true});if(position!==null)next?.setSelectionRange(position,position);return;}const f=event.target.closest('[data-shop-form]');if(f?.dataset.shopForm==='address'){const input=event.target,name=input.name;let value=input.type==='checkbox'?input.checked:input.value;if(name==='phone'){value=formatPhone(value);input.value=value}else if(name==='postal_code'){value=formatCEP(value);input.value=value;clearTimeout(cepTimer);if(digits(value,8).length===8)cepTimer=setTimeout(()=>lookupCEP(value),250)}else if(name==='document_number'){value=address.document_type==='CNPJ'?formatCNPJ(value):formatCPF(value);input.value=value}address[name]=value;addressError='';requestKey=''}if(f?.dataset.shopForm==='product'&&event.target.type!=='file')product[event.target.name]=event.target.type==='checkbox'?event.target.checked:event.target.value;if(event.target.closest('[data-shop-search]')){clearTimeout(searchTimer);const input=event.target;searchTimer=setTimeout(()=>{search=document.querySelector('#shopQuery')?.value||'';sort=document.querySelector('[data-shop-search] select')?.value||'recent';const position=input.selectionStart;draw();const next=document.querySelector('#shopQuery');if(input.name==='q'&&next){next.focus({preventScroll:true});if(position!==null)next.setSelectionRange(position,position)}},180)}});
 document.addEventListener('change',async event=>{if(event.target.matches('[data-shop-form=address] [name=document_type]')){address.document_type=event.target.value;address.document_number='';const documentInput=document.querySelector('[data-shop-form=address] [name=document_number]');if(documentInput){documentInput.value='';documentInput.placeholder=event.target.value==='CNPJ'?'00.000.000/0000-00':'000.000.000-00';documentInput.maxLength=18;}return;}if(event.target.matches('[data-shop-form=address] [name=phone_country]')){address.phone_country=event.target.value;return;}if(event.target.matches('[data-shop-form=discount_options] [name=payment_method]')){if(busy)return;const token=generation;busy=true;try{await rpc('discount_options',{coupon_code:document.querySelector('[data-shop-form=discount_options] [name=coupon_code]')?.value||'',payment_method:event.target.value});if(token!==generation)return;requestKey='';orderID=null;await getQuote();}catch(err){if(token===generation)error=err.message;}finally{if(token===generation){busy=false;draw();}}return;}if(!event.target.matches('[data-shop-photo]'))return;const files=Array.from(event.target.files||[]);event.target.value='';if(!files.length||busy||mediaBusy)return;const token=generation,request=++mediaVersion,max=data?.shop_extensions?.gallery?6:1;try{if(!data?.can_manage||mode!=='product')throw Error('Sem permissão para gerenciar.');if(productImages.length+files.length>max)throw Error('Use no máximo '+max+' foto(s) por produto. Remova uma foto para adicionar outra.');mediaBusy=true;draw();const clean=[];for(const file of files){clean.push(await context.sanitizePhoto(file));if(token!==generation||request!==mediaVersion)return;}for(const blob of clean)productImages.push({blob,url:URL.createObjectURL(blob),local:true});}catch(err){if(token===generation&&request===mediaVersion)error=err.message;}finally{if(token===generation&&request===mediaVersion){mediaBusy=false;draw()}}});
 document.addEventListener('submit',async event=>{const form=event.target;if(form.matches('[data-shop-search]')){event.preventDefault();return}if(!form.matches('[data-shop-form]'))return;event.preventDefault();if(busy||mediaBusy)return;if(!form.reportValidity()){if(form.dataset.shopForm==='address'){addressError='Preencha os campos obrigatórios destacados para continuar.';const status=form.querySelector('[data-address-error]');if(status)status.textContent=addressError;}return;}const action=form.dataset.shopForm,values=Object.fromEntries(new FormData(form)),token=generation;let failed=false;busy=true;const submit=form.querySelector('button[type=submit],button:not([type])');if(submit)submit.disabled=true;try{error='';if(action==='discount_options'){await rpc('discount_options',{coupon_code:values.coupon_code,payment_method:values.payment_method});requestKey='';orderID=null;await getQuote();}else if(action==='address'){const clean=C.address(values);address=await window.NeoCloud.shopAddress('save',{...clean,id:address.id||null,label:values.label,is_default:values.is_default==='on'});savedAddresses=await window.NeoCloud.shopAddress('list');addressEditing=false;addressError='';await getQuote();mode='payment';window.NeoEngagement?.track('checkout_step_completed','loja')}else if(action==='pay'){if(!values.accept)throw Error('Confirme os dados da compra.');requestKey=requestKey||crypto.randomUUID();if(!orderID){const created=await rpc('order',{request_key:requestKey,address,expected_total_cents:quote.total_cents,...(data.promotions_ready?{quote_token:quote.quote_token}:{}),accept_terms:true});if(token!==generation)return;orderID=created.id;window.NeoEngagement?.track('order_created','loja');cart=[]}await pay(orderID)}else if(action==='product'){if(costRetries.has(product.id))throw Error('Confirme o lançamento pendente em Custos e aquisições antes de salvar o produto.');const price=C.cents(values.price);for(const image of productImages){if(image.blob&&!image.path){const path=await window.NeoCloud.uploadShopPhoto(image.blob);if(token!==generation)return;image.path=path;}}const paths=productImages.map(image=>image.path).filter(Boolean);if(paths.length>1&&!data.shop_extensions?.gallery)throw Error('Atualize a estrutura da loja no Supabase para salvar várias fotos.');await rpc('product',{id:product.id||null,name:values.name,payment_name:values.payment_name,description:values.description,category:values.category,price_cents:price,stock:Number(values.stock),active:values.active==='on',featured:values.featured==='on',photo_path:paths[0]||null,...(data.shop_extensions?.gallery?{photo_paths:paths}:{})});if(token!==generation)return;clearPhoto();homeLast=0;mode='manage';busy=false;await load(true)}else if(action==='settings'){await rpc('settings',{...values,shipping_cents:C.cents(values.shipping,true),shipping_by_state:data.settings.shipping_by_state||{},shipping_ready:values.shipping_ready==='on',delivery_min:Number(values.delivery_min),delivery_max:Number(values.delivery_max)});mode='manage';busy=false;await load(true)}else if(action==='fulfill'){await rpc('fulfill',{id:form.dataset.id,...values});orders=await rpc('manage_orders')}}catch(err){failed=true;if(token===generation){if(action==='pay'&&orderID){try{orders=await rpc('orders');if(token===generation){mode='orders';error='Pedido salvo, mas o pagamento continua pendente. '+err.message;draw()}}catch{report(err.message)}}else if(action==='pay'&&data?.promotions_ready){try{await getQuote()}catch{}error=err.message;draw();}else if(action==='address'){addressError=err.message;draw()}else report(err.message)}}finally{if(token===generation){busy=false;if(submit)submit.disabled=false;if(!failed||action==='pay'||action==='address')draw()}}});
 setInterval(()=>{if(owner&&context.user?.id===owner&&window.NeoCloud.user?.id===owner&&document.visibilityState==='visible'&&document.querySelector('[data-shop-home]'))loadHome(context)},60000);setInterval(async()=>{if(!paymentReturned||mode!=='orders'||busy||document.visibilityState!=='visible')return;const current=orders.find(o=>o.id===paymentReturnOrder);if(current&&!['awaiting_payment','pending'].includes(current.status))return;try{orders=await rpc('orders');draw()}catch{}},5000);
 const renderOrderCards=orderCards;
 orderCards=manage=>{let html=renderOrderCards(manage);if(!manage)html=html.replace(/<button class="secondary space" data-shop="request_cancel" ([^>]*)>Solicitar cancelamento<\/button>/g,(_,attrs)=>`<details class="shop-order-more"><summary aria-label="Mais opções do pedido" title="Mais opções">⋮</summary><div class="shop-order-more-menu"><button class="text-btn" data-shop="request_cancel" ${attrs}>Solicitar cancelamento</button></div></details>`);if(manage){const shell=document.createElement('div');shell.innerHTML=html;const rows=filteredOrders(true);shell.querySelectorAll('.shop-order').forEach((card,index)=>{const order=rows[index];if(!order||['cancelled','expired'].includes(order.status)||order.fulfillment==='delivered'||order.cancellation_status==='approved')return;card.insertAdjacentHTML('beforeend',`<details class="shop-order-more"><summary aria-label="Mais opções do pedido" title="Mais opções">⋮</summary><div class="shop-order-more-menu"><button class="text-btn" data-shop="admin_cancel_order" data-id="${e(order.id)}">Cancelar pedido</button></div></details>`)});html=shell.innerHTML}const standalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;if(manage||!paymentReturned||standalone)return html;return `<div class="notice shop-payment-browser-return" role="status"><strong>Pagamento concluído no Mercado Pago</strong><p>A confirmação será atualizada automaticamente. Feche esta tela do navegador e abra novamente o NeoPep pelo ícone instalado.</p></div>${html}`};
 let mpConfig=null,mpConfigBusy=false,mpSelected='test';
 function paymentSettingsPanel(){const root=mpConfig||{},active=root.active_environment||root.environment||data.settings.payment_environment||'test',c=root.environments?.[mpSelected]||(root.environment===mpSelected?root:{}),webhook=root.webhook_url||new URL('/functions/v1/mercadopago-webhook',window.NEO_CONFIG.supabaseUrl).href,saved=c.configured?' <span class="tag">✓ Salvo</span>':'';return `<section class="card space"><div class="between"><div><h2>Pagamento · Mercado Pago</h2><p class="sub">Teste e Produção ficam salvos separadamente. Somente o ambiente ativo recebe novas compras.</p></div><span class="tag">Ativo: ${active==='production'?'Produção':'Teste'}</span></div><div class="segmented shop-payment-environments" role="tablist"><button type="button" data-payment-environment="test" class="${mpSelected==='test'?'active':''}" aria-selected="${mpSelected==='test'}">Teste</button><button type="button" data-payment-environment="production" class="${mpSelected==='production'?'active':''}" aria-selected="${mpSelected==='production'}">Produção</button></div><form data-shop-payment-form class="space"><input type="hidden" name="environment" value="${mpSelected}"><label>Access Token${saved}<input name="access_token" type="password" autocomplete="new-password" placeholder="${c.configured?'Salvo · deixe vazio para manter':'Cole o Access Token deste ambiente'}"></label><label>Assinatura secreta do webhook${saved}<input name="webhook_secret" type="password" autocomplete="new-password" placeholder="${c.configured?'Salva · deixe vazio para manter':'Cole a assinatura secreta deste ambiente'}"></label><label>URL de notificação<input data-shop-webhook-url readonly value="${e(webhook)}"></label><button type="button" class="secondary" data-shop-copy-webhook>Copiar URL do webhook</button><p class="notice">${c.validated_at?'Conexão validada · conta '+e(c.collector_id):c.configured?'Credenciais salvas. Teste esta conexão antes de ativar.':'Cadastre as credenciais de '+(mpSelected==='production'?'Produção':'Teste')+'.'}</p><div class="shop-admin-actions"><button class="secondary" ${mpConfigBusy?'disabled':''}>Salvar credenciais</button><button type="button" class="secondary" data-shop-payment-test ${!c.configured||mpConfigBusy?'disabled':''}>Testar conexão</button><button type="button" class="primary" data-shop-payment-activate ${!c.validated_at||active===mpSelected||mpConfigBusy?'disabled':''}>${active===mpSelected?'Ambiente ativo':'Ativar '+(mpSelected==='production'?'Produção':'Teste')}</button></div></form></section>`}
 const deliverySettingsForm=settingsForm;settingsForm=()=>deliverySettingsForm().replace(/<p class="notice">Mercado Pago:[\s\S]*?<\/p>/,'');
 async function loadPaymentSettings(){if(mpConfigBusy)return;mpConfigBusy=true;try{const first=!mpConfig;mpConfig=await window.NeoCloud.shopPaymentIntegration('status');if(first)mpSelected=mpConfig.active_environment||mpConfig.environment||mpSelected}catch(err){error=err.message}finally{mpConfigBusy=false;draw()}}
 document.addEventListener('click',event=>{if(event.target.closest('[data-shop=settings]'))setTimeout(loadPaymentSettings);const environment=event.target.closest('[data-payment-environment]');if(environment&&!mpConfigBusy){mpSelected=environment.dataset.paymentEnvironment;draw();return}const copy=event.target.closest('[data-shop-copy-webhook]');if(copy){const input=document.querySelector('[data-shop-webhook-url]');navigator.clipboard?.writeText(input?.value||'').then(()=>{copy.textContent='URL copiada'});return}const activate=event.target.closest('[data-shop-payment-activate]');if(activate&&!mpConfigBusy){mpConfigBusy=true;window.NeoCloud.shopPaymentIntegration('activate',{environment:mpSelected}).then(()=>{error=(mpSelected==='production'?'Produção':'Teste')+' ativado para novas compras.';return load(true)}).then(()=>{mpConfigBusy=false;return loadPaymentSettings()}).catch(err=>{error=err.message;mpConfigBusy=false;draw()});return}const test=event.target.closest('[data-shop-payment-test]');if(!test||mpConfigBusy)return;mpConfigBusy=true;test.disabled=true;window.NeoCloud.shopPaymentIntegration('test',{environment:mpSelected}).then(()=>{error='Conexão '+(mpSelected==='production'?'de Produção':'de Teste')+' validada.';mpConfigBusy=false;return loadPaymentSettings()}).catch(err=>{error=err.message;mpConfigBusy=false;draw()})});
 document.addEventListener('submit',event=>{const form=event.target;if(!form.matches('[data-shop-payment-form]'))return;event.preventDefault();event.stopImmediatePropagation();if(mpConfigBusy||!form.reportValidity())return;const values=Object.fromEntries(new FormData(form));mpConfigBusy=true;window.NeoCloud.shopPaymentIntegration('save',values).then(()=>{error='Credenciais salvas. Agora teste a conexão.';mpConfigBusy=false;return loadPaymentSettings()}).catch(err=>{error=err.message;mpConfigBusy=false;draw()})},true);
 document.addEventListener('click',async event=>{const button=event.target.closest('[data-shop="admin_cancel_order"]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();if(busy||!data?.can_manage)return;const reason=window.prompt('Informe o motivo do cancelamento deste pedido:','Cancelado pela loja');if(reason===null)return;if(!window.confirm('Confirmar o cancelamento? Se o pedido estiver pago, o reembolso deverá ser conferido no Mercado Pago.'))return;busy=true;button.disabled=true;try{await rpc('admin_cancel_order',{id:button.dataset.id,reason});orders=await rpc('manage_orders');error='Pedido cancelado pela loja. Confira o reembolso quando houver pagamento.'}catch(err){error=err.message}finally{busy=false;draw()}},true);
 function openCampaignProduct(id,user){
  session(user);
  pendingProduct=id;lastLoad=0;
 }
 function openCatalog(){lastMeasuredShopMode=null;mode='catalog';selected=null;error='';addressError='';}
 function openManageOrders(){mode='manage_orders';lastLoad=0;orders=[]}
 function openOrders(){mode='orders';lastLoad=0;orders=[];load(true)}
 return {view,load,session,home,loadHome,openCampaignProduct,openCatalog,openOrders,openManageOrders};
})();
