/* NeoPep — aplicativo atual. O armazenamento elo-v1 é somente leitura. */
'use strict';
const C=window.NeoCore, Cloud=window.NeoCloud, $=s=>document.querySelector(s), esc=C.escape;
const KEY='neo-v2', LEGACY='elo-v1';
const icons={expand:'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6',community:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 21v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3',shop:'M5 7h14l1 14H4L5 7Zm3 0V6a4 4 0 0 1 8 0v1',home:'M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10',trend:'M3 17l6-6 4 3 8-10M15 4h6v6',plus:'M12 5v14M5 12h14',calendar:'M8 3v4m8-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-11 12h4',arrow:'M5 12h14m-5-5 5 5-5 5',weight:'M4 5h16v15H4V5Zm4 0a4 4 0 0 0 8 0m-4 4 2-2',measure:'m3 16 13-13 5 5L8 21 3 16Zm6-6 3 3m1-7 3 3m-11 5 3 3',drop:'M12 3C9 8 5 11 5 15a7 7 0 0 0 14 0c0-4-4-7-7-12Z',calc:'M5 3h14v18H5V3Zm3 4h8M8 12h1m6 0h1m-8 4h1m6 0h1',journal:'M5 3h14v18H5V3Zm3 5h8m-8 4h8m-8 4h5',photo:'M3 7h5l2-3h4l2 3h5v14H3V7Zm13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',report:'M4 3h16v18H4V3Zm4 14v-4m4 4V7m4 10v-7',shield:'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6',moon:'M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z',sun:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',heart:'M20 5c-4-4-8 1-8 1S8 1 4 5s0 8 8 15c8-7 12-11 8-15Z',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-5v5l3 2',download:'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',logout:'M10 3H4v18h6m4-15 6 6-6 6m-6-6h12',refresh:'M20 8A8 8 0 1 0 20 16M20 3v5h-5',check:'m5 12 4 4L19 6',layers:'m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5',chevron:'m9 5 7 7-7 7',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7'};
const icon=(n)=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[n]||icons.layers}"/></svg>`;
icons.eye='M2 12c2.5-4.5 5.8-7 10-7s7.5 2.5 10 7c-2.5 4.5-5.8 7-10 7s-7.5-2.5-10-7ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0';icons.eyeOff=icons.eye+'M3 3l18 18';
const fmt=(n,d=1)=>n==null?'—':Number(n).toLocaleString('pt-BR',{maximumFractionDigits:d});
const date=s=>new Date(s+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
const uid=()=>globalThis.crypto?.randomUUID?.()||'neo-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const unit=()=>state.profile.units==='imperial'?'lb':'kg';
const weight=n=>C.formatWeight(n==null?null:unit()==='lb'?n*2.2046226218:n);
const cm=n=>n==null?'—':fmt(state.profile.units==='imperial'?n/2.54:n);
const measureUnit=()=>state.profile.units==='imperial'?'in':'cm';
let signedInAccountId=null,arrivalWelcomeStarted=false,arrivalReady=false;
let historyPrefs={},selectedMeasure='waist',selectedProtocol='',draftRecordId='';
const measurementNames={waist:'Cintura',hip:'Quadril',chest:'Peito',arm:'Braço',thigh:'Coxa'};
let authEmail='',authMessage='',authRemember=Cloud.remember!==false,resetNextAt=0,recoveryFlow=false;
let state=C.blank(),localState=C.blank(),demo=false,mode='local',page='inicio',period='30',recordTab='journal',authMode='login',formKind='',editing=null,busy=false,backupDone=false,legacyBackupDone=false,migrationCandidate=null,localError='',photoList=[],avatarURL='',calendarView='month',calendarDate=new Date(),selectedDate=C.today(),cloudError='',suppressAuth=false,loadGeneration=0;
try{const raw=localStorage.getItem(KEY);if(raw)localState=C.validateBackup(JSON.parse(raw));state=localState}catch(e){localError='Não foi possível ler os dados locais. O conteúdo original foi preservado; exporte a cópia bruta antes de continuar.'}
let legacyExists=false;try{legacyExists=!!localStorage.getItem(LEGACY)}catch{}
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',5000)}
function applyTheme(){window.NeoAppearance?.apply();}
function saveAppearance(value){window.NeoAppearance?.save(value);}
const appearanceModes=[
 ['light','Claro','sun'],['system','Seguir sistema','monitor'],['dark','Escuro','moon']
];
icons.monitor='M3 4h18v12H3V4Zm9 12v4m-4 0h8';
function appearanceMenu(){
 return `<details class="profile-appearance"><summary class="icon-btn" aria-label="Aparência" title="Aparência">${icon('monitor')}</summary><div role="group" aria-label="Aparência">${appearanceModes.map(([value,label,image])=>`<button type="button" class="text-btn" data-appearance="${value}" aria-pressed="${window.NeoAppearance?.value===value}">${icon(image)} ${value==='system'?'Automático':label}</button>`).join('')}</div></details>`;
}
document.addEventListener('neo:appearance',()=>{
 for(const button of document.querySelectorAll('.profile-appearance [data-appearance]'))button.setAttribute('aria-pressed',String(button.dataset.appearance===window.NeoAppearance.value));
});
document.addEventListener('click',event=>{
 const button=event.target.closest('.profile-appearance [data-appearance]');
 const value=button?.dataset.appearance;
 if(!appearanceModes.some(([mode])=>mode===value))return;
 saveAppearance(value);
 const menu=button.closest('details');menu.open=false;menu.querySelector('summary')?.focus();
});
function persist(next){if(demo){state=C.validateBackup(next);return}if(mode!=='local')throw Error('Operação local indisponível nesta conta.');if(localError)throw Error('Exporte e recupere os dados locais antes de gravar.');const valid=C.validateBackup(next);try{localStorage.setItem(KEY,JSON.stringify(valid))}catch{throw Error('Não foi possível salvar neste dispositivo. O armazenamento pode estar cheio ou indisponível. Exporte um backup.')}state=valid;localState=valid}
function localConsent(){return state.profile.consent||confirm('Estes registros podem conter dados de saúde. Você autoriza guardá-los neste navegador? Em dispositivos compartilhados, outras pessoas poderão acessá-los. Você pode exportar e excluir os dados no Perfil.')}
function download(name,data,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000)}
async function backup(){const gen=loadGeneration,snapshot=JSON.parse(JSON.stringify(state));let accountMetadata=null;if(mode==='cloud'&&!demo){
 const account=await Cloud.exportMetadata();
 if(gen!==loadGeneration)throw Error('A conta mudou durante a exportação.');
 const [statistics,location]=await Promise.allSettled([Cloud.audience('export'),Cloud.geoControl('export')]);
 accountMetadata={...account,optionalPrivacy:{
  statistics:statistics.status==='fulfilled'?statistics.value:null,
  location:location.status==='fulfilled'?location.value:null
 }};
}if(gen!==loadGeneration)throw Error('O modo ou conta mudou durante a exportação. Tente novamente.');download((demo?'DEMONSTRACAO-':'')+'neopeptideos-backup-'+C.today()+'.json',JSON.stringify({...snapshot,accountMetadata,exportedAt:new Date().toISOString()},null,2),'application/json');if(!demo)backupDone=true;toast('Backup exportado. Na nuvem inclui consentimentos e recibos. As fotos são exportadas separadamente.');}
function legacyBackup(){const raw=localStorage.getItem(LEGACY);if(!raw)throw Error('Nenhum registro anterior encontrado neste navegador.');download('neopeptideos-registros-anteriores-'+C.today()+'.json',raw,'application/json');legacyBackupDone=true;toast('Backup dos registros anteriores exportado.');render()}
function head(title,sub,action=''){return `${!['inicio','bemvindo','comunidade','loja'].includes(page)?`<div class="page-back-row"><button class="text-btn page-back" data-back="auto">‹ Voltar</button>${page==='perfil'?appearanceMenu():''}</div>`:''}<div class="page-head"><div><div class="eyebrow">${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div><h1>${title}</h1><p class="sub">${sub}</p></div>${action}</div>`}
const addBtn=(kind,label)=>`<button class="primary" data-add="${kind}" aria-label="${label}">${icon('plus')}<span>${label}</span></button>`;
const empty=(title,detail,action='',i='trend')=>`<div class="empty">${icon(i)}<strong>${title}</strong><span>${detail}</span>${action}</div>`;
function periods(){return `<div class="segmented" role="group" aria-label="Período do gráfico">${[['7','7 dias'],['30','30 dias'],['90','90 dias'],['183','6 meses'],['365','1 ano'],['all','Tudo']].map(([v,l])=>`<button data-period="${v}" class="${period===v?'active':''}" aria-pressed="${period===v}">${l}</button>`).join('')}</div>`}
function chartGeometry(rows,key,reference=null){
 const values=rows.map(row=>row[key]);
 if(reference!==null)values.push(reference);
 const min=Math.min(...values)-.5,max=Math.max(...values)+.5;
 const start=C.epoch(rows[0].date),end=C.epoch(rows.at(-1).date);
 const y=value=>165-(value-min)/(max-min)*140;
 const pts=rows.map(r=>({x:end===start?300:42+(C.epoch(r.date)-start)/(end-start)*540,y:y(r[key]),r}));
 const ticks=[0,1,2,3].map(i=>{const value=max-i*(max-min)/3;return {y:y(value),value}});
 return {pts,ticks,y};
}
function chart(rows=C.periodRows(state.weights,period),key='value',label='Peso',display=weight,suffix=unit()){if(!rows.length)return empty(key==='value'?'Sua evolução começa aqui':'Uma medida de cada vez','Não há registros neste período.',addBtn(key==='value'?'weight':'measure',key==='value'?'Registrar peso':'Registrar medidas'));const {pts,ticks}=chartGeometry(rows,key);const description=p=>{const civil=date(p.r.date),weekday=new Date(p.r.date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long'});return (key==='value'?weekday+', '+civil:civil)+' · '+display(p.r[key])+' '+suffix};return `<div class="chart"><svg viewBox="0 0 600 190" role="img" aria-label="${esc(label)} ao longo do tempo"><defs><linearGradient id="chartFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--chart)" stop-opacity=".35"/><stop offset="100%" stop-color="var(--chart)" stop-opacity="0"/></linearGradient></defs>${ticks.map(({y,value})=>`<line x1="38" x2="585" y1="${y}" y2="${y}" class="grid-line"/><text x="0" y="${y+3}" class="chart-label">${esc(display(value))}</text>`).join('')}<path d="M${pts.map(p=>`${p.x},${p.y}`).join(' L')} L${pts.at(-1).x},180 L${pts[0].x},180 Z" fill="url(#chartFade)"/><polyline points="${pts.map(p=>p.x+','+p.y).join(' ')}" fill="none" stroke-width="2.8" stroke-linejoin="round"/>${pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4" stroke-width="2" tabindex="0" role="button" aria-label="${esc(description(p))}" data-tip="${esc(description(p))}"><title>${esc(description(p))}</title></circle>`).join('')}</svg></div><div class="chart-axis"><span>${date(rows[0].date)}</span><span>${date(rows.at(-1).date)}</span></div><div class="chart-tip" id="chartTip" role="status">Toque em um ponto para ver o registro</div>`}
function stats(extended=false,compact=false){const m=C.metrics(state),base=[['Peso atual',weight(m.current),unit(),state.weights.length?'Último registro: '+date(C.sorted(state.weights).at(-1).date):'Seu ponto de partida','weight'],['Peso inicial',weight(m.initial),unit(),'Referência da sua jornada','trend'],['Meta de peso',weight(m.goal),unit(),m.goal?'Sua meta pessoal':'Defina no seu perfil','layers'],['Variação total',m.change==null?'—':(m.change>0?'+':'')+weight(m.change),unit(),'Em relação ao peso inicial','trend']];if(extended)base.push(['IMC',fmt(m.bmi),'kg/m²',m.bmi?'Peso ÷ altura² · valor descritivo':'Informe a altura no perfil','user'],['Gordura corporal',fmt(m.fat),'%',m.fat?'Valor informado por você':'Adicione ao registrar seu peso','drop'],['Acompanhamento',String(m.days),'dias','Desde o primeiro peso','calendar'],['Variação em 7 dias',m.weekly==null?'—':(m.weekly>0?'+':'')+weight(m.weekly),unit(),'Peso atual vs. último registro até 7 dias atrás','trend']);if(compact)return `<section class="card home-health-summary" aria-labelledby="homeSummaryTitle"><div class="card-head"><h2 id="homeSummaryTitle">Seu resumo</h2><button class="text-btn" data-go="evolucao">Detalhes ${icon('arrow')}</button></div><dl class="home-summary-metrics">${base.map(([label,value,units,note],index)=>`<div class="home-summary-metric${index===0?' home-summary-current':''}" title="${esc(note)}"><dt>${esc(label)}</dt><dd>${esc(value)} <small>${esc(units)}</small></dd></div>`).join('')}</dl><p class="home-summary-date">${state.weights.length?'Último registro: '+date(C.sorted(state.weights).at(-1).date):'Adicione seu primeiro peso para começar.'}</p></section>`;return `<div class="stats">${base.map(([l,v,u,n,i])=>`<article class="card stat"><div class="stat-label">${l}${icon(i)}</div><div class="stat-value">${v}<small>${u}</small></div><div class="stat-note">${n}</div></article>`).join('')}</div>`}
const molecule=`<svg viewBox="0 0 200 140" aria-hidden="true"><defs><radialGradient id="orb"><stop offset="0" stop-color="#fff1cf"/><stop offset=".6" stop-color="#e7d7b2"/><stop offset="1" stop-color="#a68b53"/></radialGradient><radialGradient id="violetOrb"><stop stop-color="#fff1cf"/><stop offset="1" stop-color="#c4a264"/></radialGradient></defs><g stroke="#b39760" stroke-width="7" stroke-linecap="round"><path d="m35 87 51-44 61 14 25 51-59 13-27-78m27 78 34-64"/></g><g fill="url(#orb)"><circle cx="35" cy="87" r="17"/><circle cx="86" cy="43" r="24"/><circle cx="147" cy="57" r="18"/><circle cx="172" cy="108" r="14"/></g><circle cx="113" cy="121" r="20" fill="url(#violetOrb)"/></svg>`;
function recent(){return [...state.weights.map(r=>({...r,title:'Peso registrado',detail:weight(r.value)+' '+unit(),route:'registros',icon:'weight'})),...state.measures.map(r=>({...r,title:'Medidas atualizadas',detail:'Cintura: '+cm(r.waist)+' '+measureUnit(),route:'registros',icon:'measure'})),...state.journal.map(r=>({...r,title:'Seu diário',detail:r.note||'Registro de bem-estar',route:'diario',icon:'journal'})),...state.doses.map(r=>({...r,title:'Aplicação registrada',detail:r.product+' · '+fmt(r.amount,4)+' '+r.unit,route:'aplicacoes',icon:'drop'}))].sort((a,b)=>C.epoch(b.date)-C.epoch(a.date)).slice(0,3)}
function dailyTasks(done){const t=state.profile.tracking||{},items=[];if(t.weight!==false)items.push(['weight',done?'Peso de hoje registrado':'Como está seu peso?','Todos os dias · '+state.settings.weightTime,'weight']);if(t.measures!==false)items.push(['measure','Seu registro de medidas','Uma vez por semana','measure']);if(t.journal)items.push(['journal','Como você se sente?','Um check-in com seu bem-estar','journal']);if(t.photos)items.push(['photo','Suas fotos de evolução','Adicione uma foto privada quando desejar','photo']);if(t.applications)items.push(['drop','Seu diário de aplicações','Somente conforme sua prescrição','dose']);return items.map(([i,title,note,kind])=>`<div class="task"><div class="task-icon">${icon(i)}</div><div><b>${esc(title)}</b><small>${esc(note)}</small></div><button class="icon-btn" data-add="${kind}" aria-label="${esc(title)}">${icon('plus')}</button></div>`).join('')||'<p class="sub space">Personalize seu acompanhamento no Perfil. Todos os módulos continuam disponíveis em Registros.</p>'}
function goalIntent(initial,goal){if(initial==null||goal==null||initial===''||goal==='')return '';const a=Number(initial),b=Number(goal);if(!Number.isFinite(a)||!Number.isFinite(b)||a<=0||b<=0)return '';return b>a?'Meta de ganho de peso':b<a?'Meta de redução de peso':'Meta de manutenção do peso';}
function journeyProgress(m){const j=C.weightJourney(m),delta=m.current!=null&&m.initial!=null?m.current-m.initial:null,deltaClass=delta==null||delta===0?'':j.raw>0?'journey-delta-toward':'journey-delta-away',deltaText=delta==null?'—':(delta>0?'+':delta<0?'−':'')+weight(Math.abs(delta))+' '+unit();return `<div class="between"><span class="sub">${j.kind==='maintain'?'Acompanhamento da sua meta':'Progresso até a sua meta'}</span><b class="${j.away?'journey-negative-percent':''}">${j.percent==null?'—':fmt(j.percent,0)+'%'}</b></div><p class="journey-direction sub">${goalIntent(m.initial,m.goal)}</p><div class="progress journey-progress ${j.away?'journey-away':''}" style="--journey-progress:${j.position}%;--journey-zero:${j.zero}%" aria-label="${j.away?'Peso na direção oposta à meta':'Progresso até a meta'}"><i style="left:${j.fillStart}%;width:${j.fillWidth}%"></i><span class="journey-zero-tick" aria-hidden="true"></span>${m.current!=null?`<span class="journey-current-weight" aria-label="Peso atual: ${weight(m.current)} ${unit()}">${weight(m.current)} ${unit()}</span>`:''}</div><div class="journey-axis-labels" style="--journey-zero:${j.zero}%"><span class="journey-zero-label"><b class="${deltaClass}" aria-label="Variação desde o peso inicial">${deltaText}</b><small>Início: ${weight(m.initial)} ${unit()}</small></span><span class="journey-goal-label">Meta: ${weight(m.goal)} ${unit()}</span></div>${j.away?'<p class="sub journey-away-note">Você se distanciou da sua meta.</p>':j.kind==='maintain'?'<p class="sub">A meta é manter o peso inicial; acompanhe as variações pelos registros.</p>':''}`;}
let homeDetailsOpen=false;
function setHomeDetails(open){if(open&&!homeDetailsOpen)engagementTrack('home_journey_expand','inicio');homeDetailsOpen=!!open;const panel=document.getElementById('homeJourneyDetails'),button=document.querySelector('[data-home-details]');if(panel)panel.hidden=!homeDetailsOpen;if(button){button.setAttribute('aria-expanded',String(homeDetailsOpen));button.querySelector('span').textContent=homeDetailsOpen?'Ocultar acompanhamento':'Ver meu acompanhamento';}if(page==='inicio'){if(!open)comparisonPrepared.fill(null);hydratePhotoImages();}}
function homeJourneyDetails(done){return stats(true,true)+comparisonCard(true)+`<div class="home-today"><section class="card"><div class="card-head"><div><h2>Seu cuidado de hoje</h2><p class="sub">Um momento para você.</p></div><span class="tag">${done?icon('check'):'Hoje'}</span></div>${dailyTasks(done)}<button class="text-btn full" data-go="lembretes">${icon('bell')} Personalizar lembretes</button></section></div><div class="space"><section class="card"><div class="card-head"><h2>Seus últimos passos</h2><button class="text-btn" data-go="registros">Ver todos</button></div>${recent().length?recent().map(r=>`<div class="task"><div class="task-icon">${icon(r.icon)}</div><div><b>${r.title}</b><small>${esc(r.detail.slice(0,75))} · ${date(r.date)}</small></div><button class="icon-btn" data-go="${r.route}" aria-label="Ver ${r.title}">${icon('chevron')}</button></div>`).join(''):empty('Seu primeiro passo pode ser hoje','Registre um peso, medida ou momento do seu dia.','','journal')}</section></div>`}
function overview(){const m=C.metrics(state),name=state.profile.name.trim().split(/\s+/)[0],hour=new Date().getHours(),greeting=hour<12?'Bom dia':hour<18?'Boa tarde':'Boa noite',next=C.nextReminders(state)[0],done=state.weights.some(r=>r.date===C.today());return head(greeting+(name?', '+esc(name):'')+'.','Um novo dia para acompanhar sua evolução.','')+`<section class="card home-journey"><div class="card-head"><h2>Uma jornada com propósito</h2><div class="home-quick-actions"><button class="primary home-quick-add" data-add="weight" aria-label="Adicionar registro de peso">${icon('plus')}</button><button class="home-dose-shortcut" data-go="calculadora" aria-label="Dose: abrir calculadora">${icon('calc')}<span>Dose</span></button></div></div>${m.goal?journeyProgress(m):`<p class="sub">Defina uma meta pessoal e acompanhe a distância entre seu ponto de partida e seu objetivo.</p><button class="text-btn" data-go="perfil">Definir minha meta ${icon('arrow')}</button>`}<div class="task"><div class="task-icon">${icon('clock')}</div><div><b>Próximo lembrete</b><small>${next?esc(next.title)+' · '+next.next.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'Nenhum lembrete'}</small></div></div><button type="button" class="secondary full home-details-toggle" data-home-details aria-controls="homeJourneyDetails" aria-expanded="${homeDetailsOpen}"><span>${homeDetailsOpen?'Ocultar acompanhamento':'Ver meu acompanhamento'}</span>${icon('chevron')}</button></section>`+`<div id="homeJourneyDetails" class="home-journey-details" role="region" aria-label="Resumo e registros da sua jornada" ${homeDetailsOpen?'':'hidden'}>${homeJourneyDetails(done)}</div>`+(window.NeoLibrary?.home?.()||'')+`<section class="card" aria-labelledby="homeNutritionTitle"><h2 id="homeNutritionTitle">Minha alimentação</h2><p class="sub">Em breve</p></section>`+(window.NeoShop?.home?.({cloud:mode==='cloud'&&!demo,user:Cloud.user})||'')+homeCalculatorCard()}
function historyTable(type,rows=state[type]){const preferences=historyPrefs[type]||{query:'',from:'',to:'',page:0};const searchable=rows.map(r=>type==='doses'?{...r,protocolName:state.protocols.find(p=>p.id===r.protocolId)?.name||''}:r),data=C.filterRecords(searchable,preferences).reverse(),size=12,pages=Math.max(1,Math.ceil(data.length/size)),current=Math.min(preferences.page||0,pages-1),start=current*size;const headers={weights:['Data','Peso','Gordura','Nota'],measures:['Data','Cintura','Quadril','Peito','Braço','Coxa','Gordura'],doses:['Data','Produto','Dose informada','Local','Protocolo','Nota'],journal:['Data','Bem-estar','Energia','Sono','Apetite','Água','Atividade','Nota'],protocols:['Início','Nome','Fim','Status','Observações'],reminders:['Início','Título','Horário','Repetição','Status']};const value=(n,u,display=fmt)=>n==null?'—':display(n)+' '+u;
const values=r=>type==='weights'?[date(r.date),value(r.value,unit(),weight),value(r.fat,'%'),r.note]:type==='measures'?[date(r.date),...['waist','hip','chest','arm','thigh'].map(k=>value(r[k],measureUnit(),cm)),value(r.fat,'%')]:type==='doses'?[date(r.date),r.product,fmt(r.amount,4)+' '+r.unit,r.site,r.protocolName||(r.protocolId?'Protocolo não disponível':'Sem vínculo'),r.note]:type==='journal'?[date(r.date),value(r.wellbeing,'/ 5'),value(r.energy,'/ 5'),value(r.sleep,'h'),value(r.appetite,'/ 5'),value(r.water,'L'),value(r.activity,'min'),r.note]:type==='protocols'?[date(r.date),r.name,r.end?date(r.end):'—',r.status==='active'?'Em acompanhamento':'Encerrado',r.note]:[date(r.date),r.title,r.time,{once:'Uma vez',daily:'Diário',weekly:'Semanal'}[r.repeat],r.enabled?'Ativo':'Pausado'];
const actions=r=>`<button class="text-btn" data-edit="${type}:${esc(r.id)}" aria-label="Editar registro de ${date(r.date)}">Editar</button>${type==='reminders'?`<button class="text-btn" data-toggle-reminder="${esc(r.id)}">${r.enabled?'Pausar':'Ativar'}</button>`:''}<button class="delete" data-delete="${type}:${esc(r.id)}" aria-label="Excluir registro de ${date(r.date)}">${icon('trash')}</button>`;
return `<div class="history-block" data-history="${type}" tabindex="-1"><p class="history-print-context">${esc(preferences.from||preferences.to?'Datas: '+(preferences.from?date(preferences.from):'início')+' até '+(preferences.to?date(preferences.to):'hoje'):'Todo o período desta seção')}${preferences.query?' · Busca: '+esc(preferences.query):''} · ${data.length} registros</p><details class="history-filters" ${preferences.query||preferences.from||preferences.to?'open':''}><summary>${icon('report')} Filtrar histórico · ${data.length} de ${rows.length} registros</summary><form data-history-filter="${type}"><label>Buscar por texto<input type="search" name="query" value="${esc(preferences.query||'')}" maxlength="100" placeholder="Produto, observação ou protocolo"></label><div class="form-grid"><label>De<input type="date" name="from" value="${esc(preferences.from||'')}"></label><label>Até<input type="date" name="to" value="${esc(preferences.to||'')}"></label></div><div class="inline-actions"><button class="secondary" type="submit">Aplicar filtros</button><button class="text-btn" type="button" data-history-reset="${type}">Limpar filtros</button></div><p class="form-help space">A busca muda apenas a visualização. Seus registros são preservados.</p></form></details>${!data.length?empty(rows.length?'Nenhum registro neste filtro':'Ainda sem registros',rows.length?'Ajuste as datas ou o texto da busca.':'Cada registro ajuda a contar sua história.','','journal'):`<div class="table-wrap history-desktop"><table><thead><tr>${headers[type].map(h=>`<th>${h}</th>`).join('')}<th>Ações</th></tr></thead><tbody>${data.map((r,index)=>`<tr ${index<start||index>=start+size?'class="print-only"':''}>${values(r).map(v=>`<td class="note">${esc(v??'—')}</td>`).join('')}<td>${actions(r)}</td></tr>`).join('')}</tbody></table></div><div class="history-mobile">${data.slice(start,start+size).map(r=>`<article class="history-record"><div class="between"><strong>${date(r.date)}</strong><span class="tag">${esc(values(r)[1]||'Registro')}</span></div><dl>${values(r).slice(1).map((v,i)=>v!=null&&v!==''&&v!=='—'?`<div><dt>${headers[type][i+1]}</dt><dd>${esc(v)}</dd></div>`:'').join('')}</dl><div class="history-actions">${actions(r)}</div></article>`).join('')}</div><div class="history-pagination"><span>${start+1}–${Math.min(start+size,data.length)} de ${data.length}</span><div><button class="secondary" data-history-page="${type}:${current-1}" ${current===0?'disabled':''} aria-label="Página anterior">‹</button><span>${current+1} / ${pages}</span><button class="secondary" data-history-page="${type}:${current+1}" ${current>=pages-1?'disabled':''} aria-label="Próxima página">›</button></div></div>`}</div>`}
function measureSummary(){return `<div class="measure-summary">${C.measureChanges(state.measures).map(r=>`<div><span>${measurementNames[r.key]}</span><b>${r.current==null?'—':cm(r.current)+' '+measureUnit()}</b><small>${r.change==null?'A partir de dois registros':(r.change>0?'+':'')+cm(r.change)+' '+measureUnit()+' desde a primeira medida'}</small></div>`).join('')}</div>`}

function evolution(){return head('Sua evolução, em detalhes.','Uma visão completa das mudanças que você registrou.',addBtn('measure','Registrar medidas'))+stats(true)+`<section class="card"><div class="card-head"><h2>Evolução do peso</h2>${addBtn('weight','Registrar peso')}</div>${periods()}${chart()}</section><div class="two-cols space"><section class="card"><div class="card-head"><h2>Evolução das medidas</h2><label class="compact-label">Medida<select id="measureSeries">${Object.entries(measurementNames).map(([key,name])=>`<option value="${key}" ${key===selectedMeasure?'selected':''}>${name}</option>`).join('')}</select></label></div>${chart(C.periodRows(state.measures,period).filter(r=>r[selectedMeasure]!=null),selectedMeasure,measurementNames[selectedMeasure],cm,measureUnit())}</section><section class="card"><h2>Comparação entre períodos</h2>${comparison()}<button class="text-btn" data-go="relatorios">Abrir relatório completo ${icon('arrow')}</button></section></div>`+comparisonCard(true)}
function comparison(){const days=period==='all'?30:Number(period),now=C.epoch(C.today()),current=state.weights.filter(r=>C.epoch(r.date)>=now-(days-1)*C.DAY),previous=state.weights.filter(r=>C.epoch(r.date)>=now-(days*2-1)*C.DAY&&C.epoch(r.date)<now-(days-1)*C.DAY),avg=a=>a.length?a.reduce((t,r)=>t+r.value,0)/a.length:null,a=avg(current),b=avg(previous);return `<div class="task"><div><b>Últimos ${days} dias</b><small>Média de ${current.length} registros</small></div><strong>${weight(a)} ${unit()}</strong></div><div class="task"><div><b>${days} dias anteriores</b><small>Média de ${previous.length} registros</small></div><strong>${weight(b)} ${unit()}</strong></div><p class="sub space">${a!=null&&b!=null?'Variação entre médias: '+(a-b>0?'+':'')+weight(a-b)+' '+unit()+'.':'Faltam registros em um dos períodos para comparar.'}</p>`}
function records(){return head('Tudo o que faz parte da sua jornada.','Seus registros, organizados em um só lugar.')+`<div class="record-menu">${[['diario','Diário pessoal','Seu bem-estar, dia a dia','journal'],['aplicacoes','Aplicações','Seu histórico de cuidado','drop'],['protocolos','Protocolos','Organize seus registros','layers'],['fotos','Fotos de evolução','Um olhar sobre as mudanças','photo'],['calculadora','Calculadora','Volume e marcações U-100','calc'],['relatorios','Relatórios','Dados em perspectiva','report'],['lembretes','Lembretes','Uma rotina que combina com você','bell'],['evolucao','Peso e medidas','Cada mudança conta','measure']].map(([p,t,s,i])=>`<button class="card menu-tile" data-go="${p}">${icon(i)}<span><b>${t}</b><small>${s}</small></span></button>`).join('')}</div><section class="card space"><div class="card-head"><h2>Histórico de peso</h2>${addBtn('weight','Registrar peso')}</div>${historyTable('weights')}</section><section class="card space"><div class="card-head"><h2>Medidas corporais</h2>${addBtn('measure','Registrar medidas')}</div>${measureSummary()}${historyTable('measures')}</section><section class="card space"><div class="card-head"><h2>Histórico de aplicações</h2>${addBtn('dose','Registrar aplicação')}</div>${historyTable('doses')}</section>`}
function journal(){const js=C.periodRows(state.journal,period),mean=k=>{const a=js.filter(r=>r[k]!=null);return a.length?fmt(a.reduce((v,r)=>v+r[k],0)/a.length):'—'};return head('Como você se sente também importa.','Um diário opcional para observar sua rotina.',addBtn('journal','Registrar meu dia'))+`<section class="card"><div class="card-head"><h2>Um olhar para o seu bem-estar</h2><span class="tag">${js.length} registros</span></div>${periods()}<div class="journal-row">${[['Energia média',mean('energy')+'/5'],['Sono médio',mean('sleep')+' h'],['Hidratação média',mean('water')+' L'],['Atividade média',mean('activity')+' min']].map(([l,v])=>`<div><span>${l}</span><b>${v}</b></div>`).join('')}</div><p class="sub space">Médias dos registros informados no período. Estes dados não estabelecem diagnóstico ou relação com aplicações.</p></section><section class="card space"><h2>Meu diário</h2>${historyTable('journal',js)}</section>`}
function applications(){return head('Seu diário de aplicações.','Registre o que foi aplicado conforme sua prescrição.',addBtn('dose','Registrar aplicação'))+`<div class="notice">Este diário não define doses, frequência ou adequação de produtos. Não há sugestões automáticas de administração.</div><section class="card"><div class="card-head"><h2>Histórico de aplicações</h2><button class="text-btn" data-go="protocolos">Ver protocolos</button></div><label class="space">Protocolo<select id="protocolFilter"><option value="">Todos os protocolos</option>${state.protocols.map(p=>`<option value="${esc(p.id)}" ${selectedProtocol===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>${historyTable('doses',selectedProtocol?state.doses.filter(r=>r.protocolId===selectedProtocol):state.doses)}</section>`}
function protocolCards(){return state.protocols.map(p=>{const applications=C.sorted(state.doses.filter(d=>d.protocolId===p.id)),last=applications.at(-1);return `<article class="card protocol-card"><div class="between"><h3>${esc(p.name)}</h3><span class="tag">${p.status==='active'?'Em acompanhamento':'Encerrado'}</span></div><p class="sub">Desde ${date(p.date)}${p.end?' · até '+date(p.end):''}</p><div class="protocol-count"><strong>${applications.length}</strong><span>aplicações registradas</span></div><p class="sub">${last?'Último registro: '+date(last.date):'Ainda sem aplicação vinculada.'}</p>${p.note?`<p class="sub protocol-note">${esc(p.note)}</p>`:''}<button class="text-btn" data-protocol-apps="${esc(p.id)}">Ver aplicações ${icon('arrow')}</button></article>`}).join('')}
function protocols(){return head('Seu histórico de protocolos.','Organize datas e informações cadastradas por você.',addBtn('protocol','Novo protocolo'))+`<div class="notice">Este espaço organiza registros pessoais. Não cria esquemas de administração nem recomenda mudanças de dose.</div>${state.protocols.length?`<div class="two-cols">${protocolCards()}</div>`:''}<section class="card space"><h2>Protocolos registrados</h2>${historyTable('protocols')}</section>`}
const calcFields={
 mass:{label:'Massa total do frasco',unit:'mg',max:60,step:.5,choices:[5,10,15,20,40,60]},
 volume:{label:'Volume do diluente',unit:'mL',max:5,step:.01,choices:[1,2,3,5]},
 dose:{label:'Dose informada',unit:'mg',max:10,step:.1,choices:[.5,1,1.5,2,2.5,3,3.5,5,7.5,10]}
};
const calcMinimum=.000001;
// Reference configurations of standard-scale U-100 syringes. Other models can differ.
const syringeModels={
 '0.3':{units:30,division:1,length:166,height:24},
 '0.5':{units:50,division:1,length:166,height:30},
 '1':{units:100,division:2,length:166,height:38}
};
let calcCapacityValue=1,calcOutcome='';
function calcNumber(value){
 if(value!==0&&(Math.abs(value)<1e-6||Math.abs(value)>=1e9))return value.toExponential().replace('.',',');
 const [whole,fraction]=String(value).split('.');
 return whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+(fraction?','+fraction:'');
}
const calcResultsNumber=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2});
function calcDisplay(value){
 return Math.abs(value)>=1e9?value.toExponential(2).replace('.',','):calcResultsNumber.format(value);
}
let calcGraphicSequence=0;
function calcVial(id){
 const art='calc-vial-'+(++calcGraphicSequence);
 const glass='M28 23h28v14l10 10v33a8 8 0 0 1-8 8H26a8 8 0 0 1-8-8V47l10-10z';
 return `<svg class="calc-vial" viewBox="0 0 84 100" aria-hidden="true">
 <defs>
  <linearGradient id="${art}-glass">
   <stop stop-color="var(--calc-art-ink,#806235)" stop-opacity=".65"/><stop offset=".12" stop-color="var(--calc-art-tint,#e7c88f)" stop-opacity=".45"/>
   <stop offset=".35" stop-color="var(--calc-art-tint,#e9d7b1)" stop-opacity=".12"/><stop offset=".69" stop-color="var(--calc-art-light,#f3e4c4)" stop-opacity=".08"/>
   <stop offset=".9" stop-color="var(--calc-art-tint,#e6c38a)" stop-opacity=".32"/><stop offset="1" stop-color="var(--calc-art-edge,#8c6e43)" stop-opacity=".65"/>
  </linearGradient>
  <linearGradient id="${art}-depth" x2="0" y2="1">
   <stop stop-color="var(--calc-art-light,#fff5db)" stop-opacity=".2"/><stop offset=".43" stop-color="var(--calc-art-edge,#a7885e)" stop-opacity="0"/>
   <stop offset="1" stop-color="var(--calc-art-ink,#6b4b25)" stop-opacity=".4"/>
  </linearGradient>
  <linearGradient id="${art}-cap" x2="0" y2="1">
   <stop stop-color="var(--calc-art-tint,#f1d5a0)"/><stop offset=".25" stop-color="var(--calc-art-mid,#cfa46a)"/><stop offset=".67" stop-color="var(--calc-art-edge,#927043)"/><stop offset="1" stop-color="var(--calc-art-edge,#b98d50)"/>
  </linearGradient>
  <linearGradient id="${art}-liquid" x2="0" y2="1">
   <stop stop-color="var(--calc-art-light,#fff0c9)" stop-opacity=".9"/><stop offset=".08" stop-color="var(--calc-art-tint,#eacf91)" stop-opacity=".84"/>
   <stop offset=".36" stop-color="var(--calc-art-mid,#c79549)" stop-opacity=".73"/><stop offset="1" stop-color="var(--calc-art-edge,#91642d)" stop-opacity=".86"/>
  </linearGradient>
  <radialGradient id="${art}-shadow"><stop stop-color="var(--calc-art-shadow,#261b0d)" stop-opacity=".36"/><stop offset="1" stop-color="var(--calc-art-shadow,#261b0d)" stop-opacity="0"/></radialGradient>
  <clipPath id="${art}-chamber"><path d="M30 25h24v13l9 10v31q0 6-6 6H27q-6 0-6-6V48l9-10z"/></clipPath>
 </defs>
 <ellipse cx="42" cy="91" rx="30" ry="5" fill="url(#${art}-shadow)"/>
 <path d="${glass}" fill="url(#${art}-glass)" stroke="var(--calc-art-edge,#ad8f60)" stroke-width="1.15"/>
 <g clip-path="url(#${art}-chamber)">
  <svg data-calc-fill="${id}" x="21" y="85" width="42" height="0" overflow="hidden">
   <rect width="42" height="100%" rx="2" fill="url(#${art}-liquid)"/>
   <path d="M1 .65Q21 3.8 41 .65" fill="none" stroke="var(--calc-art-light,#fff1ce)" stroke-opacity=".58" stroke-width=".85"/>
  </svg>
  <path d="${glass}" fill="url(#${art}-depth)"/>
  <path d="M31 27v12l-8 10v28q0 4 3 5m3-32v22" fill="none" stroke="var(--calc-art-light,#fff9ed)" stroke-width="2" stroke-opacity=".43" stroke-linecap="round"/>
  <path d="M55 42l6 8v24" fill="none" stroke="var(--calc-art-light,#fff3d5)" stroke-width="1.3" stroke-opacity=".28" stroke-linecap="round"/>
 </g>
 <path d="M24 82q2 3 6 3h24q4 0 6-3" fill="none" stroke="var(--calc-art-light,#fff1cf)" stroke-opacity=".65" stroke-width="1.5"/>
 <path class="calc-mark" d="M46 52h12m-7 10h7m-12 10h12"/>
 <rect x="23" y="9" width="38" height="15" rx="4" fill="url(#${art}-cap)" stroke="var(--calc-art-edge,#997447)" stroke-width=".85"/>
 <path d="M27 12h30" stroke="var(--calc-art-light,#fff1cf)" stroke-opacity=".65" stroke-linecap="round"/>
 <path d="M28 15v5m4-5v5m4-5v5m4-5v5m4-5v5m4-5v5m4-5v5m4-5v5" stroke="var(--calc-art-ink,#6e4d29)" stroke-opacity=".35" stroke-width=".7"/>
 </svg>`;
}
function syringeReading(capacity,units){
 const {units:max,division}=syringeModels[capacity];
 const tolerance=Number.EPSILON*Math.max(1,Math.abs(units))*8;
 const outside=units-max>tolerance;
 const nearest=Math.round(units/division)*division;
 const between=!outside&&Math.abs(nearest-units)>tolerance;
 return {outside,between,mark:outside?max:between?Math.floor(units/division)*division:Math.min(max,nearest)};
}
function syringeSymbol(capacity,mark=0,compact=false,calculated=null){
 const {units,division,length:baseLength,height}=syringeModels[capacity];
 const wide=!compact&&units===100;
 const length=wide?196:baseLength;
 const end=246,start=end-length,top=43-height/2,bottom=top+height;
 const position=value=>end-value/units*length;
 const piston=position(mark),grip=start-9-(wide?34:42)*mark/units;
 const label=calculated===null?'':calcDisplay(calculated)+' UI';
 const labelWidth=Math.max(48,label.length*6+10),labelX=Math.max(labelWidth/2+2,Math.min(284-labelWidth/2,piston));
 const art='calc-syringe-'+(++calcGraphicSequence);
 const ticks=[];
 const tickStep=compact?10:division;
 for(let value=0;value<=units;value+=tickStep){
  const x=position(value),major=value%10===0;
  ticks.push(`<path class="calc-mark" ${compact?'':`data-graduation="${value}"`} d="M${x} ${bottom}v-${major?11:5}"/>${major&&!compact?`<text x="${x}" y="75" text-anchor="middle">${value}</text>`:''}`);
 }
 return `<svg class="calc-syringe" viewBox="0 ${compact?'13':'0'} 286 ${compact?'56':'82'}" aria-hidden="true">
 <defs>
  <linearGradient id="${art}-glass" x2="0" y2="1">
   <stop stop-color="var(--calc-art-edge,#a68b64)" stop-opacity=".6"/><stop offset=".14" stop-color="var(--calc-art-light,#fff0d4)" stop-opacity=".48"/>
   <stop offset=".45" stop-color="var(--calc-art-tint,#e9d7b7)" stop-opacity=".09"/><stop offset=".72" stop-color="var(--calc-art-mid,#bd9f73)" stop-opacity=".19"/>
   <stop offset="1" stop-color="var(--calc-art-edge,#997e58)" stop-opacity=".64"/>
  </linearGradient>
  <linearGradient id="${art}-liquid" x2="0" y2="1">
   <stop stop-color="var(--calc-art-tint,#fcdf9e)" stop-opacity=".63"/><stop offset=".4" stop-color="var(--calc-fluid-pigment,#c49650)" stop-opacity=".65"/>
   <stop offset="1" stop-color="var(--calc-fluid-pigment,#c49650)" stop-opacity=".92"/>
  </linearGradient>
  <linearGradient id="${art}-metal" x2="0" y2="1">
   <stop stop-color="var(--calc-art-tint,#e5d3b3)"/><stop offset=".26" stop-color="var(--calc-art-mid,#bcaa8d)"/>
   <stop offset=".55" stop-color="var(--calc-art-ink,#726657)"/><stop offset=".82" stop-color="var(--calc-art-edge,#9d8a71)"/><stop offset="1" stop-color="var(--calc-art-ink,#665c4f)"/>
  </linearGradient>
  <radialGradient id="${art}-shadow"><stop stop-color="var(--calc-art-shadow,#2c2014)" stop-opacity=".33"/><stop offset="1" stop-color="var(--calc-art-shadow,#2c2014)" stop-opacity="0"/></radialGradient>
  <clipPath id="${art}-chamber"><rect x="${start}" y="${top+2}" width="${length}" height="${height-4}" rx="2"/></clipPath>
  <clipPath id="${art}-stem"><rect x="0" y="0" width="${start}" height="82"/></clipPath>
 </defs>
 <ellipse cx="${(start+end)/2}" cy="${bottom+3}" rx="${length/2+4}" ry="5" fill="url(#${art}-shadow)"/>
 <path d="M254 43h24l3-1" fill="none" stroke="var(--calc-art-edge,#968974)" stroke-width="1.4" stroke-linecap="round"/>
 <rect x="245" y="39" width="13" height="8" rx="2" fill="url(#${art}-metal)"/>
 <g class="calc-external-stem" clip-path="url(#${art}-stem)">
  <rect x="${grip}" y="41" width="${Math.max(0,piston-grip)}" height="4" rx="2" fill="url(#${art}-metal)"/>
  <rect x="${grip-3}" y="34" width="5" height="18" rx="2" fill="url(#${art}-metal)" stroke="var(--calc-art-ink,#736452)" stroke-width=".6"/>
 </g>
 <rect class="calc-syringe-barrel" x="${start}" y="${top}" width="${length}" height="${height}" rx="3" fill="url(#${art}-glass)" stroke="var(--calc-art-edge,#9a845f)" stroke-width="1.15"/>
 <rect x="${start-2}" y="${top-4}" width="4" height="${height+8}" rx="1.5" fill="url(#${art}-metal)"/>
 <g clip-path="url(#${art}-chamber)">
  <rect class="calc-liquid" x="${piston}" y="${top+2}" width="${end-piston}" height="${height-4}" fill="url(#${art}-liquid)"/>
  <path d="M${start+2} ${top+4}H${end-2}" stroke="var(--calc-art-light,#fff7e8)" stroke-width="2.6" stroke-opacity=".47" stroke-linecap="round"/>
  <path d="M${start+1} ${bottom-3}H${end-1}" stroke="var(--calc-art-light,#f9e8c9)" stroke-width="1.05" stroke-opacity=".43" stroke-linecap="round"/>
 </g>
 ${mark>0?`<path class="calc-meniscus" d="M${piston} ${top+2} Q${piston+3} 43 ${piston} ${bottom-2}" fill="none" stroke="var(--calc-art-light,#fff1ce)" stroke-opacity=".55"/>`:''}
 <rect data-calc-piston x="${piston-3}" y="${top+2}" width="3" height="${height-4}" rx="1" fill="url(#${art}-metal)"/>
 ${ticks.join('')}
 ${label?`<g class="calc-level-label"><path d="M${labelX} 19L${piston} ${top}"/><rect x="${labelX-labelWidth/2}" y="2" width="${labelWidth}" height="17" rx="5"/><text x="${labelX}" y="14" text-anchor="middle">${label}</text></g>`:''}
 </svg>`;
}
function calcField(id){
 const {label,unit,max,step,choices}=calcFields[id];
 return `<section class="card calc-card calc-card-${id}">
  <h2>${label}</h2>${id==='dose'?'':calcVial(id)}
  ${id==='volume'?'<p class="sub" id="calc-volume-help">Use o volume final efetivo no cálculo. Se ele diferir do volume de diluente adicionado, informe o volume final.</p>':''}
  <label for="calc-range-${id}" class="calc-range-label">Ajustar ${label.toLocaleLowerCase('pt-BR')}</label>
  <div class="calc-slider"><output class="calc-bubble" data-calc-bubble="${id}" aria-hidden="true">—</output>
   <input id="calc-range-${id}" data-calc-range="${id}" type="range" min="0" max="${max}" step="${step}" value="0" aria-valuetext="Não informado" ${id==='volume'?'aria-describedby="calc-volume-help"':''}>
  </div>
  <div class="calc-limits" aria-hidden="true"><span>0</span><span data-calc-max="${id}">${calcNumber(max)} ${unit}</span></div>
  ${id==='dose'?'<p class="sub" id="calc-dose-limit"></p>':''}
  <div class="calc-chips" role="group" aria-label="Valores rápidos de ${label}">${choices.map(value=>`<button type="button" class="secondary" data-calc-chip="${id}" data-value="${value}" aria-pressed="false">${calcNumber(value)} ${unit}</button>`).join('')}</div>
  <details class="calc-manual"><summary>Entrada manual${id==='dose'?' e unidade':''}</summary>
   <div class="${id==='dose'?'calc-number-group':''}">
    <label for="${id}">Valor <span data-calc-unit="${id}">(${unit})</span><input name="${id}" id="${id}" type="number" min="${calcMinimum}" step="any" inputmode="decimal"></label>
    ${id==='dose'?'<label>Unidade<select name="doseUnit" id="doseUnit" data-unit="mg"><option value="mg" selected>mg</option><option value="mcg">mcg</option></select></label>':''}
   </div>
   ${id==='dose'?'<label>Passo do controle em mcg<select id="calcDoseStep"><option value="0.1">100 mcg</option><option value="0.01">10 mcg</option><option value="0.001">1 mcg</option></select></label>':''}
  </details>
 </section>`;
}
function calcCapacity(){
 return `<section class="card calc-card calc-capacity" aria-labelledby="calc-capacity-title">
  <h2 id="calc-capacity-title">Capacidade da seringa U-100</h2>
  <div class="calc-capacities" role="radiogroup" aria-labelledby="calc-capacity-title">
   ${Object.keys(syringeModels).sort((a,b)=>Number(a)-Number(b)).map(value=>`
    <label class="calc-capacity-choice" data-calc-capacity="${value}">
     <input type="radio" name="capacity" value="${value}" ${Number(value)===calcCapacityValue?'checked':''}>
     <span class="calc-capacity-content">
      ${syringeSymbol(value,0,true)}
      <b>${calcNumber(Number(value))} mL</b>
      <small>${syringeModels[value].units} na escala</small>
     </span>
    </label>`).join('')}
  </div>
  <p class="sub calc-capacity-guidance">Para volumes pequenos, uma seringa de menor capacidade pode oferecer divisões mais finas e facilitar a leitura. Confira a graduação impressa no seu modelo e confirme a medida com um profissional de saúde. A seringa não define nem altera a dose prescrita.</p>
 </section>`;
}
function syringeScale(capacity,units=null){
 const {units:max,division}=syringeModels[capacity];
 const reading=units===null?null:syringeReading(capacity,units);
 return `<figure class="calc-scale ${reading?.outside?'scale-overflow':''}" aria-label="Escala volumétrica de 0 a ${max}, divisões de ${division}">
  ${syringeSymbol(capacity,reading?.mark,false,units)}
  <figcaption>Divisão de ${division} na escala U-100. Confira a graduação do seu modelo.</figcaption>
  ${reading?`<p class="syringe-reading">${calcDisplay(units)} UI na escala U-100${reading.outside?' · fora da capacidade':reading.between?` · entre marcas. O desenho aproxima pela marca inferior (${reading.mark}).`:''}</p>`:''}
 </figure>`;
}
function calcEmpty(capacity=calcCapacityValue){
 return `${syringeScale(capacity)}<p class="sub">Preencha os dados confirmados para calcular o volume e a graduação U-100.</p>`;
}
function updateCalc(commit=false,track=true){
 const fields=['mass','volume','dose'].map(id=>$('#'+id));
 const [mass,volume,dose]=fields.map(field=>Number(field.value));
 const unit=$('#doseUnit').value,capacity=calcCapacityValue,result=$('#result');
 const isInvalid=field=>field.validity?.badInput||field.value!==''&&(!Number.isFinite(Number(field.value))||Number(field.value)<calcMinimum);
 const invalid=fields.some(field=>isInvalid(field)&&(commit||field!==document.activeElement&&!field.validity?.badInput));
 const draft=fields.some(field=>field===document.activeElement&&isInvalid(field));
 if(!commit&&!invalid&&draft){result.innerHTML=calcEmpty(capacity);return;}
 if(!invalid&&fields.some(field=>field.value==='')){
  calcOutcome='';result.innerHTML=calcEmpty(capacity);return;
 }
 try{
  if(invalid)throw Error('Informe valores positivos e finitos, a partir de 0,000001.');
  const r=C.convertDose(mass,volume,dose,unit,capacity);
  const {outside}=syringeReading(capacity,r.units);
  const exceedsMass=dose/(unit==='mcg'?1000:1)>mass;
  if(track&&calcOutcome!=='valid')engagementTrack('calculator_completed','calculadora');
  calcOutcome='valid';
  result.innerHTML=`<div class="calc-result-values"><div class="big">${calcDisplay(r.ml)} <small>mL</small></div><strong>${calcDisplay(r.units)} UI na escala U-100</strong></div>
  ${syringeScale(capacity,r.units)}
  ${exceedsMass?'<p class="error">O valor informado excede a massa total do frasco.</p>':''}
  ${outside?'<p class="error">O volume excede a capacidade da seringa selecionada.</p>':''}
  <dl class="calc-result-details"><div><dt>Concentração</dt><dd>${calcDisplay(r.concentration)} mg/mL</dd></div><div><dt>Razão massa ÷ dose</dt><dd>${calcDisplay(r.doses)}</dd></div></dl>
  <p class="sub">A exibição usa até duas casas decimais. Os cálculos mantêm a precisão dos valores informados.</p><button type="button" class="primary" data-calc-saved-action="save">Salvar dosagem</button><p class="sub" data-calc-result-save-status role="status"></p>`;
 }catch(err){
  if(track&&commit&&calcOutcome!=='invalid')engagementTrack('calculator_validation_error','calculadora');
  calcOutcome='invalid';
  result.innerHTML=`${syringeScale(capacity)}<p class="error">${esc(err.message)}</p>`;
 }
}
function calculator(){
 calcOutcome='';calcCapacityValue=1;
 return head('Calculadora de volume','Conversão matemática de dados confirmados do frasco e da prescrição.')+
 `<div class="calc-layout"><form id="calcForm" class="calc-inputs" data-calc-owner="${esc(calcStorageKey()||'')}" novalidate>
 ${calcField('mass')}${calcField('volume')}${calcCapacity()}${calcField('dose')}
 </form>
 <section class="card calc-result"><h2>Resultado</h2><div id="result" role="status" aria-live="polite">${calcEmpty()}</div>
 <p class="sub calc-context">Na escala U-100, 100 unidades correspondem a 1 mL. Essa graduação mede volume e é distinta das unidades de atividade de outras substâncias. Um valor caber na escala não indica que seja prescrito ou seguro.</p></section>
 <section class="card calc-vial-overview"><h2>Saldo e duração do frasco</h2>
 <label>Dosagem acompanhada<select id="calc-vial-select"><option value="">Cálculo atual (automático)</option></select></label>
 <p class="sub">Usa a dosagem salva mais recente como padrão. Alterações nos campos da calculadora atualizam a estimativa imediatamente, sem sobrescrever a dosagem salva.</p>
 <label>Aplicações por semana (frequência informada)<select id="calc-vial-weekly">${[1,2,3,4,5,6,7].map(n=>`<option value="${n}" ${n===calcVialWeekly?'selected':''}>${n}</option>`).join('')}</select></label>
 <div id="calc-vial-summary" aria-live="polite"></div>
 <label>Frasco físico vinculado a aplicações (opcional)<select id="calc-vial-tracked-select"><option value="">Nenhum frasco físico vinculado</option></select></label>
 <div class="calc-vial-actions"><button type="button" class="secondary" data-calc-vial-action="new">Registrar frasco físico</button><button type="button" class="text-btn" data-calc-vial-action="remove">Excluir vínculo do frasco</button></div><p class="sub" role="status" id="calc-vial-status"></p></section>
 <section class="card calc-formula"><h2>Como o cálculo funciona</h2><ol>
 <li><strong>Concentração</strong><span>Massa total ÷ volume final</span></li>
 <li><strong>Volume</strong><span>Dose informada em mg ÷ concentração</span></li>
 <li><strong>Graduação U-100</strong><span>Volume em mL × 100</span></li>
 </ol></section>
 <section class="card calc-saved" aria-labelledby="calc-saved-title">
 <h2 id="calc-saved-title">Dosagens salvas</h2>
 <p class="sub">Salvas neste navegador. As dosagens não são sincronizadas entre dispositivos.</p>
 <div class="calc-saved-entry"><label for="calc-saved-name">Nome (opcional)<input id="calc-saved-name" maxlength="80"></label>
 <button id="calc-save" type="button" class="primary" data-calc-saved-action="save">Salvar dosagem</button></div>
 <p class="sub" id="calc-saved-status" role="status"></p><div id="calc-saved-list"></div></section>
 </div>`;
}
function calcSliderConfig(id){
 if(id!=='dose')return calcFields[id];
 const unit=$('#doseUnit').value,multiplier=unit==='mcg'?1000:1;
 const step=unit==='mg'?calcFields.dose.step:Number($('#calcDoseStep').value||.1)*multiplier;
 const mass=Number($('#mass').value),volume=Number($('#volume').value);
 const limit=(mass/volume)*calcCapacityValue*multiplier;
 const known=mass>=calcMinimum&&volume>=calcMinimum&&Number.isFinite(limit)&&limit>0;
 const steps=known?Math.min(Number.MAX_SAFE_INTEGER,Math.floor(limit/step+Number.EPSILON*(limit/step))):Math.round(10*multiplier/step);
 return {unit,step,max:Number((steps*step).toPrecision(15)),limit:known?limit:null};
}
function syncCalcField(id,commit=false){
 const field=$('#'+id),range=$('#calc-range-'+id),config=calcSliderConfig(id);
 const {step,unit,limit}=config;
 const number=Number(field.value),valid=field.value!==''&&Number.isFinite(number)&&number>=calcMinimum;
 const max=id==='dose'?config.max:Math.max(config.max,valid?Number((Math.ceil(Math.min(number,1e9)/step)*step).toPrecision(15)):0);
 range.max=String(max);
 range.step=String(step);
 range.disabled=max<=0;
 const thumb=valid?Math.min(max,Math.round(number/step)*step):0;
 range.value=String(Number(thumb.toPrecision(15)));
 field.setAttribute('aria-invalid',String((commit||field!==document.activeElement)&&(!!field.validity?.badInput||field.value!==''&&!valid)));
 const value=valid?calcDisplay(number)+' '+unit:'Não informado';
 range.setAttribute('aria-valuetext',value);
 const bubble=$('[data-calc-bubble='+id+']');
 bubble.textContent=valid?value:'—';
 bubble.title=valid?value:'';
 bubble.style.setProperty('--calc-position',(max?100*thumb/max:0)+'%');
 $('[data-calc-max='+id+']').textContent=calcDisplay(max)+' '+unit;
 $('[data-calc-unit='+id+']').textContent='('+unit+')';
 if(id==='dose')$('#calcDoseStep').disabled=unit==='mg';
 if(id==='dose')$('#calc-dose-limit').textContent=limit===null?'':`Limite volumétrico calculado: ${calcDisplay(limit)} ${unit}. A entrada manual preserva valores entre passos ou fora da escala.`;
 const multiplier=id==='dose'&&unit==='mcg'?1000:1;
 for(const chip of document.querySelectorAll('[data-calc-chip='+id+']')){
  const amount=Number(chip.dataset.value)*multiplier;
  chip.textContent=calcNumber(amount)+' '+unit;
  chip.setAttribute('aria-pressed',String(valid&&number===amount));
 }
 const fill=$('[data-calc-fill='+id+']');
 if(fill){
  const height=valid?Math.min(39,39*number/max):0;
  fill.setAttribute('y',85-height);fill.setAttribute('height',height);
 }
}
function calcInputChanged(id,commit=false){
 if(!engagementCalcStarted){engagementCalcStarted=true;engagementTrack('calculator_started','calculadora');}
 formDirty=true;
 if(id&&id!=='dose')syncCalcField(id,commit);
 syncCalcField('dose',commit);
 updateCalc(commit);
 updateCalcVial();
}
document.addEventListener('click',event=>{
 const control=event.target.closest('[data-calc-chip]');
 if(!control)return;
 const id=control.dataset.calcChip,multiplier=id==='dose'&&$('#doseUnit').value==='mcg'?1000:1;
 $('#'+id).value=String(Number(control.dataset.value)*multiplier);
 calcInputChanged(id,true);
});
document.addEventListener('change',event=>{
 const input=event.target;
 if(input.matches('input[name="capacity"][type="radio"]')&&input.closest('#calcForm')){
  calcCapacityValue=Number(input.value);
  calcInputChanged(null,true);return;
 }
 if(input.id==='calcDoseStep'){calcInputChanged('dose',true);return;}
 if(input.id!=='doseUnit')return;
 const field=$('#dose'),targetUnit=input.value;
 if(field.value!==''&&input.dataset.unit!==targetUnit){
  const [mantissa,exponent]=Number(field.value).toExponential().split('e');
  const converted=Number(mantissa+'e'+(Number(exponent)+(targetUnit==='mcg'?3:-3)));
  if(Number.isFinite(converted)&&converted!==0)field.value=String(converted);
  else {
   input.value=input.dataset.unit;
   $('#result').textContent='Valor fora do limite para a unidade selecionada.';
   return;
  }
 }
 input.dataset.unit=targetUnit;
 calcInputChanged('dose',true);
});
document.addEventListener('input',event=>{
 const input=event.target;
 if(input.dataset.calcRange){
  const id=input.dataset.calcRange;
  $('#'+id).value=Number(input.value)===0?'':input.value;
  calcInputChanged(id);
 }else if(input.matches('#mass,#volume,#dose'))calcInputChanged(input.id);
});
document.addEventListener('focusout',event=>{
 if(event.target.matches?.('#mass,#volume,#dose'))calcInputChanged(event.target.id,true);
});

function calcStorageKey(){
 if(demo)return 'neo-calc-saved-v1:demo';
 if(mode!=='cloud')return 'neo-calc-saved-v1:local';
 const owner=Cloud.user?.id;
 return /^[a-f0-9-]{36}$/i.test(owner||'')?'neo-calc-saved-v1:'+owner:null;
}
function calcSnapshot(input){
 if(!input||!['mg','mcg'].includes(input.unit)||![.3,.5,1].includes(input.capacity)||
    ![input.mass,input.volume,input.dose].every(n=>Number.isFinite(n)&&n>=calcMinimum))return null;
 const {mass,volume,dose,unit,capacity}=input;
 try{
  const {concentration,ml,units}=C.convertDose(mass,volume,dose,unit,capacity);
  return {mass,volume,dose,unit,capacity,concentration,ml,units};
 }catch{return null;}
}

let calcVialWeekly=1,calcVialFormulaSelection='';
function calcVialStoreKey(){
 const key=calcStorageKey();
 return key?'neo-calc-vials-v1:'+key:null;
}
function readCalcVials(){
 const key=calcVialStoreKey();
 const empty={items:[],links:{},active:null};
 if(!key)return empty;
 const text=localStorage.getItem(key);
 if(!text)return empty;
 const saved=JSON.parse(text);
 if(!saved||!Array.isArray(saved.items)||!saved.links||typeof saved.links!=='object'||Array.isArray(saved.links))
  throw Error('Não foi possível ler o histórico local de frascos. Os registros existentes foram preservados.');
 return {items:saved.items.filter(item=>item&&typeof item.id==='string'&&
   typeof item.name==='string'&&item.name.length<=80&&Number.isFinite(item.mass)&&item.mass>0&&
   Number.isFinite(item.volume)&&item.volume>0).slice(0,30),
  links:saved.links,active:saved.active};
}
function saveCalcVials(saved){
 const key=calcVialStoreKey();
 if(!key||saved.items.length>30)throw Error('Limite de 30 frascos neste dispositivo.');
 const data=JSON.stringify(saved);
 if(data.length>100000)throw Error('Limite de armazenamento local atingido.');
 localStorage.setItem(key,data);
}
function vialMassUsed(vial,links){
 return state.doses.reduce((used,record)=>{
  if(links[record.id]!==vial.id)return used;
  const amount=Number(record.amount);
  if(!Number.isFinite(amount)||amount<=0)return used;
  const mg=record.unit==='mcg'?amount/1000:
   record.unit==='mL'?amount*vial.mass/vial.volume:record.unit==='mg'?amount:0;
  return used+mg;
 },0);
}
function calcVialDosePicker(record={}){
 let stored;
 try{stored=readCalcVials();}catch{return '';}
 if(!stored.items.length)return '';
 const selected=stored.links[record.id]||'';
 return '<label>Frasco usado nesta aplicação (opcional)<select name="vialId">'+
  '<option value="">Não vincular a um frasco</option>'+
  stored.items.map(item=>'<option value="'+esc(item.id)+'"'+(item.id===selected?' selected':'')+'>'+esc(item.name)+'</option>').join('')+
  '</select></label><p class="form-help">Só o frasco escolhido terá o saldo reduzido. O vínculo fica neste dispositivo.</p>';
}
function assignCalcVialDose(recordId,vialId){
 const saved=readCalcVials();
 if(vialId&&!saved.items.some(item=>item.id===vialId))throw Error('Frasco não encontrado.');
 if(vialId)saved.links[recordId]=vialId;
 else delete saved.links[recordId];
 saveCalcVials(saved);
}
function updateCalcVial(){
 const root=$('#calc-vial-summary');
 if(!root)return;
 let stored;
 try{stored=readCalcVials()}catch(error){root.textContent=error.message;return}
 let saved={items:[]};
 try{saved=readCalcSaved(calcStorageKey())}catch{/* Sem dosagens salvas. O cálculo atual permanece disponível. */}
 const formula=$('#calc-vial-select');
 if(formula){
  if(calcVialFormulaSelection&&!saved.items.some(item=>item.id===calcVialFormulaSelection))calcVialFormulaSelection=saved.items[0]?.id||'';
  formula.innerHTML='<option value="">Cálculo atual (automático)</option>'+
   saved.items.map(item=>'<option value="'+esc(item.id)+'"'+(item.id===calcVialFormulaSelection?' selected':'')+'>'+
     esc(item.name||'Dosagem salva')+' · '+calcDisplay(item.dose)+' '+item.unit+'</option>').join('');
  formula.value=calcVialFormulaSelection;
 }
 const tracked=$('#calc-vial-tracked-select');
 if(tracked){
  tracked.innerHTML='<option value="">Nenhum frasco físico vinculado</option>'+
   stored.items.map(item=>'<option value="'+esc(item.id)+'"'+(item.id===stored.active?' selected':'')+'>'+esc(item.name)+'</option>').join('');
  tracked.value=stored.active||'';
 }
 const vial=stored.items.find(item=>item.id===stored.active);
 const fields=['mass','volume','dose'].map(id=>$('#'+id));
 const valid=fields.every(field=>field&&field.value!==''&&!field.validity?.badInput&&Number.isFinite(Number(field.value))&&Number(field.value)>0);
 const enteredMass=valid?Number($('#mass').value):0;
 const doseRaw=valid?Number($('#dose').value):0;
 const dose=$('#doseUnit')?.value==='mcg'?doseRaw/1000:doseRaw;
 const mass=vial?.mass||enteredMass;
 const applied=vial?vialMassUsed(vial,stored.links):0;
 const remaining=Math.max(0,mass-applied);
 const percent=valid&&mass>0?Math.max(0,Math.min(100,remaining/mass*100)):0;
 const counts=valid&&dose>0&&mass>0?Math.max(0,Math.floor((remaining+1e-10)/dose)):null;
 const weeks=counts===null?null:counts/calcVialWeekly;
 const subtitle=vial?'Acompanhamento do frasco físico: '+esc(vial.name):
  calcVialFormulaSelection?'Estimativa da dosagem salva, usando os valores atuais da tela.':'Prévia do cálculo atual, sem frasco físico cadastrado.';
 root.innerHTML='<div class="calc-vial-display"><div class="calc-vial-art" role="img" aria-label="Frasco com '+
  esc(calcDisplay(percent))+'% de saldo estimado">'+calcVial('balance')+
  '<strong class="calc-vial-percent">'+calcDisplay(percent)+'% restante</strong></div>'+
  '<div class="calc-vial-facts"><span>'+subtitle+'</span>'+
  (valid?'<span>Saldo estimado: '+calcDisplay(remaining)+' de '+calcDisplay(mass)+' mg</span>':
   '<span>Preencha massa, volume e dose para estimar o rendimento.</span>')+
  (vial?'<span>Aplicações vinculadas: '+state.doses.filter(item=>stored.links[item.id]===vial.id).length+'</span>':'')+
  (counts===null?'':'<strong>'+counts+' aplicação(ões) completas estimadas</strong><span>'+calcDisplay(weeks)+' semana(s) na frequência informada</span>')+
  '</div></div><p class="sub">Estimativa matemática. O frasco ilustrado usa o mesmo desenho da calculadora; o saldo real só é descontado quando uma aplicação é vinculada a um frasco físico. Não considera perdas, estabilidade nem substitui prescrição.</p>';
 const fill=root.querySelector('[data-calc-fill="balance"]');
 if(fill){const height=39*percent/100;fill.setAttribute('y',85-height);fill.setAttribute('height',height);}
}
document.addEventListener('change',event=>{
 if(event.target.id==='calc-vial-weekly'){
  calcVialWeekly=Math.max(1,Math.min(7,Number(event.target.value)||1));
  updateCalcVial();
 }
 if(event.target.id==='calc-vial-select'){
  const id=event.target.value||'';
  try{
   const saved=readCalcSaved(calcStorageKey());
   const selected=saved.items.find(item=>item.id===id);
   if(id&&!selected)throw Error('Dosagem salva indisponível.');
   calcVialFormulaSelection=id;
   if(selected)applyCalcSaved(selected);
   updateCalcVial();
  }catch(error){const node=$('#calc-vial-status');if(node)node.textContent=error.message;}
 }
 if(event.target.id==='calc-vial-tracked-select'){
  try{const stored=readCalcVials();stored.active=event.target.value||null;saveCalcVials(stored);updateCalcVial();}
  catch(error){const node=$('#calc-vial-status');if(node)node.textContent=error.message;}
 }
});
document.addEventListener('click',event=>{
 const action=event.target.closest('[data-calc-vial-action]')?.dataset.calcVialAction;
 if(!action)return;
 const status=$('#calc-vial-status');
 if(!status)return;
 try{
  const stored=readCalcVials();
  if(action==='new'){
   const snapshot=calcSnapshot({mass:Number($('#mass')?.value),volume:Number($('#volume')?.value),
    dose:Number($('#dose')?.value),unit:$('#doseUnit')?.value,capacity:calcCapacityValue});
   if(!snapshot){status.textContent='Informe massa, volume e dose válidos antes de cadastrar o frasco.';return;}
   if(stored.items.length>=30){status.textContent='Limite de frascos neste dispositivo atingido.';return;}
   const name=window.prompt('Nome para identificar este frasco','Frasco '+new Date().toLocaleDateString('pt-BR'));
   if(name===null)return;
   if(!name.trim()||name.length>80){status.textContent='Informe um nome de até 80 caracteres.';return;}
   const item={id:uid(),name:name.trim(),mass:snapshot.mass,volume:snapshot.volume,createdAt:new Date().toISOString()};
   stored.items.unshift(item);stored.active=item.id;saveCalcVials(stored);
   status.textContent='Frasco cadastrado. Vincule as próximas aplicações a ele no diário.';
  }else if(action==='remove'){
   if(!stored.active)return;
   if(!window.confirm('Excluir este acompanhamento local de frasco? Os registros de aplicações continuarão salvos.'))return;
   stored.items=stored.items.filter(item=>item.id!==stored.active);
   for(const [id,vialId] of Object.entries(stored.links))if(vialId===stored.active)delete stored.links[id];
   stored.active=stored.items[0]?.id||null;saveCalcVials(stored);
   status.textContent='Acompanhamento local do frasco excluído. Os registros de aplicações foram mantidos.';
  }
  updateCalcVial();
 }catch(error){status.textContent=error.message||'Não foi possível atualizar o frasco.';}
});

function readCalcSaved(key){
 if(!key)throw Error('A conta ainda não está disponível para salvar dosagens.');
 const raw=localStorage.getItem(key);
 if(raw===null)return {items:[],last:null};
 const value=JSON.parse(raw);
 if(!value||!Array.isArray(value.items))throw Error('Os dados locais de dosagens não puderam ser lidos.');
 const items=value.items.flatMap(item=>{
  const snapshot=calcSnapshot(item);
  if(!snapshot||typeof item.id!=='string'||!/^[-a-z0-9]{1,100}$/i.test(item.id)||
     typeof item.name!=='string'||item.name.length>80||typeof item.savedAt!=='string'||!Number.isFinite(Date.parse(item.savedAt)))return [];
  return [{...snapshot,id:item.id,name:item.name,savedAt:item.savedAt}];
 });
 return {items,last:items.some(item=>item.id===value.last)?value.last:null};
}
function homeCalculatorContent(){
 let latest=null;
 if(mode==='cloud'&&!demo){
  const key=calcStorageKey();
  // Saving prepends a record. The "last" pointer can also select an older one.
  if(key)try{latest=readCalcSaved(key).items[0]||null;}catch{/* The card remains usable without storage. */}
 }
 const capacity=latest?.capacity??1;
 const units=latest?.units??null;
 const reading=latest?syringeReading(capacity,units):null;
 return `<span class="home-calculator-title">Calculadora de volume</span>
  ${syringeSymbol(capacity,reading?.mark,false,units)}
  ${latest?`<span class="home-calculator-details">Último cálculo salvo · ${esc(new Date(latest.savedAt).toLocaleDateString('pt-BR'))}<br>
   ${calcDisplay(latest.ml)} mL · ${calcDisplay(units)} UI · Seringa de ${calcDisplay(capacity)} mL
   ${reading.outside?'<br>Fora da capacidade da seringa':reading.between?'<br>Desenho na marca inferior':''}</span>`:
   '<span class="home-calculator-details">Abra a calculadora para converter valores em volume e graduação U-100.</span>'}
  <span class="home-calculator-link">Abrir calculadora ${icon('arrow')}</span>`;
}
function homeCalculatorCard(){
 return `<button type="button" class="card space home-calculator" data-home-calculator data-go="calculadora">${homeCalculatorContent()}</button>`;
}
window.addEventListener('storage',event=>{
 if(page!=='inicio'||mode!=='cloud'||demo||event.storageArea!==localStorage)return;
 const key=calcStorageKey();
 if(key&&(event.key===key||event.key===null)){
  const card=$('[data-home-calculator]');
  if(card)card.innerHTML=homeCalculatorContent();
 }
});
function renderCalcSaved(saved){
 const list=$('#calc-saved-list');
 if(!list)return;
 list.innerHTML=saved.items.map(item=>`<article class="calc-saved-row" data-saved-id="${esc(item.id)}">
  <button type="button" class="calc-saved-summary" data-calc-saved-action="apply" aria-pressed="${item.id===saved.last}">
   <strong>${esc(item.name||'Dosagem sem nome')}</strong>
   <span>Dose: ${calcDisplay(item.dose)} ${item.unit} · Concentração: ${calcDisplay(item.concentration)} mg/mL</span>
   <span>Volume: ${calcDisplay(item.ml)} mL · Escala: ${calcDisplay(item.units)} UI · Seringa: ${calcDisplay(item.capacity)} mL</span>
   <small>${esc(new Date(item.savedAt).toLocaleString('pt-BR'))}</small>
  </button>
  <div class="calc-saved-actions">
   <button type="button" class="secondary" data-calc-saved-action="apply">Aplicar</button>
   <button type="button" class="text-btn" data-calc-saved-action="rename">Renomear</button>
   <button type="button" class="text-btn" data-calc-saved-action="remove">Excluir</button>
  </div>
 </article>`).join('')||'<p class="sub">Nenhuma dosagem salva.</p>';
}
function applyCalcSaved(item){
 calcCapacityValue=item.capacity;
 for(const id of ['mass','volume','dose'])$('#'+id).value=String(item[id]);
 const unit=$('#doseUnit');
 for(const option of unit.querySelectorAll('option'))option.toggleAttribute('selected',option.value===item.unit);
 const selected=unit.querySelector('[selected]');
 if(selected)selected.selected=true;
 unit.dataset.unit=item.unit;
 for(const radio of document.querySelectorAll('#calcForm [name=capacity]')){
  radio.checked=Number(radio.value)===item.capacity;
  radio.toggleAttribute('checked',radio.checked);
 }
 for(const id of ['mass','volume','dose'])syncCalcField(id,true);
 updateCalc(true,false);
 updateCalcVial();
 formDirty=false;
}
function restoreCalcSaved(){
 if(!$('#calc-saved-list'))return;
 try{
  const saved=readCalcSaved(calcStorageKey());
  renderCalcSaved(saved);
  const selected=saved.items[0]||null;
  calcVialFormulaSelection=selected?.id||'';
  if(selected)applyCalcSaved(selected);
  updateCalcVial();
 }catch{$('#calc-saved-status').textContent='Não foi possível ler as dosagens neste navegador.';}
}
document.addEventListener('click',event=>{
 const control=event.target.closest('[data-calc-saved-action]');
 if(!control)return;
 const resultStatus=control.closest('#result')?.querySelector('[data-calc-result-save-status]');
 const status=resultStatus||$('#calc-saved-status'),key=calcStorageKey(),action=control.dataset.calcSavedAction;
 if(!key||$('#calcForm').dataset.calcOwner!==key){
  status.textContent='A sessão mudou. Reabra a calculadora para continuar.';
  return;
 }
 let saved;
 try{saved=readCalcSaved(key);}
 catch{status.textContent='As dosagens locais estão indisponíveis neste navegador.';return;}
 let item=saved.items.find(value=>value.id===control.closest('[data-saved-id]')?.dataset.savedId);
 if(action==='save'){
  const snapshot=calcSnapshot({mass:Number($('#mass').value),volume:Number($('#volume').value),dose:Number($('#dose').value),unit:$('#doseUnit').value,capacity:calcCapacityValue});
  if(!snapshot){status.textContent='Preencha valores válidos antes de salvar.';return;}
  item={...snapshot,id:uid(),name:$('#calc-saved-name').value.trim().slice(0,80),savedAt:new Date().toISOString()};
  saved.items.unshift(item);saved.last=item.id;
 }else if(!item)return;
 else if(action==='apply')saved.last=item.id;
 else if(action==='rename'){
  const name=prompt('Nome da dosagem (opcional)',item.name);
  if(name===null)return;
  item.name=name.trim().slice(0,80);
 }else if(action==='remove'){
  if(!confirm('Excluir esta dosagem salva?'))return;
  saved.items=saved.items.filter(value=>value.id!==item.id);
  if(saved.last===item.id)saved.last=null;
 }else return;
 try{localStorage.setItem(key,JSON.stringify(saved));}
 catch{status.textContent='Não foi possível salvar a alteração. O armazenamento local está cheio ou indisponível.';return;}
 if(action==='apply'||action==='save'){calcVialFormulaSelection=item.id;}
 if(action==='apply')applyCalcSaved(item);
 if(action==='save'){$('#calc-saved-name').value='';formDirty=false;}
 updateCalcVial();
 renderCalcSaved(saved);
 status.textContent={save:'Dosagem salva neste dispositivo.',apply:'Dosagem aplicada.',rename:'Nome atualizado.',remove:'Dosagem excluída.'}[action];
 const focused=saved.items.some(value=>value.id===item.id)?
  $('#calc-saved-list').querySelector('[data-saved-id="'+item.id+'"] [data-calc-saved-action="'+(action==='rename'?'rename':'apply')+'"]'):$('#calc-save');
 if(!resultStatus)focused?.focus({preventScroll:true});
});

function reports(){const rows=C.periodRows(state.weights,period),m=C.metrics(state);return head('Sua jornada, em perspectiva.','Relatórios descritivos para acompanhar e compartilhar.',`<button class="primary" id="csvPeriod">${icon('download')}<span>CSV do período</span></button>`)+stats(true)+`<div class="report-print-heading"><h2>NeoPep · Relatório pessoal</h2><p>${esc(state.profile.name)} · Emitido em ${date(C.today())}</p></div><div class="grid"><section class="card"><div class="card-head"><h2>Relatório de evolução</h2><button class="text-btn" id="print">PDF / Imprimir</button></div>${periods()}${chart(rows)}<p class="sub">${rows.length?'Período: '+date(rows[0].date)+' a '+date(rows.at(-1).date)+'. Variação: '+weight(rows.at(-1).value-rows[0].value)+' '+unit()+'.':'Nenhum peso no período selecionado.'}</p></section><section class="card"><h2>Comparação entre períodos</h2>${comparison()}<p class="sub space">Meta: ${weight(m.goal)} ${unit()} · Progresso: ${fmt(m.progress,0)}%.</p><p class="sub space">Os dados não estabelecem causa entre mudanças corporais e aplicações. IMC é um indicador descritivo, limitado e não diagnóstico.</p></section></div><section class="card space"><h2>Pesos no período</h2>${historyTable('weights',rows)}</section><section class="card space"><h2>Diário no período</h2>${historyTable('journal',C.periodRows(state.journal,period))}</section><section class="card space"><h2>Medidas no período</h2>${historyTable('measures',C.periodRows(state.measures,period))}</section><section class="card space"><h2>Aplicações no período</h2>${historyTable('doses',C.periodRows(state.doses,period))}</section><div class="notice">O CSV desta tela respeita o período escolhido e inclui os registros e o diário. Para exportar todo o histórico, use o CSV ou backup no Perfil. Filtros de texto afetam a visualização, não o CSV do período. Para PDF, use “PDF / Imprimir” e a opção de salvar ou compartilhar PDF do sistema. O CSV usa kg e cm; aplicações mantêm a unidade informada. Fotos são exportadas individualmente para preservar sua privacidade.</div>`}
function eventsFor(d){const result=[];for(const [k,title,i] of [['weights','Peso','weight'],['measures','Medidas','measure'],['doses','Aplicação','drop'],['journal','Diário','journal'],['protocols','Início de protocolo','layers']])for(const r of state[k].filter(r=>r.date===d))result.push({kind:k,id:r.id,title,detail:k==='weights'?weight(r.value)+' '+unit():r.product||r.name||r.note||'Registro pessoal',icon:i});if(state.profile.tracking?.weight!==false)result.push({title:'Lembrete de peso',detail:state.settings.weightTime,icon:'bell'});if(state.profile.tracking?.measures!==false&&new Date(d+'T12:00').getDay()===+state.settings.measureDay)result.push({title:'Lembrete de medidas',detail:state.settings.measureTime,icon:'bell'});for(const r of state.reminders.filter(r=>r.enabled&&r.date<=d&&(r.repeat==='daily'||r.repeat==='once'&&r.date===d||r.repeat==='weekly'&&new Date(d+'T12:00').getDay()===r.weekday)))result.push({kind:'reminders',id:r.id,title:r.title,detail:r.time,icon:'bell'});return result}
const calendarKinds={weights:'Peso',measures:'Medidas',doses:'Aplicações',journal:'Diário',protocols:'Protocolos',reminders:'Lembretes'};
function calendarPage(){const anchor=new Date(calendarDate),start=new Date(anchor.getFullYear(),anchor.getMonth(),1),label=anchor.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});if(calendarView==='week'){start.setDate(anchor.getDate()-anchor.getDay())}else start.setDate(1-start.getDay());const days=[];for(let i=0;i<(calendarView==='week'?7:42);i++){const d=new Date(start);d.setDate(start.getDate()+i);days.push(d)}const ev=eventsFor(selectedDate);return head('Seu cuidado, no calendário.','Consulte registros e lembretes em um só lugar.',addBtn('reminder','Novo lembrete'))+`<div class="grid"><section class="card"><div class="calendar-toolbar"><button class="icon-btn" id="prevMonth" aria-label="Período anterior">‹</button><h2>${label}</h2><button class="icon-btn" id="nextMonth" aria-label="Próximo período">›</button></div><div class="between"><div class="segmented"><button data-calview="month" class="${calendarView==='month'?'active':''}">Mês</button><button data-calview="week" class="${calendarView==='week'?'active':''}">Semana</button></div><button class="text-btn" id="calToday">Hoje</button></div><div class="calendar-grid space">${['D','S','T','Q','Q','S','S'].map(d=>`<div class="weekday">${d}</div>`).join('')}${days.map(d=>{const key=C.today(d),events=eventsFor(key).filter(e=>e.kind),kinds=[...new Set(events.map(e=>e.kind))];return `<button class="calendar-day ${d.getMonth()!==anchor.getMonth()?'outside':''} ${key===selectedDate?'selected':''} ${key===C.today()?'today':''}" data-day="${key}" aria-label="${date(key)}, ${events.length} registros${kinds.length?': '+kinds.map(k=>calendarKinds[k]).join(', '):''}" aria-pressed="${key===selectedDate}"><span>${d.getDate()}</span><span class="dots">${kinds.map(k=>`<i class="calendar-mark calendar-${k}" title="${calendarKinds[k]}" aria-hidden="true"></i>`).join('')}</span></button>`}).join('')}</div><div class="calendar-legend" aria-label="Legenda dos registros">${Object.entries(calendarKinds).map(([k,label])=>`<span><i class="calendar-mark calendar-${k}" aria-hidden="true"></i>${label}</span>`).join('')}</div></section><section class="card"><div class="card-head"><h2>${date(selectedDate)}</h2><span class="tag">${ev.length} eventos</span></div>${ev.map(e=>`<div class="task"><div class="task-icon calendar-event-icon calendar-${e.kind||'reminders'}">${icon(e.icon)}</div><div><b>${esc(e.title)}</b><small>${esc(e.detail.slice(0,90))}</small></div>${e.kind?`<button class="icon-btn" data-edit="${e.kind}:${esc(e.id)}" aria-label="Ver detalhes de ${esc(e.title)}">${icon('chevron')}</button>`:''}</div>`).join('')}</section></div>`}
function remindersPage(){return head('Lembretes','Organize os horários e as notificações do seu dispositivo.',addBtn('reminder','Novo lembrete'))+`<div class="two-cols"><section class="card"><h2>Horários da sua rotina</h2><form id="settingsForm" class="space"><label>Peso · todos os dias<input name="weightTime" type="time" required value="${esc(state.settings.weightTime)}"></label><div class="form-grid"><label>Medidas · dia da semana<select name="measureDay">${['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'].map((d,i)=>`<option value="${i}" ${String(i)===String(state.settings.measureDay)?'selected':''}>${d}</option>`).join('')}</select></label><label>Horário<input name="measureTime" type="time" required value="${esc(state.settings.measureTime)}"></label></div><button class="primary full">Salvar horários</button></form></section>${window.NeoPush?.panel({cloud:mode==='cloud'&&!demo})||''}</div><section class="card space"><h2>Outros lembretes</h2>${historyTable('reminders')}</section><section class="card space"><h2>Próximos</h2>${C.nextReminders(state,new Date()).slice(0,8).map(r=>`<div class="upcoming-reminder"><div><strong>${esc(r.title)}</strong><p class="sub">${esc(r.next.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}))}</p></div><button class="text-btn" data-go="registros">Registrar agora</button></div>`).join('')||'<p class="sub">Nenhum aviso programado.</p>'}</section>`}
async function openDB(){return new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(Error('Armazenamento de fotos indisponível neste navegador.'));const r=indexedDB.open('neopeptideos-private',1);r.onupgradeneeded=()=>r.result.createObjectStore('photos',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Não foi possível abrir o armazenamento privado de fotos.'))})}
async function photoStore(action,item){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('photos',action==='all'?'readonly':'readwrite'),store=tx.objectStore('photos');let value;const req=action==='all'?store.getAll():action==='put'?store.put(item):store.delete(item);req.onsuccess=()=>value=req.result;tx.oncomplete=()=>{db.close();resolve(value)};tx.onerror=()=>{db.close();reject(Error('Falha ao salvar a foto. O armazenamento pode estar cheio.'))};tx.onabort=()=>{db.close();reject(Error('Operação de foto interrompida.'))}})}
let photoCache=new Map(),photoObserver=null,photoMetadataLoaded=false;
function clearPhotoURLs(){
 $('#comparisonExport')?.dispose();
 comparisonWeightCache=null;
 photoObserver?.disconnect();
 clearPhotoBatch();
 for(const entry of photoCache.values())if(entry.objectURL)URL.revokeObjectURL(entry.objectURL);
 photoCache.clear();
 openedPhotoSections.clear();
 comparisonSelection.fill(null);
 comparisonPrepared.fill(null);
 comparisonDays.clear();
 clearComparisonThumbs();
 photoMetadataLoaded=false;
 photoList=[];
 avatarURL='';
 const viewer=$('#photoViewer');if(viewer){viewer.close();viewer.remove()}
 if($('#avatar'))$('#avatar').textContent='N';
}
function sortedPhotos(role){
 return photoList.filter(p=>role==='avatar'?p.role==='avatar':p.role!=='avatar')
  .sort((a,b)=>a.date.localeCompare(b.date)||String(a.created_at||a.id).localeCompare(String(b.created_at||b.id)));
}
async function photoSource(p,variant,refresh=false){
 const key=p.id+':'+variant,generation=loadGeneration,cloud=mode==='cloud';
 const previous=photoCache.get(key);
 if(!refresh&&previous&&previous.until>Date.now())return previous.promise;
 const entry={until:cloud?Date.now()+240000:Infinity,objectURL:null};
 photoCache.set(key,entry);
 entry.promise=(async()=>{
  if(cloud)return Cloud.photoURL(p,variant);
  const blob=variant==='preview'?p.preview||await encodePhoto(p.blob,{edge:800,quality:.8}):
   variant==='thumbnail'?p.thumbnail||await encodePhoto(p.blob,{edge:160,quality:.68}):p.blob;
  if(generation!==loadGeneration||photoCache.get(key)!==entry)return null;
  return entry.objectURL=URL.createObjectURL(blob);
 })().catch(error=>{if(photoCache.get(key)===entry)photoCache.delete(key);throw error});
 return entry.promise;
}
async function loadPhotos(){
 const generation=loadGeneration;
 if(demo){clearPhotoURLs();return}
 const list=mode==='cloud'?await Cloud.photos():await photoStore('all');
 if(generation!==loadGeneration)return;
 const ids=new Set(list.map(p=>p.id));
 for(const [key,entry] of photoCache)if(!ids.has(key.split(':')[0])){
  if(entry.objectURL)URL.revokeObjectURL(entry.objectURL);
  photoCache.delete(key);
 }
 for(const [key,item] of comparisonThumbs)if(!ids.has(item.photo.id)){item.controller?.abort();if(item.url)URL.revokeObjectURL(item.url);comparisonThumbs.delete(key)}
 photoList=list;
 photoMetadataLoaded=true;
 const avatar=sortedPhotos('avatar').sort((a,b)=>String(a.created_at||a.id).localeCompare(String(b.created_at||b.id))).at(-1);
 let url='';
 if(avatar)try{url=await photoSource(avatar,'original')||''}catch{}
 if(generation!==loadGeneration)return;
 avatarURL=url;
 if($('#avatar'))$('#avatar').innerHTML=url?`<img src="${esc(url)}" alt="Sua foto de perfil">`:'NP';
}
function photoTiles(list){
 const days=new Map();
 for(const p of list){if(!days.has(p.date))days.set(p.date,[]);days.get(p.date).push(p)}
 return [...days].map(([day,rows])=>`<section class="photo-day"><h3>${date(day)}</h3><div class="photo-grid">${rows.map(p=>`
  <article class="photo-card"><button type="button" class="photo-open" data-photo-open="${esc(p.id)}" aria-label="Ampliar foto de ${date(p.date)}">
  <span data-photo-placeholder>Ver foto</span><img hidden data-photo-media="${esc(p.id)}" data-photo-variant="thumbnail" alt="Foto privada em ${date(p.date)}">
  </button></article>`).join('')}</div></section>`).join('');
}
const openedPhotoSections=new Set();
function photosPage(){
 const list=sortedPhotos('progress'),avatars=sortedPhotos('avatar');
 const history=(id,title,rows)=>`<details class="card space" data-photo-section="${id}" ${openedPhotoSections.has(id)?'open':''}><summary>${title} · ${rows.length}</summary>${rows.length?photoTiles(rows):'<p class="sub">Nenhuma foto neste histórico.</p>'}</details>`;
 return head('Um olhar sobre sua evolução.','Fotos privadas, organizadas por data.',addBtn('photo','Adicionar foto'))+`
  ${comparisonCard(false)}
  ${history('progress','Histórico de evolução',list)}${history('avatar','Histórico de fotos de perfil',avatars)}
  <button class="text-btn" id="refreshPhotos">${icon('refresh')} Atualizar fotos</button>`;
}
const comparisonSelection=[null,null],comparisonPrepared=[null,null];
let comparisonDays=new Map();
const comparisonThumbs=new Map(),thumbQueue=[];
let activeThumbs=0;
function clearComparisonThumbs(){
 for(const entry of comparisonThumbs.values()){entry.controller?.abort();if(entry.url)URL.revokeObjectURL(entry.url)}
 comparisonThumbs.clear();
 for(const queued of thumbQueue.splice(0))queued.finish(undefined);
}
function drainThumbQueue(){
 while(activeThumbs<2&&thumbQueue.length){
  const item=thumbQueue.shift();
  if(item.generation!==loadGeneration||!item.needs.some(check=>check())){
   if(comparisonThumbs.get(item.key)===item)comparisonThumbs.delete(item.key);
   item.finish(undefined);continue;
  }
  item.started=true;
  activeThumbs++;
  void (async()=>{
   try{
    const stillNeeded=()=>item.generation===loadGeneration&&comparisonThumbs.get(item.key)===item&&item.needs.some(check=>check());
    let variant=item.variant,source=await photoSource(item.photo,variant);
    if(!source&&variant==='preview'&&stillNeeded()){
     variant='thumbnail';
     source=await photoSource(item.photo,variant);
    }
    let blob=null;
    if(source&&stillNeeded()){
     item.controller=typeof AbortController==='function'?new AbortController():null;
     const options={cache:'no-store',credentials:'omit',signal:item.controller?.signal};
     let response=await fetch(source,options);
     if(mode==='cloud'&&(response.status===401||response.status===403)&&stillNeeded()){
      source=await photoSource(item.photo,variant,true);
      if(source&&stillNeeded())response=await fetch(source,options);
     }
     if(response.ok)blob=await response.blob();
     else if(response.status!==404)throw Error('Prévia indisponível.');
    }
    if(!stillNeeded()){
     if(comparisonThumbs.get(item.key)===item)comparisonThumbs.delete(item.key);
     item.finish(undefined);return;
    }
    item.url=blob&&blob.size<=524288?URL.createObjectURL(blob):null;
    if(item.url&&typeof Image==='function'){
     const decoded=new Image();
     decoded.src=item.url;
     if(typeof decoded.decode==='function')try{await decoded.decode()}catch{}
     if(!stillNeeded()){
      URL.revokeObjectURL(item.url);
      if(comparisonThumbs.get(item.key)===item)comparisonThumbs.delete(item.key);
      item.finish(undefined);return;
     }
     item.decoded=decoded;
    }
    const edge=item.variant==='preview'?800:160;
    item.bytes=(blob?.size||0)+(item.url?4*(item.decoded?.naturalWidth||edge)*(item.decoded?.naturalHeight||edge):0);
    item.ready=true;
    item.needs=[];
    item.finish(item.url);
    trimComparisonCache(item.key);
   }catch{
    if(item.url)URL.revokeObjectURL(item.url);
    if(comparisonThumbs.get(item.key)===item)comparisonThumbs.delete(item.key);
    item.finish(undefined);
   }finally{activeThumbs--;drainThumbQueue()}
  })();
 }
}
function trimComparisonCache(current){
 const pinned=new Set(comparisonSelection.filter(Boolean).map(selection=>selection.id+':preview'));
 const ready=[...comparisonThumbs].filter(([,entry])=>entry.ready);
 let bytes=ready.reduce((sum,[,entry])=>sum+entry.bytes,0),count=ready.length;
 for(const [key,entry] of ready){
  if(count<=32&&bytes<=24*1024*1024)break;
  if(key===current||pinned.has(key))continue;
  if(entry.url)URL.revokeObjectURL(entry.url);
  comparisonThumbs.delete(key);bytes-=entry.bytes;count--;
 }
}
function warmPhotoThumb(photo,needed,priority=false,variant='thumbnail'){
 const key=photo.id+':'+variant;
 const existing=comparisonThumbs.get(key);
 if(existing){
  if(existing.ready){comparisonThumbs.delete(key);comparisonThumbs.set(key,existing)}
  else{
   if(existing.needs.length>32)existing.needs=existing.needs.filter(check=>check());
   existing.needs.push(needed);
   if(priority&&!existing.started){const i=thumbQueue.indexOf(existing);if(i>=0){thumbQueue.splice(i,1);thumbQueue.unshift(existing)}}
  }
  return existing.promise;
 }
 const item={photo,key,variant,generation:loadGeneration,needs:[needed],ready:false,url:null};
 item.promise=new Promise(resolve=>{item.finish=resolve});
 comparisonThumbs.set(key,item);
 if(priority)thumbQueue.unshift(item);else thumbQueue.push(item);
 drainThumbQueue();
 return item.promise;
}
let comparisonWeightCache=null;
function selectedComparisonPhotos(account){
 return comparisonSelection.map(selected=>account&&comparisonDays.get(selected?.day)?.find(photo=>
  photo.id===selected.id&&photo.user_id===account&&photo.path?.startsWith(account+'/')));
}
function comparisonWeight(photos){
 const [before,after]=photos.map(photo=>photo?.date);
 const units=unit(),initial=state.profile.initialWeight,source=state.weights;
 const cached=comparisonWeightCache;
 if(cached&&cached.source===source&&cached.initial===initial&&cached.units===units&&cached.before===before&&cached.after===after)return cached.result;
 let type='none',value=null,reference=null,rows=[],references=[];
 if(before&&after&&before!==after){
  const daily=new Map();
  for(const row of source){
   if(!C.validDate(row.date)||!Number.isFinite(row.value)||row.value<1||row.value>650)continue;
   const timestamp=[row.updated_at,row.updatedAt,row.created_at,row.createdAt].map(Date.parse).find(Number.isFinite)??null;
   const previous=daily.get(row.date);
   if(previous&&Number.isFinite(previous.timestamp)&&(!Number.isFinite(timestamp)||previous.timestamp>timestamp))continue;
   daily.set(row.date,{id:row.id,date:row.date,value:row.value,timestamp});
  }
  const history=C.sorted([...daily.values()]).map(row=>Object.freeze(row));
  const first=daily.get(before),last=daily.get(after);
  if(first&&last){
   type='period';
   value=last.value-first.value;
   references=[first,last].map(row=>Object.freeze(row));
   const [start,end]=[before,after].sort();
   rows=history.filter(row=>row.date>=start&&row.date<=end);
  }else if(history.length>=2){
   const metrics=C.metrics({...state,weights:history});
   if(Number.isFinite(metrics.change)){
    type='total';
    value=metrics.change;
    rows=history;
    reference=metrics.initial===history[0].value?null:metrics.initial;
    references=[reference===null?history[0]:Object.freeze({value:reference,origin:'profile'}),history.at(-1)];
   }
  }
 }
 const converted=units==='lb'?value*2.2046226218:value;
 const rounded=value===null?null:Math.round(Math.abs(converted)*100)/100;
 const sign=rounded===0?'':converted<0?'−':'+';
 const label=type==='period'?'Variação entre as fotos':type==='total'?'Variação total':'Sem dados suficientes';
 const display=value===null?'':sign+C.formatWeight(rounded)+' '+units;
 const range=rows.length?date(rows[0].date)+' a '+date(rows.at(-1).date):'';
 const result=Object.freeze({type,value,label,display,range,units,reference,rows:Object.freeze(rows),references:Object.freeze(references)});
 comparisonWeightCache={source,initial,units,before,after,result};
 return result;
}
function comparisonWeightMarkup(result){
 return `<span>${result.label}${result.display?':':''}</span>${result.display?` <strong>${result.display}</strong><small>${result.range}${result.reference===null?'':' · Peso inicial do perfil'}</small>`:''}`;
}
function currentComparisonWeight(){
 return comparisonWeight(selectedComparisonPhotos(mode==='cloud'&&!demo?Cloud.user?.id:null));
}
function comparisonCard(home){
 const photos=sortedPhotos('progress');
 comparisonDays=new Map();
 for(const photo of photos){
  if(!comparisonDays.has(photo.date))comparisonDays.set(photo.date,[]);
  comparisonDays.get(photo.date).push(photo);
 }
 const title=home?'Minha evolução — Antes e Depois':'Antes e Depois';
 const heading=`<div class="card-head"><h2>${title}</h2>${home?'<button type="button" class="text-btn" data-go="fotos">Ver fotos</button>':''}</div>`;
 const example=(label,i)=>`<figure class="comparison-example">
  <span class="comparison-date-spacer" aria-hidden="true"></span>
  <div class="comparison-preview"><img class="photo-example" src="assets/photo-example-${i+1}.png" alt="Ilustração fictícia"></div>
  <figcaption><strong>${label}</strong><span>Exemplo</span></figcaption>
  <span class="comparison-slider-spacer" aria-hidden="true"></span></figure>`;
 if(comparisonDays.size<2){comparisonSelection[1]=null;comparisonPrepared[1]=null}
 const figures=[0,1].map(side=>{
   const label=side?'Depois':'Antes';
   if(!photos.length||(side&&comparisonDays.size===1))return example(label,side);
   const state=comparisonSelection[side],fallback=side?photos.at(-1):photos[0];
   const rows=comparisonDays.get(state?.day)||comparisonDays.get(fallback.date);
   const selected=rows.find(row=>row.id===state?.id)||(!state?fallback:rows[0]);
   comparisonSelection[side]={day:selected.date,id:selected.id};
   const index=rows.indexOf(selected),position=`Foto ${index+1} de ${rows.length}`;
   const options=[...comparisonDays.keys()].map(day=>`<option value="${esc(day)}" ${day===selected.date?'selected':''}>${date(day)}</option>`).join('');
   return `<figure data-photo-side="${side}">
   <div class="comparison-date"><select data-photo-date aria-label="Data ${label}">${options}</select></div>
   <div data-photo-preview></div>
   <figcaption><strong>${label}</strong><span data-photo-position>${position}</span></figcaption>
   <div class="comparison-slider-slot"><input type="range" data-photo-slider="${label}" aria-label="Fotografia ${label}" aria-valuetext="${date(selected.date)}, ${position}" min="0" step="1" max="${rows.length-1}" value="${index}" style="--photo-progress:${rows.length>1?100*index/(rows.length-1):0}%" ${rows.length===1?'disabled hidden':''}></div></figure>`;
  }).join('');
 return `<section class="card space" data-photo-comparison data-comparison-home="${home}">${heading}
  <div class="compare photo-comparison" id="comparisonPhotos">${figures}</div><div class="comparison-card-actions"><div class="comparison-weight" data-comparison-weight aria-live="polite">${comparisonWeightMarkup(currentComparisonWeight())}</div><button type="button" class="secondary full comparison-export-button" data-comparison-export>${icon('expand')} Comparar e compartilhar</button>${mode==='cloud'&&!demo?'<button type="button" class="secondary full" data-saved-comparisons>Minhas comparações salvas</button>':''}${comparisonDays.size<2?addBtn('photo',photos.length?'Adicionar foto de outro dia':'Adicionar minhas fotos'):''}</div></section>`;
}
function paintComparison(figure,day,index,warm=false){
 const side=Number(figure.dataset.photoSide),label=side?'Depois':'Antes',rows=comparisonDays.get(day),photo=rows?.[index];
 if(!photo)return;
 const previousPhoto=comparisonSelection[side]?.id;
 if(warm&&previousPhoto!==photo.id&&page==='fotos')engagementTrack('photo_selected','fotos');
 const dateChanged=comparisonSelection[side]?.day!==day;
 comparisonSelection[side]={day,id:photo.id};
 if(dateChanged)figure.closest('[data-photo-comparison]').querySelector('[data-comparison-weight]').innerHTML=comparisonWeightMarkup(currentComparisonWeight());
 const slider=figure.querySelector('[data-photo-slider]'),position=`Foto ${index+1} de ${rows.length}`;
 slider.max=String(rows.length-1);
 slider.value=String(index);
 slider.disabled=rows.length===1;
 slider.hidden=rows.length===1;
 slider.setAttribute('aria-valuetext',date(day)+', '+position);
 slider.style.setProperty('--photo-progress',`${rows.length>1?100*index/(rows.length-1):0}%`);
 figure.querySelector('[data-photo-position]').textContent=position;
 const preview=figure.querySelector('[data-photo-preview]');
 const home=figure.closest('[data-photo-comparison]').dataset.comparisonHome==='true';
 const element=document.createElement(home?'div':'button');
 element.className='photo-open comparison-preview';
 if(!home){element.type='button';element.dataset.photoOpen=photo.id;element.setAttribute('aria-label','Ampliar '+label)}
 const image=document.createElement('img'),status=document.createElement('span');
 image.alt=label+' em '+date(day);image.hidden=true;
 status.textContent='Preparando prévia…';
 element.append(status,image);
 preview.replaceChildren(element);
 const dayNeeded=()=>figure.isConnected&&!figure.closest('[hidden]')&&comparisonSelection[side]?.day===day;
 const needed=()=>element.isConnected&&dayNeeded();
 const display=url=>{
  if(!needed())return;
  if(!url){status.textContent=home?'Prévia indisponível':'Ver foto';return}
  image.src=url;image.hidden=false;status.hidden=true;
 };
 const existing=comparisonThumbs.get(photo.id+':preview');
 if(existing?.ready){
  comparisonThumbs.delete(photo.id+':preview');
  comparisonThumbs.set(photo.id+':preview',existing);
  display(existing.url);
 }
 if(!warm)return;
 if(!existing?.ready)void warmPhotoThumb(photo,needed,true,'preview').then(display);
 if(comparisonPrepared[side]===day)return;
 comparisonPrepared[side]=day;
 for(const neighbor of [...rows.slice(index+1),...rows.slice(0,index).reverse()]){
  void warmPhotoThumb(neighbor,dayNeeded,false,'preview');
 }
}
function changePhotoComparison(control){
 const figure=control.closest('[data-photo-side]'),select=figure.querySelector('[data-photo-date]');
 const index=control===select?0:Number(control.value);
 paintComparison(figure,select.value,index,true);
}
document.addEventListener('input',event=>{
 if(event.target.matches?.('[data-photo-slider]'))changePhotoComparison(event.target);
});
document.addEventListener('change',event=>{
 if(event.target.matches?.('[data-photo-date]'))changePhotoComparison(event.target);
});
function hydratePhotoImages(){
 photoObserver?.disconnect();
 if(!['fotos','inicio','evolucao','peso'].includes(page))return;
 const root=$('#content'),generation=loadGeneration;
 const figures=[...root.querySelectorAll('[data-photo-side]')].filter(figure=>!figure.closest('[hidden]'));
 const loadFigure=(figure,warm)=>{
  const side=Number(figure.dataset.photoSide),selection=comparisonSelection[side],rows=comparisonDays.get(selection?.day);
  if(rows)paintComparison(figure,selection.day,Math.max(0,rows.findIndex(p=>p.id===selection.id)),warm);
 };
 const loadHistory=async button=>{
  const image=button.querySelector('[data-photo-media]');
  const needed=()=>image.isConnected&&image.closest('details')?.open&&generation===loadGeneration;
  if(!needed()||image.hasAttribute('src'))return;
  const photo=photoList.find(row=>row.id===image.dataset.photoMedia);
  if(!photo)return;
  const url=await warmPhotoThumb(photo,needed,true);
  if(!url||!needed())return;
  image.src=url;image.hidden=false;
  button.querySelector('[data-photo-placeholder]').hidden=true;
 };
 for(const figure of figures)if(!figure.querySelector('[data-photo-preview]').firstChild)loadFigure(figure,false);
 if(typeof IntersectionObserver!=='function'){figures.forEach(figure=>loadFigure(figure,true));return}
 photoObserver=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){
   photoObserver.unobserve(entry.target);
   if(entry.target.matches('[data-photo-side]'))loadFigure(entry.target,true);
   else void loadHistory(entry.target);
  }
 },{rootMargin:'96px 0px'});
 figures.forEach(figure=>photoObserver.observe(figure));
 root.querySelectorAll('details[open] [data-photo-media]').forEach(image=>photoObserver.observe(image.closest('button')));
}
function drawComparisonImage(ctx,image,x,y,width,height,alignTop=false){
 const scale=Math.min(width/image.naturalWidth,height/image.naturalHeight);
 const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
 ctx.drawImage(image,x+(width-w)/2,y+(height-h)*(alignTop?0:.5),w,h);
 return h;
}
async function drawComparisonSource(source,signal,draw){
 const image=document.createElement('img');
 const objectURL=typeof source==='string'?null:URL.createObjectURL(source);
 let abort;
 try{
  await new Promise((resolve,reject)=>{
   abort=()=>reject(Error('Cancelado.'));
   if(signal.aborted)return abort();
   signal.addEventListener('abort',abort,{once:true});
   image.onload=resolve;
   image.onerror=()=>reject(Error('Imagem indisponível.'));
   image.src=objectURL||source;
  });
  if(!signal.aborted)draw(image);
 }finally{
  signal.removeEventListener('abort',abort);
  image.onload=image.onerror=null;
  image.removeAttribute('src');
  if(objectURL)URL.revokeObjectURL(objectURL);
 }
}
function comparisonExportPalette(theme){
 return theme==='light'
  ?{background:'#F4F5F6',text:'#142743',title:'#142743',accent:'#223F63',photo:'#E2E5EA',footer:'#EDF0F4',grid:'#A8B4CC',fade:'rgba(34,63,99,.25)',transparent:'rgba(34,63,99,0)',outline:'rgba(244,245,246,.95)',variation:'#142743'}
  :{background:'#12100e',text:'#f8e8ca',title:'#dfbd78',accent:'#dfbd78',photo:'#27221d',footer:'#221c16',grid:'#524233',fade:'rgba(223,189,120,.35)',transparent:'rgba(223,189,120,0)',outline:'rgba(20,15,9,.80)',variation:'#ffe0a2'};
}
function drawComparisonWeight(ctx,result,font,top,palette){
 const {rows,reference,units}=result;
 if(rows.length<2)return;
 const {pts,ticks,y}=chartGeometry(rows,'value',reference);
 const px=x=>135+x*1.56,py=y=>top+14+y*(1871-top)/180;
 ctx.font=`34px ${font}`;
 const display=value=>fmt(units==='lb'?value*2.2046226218:value);
 ctx.textAlign='right';
 for(const tick of ticks){
  ctx.strokeStyle=palette.grid;
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(px(38),py(tick.y));
  ctx.lineTo(px(585),py(tick.y));
  ctx.stroke();
  ctx.fillStyle=palette.text;
  ctx.fillText(display(tick.value)+' '+units,px(34),py(tick.y)+11,px(34)-14);
 }
 const fade=ctx.createLinearGradient(0,py(25),0,py(180));
 fade.addColorStop(0,palette.fade);
 fade.addColorStop(1,palette.transparent);
 ctx.beginPath();
 pts.forEach((point,index)=>index?ctx.lineTo(px(point.x),py(point.y)):ctx.moveTo(px(point.x),py(point.y)));
 ctx.strokeStyle=palette.accent;
 ctx.lineWidth=4;
 ctx.lineJoin='round';
 ctx.stroke();
 ctx.lineTo(px(pts.at(-1).x),py(180));
 ctx.lineTo(px(pts[0].x),py(180));
 ctx.closePath();
 ctx.fillStyle=fade;
 ctx.fill();
 if(reference!==null){
  ctx.save();
  ctx.setLineDash([9,7]);
  ctx.beginPath();
  ctx.moveTo(px(38),py(y(reference)));
  ctx.lineTo(px(585),py(y(reference)));
  ctx.stroke();
  ctx.restore();
 }
 ctx.fillStyle=palette.accent;
 for(const point of pts){
  ctx.beginPath();
  ctx.arc(px(point.x),py(point.y),5,0,Math.PI*2);
  ctx.fill();
 }
 ctx.textAlign='center';
 ctx.fillStyle=palette.text;
 ctx.textAlign='left';
 ctx.fillText(date(rows[0].date),px(38),1894);
 ctx.textAlign='right';
 ctx.fillText(date(rows.at(-1).date),px(585),1894);
}
async function showComparisonExport(trigger){
 if($('#comparisonExport'))return;
 const generation=loadGeneration,account=mode==='cloud'&&!demo?Cloud.user?.id:null;
 const selected=selectedComparisonPhotos(account);
 const snapshot=Object.freeze({
  photos:Object.freeze(selected.map(photo=>photo?Object.freeze({id:photo.id,date:photo.date,path:photo.path}):null)),
  weight:comparisonWeight(selected)
 });
 const {photos,weight:variation}=snapshot;
 const exportable=photos.every(Boolean)&&photos[0].date!==photos[1].date;
 const indicator=trigger.closest('[data-photo-comparison]')?.querySelector('[data-comparison-weight]');
 if(indicator)indicator.innerHTML=comparisonWeightMarkup(variation);
 const controller=new AbortController();
 const dialog=document.createElement('dialog');
 dialog.id='comparisonExport';
 dialog.className='comparison-export-dialog';
 dialog.setAttribute('aria-labelledby','comparisonExportTitle');
 dialog.innerHTML=`<header><div><h2 id="comparisonExportTitle">Minha Evolução</h2><p>Antes e Depois</p></div>
  <form method="dialog"><button type="submit" class="secondary" autofocus>Fechar</button></form></header>
  <div class="comparison-export-media"><p role="status">Preparando imagens…</p></div>
  <footer><div class="comparison-export-actions"><button type="button" class="primary" data-export-share disabled>Compartilhar</button>
  <a class="secondary" data-export-save hidden download="NeoPep-Antes-e-Depois.jpg">Salvar imagem</a>
  <button type="button" class="secondary" data-export-cloud hidden disabled>Salvar no NeoPep</button></div>
  <p data-export-status role="status"></p></footer>`;
 const media=dialog.querySelector('.comparison-export-media');
 const share=dialog.querySelector('[data-export-share]'),save=dialog.querySelector('[data-export-save]'),cloudSave=dialog.querySelector('[data-export-cloud]');
 const status=dialog.querySelector('[data-export-status]');
 const current=()=>!controller.signal.aborted&&dialog.open&&generation===loadGeneration&&(!account||Cloud.user?.id===account);
 const canvas=document.createElement('canvas');
 let url,file;
 dialog.dispose=()=>{
  controller.abort();
  canvas.width=canvas.height=0;
  if(url)URL.revokeObjectURL(url);
  url=file=null;
  dialog.close();
  dialog.remove();
  if(trigger.isConnected)trigger.focus({preventScroll:true});
 };
 dialog.addEventListener('close',()=>{if(!controller.signal.aborted)dialog.dispose()},{once:true});
 const comparisonOrigin=engagementArea(page);
 save.addEventListener('click',event=>{if(!current())event.preventDefault();else engagementTrack('photo_comparison_export_success',comparisonOrigin)});
 cloudSave.addEventListener('click',async()=>{
  if(!current()||!file||!exportable||!account)return;
  if(!window.confirm('Salvar esta comparação de fotos no armazenamento privado da sua conta NeoPep? Ela não será publicada em grupos.'))return;
  cloudSave.disabled=true;
  status.textContent='Salvando sua comparação privada…';
  try{
   const saved=await Cloud.saveBeforeAfter(file,photos);
   if(!current()||!saved)return;
   status.textContent='Comparação salva na sua conta. Ela não foi compartilhada.';
   cloudSave.textContent='Salvo no NeoPep';
   engagementTrack('photo_comparison_export_success',comparisonOrigin);
  }catch(error){
   if(current()){cloudSave.disabled=false;status.textContent=error?.message||'Não foi possível salvar. Tente novamente.';}
  }
 });
 share.addEventListener('click',async()=>{
  if(!current()||!url)return;
  try{
   if(file&&navigator.share&&navigator.canShare?.({files:[file]})){
    await navigator.share({files:[file]});
    if(current())engagementTrack('before_after_share_success',comparisonOrigin);
    return;
   }
   save.click();
  }catch(error){
   if(current()&&error.name!=='AbortError')status.textContent='O compartilhamento falhou. Use Salvar imagem.';
  }
 });
 document.body.append(dialog);
 dialog.showModal();
 try{
  const font=window.getComputedStyle?.(document.body)?.fontFamily||'system-ui';
  if(document.fonts){
   await Promise.all([document.fonts.load(`400 32px ${font}`),document.fonts.load(`800 156px ${font}`)]);
  }
  if(!current())return;
  // One bounded output canvas and one decoded original at a time.
  canvas.width=navigator.deviceMemory&&navigator.deviceMemory<=4?720:1080;
  canvas.height=canvas.width*16/9;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Canvas indisponível.');
  const palette=comparisonExportPalette(document.documentElement.dataset.theme);
  ctx.scale(canvas.width/1080,canvas.width/1080);
  ctx.fillStyle=palette.background;
  ctx.fillRect(0,0,1080,1920);
  ctx.textAlign='center';
  ctx.fillStyle=palette.accent;
  ctx.font=`700 59px ${font}`;
  ctx.fillStyle=palette.title;
  ctx.fillText('Minha Evolução',540,76);
  const photoTop=202,maxPhotoHeight=1310,heights=[];
  for(const [side,photo] of photos.entries()){
   const x=side*540,center=x+270;
   ctx.fillStyle=palette.photo;
   ctx.fillRect(x,photoTop,540,maxPhotoHeight);
   ctx.fillStyle=palette.accent;
   ctx.font=`700 38px ${font}`;
   ctx.fillText(side?'DEPOIS':'ANTES',center,145);
   ctx.fillStyle=palette.text;
   ctx.font=`400 30px ${font}`;
   ctx.fillText(photo?date(photo.date):'Exemplo',center,185);
   const source=photo?await Cloud.photoBlob(photo):`assets/photo-example-${side+1}.png`;
   if(!current())return;
   await drawComparisonSource(source,controller.signal,image=>{
    heights.push(drawComparisonImage(ctx,image,x,photoTop,540,maxPhotoHeight,true));
   });
   if(!current())return;
  }
  const photoBottom=photoTop+Math.max(...heights);
  const overlap=Math.min(...heights);
  const markSize=Math.min(174,overlap*.37);
  const markTop=photoBottom-markSize/2;
  ctx.fillStyle=palette.footer;
  ctx.fillRect(0,photoBottom,1080,1920-photoBottom);
  ctx.textAlign='center';
  ctx.font=`700 ${markSize*1.15}px ${font}`;
  ctx.textBaseline='middle';
  const nameMetrics=ctx.measureText('NeoPep');
  const nameWidth=Math.min(690,nameMetrics.width);
  const nameOffset=(nameMetrics.actualBoundingBoxAscent-nameMetrics.actualBoundingBoxDescent)/2||0;
  const markGap=markSize*.15;
  const markLeft=(1080-markSize-markGap-nameWidth)/2;
  ctx.globalAlpha=.30;
  await drawComparisonSource('assets/icon-512.png',controller.signal,image=>drawComparisonImage(ctx,image,markLeft,markTop,markSize,markSize));
  if(!current())return;
  ctx.fillStyle=palette.accent;
  ctx.fillText('NeoPep',markLeft+markSize+markGap+nameWidth/2,photoBottom+nameOffset,690);
  ctx.globalAlpha=1;
  ctx.textBaseline='alphabetic';
  if(variation.display){
   const baseline=markTop-12;
   const fontSize=Math.min(78,overlap*.26);
   ctx.save();
   ctx.font=`800 ${fontSize}px ${font}`;
   ctx.lineJoin='round';
   ctx.lineWidth=fontSize/13;
   ctx.strokeStyle=palette.outline;
   ctx.fillStyle=palette.variation;
   ctx.strokeText(variation.display,540,baseline,960);
   ctx.fillText(variation.display,540,baseline,960);
   ctx.restore();
  }
  // Paint the data over the translucent mark to keep the plot readable.
  drawComparisonWeight(ctx,variation,font,photoBottom,palette);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.93));
  if(!current())return;
  if(!blob)throw Error('Composição indisponível.');
  url=URL.createObjectURL(blob);
  const image=document.createElement('img');
  image.src=url;
  image.alt='Composição Minha Evolução. '+(variation.display?variation.display+'. ':'')+photos.map((photo,side)=>(side?'Depois: ':'Antes: ')+(photo?date(photo.date):'Exemplo')).join('. ');
  media.replaceChildren(image);
  if(exportable){
   if(typeof File==='function')file=new File([blob],'NeoPep-Antes-e-Depois.jpg',{type:blob.type});
   save.href=url;
   save.hidden=false;
   share.disabled=false;
   if(account&&file&&typeof Cloud.beforeAfterAvailable==='function'){
    try{
     if(await Cloud.beforeAfterAvailable()&&current()){
      cloudSave.hidden=false;
      cloudSave.disabled=false;
     }
    }catch{} // Backend ainda não habilitado: manter opção oculta.
   }
  }else{
   status.textContent=account?'Selecione fotos reais de dois dias diferentes para compartilhar ou salvar.':'Entre na sua conta para compartilhar suas fotos.';
  }
 }catch{
  if(current())media.textContent='Não foi possível preparar a comparação. Feche e tente novamente.';
 }finally{
  canvas.width=canvas.height=0;
 }
}
document.addEventListener('click',event=>{
 const trigger=event.target.closest?.('[data-comparison-export]');
 if(trigger&&!$('#comparisonExport')){engagementTrack(page==='fotos'?'photo_comparison_started':'before_after_open');void showComparisonExport(trigger)}
});
async function showSavedComparisons(trigger){
 if($('#savedComparisonsDialog')||mode!=='cloud'||demo||!Cloud.user?.id)return;
 const generation=loadGeneration,account=Cloud.user.id;
 const dialog=document.createElement('dialog');
 dialog.id='savedComparisonsDialog';
 dialog.className='comparison-export-dialog';
 dialog.setAttribute('aria-label','Minhas comparações salvas');
 dialog.innerHTML='<header><h2>Minhas comparações salvas</h2><form method="dialog"><button class="secondary" type="submit">Fechar</button></form></header><div class="comparison-saved-list" role="region" aria-live="polite"><p>Carregando…</p></div>';
 const active=()=>dialog.isConnected&&dialog.open&&generation===loadGeneration&&mode==='cloud'&&Cloud.user?.id===account;
 dialog.addEventListener('close',()=>{dialog.remove();if(trigger?.isConnected)trigger.focus({preventScroll:true})},{once:true});
 document.body.append(dialog);
 if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
 const list=dialog.querySelector('.comparison-saved-list');
 async function refresh(){
  if(!active())return;
  try{
   const records=await Cloud.savedBeforeAfter();
   if(!active())return;
   list.replaceChildren();
   if(!records.length){const empty=document.createElement('p');empty.textContent='Você ainda não salvou comparações nesta conta.';list.append(empty);return;}
   for(const item of records){
    const section=document.createElement('section');
    section.className='card space';
    const label=document.createElement('p');
    label.textContent='Antes: '+date(item.before_date)+' · Depois: '+date(item.after_date);
    const controls=document.createElement('div');
    controls.className='comparison-export-actions';
    const view=document.createElement('button'),remove=document.createElement('button');
    view.type=remove.type='button';
    view.className='secondary';view.textContent='Visualizar';
    remove.className='secondary';remove.textContent='Excluir';
    const preview=document.createElement('div');
    preview.className='comparison-saved-preview';
    view.addEventListener('click',async()=>{
     if(!active())return;
     view.disabled=true;
     try{
      const url=await Cloud.beforeAfterURL(item);
      if(!active())return;
      const img=document.createElement('img');
      img.src=url;img.alt='Comparação privada de '+date(item.before_date)+' até '+date(item.after_date);
      img.referrerPolicy='no-referrer';
      img.style.maxWidth='100%';
      img.style.maxHeight='65vh';
      preview.replaceChildren(img);
     }catch(error){if(active())preview.textContent=error?.message||'Prévia indisponível.'}
     finally{if(active())view.disabled=false}
    });
    remove.addEventListener('click',async()=>{
     if(!active()||!window.confirm('Excluir permanentemente esta comparação privada do NeoPep? As fotos originais não serão excluídas.'))return;
     remove.disabled=true;
     try{
      await Cloud.deleteBeforeAfter(item);
      if(active())await refresh();
     }catch(error){
      if(active()){remove.disabled=false;preview.textContent=error?.message||'Não foi possível excluir a comparação.';}
     }
    });
    controls.append(view,remove);section.append(label,controls,preview);list.append(section);
   }
  }catch(error){if(active())list.textContent=error?.message||'Não foi possível carregar as comparações salvas.'}
 }
 void refresh();
}
document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-saved-comparisons]');
 if(button)void showSavedComparisons(button);
});
async function showPhoto(id,trigger=document.activeElement){
 const photo=photoList.find(row=>row.id===id),generation=loadGeneration;
 if(!photo||$('#photoViewer'))return;
 const dialog=document.createElement('dialog');
 dialog.id='photoViewer';
 dialog.className='photo-viewer';
 dialog.setAttribute('aria-labelledby','photoViewerTitle');
 dialog.innerHTML=`<header class="photo-viewer-actions">
  <form method="dialog"><button type="submit" class="secondary" autofocus>Fechar</button></form>
  <button type="button" class="secondary" data-photo-export="${esc(id)}">Download</button>
  <button type="button" class="delete" data-photo-delete="${esc(id)}">Excluir</button>
 </header><div class="photo-viewer-media"><p role="status">Carregando foto…</p></div>
 <footer id="photoViewerTitle">Foto privada · ${date(photo.date)}</footer>`;
 dialog.addEventListener('close',()=>{
  dialog.remove();
  if(trigger?.isConnected)trigger.focus({preventScroll:true});
  else if(page==='fotos')$('#content').focus({preventScroll:true});
 },{once:true});
 document.body.append(dialog);
 dialog.showModal();
 dialog.querySelector('button').focus({preventScroll:true});
 const media=dialog.querySelector('.photo-viewer-media');
 try{
  const url=await photoSource(photo,'original');
  if(!dialog.hasAttribute('open')||!dialog.isConnected||generation!==loadGeneration)return;
  if(!url)throw Error('Foto indisponível.');
  const image=document.createElement('img');
  image.alt='Foto privada em '+date(photo.date);
  image.onload=()=>media.replaceChildren(image);
  image.onerror=()=>{media.textContent='Não foi possível carregar a foto. Feche e tente novamente.'};
  image.src=url;
 }catch{if(dialog.hasAttribute('open'))media.textContent='Não foi possível carregar a foto. Feche e tente novamente.'}
}
document.addEventListener('toggle',event=>{
 const id=event.target.dataset?.photoSection;
 if(!id||!event.target.isConnected)return;
 if(event.target.open){if(!openedPhotoSections.has(id))engagementTrack('photo_history_open','fotos');openedPhotoSections.add(id);}else openedPhotoSections.delete(id);
 hydratePhotoImages();
},true);
const audienceCampaign=(()=>{
 const result={};
 const query=new URL(location.href,"https://invalid.invalid").searchParams;
 for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']){
  const value=query.get(key);
  if(value&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value))result[key]=value;
 }
 if(document.referrer){
  try{
   const origin=new URL(document.referrer),host=origin.hostname;
   if(origin.origin!==new URL(location.href).origin){
    result.referrer=/(^|\.)instagram\.com$/.test(host)?'Instagram':/(^|\.)facebook\.com$/.test(host)?'Facebook':
     /(^|\.)google\.(com|com\.br|co\.uk)$/.test(host)?'Google':'Outra referência';
   }
  }catch{}
 }
 return result;
})();
let audienceAccount=null,audienceAllowed=null,audienceCheck=null,audienceObservedAt=0,audienceCampaignPending=true;
function audienceDevice(){
 const ua=navigator.userAgent||'';
 const ipad=/iPad/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
 const os=ipad||/iPhone|iPod/.test(ua)?'iOS':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':
  /Macintosh/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':null;
 const category=ipad||os==='Android'&&!/Mobile/.test(ua)?'tablet':/Mobile|iPhone|iPod/.test(ua)?'mobile':os?'desktop':null;
 const patterns=[['Edge',/Edg(?:A|iOS)?\/(\d+)/],['Opera',/OPR\/(\d+)/],
  ['Samsung Internet',/SamsungBrowser\/(\d+)/],['Firefox',/(?:Firefox|FxiOS)\/(\d+)/],
  ['Chrome',/(?:Chrome|CriOS)\/(\d+)/],['Safari',/Version\/(\d+).*Safari/]];
 const match=patterns.find(([,pattern])=>pattern.test(ua));
 const context=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches?'pwa':
  navigator.standalone===false||matchMedia('(display-mode: browser)').matches?'browser':null;
 return {category,os,browser:match?.[0],major:match?.[1].exec(ua)?.[1],context};
}
async function syncAudience(){
 const account=mode==='cloud'&&!demo?Cloud.user?.id:null;
 if(audienceAccount!==account){
  if(audienceAccount)audienceCampaignPending=false;
  audienceAccount=account;audienceAllowed=null;audienceCheck=null;audienceObservedAt=0;
 }
 if(!account||!Cloud.audience||audienceCheck||document.visibilityState==='hidden'||navigator.onLine===false||audienceAllowed===false)return;
 const request={};audienceCheck=request;
 try{
  if(audienceAllowed===null){
   const status=await Cloud.audience('status');
   if(audienceCheck!==request||Cloud.user?.id!==account)return;
   audienceAllowed=status.allowed===true;
  }
  if(!audienceAllowed||Date.now()-audienceObservedAt<300000)return;
  const result=await Cloud.audience('observe',audienceDevice(),audienceCampaignPending?audienceCampaign:null);
  if(audienceCheck!==request||Cloud.user?.id!==account)return;
  audienceAllowed=result.allowed===true;
  audienceObservedAt=Date.now();
  audienceCampaignPending=false;
 }catch{}finally{if(audienceCheck===request)audienceCheck=null}
}

window.addEventListener('pageshow',syncAudience);
setInterval(syncAudience,300000);
const engagementViews={
 inicio:'home_view',evolucao:'evolution_view',registros:'records_view',diario:'journal_view',
 aplicacoes:'application_view',protocolos:'protocols_view',calculadora:'calculator_view',relatorios:'reports_view',
 calendario:'calendar_view',lembretes:'reminders_view',fotos:'photos_view',perfil:'profile_view',
 comunidade:'community_view',loja:'shop_view',suporte:'support_view'
};
let engagementOwner=null,engagementAllowed=false,engagementChecked=false,engagementChecking=false;
let engagementSession=null,engagementSequence=0,engagementRoute=null,engagementQueue=[];
let engagementBusy=false,engagementLastInput=0,engagementLastSample=0,engagementCalcStarted=false;
function engagementArea(route){return route==='peso'?'evolucao':route==='comunidade'&&document.querySelector('[data-support-root]')?'suporte':route}
function resetEngagement(owner){
 engagementOwner=owner;
 engagementAllowed=engagementChecked=engagementChecking=engagementBusy=false;
 engagementSession=engagementRoute=null;
 engagementQueue=[];
 engagementSequence=engagementLastInput=engagementLastSample=0;
 engagementCalcStarted=false;
 qualityNext.clear();
}
function engagementVisible(){return document.visibilityState!=='hidden'&&mode==='cloud'&&!demo&&!!Cloud.user&&Cloud.user.id===engagementOwner}
function engagementTrack(event,area=engagementArea(page),seconds=0){
 if(!engagementAllowed||!engagementVisible()||!event||!window.crypto?.randomUUID)return;
 if(!Object.hasOwn(engagementViews,area)&&area!=='onboarding')return;
 const now=Date.now();
 if(!engagementSession||now-engagementLastInput>=1800000){
  engagementSession=window.crypto.randomUUID();
  engagementSequence=0;
  engagementLastInput=now;
 }
 if(engagementQueue.length>=100)engagementQueue.shift();
 engagementQueue.push({id:window.crypto.randomUUID(),session_id:engagementSession,
  occurred_at:new Date(now).toISOString(),sequence:++engagementSequence,area,event,seconds});
 if(engagementQueue.length>=20)void flushEngagement();
}
window.NeoEngagement={track:engagementTrack,view:engagementView};
async function flushEngagement(){
 if(!engagementAllowed||engagementBusy||!engagementQueue.length||navigator.onLine===false||Cloud.user?.id!==engagementOwner)return;
 const queue=engagementQueue,owner=engagementOwner;
 engagementBusy=true;
 try{
  queue.splice(0,queue.length,...queue.filter(row=>Date.now()-Date.parse(row.occurred_at)<540000));
  if(!queue.length)return;
  const batch=queue.slice(0,20),result=await Cloud.engagement('record',batch);
  if(queue!==engagementQueue||Cloud.user?.id!==owner)return;
  const sent=new Set(batch.map(event=>event.id));
  queue.splice(0,queue.length,...queue.filter(event=>!sent.has(event.id)));
  if(!result.allowed){engagementAllowed=false;queue.length=0}
 }catch{}finally{if(queue===engagementQueue)engagementBusy=false}
}
function engagementView(){
 if(!engagementAllowed||!engagementVisible())return;
 const area=engagementArea(page);
 if(area===engagementRoute)return;
 engagementRoute=area;
 engagementLastSample=Date.now();
 engagementCalcStarted=false;
 if(Object.hasOwn(engagementViews,area))engagementTrack(engagementViews[area],area);
}
let geoAccount=null,geoAllowed=null,geoPending=false,geoNext=0,geoCaptureRequested=true;
async function syncGeo(){
 const account=mode==='cloud'&&!demo?Cloud.user?.id:null;
 if(geoAccount!==account){geoAccount=account;geoAllowed=null;geoPending=false;geoNext=0;geoCaptureRequested=true}
 const enabled=window.NEO_CONFIG?.stagingGeoEnabled===true;
 if(!account||!Cloud.geoControl||geoPending||document.visibilityState==='hidden'||(!enabled&&page!=='perfil')||Date.now()<geoNext)return;
 geoPending=true;
 try{
  if(geoAllowed===null){
   const result=await Cloud.geoControl('status');
   if(geoAccount!==account||Cloud.user?.id!==account)return;
   geoAllowed=result.allowed===true;
  }
  if(enabled&&geoAllowed&&geoCaptureRequested&&Cloud.captureGeo){await Cloud.captureGeo();geoCaptureRequested=false;}
 }catch{}finally{if(geoAccount===account){geoPending=false;geoNext=Date.now()+300000}}
}

for(const event of ['pageshow','focus'])window.addEventListener(event,()=>{geoCaptureRequested=true;void syncGeo()});
const qualityNext=new Map();
let qualityNavigationMeasured=false,vitalsOwner=null;
function observeQuality(metric,duration=null,ending=false){
 const visible=()=>engagementVisible()||(ending&&mode==='cloud'&&!demo&&Cloud.user?.id===engagementOwner);
 if(!engagementAllowed||!visible()||!Cloud.qualityObserve)return;
 const now=Date.now(),key=engagementOwner+':'+metric;
 if((qualityNext.get(key)||0)>now)return;
 qualityNext.set(key,now+(metric==='sync_response'?300000:60000));
 const commit=window.NEO_CONFIG?.stagingBuild?.commit;
 const revision=/^[a-f0-9]{40}$/.test(commit||'')?commit.slice(0,12):'';
 void Promise.resolve().then(()=>{
  if(engagementAllowed&&visible()&&key.startsWith(engagementOwner+':'))
   return Cloud.qualityObserve(metric,duration,revision);
 }).catch(()=>{});
}
function sampleInitialQuality(){
 if(!engagementAllowed)return;
 if(vitalsOwner===null&&Cloud.observeWebVitals){
  const owner=engagementOwner;
  vitalsOwner=owner;
  try{Cloud.observeWebVitals(metric=>{
   if(engagementOwner!==owner||Cloud.user?.id!==owner)return;
   const label=({LCP:'web_lcp',CLS:'web_cls',INP:'web_inp'})[metric.name];
   const value=Math.round(metric.value*(metric.name==='CLS'?1000:1));
   if(label&&Number.isFinite(value)&&value>=0&&value<=120000)observeQuality(label,value,true);
  })}catch{}
 }
 if(qualityNavigationMeasured)return;
 const entry=window.performance?.getEntriesByType?.('navigation')?.[0];
 if(entry?.loadEventEnd>0&&entry.duration<=120000){
  qualityNavigationMeasured=true;
  observeQuality('initial_load',Math.round(entry.duration));
 }
}
window.addEventListener('error',event=>{
 if(typeof event.message==='string')observeQuality('javascript_error');
});
window.addEventListener('unhandledrejection',()=>observeQuality('javascript_error'));
async function syncEngagement(){
 const owner=mode==='cloud'&&!demo?Cloud.user?.id:null;
 if(engagementOwner!==owner)resetEngagement(owner);
 if(!owner||!Cloud.engagement||engagementChecking||!engagementVisible())return;
 if(!engagementChecked){
  engagementChecking=true;
  const queue=engagementQueue;
  try{
   const status=await Cloud.engagement('status');
   if(queue!==engagementQueue||Cloud.user?.id!==owner)return;
   engagementAllowed=status.allowed===true;
   engagementChecked=true;
  }catch{return}finally{if(queue===engagementQueue)engagementChecking=false}
 }
 engagementView();
 sampleInitialQuality();
}
function sampleEngagement(){
 const now=Date.now(),elapsed=now-engagementLastSample;
 engagementLastSample=now;
 if(engagementAllowed&&engagementVisible()&&engagementRoute===engagementArea(page)&&elapsed>0&&elapsed<=17000){
  const seconds=Math.min(15,Math.floor(Math.max(0,Math.min(now,engagementLastInput+60000)-(now-elapsed))/1000));
  if(seconds)engagementTrack('active_time',engagementRoute,seconds);
 }
}
function engagementInput(){
 if(!engagementAllowed||!engagementVisible())return;
 const now=Date.now();
 if(now-engagementLastInput>=60000)sampleEngagement();
 if(now-engagementLastInput>=1800000){
  engagementSession=engagementRoute=null;
  engagementView();
 }
 engagementLastInput=now;
}
for(const type of ['pointerdown','keydown','touchstart','scroll'])document.addEventListener(type,engagementInput,{passive:true});
document.addEventListener('visibilitychange',()=>{
 engagementLastSample=Date.now();
 if(document.visibilityState==='hidden')void flushEngagement();
 else void syncEngagement();
});
window.addEventListener('pagehide',()=>void flushEngagement());
setInterval(()=>{sampleEngagement();void syncEngagement();void flushEngagement()},15000);

const privacyOptions=[
 ['statistics','Estatísticas do aplicativo'],
 ['usage','Medição de uso'],
 ['campaigns','Notificações de campanhas'],
 ['location','Localização aproximada']
];
function personalizationPanel(initial){
 return `<section class="card privacy-preferences personalization-panel" data-personalization hidden aria-labelledby="personalizationTitle">
  <h2 id="personalizationTitle" tabindex="-1">Personalize sua experiência</h2>
  <p>Permita que o NeoPep personalize sua experiência e melhore nossas comunicações.</p>
  <p class="sub">Sua escolha é opcional. Estatísticas, campanhas e permissões do aparelho têm controles próprios.</p>
  <div class="personalization-actions">
   <button type="button" class="primary" data-personalization-choice="allow">Permitir personalização</button>
   <button type="button" class="text-btn" data-personalization-choice="deny">${initial?'Agora não':'Revogar personalização'}</button>
  </div><p role="status" data-personalization-status></p>
 </section>`;
}
function mountPersonalization(form,initial,current){
 const panel=$('[data-personalization]');
 if(!panel||!Cloud.personalizationConsent)return async()=>{};
 const allow=panel.querySelector('[data-personalization-choice=allow]');
 const deny=panel.querySelector('[data-personalization-choice=deny]');
 const status=panel.querySelector('[data-personalization-status]');
 const notice=form.querySelector('[data-privacy-notice]');
 let busy=false;
 function revealPreferences(message){
  panel.hidden=true;
  form.hidden=false;
  if(message)notice.textContent=message;
  form.querySelector('button.primary').focus();
 }
 function paint(result){
  if(initial&&result.decided)return;
  panel.hidden=false;
  if(initial){
   form.hidden=true;
   panel.querySelector('h2').focus();
  }else{
   allow.hidden=result.granted===true;
   deny.hidden=result.granted!==true;
   status.textContent=result.granted?'Personalização autorizada.':'Personalização desativada.';
  }
 }
 panel.addEventListener('click',async event=>{
  const choice=event.target.closest('[data-personalization-choice]')?.dataset.personalizationChoice;
  if(!choice||busy||panel.hidden||!current())return;
  busy=true;allow.disabled=deny.disabled=true;
  status.textContent='Salvando sua escolha…';
  try{
   const result=await Cloud.personalizationConsent(choice==='allow');
   if(!current())return;
   if(initial)revealPreferences();else paint(result);
  }catch{
   if(!current())return;
   const message='Não foi possível confirmar a escolha. Você pode revisá-la em Privacidade e permissões.';
   if(initial)revealPreferences(message);else status.textContent=message;
  }finally{
   busy=false;
   if(current())allow.disabled=deny.disabled=false;
  }
 });
 return async function showPersonalization(){
  try{
   const result=await Cloud.personalizationConsent();
   if(current())paint(result);
  }catch{/* Older deployments and network failures leave this optional step closed. */}
 };
}
function privacyPreferencesPage(){
 if(mode!=='cloud'||demo||!Cloud.user)return head('Privacidade e permissões','Entre na sua conta para configurar suas preferências.');
 const initial=page==='permissoes-iniciais';
 const title=initial?'Suas preferências':'Privacidade e permissões';
 const device=audienceDevice();
 const deviceSummary=[device.category==='mobile'?'Celular':device.category==='tablet'?'Tablet':device.category==='desktop'?'Computador':null,device.os,device.browser,device.context==='pwa'?'Aplicativo instalado':device.context==='browser'?'Navegador':null].filter(Boolean).join(' · ');
 return (initial?'<div class="page-head"><h1>'+title+'</h1></div>':head(title,''))+
  `<form id="privacyPreferences" class="card privacy-preferences" data-privacy-account="${esc(Cloud.user.id)}" data-privacy-page="${page}">
  ${initial?'<p class="sub">Revise as opções e confirme em OK. Você pode mudar depois no Perfil.</p>':''}
  <fieldset disabled aria-label="Permissões opcionais">
  ${privacyOptions.map(([key,label])=>`<label class="privacy-option" for="privacy-${key}"><span>${label}</span><input id="privacy-${key}" name="${key}" type="checkbox" role="switch"${initial?' checked':''}></label>`).join('')}
  </fieldset>
  ${initial?'<button type="button" class="secondary full" data-privacy-select-none>Desmarcar todas</button>':''}
  <p class="sub privacy-device-summary">Dispositivo atual: ${esc(deviceSummary||'Não identificado')}.</p>
  <p class="form-help">A região é aproximada pela conexão. As coordenadas GPS não são armazenadas.</p>
  <p class="sub" data-privacy-notice role="status">Consultando preferências…</p>
  <a class="text-btn privacy-policy-link" href="#privacidade" target="_blank" rel="noopener">Política de Privacidade</a>
  <button type="submit" class="primary full" disabled>${initial?'OK':'Salvar preferências'}</button>
  ${initial?'<button type="submit" name="skip" class="text-btn full" disabled>Agora não</button>':''}
  </form>`+personalizationPanel(initial);
}
function privacyHelp(form){
 const messages=[];
 if(window.Notification?.permission==='denied')messages.push('Notificações bloqueadas. Para liberá-las, abra os ajustes de notificações do aparelho ou do navegador.');
 if(form.querySelector('[name=location]')?.disabled)messages.push('A localização aproximada ainda está indisponível neste ambiente.');
 return messages.join(' ');
}
function requestDeviceLocation(){
 return new Promise(resolve=>{
  const timeout=setTimeout(()=>finish(false),8000);
  function finish(allowed){clearTimeout(timeout);resolve(allowed);}
  try{
   const geo=navigator.geolocation;
   if(!geo){finish(false);return;}
   geo.getCurrentPosition(()=>finish(true),()=>finish(false),{
    enableHighAccuracy:false,maximumAge:0,timeout:8000
   });
  }catch{finish(false);}
 });
}
function mountPrivacyPreferences(){
 const form=$('#privacyPreferences');
 if(!form||form.dataset.mounted)return;
 form.dataset.mounted='true';
 const account=Cloud.user.id,initial=page==='permissoes-iniciais',fields=form.querySelector('fieldset');
 const status=form.querySelector('[data-privacy-notice]'),save=form.querySelector('button.primary');
 const skip=form.querySelector('[name=skip]');
 const current=()=>Cloud.user?.id===account&&form.isConnected;
 let baseline=null,saving=false;
 form.querySelector('[data-privacy-select-none]')?.addEventListener('click',()=>{
  if(!current()||saving||fields.disabled)return;
  for(const option of fields.querySelectorAll('input[type=checkbox]:not(:disabled)'))option.checked=false;
  status.textContent='Opções desmarcadas. Toque em OK para salvar.';
 });
 const showPersonalization=mountPersonalization(form,initial,()=>current()&&!saving);
 function apply(values){
  baseline=values;
  for(const [key] of privacyOptions){
   const field=form.querySelector('[name='+key+']');
   if(field)field.checked=initial&&values.pending?true:values[key]===true;
  }
  const locationField=form.querySelector('[name=location]');
  if(locationField)locationField.disabled=!values.location&&window.NEO_CONFIG?.stagingGeoEnabled!==true;
  status.textContent=privacyHelp(form);
 }
 async function load(){
  status.textContent='Consultando preferências…';
  try{
   const values=await Cloud.privacyPreferences();
   if(!current()||saving)return;
   if(initial&&!values.pending){await openAccountDestination(false);return;}
   apply(values);
   fields.disabled=false;
   await showPersonalization();
  }catch{
   if(current()&&!saving)status.textContent='Não foi possível consultar as preferências. Tente novamente.';
  }
  if(current()&&!saving){save.disabled=false;if(skip)skip.disabled=false;}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!current()||saving)return;
  const skipping=!!skip&&event.submitter===skip;
  if(!skipping&&!baseline){await load();return;}
  const choices={};
  if(!skipping)for(const [key] of privacyOptions){
   const field=form.querySelector('[name='+key+']');
   if(field&&!field.disabled&&(initial||field.checked!==baseline[key]))choices[key]=field.checked;
  }
  // Start native authorization within the submit gesture, before the network request.
  const wantsCampaigns=choices.campaigns===true;
  const nativeNotice=wantsCampaigns?Promise.resolve(window.NeoPush?.enable?.()).then(active=>active?'Notificações ativadas neste dispositivo.':'Confira a ativação de notificações em Lembretes.').catch(error=>error?.message||'O aparelho não autorizou as notificações; confira os ajustes do iPhone.'):Promise.resolve('');
  const locationCheck=choices.location===true?requestDeviceLocation():null;
  saving=true;fields.disabled=true;save.disabled=true;if(skip)skip.disabled=true;
  status.textContent=locationCheck?'Aguardando a permissão do aparelho…':'Salvando preferências…';
  try{
   const locationUnavailable=locationCheck!==null&&!(await locationCheck);
   if(!current())return;
   if(locationUnavailable)delete choices.location;
   const values=await Cloud.privacyPreferences(skipping?null:choices,initial);
   if(Cloud.user?.id!==account)return;
   if(choices.statistics!==undefined){
    audienceAccount=account;audienceAllowed=values.statistics;audienceCheck=null;audienceObservedAt=0;
    if(!values.statistics)audienceCampaignPending=false;
    else void syncAudience();
   }
   if(choices.usage!==undefined){
    resetEngagement(account);engagementAllowed=values.usage;engagementChecked=true;
    if(values.usage)void syncEngagement();
   }
   if(choices.location!==undefined){
    geoAccount=account;geoAllowed=values.location;geoNext=0;geoCaptureRequested=values.location;
    if(values.location)void syncGeo();
   }
   const notificationMessage=await nativeNotice;
   const notice=[notificationMessage,locationUnavailable?'A localização continua desativada. Você pode autorizá-la no Perfil.':''].filter(Boolean).join(' ');
   if(!current())return;
   apply(values);
   if(initial){
    window.NeoArrival?.arm(account,true);
    await openAccountDestination(false);
    toast(notice||'Seu espaço está pronto.');
   }else status.textContent=['Preferências salvas.',notice||privacyHelp(form)].filter(Boolean).join(' ');
  }catch{
   if(current())status.textContent='Não foi possível salvar as preferências. Tente novamente.';
  }finally{
   saving=false;
   if(current()){fields.disabled=!baseline;save.disabled=false;if(skip)skip.disabled=false;}
  }
 });
 void load();
}
function profilePage(){const p={...state.profile,consent:mode==='cloud'&&!demo?Cloud.hasConsent('health'):state.profile.consent};return head('Seu espaço, do seu jeito.','Perfil, preferências e controle dos seus dados.')+`<div class="two-cols"><section class="card"><div class="profile-head"><div class="avatar">${avatarURL?`<img src="${esc(avatarURL)}" alt="Sua foto">`:esc(p.name.slice(0,1).toUpperCase()||'N')}</div><div><h2>${esc(p.name||'Como podemos chamar você?')}</h2><p class="sub">${mode==='cloud'?esc(Cloud.user?.email||'Conta conectada'):'Perfil local · neste navegador'}</p><button class="text-btn" data-add="avatar">Alterar foto</button></div></div><form id="profileForm"><label>Nome<input name="name" value="${esc(p.name)}" maxlength="100" autocomplete="given-name" required placeholder="Seu nome"></label>${mode==='cloud'?`<label>E-mail da conta<input type="email" disabled value="${esc(Cloud.user?.email||'')}"></label>`:''}<div class="form-grid"><label class="profile-birth-date">Nascimento (opcional)<input name="birthDate" type="date" value="${esc(p.birthDate)}" max="${C.today()}"></label><label class="profile-height">Altura (cm)<input name="height" type="number" min="40" max="260" step="0.1" inputmode="decimal" value="${p.height??''}"></label><label>Peso inicial (kg)<input name="initialWeight" type="number" min="1" max="650" step="0.01" inputmode="decimal" value="${p.initialWeight??''}"></label><label>Meta de peso (kg)<input name="goal" type="number" min="1" max="650" step="0.01" inputmode="decimal" value="${p.goal??''}"></label></div><div class="form-grid"><label>Unidades de exibição<select name="units"><option value="metric" ${p.units==='metric'?'selected':''}>kg e cm</option><option value="imperial" ${p.units==='imperial'?'selected':''}>lb e polegadas</option></select></label></div><p class="form-help">Os formulários guardam valores em kg e cm; a preferência altera a exibição de peso e medidas.</p>${mode!=='cloud'||demo?profilePermissions(p):''}${trackingFields(p)}<button class="primary full">Salvar perfil</button></form></section><section><div class="card"><h2>Conta e sincronização</h2>${mode==='cloud'&&!Cloud.onboardingComplete?'<button class="primary full space" data-go="onboarding">Concluir cadastro inicial</button>':''}<p class="sub space">${mode==='cloud'?'Sua conta está conectada. Alterações confirmadas são persistidas na nuvem.':'Você está no modo local. Os dados deste dispositivo não são enviados à nuvem automaticamente.'}</p>${mode==='cloud'?`<button class="secondary full space" id="refresh">${icon('refresh')} Atualizar dados da nuvem</button><button class="text-btn full" id="logout">${icon('logout')} Sair da conta</button><button class="text-btn full" id="logoutAll">Sair de todos os dispositivos</button>`:`<button class="primary full space" data-go="bemvindo">${icon('user')} Entrar ou criar conta</button><p class="not-configured space">${Cloud.configured?'Integração configurada; valide o acesso na sua conta.':'Apple, Google e e-mail aguardam configuração externa.'}</p>`}</div><div class="profile-settings space"><details class="card profile-setting"><summary><span class="profile-setting-icon">${icon('download')}</span><span>Meus dados<small>Exportar, importar e excluir</small></span><span class="profile-setting-chevron" aria-hidden="true">⌄</span></summary><div class="profile-setting-content"><div class="profile-data-actions"><button class="secondary" id="backup">${icon('download')} Exportar backup</button><button class="secondary" id="restore">Importar backup</button><button class="secondary" id="csv">Exportar planilha</button></div><p class="sub space">O backup inclui seu perfil e registros. As fotos são exportadas separadamente na galeria. A importação adiciona registros sem apagar os existentes ou substituir seu perfil.</p><button class="text-btn" data-go="fotos">Abrir minhas fotos</button>${legacyExists&&!demo?`<details class="space"><summary>Recuperar registros anteriores</summary><p class="sub">Exporte o original antes de revisar a importação.</p><button class="secondary space" id="legacyBackup">Exportar registros originais</button><button class="secondary space" id="legacyImport" ${legacyBackupDone?'':'disabled'}>Revisar importação</button></details>`:''}${localError?'<button class="secondary full space" id="rawBackup">Exportar dados locais brutos</button>':''}<div class="danger-zone">${mode==='cloud'?'<button class="delete" id="deleteAccount">Excluir minha conta</button><p class="sub">A exclusão é permanente e exige confirmação de identidade. Exportar os dados antes é opcional.</p>':'<button class="delete" id="clearLocal">Excluir dados deste dispositivo</button><p class="sub">A exclusão é permanente e afeta os dados locais neste navegador. Exportar antes é opcional.</p>'}</div></div></details>${mode==='cloud'&&!demo?`<button type="button" class="card profile-setting privacy-setting-link" data-go="permissoes"><span class="profile-setting-icon">${icon('shield')}</span><span>Privacidade e permissões</span><span class="profile-setting-chevron" aria-hidden="true">›</span></button>`:''}<details class="card profile-setting"><summary><span class="profile-setting-icon">${icon('shield')}</span><span>Dados de saúde e fotos<small>Autorizações e documentos</small></span><span class="profile-setting-chevron" aria-hidden="true">⌄</span></summary><div class="profile-setting-content">${mode==='cloud'&&!demo?profilePermissions(p):'<p class="sub">Você controla os dados que registra. Consulte os documentos e as opções de exclusão em Meus dados.</p>'}${mode==='cloud'?'<div class="privacy-controls"><button class="text-btn" id="withdrawHealth">Retirar autorização de saúde</button><button class="text-btn" id="withdrawPhotos">Retirar autorização de fotos</button></div><p class="sub">Retirar uma autorização bloqueia novas gravações correspondentes; não apaga automaticamente os dados anteriores.</p>':''}<div class="privacy-documents"><button class="text-btn" data-go="termos">Termos de uso</button><button class="text-btn" data-go="privacidade">Política de Privacidade</button></div></div></details><details class="card profile-setting"><summary><span class="profile-setting-icon">${icon('download')}</span><span>Instalar aplicativo<small>Adicionar à tela inicial</small></span><span class="profile-setting-chevron" aria-hidden="true">⌄</span></summary><div class="profile-setting-content">${window.NeoInstall?.guide()||'<p class="sub">Abra o menu do navegador e escolha adicionar à tela inicial.</p>'}</div></details></div></section></div>`}
function rememberRecovery(stage){try{window.sessionStorage?.setItem('neo-recovery-request',JSON.stringify({email:authEmail,stage,requestedAt:Date.now()}));}catch{}}
function clearRecovery(){try{window.sessionStorage?.removeItem('neo-recovery-request');}catch{}}
function restoreRecovery(){try{const saved=JSON.parse(window.sessionStorage?.getItem('neo-recovery-request')||'null');if(!saved||!/^\S+@\S+\.\S+$/.test(saved.email)||!Number.isFinite(saved.requestedAt)||Date.now()-saved.requestedAt>3600000||saved.requestedAt>Date.now()||!['verifycode','newpassword'].includes(saved.stage))return;authEmail=saved.email;authMode=saved.stage;recoveryFlow=true;resetNextAt=saved.stage==='verifycode'?saved.requestedAt+60000:0;page='bemvindo';}catch{}}
function socialLoginButtons(cfg){const apple='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.05 12.54c.03 3.03 2.66 4.04 2.69 4.05-.02.07-.42 1.44-1.39 2.86-.84 1.23-1.71 2.45-3.08 2.48-1.34.03-1.77-.8-3.3-.8-1.52 0-2 .77-3.27.83-1.32.05-2.33-1.33-3.18-2.55-1.73-2.5-3.05-7.07-1.27-10.15.88-1.53 2.45-2.5 4.16-2.52 1.3-.03 2.53.88 3.32.88.8 0 2.29-1.09 3.86-.93.66.03 2.5.27 3.68 2.01-.1.06-2.2 1.28-2.22 3.84M14.54 5.03c.7-.85 1.17-2.02 1.04-3.19-1.01.04-2.23.67-2.95 1.52-.65.75-1.22 1.95-1.06 3.1 1.13.09 2.28-.57 2.97-1.43"/></svg>';const google='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02zM12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.88A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96"/></svg>';return `<div class="auth-social-buttons" role="group" aria-label="Outras formas de entrar"><button type="button" class="auth-social-circle" data-oauth="apple" aria-label="Continuar com Apple" title="Continuar com Apple" ${Cloud.configured&&cfg.providers.apple?'':'disabled'}>${apple}</button><button type="button" class="auth-social-circle" data-oauth="google" aria-label="Continuar com Google" title="Continuar com Google" ${Cloud.configured&&cfg.providers.google?'':'disabled'}>${google}</button></div>`;}
function welcome(){const cfg=window.NEO_CONFIG,codeMode=authMode==='verifycode',passwordMode=authMode==='newpassword',recovery=['reset','verifycode','newpassword'].includes(authMode),cooldown=authMode==='reset'&&Date.now()<resetNextAt;return `<section class="card auth-card"><div class="auth-brand"><img src="assets/logo-neopep.png" alt="NeoPep"><h1>NeoPep</h1><p class="sub">Sua evolução, em suas mãos.</p></div><h2 style="text-align:center">${codeMode?'Confira seu e-mail.':passwordMode?'Crie sua nova senha.':authMode==='reset'?'Recupere seu acesso.':'Seu cuidado começa com você.'}</h2><p class="sub" style="text-align:center">${codeMode?'Volte aqui e informe o código recebido.':passwordMode?'Escolha uma senha com pelo menos 8 caracteres.':authMode==='reset'?'Receba um código e altere sua senha aqui no aplicativo.':'Um espaço pessoal para acompanhar cada passo.'}</p>${!recovery?(window.NeoInstall?.loginNotice()||''):''}${authMode!=='login'&&!passwordMode?`<button class="text-btn" type="button" data-auth="${codeMode?'reset':'login'}">‹ ${codeMode?'Alterar e-mail':'Voltar para entrar'}</button>`:''}<div class="divider">${{login:'entre com e-mail',signup:'crie sua conta',reset:'envie seu código',verifycode:'confirme seu código',newpassword:'defina uma nova senha'}[authMode]}</div>${authMessage?`<p class="notice auth-feedback" id="authMessage" role="status">${esc(authMessage)}</p>`:''}<form id="authForm">${authMode==='signup'?input('name','Nome completo','text','required maxlength="100" autocomplete="name"'):''}${!passwordMode&&!codeMode?input('email','E-mail','email','required autocomplete="email"',authEmail):''}${codeMode?`<p class="sub recovery-email">E-mail: <strong>${esc(authEmail)}</strong></p>${input('code','Código recebido por e-mail','text','required inputmode="numeric" autocomplete="one-time-code" minlength="6" maxlength="10" pattern="[0-9]{6,10}" autocapitalize="off" spellcheck="false"')}`:''}${['login','signup','newpassword'].includes(authMode)?input('password',passwordMode?'Nova senha':'Senha','password',`required minlength="${authMode==='login'?1:8}" maxlength="128" autocomplete="${authMode==='login'?'current-password':'new-password'}"`):''}${passwordMode?input('confirmPassword','Confirmar nova senha','password','required minlength="8" maxlength="128" autocomplete="new-password"'):''}${authMode==='signup'?'<label class="check auth-legal"><input id="authLegalConsent" type="checkbox" name="consent" required><span>Li a <a href="#privacidade" target="_blank" rel="noopener">Política de Privacidade</a> e aceito os <a href="#termos" target="_blank" rel="noopener">Termos de Uso</a>. O consentimento para dados de saúde será solicitado separadamente.</span></label>':''}${['login','signup'].includes(authMode)?`<label class="check auth-remember"><input type="checkbox" name="remember" ${authRemember?'checked':''}>Manter conectado neste dispositivo</label>`:''}${Cloud.persistenceLimited?'<p class="sub">Este navegador limitou o armazenamento. Talvez seja necessário entrar novamente após fechar a aba.</p>':''}${cfg.captchaRequired&&!codeMode&&!passwordMode?'<div id="captcha" class="space" aria-live="polite"></div>':''}<button class="primary full" ${Cloud.configured&&cfg.providers.email&&(!cfg.captchaRequired||cfg.captchaSiteKey||codeMode||passwordMode)&&(authMode!=='signup'||cfg.publicRegistration||cfg.previewRegistration)&&!cooldown?'':'disabled'}>${{login:'Entrar',signup:'Criar conta',reset:'Enviar código',verifycode:'Validar código',newpassword:'Salvar nova senha'}[authMode]}</button><p id="authError" class="error" role="alert"></p></form>${!recovery?socialLoginButtons(cfg):''}${codeMode?'<button type="button" class="text-btn full space" data-auth="reset">Não recebeu? Solicitar novo código</button>':passwordMode?'':`<div class="auth-tabs"><button type="button" class="${authMode==='login'?'primary full auth-create-account':'text-btn'}" data-auth="${authMode==='signup'?'login':'signup'}">${authMode==='signup'?'Já tenho conta':'Criar conta'}</button><button class="text-btn" data-auth="reset">Esqueci a senha</button>${authMode!=='signup'?'<a href="#privacidade" target="_blank" rel="noopener">Privacidade</a><a href="#termos" target="_blank" rel="noopener">Termos</a>':''}</div>`}</section>`}

function privacy(){return head('Privacidade com transparência.','Você decide o que registrar e onde armazenar.')+`<article class="card privacy"><h2>O que esta prévia faz</h2><p>NeoPep organiza peso, medidas, fotos, aplicações e diário pessoal. Não fornece diagnóstico ou recomendação de tratamento.</p><h2>Armazenamento e finalidade</h2><p>No modo local, os registros ficam em localStorage e as fotos em IndexedDB, neste navegador. O dispositivo não constitui conta autenticada; pessoas que utilizam o mesmo perfil de navegador podem acessar esses dados. Limpar os dados do site pode removê-los. Não há envio automático dos registros anteriores ou dos dados locais a terceiros.</p><p>Quando configurado e escolhido por você, o modo nuvem utiliza Supabase para autenticação, banco e armazenamento privado de fotos, com autorização por usuário. Apple e Google são usados apenas para autenticação. A hospedagem Sites pode exigir sua conta ChatGPT para abrir a página. Os provedores mantêm suas próprias políticas e registros operacionais.</p><h2>Permissões opcionais</h2><p>Estatísticas guardam informações gerais sobre dispositivo, navegador e origem de campanhas por até 90 dias. Medição de uso registra ações e tempo de uso por até 90 dias, sem guardar o conteúdo dos registros. As duas opções são independentes.</p><p>A localização aproximada usa cidade, estado e país disponibilizados pela hospedagem, sem acesso ao GPS. As notificações de campanhas são promocionais e têm preferência própria. Para receber notificações no aparelho, é necessário autorizá-las e ativar o dispositivo em Lembretes.</p><p>Consulte ou revogue qualquer opção em Perfil → Privacidade e permissões. O backup em Meus dados inclui as informações opcionais disponíveis.</p><h2>Manter conectado</h2><p>Com essa opção ativada, o navegador guarda os tokens de sessão para restaurar seu acesso e renová-los quando permitido pelo serviço. O aplicativo não salva sua senha. Ao desativar a opção, a sessão fica restrita à aba. Sair remove os tokens de acesso armazenados neste navegador; limpar os dados do site também pode encerrar o acesso.</p><h2>Dados sensíveis e consentimento</h2><p>Peso, medidas e registros pessoais podem revelar informações de saúde. Cadastre apenas o que deseja guardar. O consentimento é específico ao uso escolhido e pode ser retirado pela exclusão dos dados. Não usamos informações reais para a demonstração. Não há rastreadores de publicidade ou ferramentas de análise nesta implementação.</p><h2>Comunidade e atendimento privado</h2><p>No Grupo, mensagens e anexos enviados ficam visíveis aos membros após publicação. A lista de membros mostra nome público, função e data de entrada, sem dados de saúde. No atendimento privado, sua mensagem aguarda um atendente; os demais administradores veem somente o pedido pendente. Após o aceite, o conteúdo é acessível a você e ao atendente responsável. O histórico é preservado para continuar o atendimento. Você pode enviar fotos, documentos e áudio voluntariamente; o microfone depende da sua permissão. Links dos anexos são temporários. Avisos de mensagens não incluem o conteúdo da conversa.</p><h2>Compras na loja</h2><p>A loja usa dados de contato e endereço fornecidos na compra para pagamento e entrega. O pagamento, quando ativado, ocorre no ambiente do Mercado Pago; o aplicativo não recebe dados do cartão. Registros corporais não são usados na compra. Pedidos em aberto precisam de atendimento antes da exclusão da conta; após a resolução, dados pessoais são anonimizados, preservando o registro financeiro para controle comercial.</p><h2>Atendimento virtual</h2><p>O atendimento privado pode usar um assistente virtual configurado pela equipe, com processamento de textos pela integração selecionada: OpenAI, Google Gemini ou Anthropic Claude. O contexto usa textos recentes da conversa e informações operacionais aprovadas pela empresa. Fotos, áudios, arquivos da conversa e registros de saúde do seu perfil não são enviados automaticamente ao agente. O atendimento humano pode assumir a conversa. Não envie senhas ou códigos de acesso.</p><h2>Seus direitos e controles</h2><p>Você pode acessar e editar registros, exportar JSON e CSV, salvar relatórios em PDF pelo sistema e excluir fotos individualmente. A importação exige backup e confirmação, é aditiva e preserva os registros originais. Exporte fotos separadamente. Na nuvem, a exclusão de conta remove fotos e dados associados, após autenticação recente e confirmação. Backups baixados permanecem sob seu controle.</p><h2>Segurança e limites</h2><p>Use HTTPS, bloqueio de tela e um dispositivo de confiança. Na nuvem, RLS restringe registros e objetos ao titular. Links de fotos são temporários. O cache offline armazena somente os arquivos da interface; não armazena respostas de autenticação, APIs ou fotos da nuvem. Ao sair, os registros da conta são removidos da memória da interface. Nenhum sistema oferece risco zero.</p><h2>Consentimentos e administração</h2><p>As autorizações de saúde, termos e fotos são registradas com versão e horário no servidor. Você pode retirar autorizações no Perfil; novas gravações ficam bloqueadas sem impedir exportação e exclusão. O painel administrativo exibe somente totais e indicadores agregados, sem valores individuais de saúde, notas, e-mails ou fotografias. Para operação, o servidor guarda identificador da conta, último acesso e contadores de erro de categoria fixa; não guarda conteúdo dos registros nesses indicadores.</p><h2>Retenção e responsável</h2><p>Dados locais permanecem até sua exclusão ou limpeza do navegador. Na nuvem, permanecem até a exclusão pelo titular; retenção de backups do provedor depende do plano e precisa ser documentada antes do lançamento. O responsável pelo aplicativo deve definir identificação do controlador, canal para exercício de direitos LGPD, região de processamento e política de retenção antes de habilitar cadastro público.</p><p>Empresa responsável: ${esc(window.NEO_CONFIG.controllerName||'NeoPep')}</p>${window.NEO_CONFIG.controllerCnpj?`<p>CNPJ: ${esc(window.NEO_CONFIG.controllerCnpj)}</p>`:''}<p>${window.NEO_CONFIG.privacyContact?'Contato para privacidade e exercício de direitos: '+esc(window.NEO_CONFIG.privacyContact):'Contato do controlador: pendente de configuração. Esta política é uma minuta funcional para a prévia e requer identificação do responsável antes de uso com público.'}</p><h2>Atendimento com IA opcional</h2><p>Quando habilitado pela plataforma e autorizado por você na conversa privada, textos enviados após a autorização podem ser encaminhados à OpenAI para gerar respostas operacionais. O fluxo não envia fotografias, áudios, anexos nem busca seus registros de saúde. A IA é identificada e não substitui atendimento profissional; um administrador pode assumir a conversa.</p><p>Você pode desativar a IA na própria conversa. O provedor processa os textos conforme suas políticas; desativar não desfaz envios anteriores. A confirmação específica é registrada separadamente das preferências de acompanhamento.</p><button class="secondary" data-go="perfil">Voltar ao perfil</button></article>`}

function trackingFields(p){return `<fieldset class="tracking"><legend>Personalizar meu acompanhamento</legend><p class="form-help tracking-help">Escolha os atalhos da tela inicial. Peso e medidas também participam dos lembretes configurados. Desmarcar não apaga dados nem remove os módulos de Registros.</p>${[['weight','Peso','Registro diário e lembrete de peso.'],['measures','Medidas','Registro e lembrete semanal.'],['journal','Diário de bem-estar','Atalho para registrar como você se sente.'],['photos','Fotos de evolução','Atalho para adicionar uma foto de evolução.'],['applications','Aplicações e protocolos','Atalho para registrar uma aplicação.']].map(([k,t,h])=>`<label class="check tracking-choice"><input type="checkbox" name="track_${k}" ${p.tracking?.[k]?'checked':''}><span>${t}<small>${h}</small></span></label>`).join('')}</fieldset>`}
function profilePermissions(p){return `<section class="profile-permissions"><h3>Privacidade e autorizações</h3>${mode==='cloud'&&!demo?`<p class="sub">Dados de saúde: <strong>${p.consent?'autorizados':'novas gravações bloqueadas'}</strong>.</p><p class="sub">Fotos: <strong>${Cloud.hasConsent('photos')?'envios autorizados':'autorização necessária ao enviar'}</strong>.</p><p class="form-help">Essas autorizações permitem guardar seus dados na conta. Não publicam informações na comunidade. Você pode retirá-las pelos controles desta seção, sem apagar automaticamente os registros anteriores.</p>`:`<label class="check"><input type="checkbox" name="consent" ${p.consent?'checked':''}>Autorizo o armazenamento dos dados pessoais e de saúde que eu registrar, conforme a Política de Privacidade.</label>`}</section>`}
function arrivalWelcome(){return `<section class="card arrival-welcome"><span class="arrival-welcome-mark" aria-hidden="true">✦</span><p class="eyebrow">BOAS-VINDAS</p><h1>Seu espaço começa aqui.</h1><p class="sub">Para aproveitar melhor o aplicativo, vamos conhecer seu ponto de partida.</p><button class="primary full" type="button" data-start-profile>Começar ${icon('arrow')}</button></section>`;}
function onboarding(){const p=state.profile;return `<section class="card onboarding-card onboarding-minimal"><p class="eyebrow">SEU PONTO DE PARTIDA</p><h1>Vamos conhecer você.</h1><p class="sub">Preencha seus dados. Você pode ajustar depois.</p><form id="onboardingForm" class="space">${input('name','Nome completo','text','required maxlength="100" autocomplete="name"',p.name)}<div class="form-grid">${input('height','Altura (cm)','number','required min="40" max="260" step="0.1"',p.height??'')}${input('initialWeight','Peso inicial (kg)','number','required min="1" max="650" step="0.01"',p.initialWeight??'')}${input('goal','Meta de peso (kg)','number','required min="1" max="650" step="0.01"',p.goal??'')}</div><p class="sub onboarding-goal-intent" id="onboardingGoalIntent" role="status">${goalIntent(p.initialWeight,p.goal)}</p><details class="onboarding-options"><summary>O que quero acompanhar</summary>${[['weight','Peso'],['measures','Medidas'],['journal','Bem-estar'],['photos','Fotos de evolução'],['applications','Aplicações']].map(([key,label])=>`<label class="check"><input type="checkbox" name="track_${key}" ${p.tracking?.[key]?'checked':''}>${label}</label>`).join('')}</details><label class="check"><input type="checkbox" name="health" required><span>Autorizo o uso dos dados de saúde que registrar para acompanhar minha evolução. Posso retirar a autorização no Perfil.</span></label><label class="check"><input type="checkbox" name="terms" required><span>Li a <a href="#privacidade">Política de Privacidade</a> e aceito os <a href="#termos">Termos de Uso</a>.</span></label><p id="onboardingError" class="error" role="alert"></p><button class="primary full" type="submit">Entrar no meu espaço ${icon('arrow')}</button></form></section>`;}
function terms(){return head('Termos de Uso','Versão final · 16 de novembro de 2026')+`<article class="card privacy"><p>Estes Termos regulam o acesso e o uso do NeoPep. Ao criar uma conta ou continuar usando o aplicativo, você declara que leu e aceita estas condições e a Política de Privacidade.</p><h2>1. Finalidade do aplicativo</h2><p>O NeoPep oferece ferramentas para acompanhamento pessoal, registros de peso e medidas, fotos, diário, aplicações, lembretes, comunidade, biblioteca, atendimento e compras. O aplicativo não substitui médico, nutricionista, farmacêutico ou outro profissional habilitado, não realiza diagnóstico e não prescreve tratamentos, produtos, doses ou protocolos. Resultados de calculadoras são apenas matemáticos e devem ser conferidos antes do uso.</p><h2>2. Conta e segurança</h2><p>A conta é pessoal. Você deve fornecer informações verdadeiras, proteger senha, e-mail e dispositivo e comunicar acessos suspeitos. É proibido acessar conta de terceiros, contornar controles, testar vulnerabilidades sem autorização, automatizar abuso ou usar a plataforma para atividade ilegal. A pessoa usuária responde pelo conteúdo e pelas ações realizadas em sua conta até comunicar comprometimento.</p><h2>3. Registros pessoais e consentimentos</h2><p>Você escolhe quais informações registrar. Dados de saúde e fotografias dependem de consentimentos específicos. É possível editar, exportar ou excluir registros e retirar consentimentos pelos controles disponíveis. A retirada pode impedir novas gravações sem apagar automaticamente dados que devam ser preservados por obrigação legal, segurança ou relação comercial. Consulte a Política de Privacidade para detalhes.</p><h2>4. Comunidade, biblioteca e atendimento</h2><p>Conteúdos publicados no Grupo podem ser vistos pelos membros. Não publique dados de terceiros sem autorização, conteúdo ofensivo, discriminatório, fraudulento, ilegal, perigoso ou que viole direitos autorais. A equipe pode moderar, ocultar ou remover conteúdo e restringir contas para proteger a comunidade. Materiais da biblioteca têm finalidade informativa e não representam orientação individual.</p><p>Conversas privadas podem ser atendidas pela equipe ou por assistente virtual identificado. Quando habilitado, o agente processa textos da conversa conforme a Política de Privacidade e pode encaminhar o atendimento a uma pessoa. Não envie senhas, códigos de autenticação ou dados completos de pagamento.</p><h2>5. Loja, pagamento e entrega</h2><p>Antes de finalizar, confira produto, quantidade, preço, descontos, frete, endereço e identificação. O pagamento é processado no ambiente do Mercado Pago; o NeoPep não recebe os dados completos do cartão. A aprovação exibida no provedor depende da confirmação recebida pelo sistema. Prazos de entrega são estimativas e podem variar por endereço, transportadora e eventos externos.</p><p>Pedidos ainda não pagos podem ser cancelados conforme a opção disponível. Para pedidos pagos, o cliente pode solicitar cancelamento e a loja analisará o estado do envio, as condições informadas e a legislação aplicável. Aprovar um cancelamento não significa reembolso instantâneo: o estorno depende do Mercado Pago, do meio de pagamento e dos prazos financeiros. Produtos já entregues seguem as condições de troca, arrependimento e garantia aplicáveis.</p><h2>6. Notificações e lembretes</h2><p>Com permissão do dispositivo, o aplicativo pode enviar lembretes e avisos de mensagens mesmo quando estiver fechado. A entrega depende do sistema operacional, navegador, conexão e serviços de terceiros e pode atrasar ou não ocorrer. Notificações são apoio de organização e não devem ser usadas como único alerta para medicação, emergência ou cuidado de saúde.</p><h2>7. Propriedade intelectual</h2><p>A marca, identidade visual, software, textos próprios e organização da plataforma pertencem ao responsável ou aos respectivos licenciadores. O uso da conta não transfere esses direitos. Você mantém os direitos sobre o conteúdo que envia e concede apenas a autorização necessária para armazená-lo, exibi-lo e processá-lo dentro das funções solicitadas.</p><h2>8. Disponibilidade e alterações</h2><p>Podem ocorrer manutenção, indisponibilidade, falhas de conexão ou mudanças nas integrações. Funcionalidades podem ser corrigidas, substituídas ou descontinuadas para segurança, conformidade ou evolução do serviço. Alterações relevantes destes Termos serão apresentadas com nova versão e poderão exigir nova aceitação.</p><h2>9. Suspensão e encerramento</h2><p>A conta pode ser suspensa em caso de fraude, abuso, risco à segurança, violação destes Termos ou obrigação legal, assegurados os direitos aplicáveis. Você pode solicitar a exclusão da conta. Pedidos, disputas, obrigações financeiras e registros que precisem ser legalmente preservados devem ser resolvidos ou anonimizados conforme a Política de Privacidade.</p><h2>10. Responsabilidade</h2><p>O serviço é fornecido com esforços razoáveis de segurança e continuidade, sem garantia de operação ininterrupta. O responsável não responde por decisões clínicas tomadas com base em registros, calculadoras ou conteúdos informativos, nem por falhas externas do dispositivo, internet, Mercado Pago, transportadoras ou outros provedores, sem prejuízo das responsabilidades que não possam ser excluídas pela legislação brasileira.</p><h2>11. Legislação e contato</h2><p>Aplicam-se as leis da República Federativa do Brasil, inclusive as normas de proteção do consumidor e de dados pessoais quando cabíveis. Antes de qualquer medida, procure o canal de atendimento para tentativa de solução.</p><p><strong>${esc(window.NEO_CONFIG.controllerName||'NeoPep')}</strong>${window.NEO_CONFIG.controllerCnpj?`<br>CNPJ: ${esc(window.NEO_CONFIG.controllerCnpj)}`:''}<br>Contato: <a href="mailto:${esc(window.NEO_CONFIG.privacyContact||'neopeptideos@proton.me')}">${esc(window.NEO_CONFIG.privacyContact||'neopeptideos@proton.me')}</a></p><button class="secondary" data-go="perfil">Voltar ao Perfil</button></article>`}

const routes={loja:()=>window.NeoShop.view({cloud:mode==='cloud'&&!demo,user:Cloud.user,admin:Cloud.admin,demo,sanitizePhoto,profileName:state.profile.name}),comunidade:()=>window.NeoCommunity.view({cloud:mode==='cloud'&&!demo,user:Cloud.user,admin:Cloud.admin,demo,sanitizePhoto,profileName:state.profile.name}),preparar:arrivalWelcome,onboarding,termos:terms,inicio:overview,evolucao:evolution,peso:evolution,registros:records,diario:journal,aplicacoes:applications,protocolos:protocols,calculadora:calculator,relatorios:reports,calendario:calendarPage,lembretes:remindersPage,fotos:photosPage,perfil:profilePage,permissoes:privacyPreferencesPage,'permissoes-iniciais':privacyPreferencesPage,bemvindo:welcome,privacidade:privacy};
let workspaceEntered=false;
let dailySeen=new Set(),dailyOwner='',dailyDate='',dailyPrompt=null,reminderSetupPrompt=null;
function resetDailyVisit(){reminderSetupPrompt?.remove();reminderSetupPrompt=null;dailySeen.clear();dailyDate=C.today();dailyPrompt?.remove();dailyPrompt=null;}
function checkReminderSetup(){
 if(!C.shouldOfferReminderSetup(state)||reminderSetupPrompt||page==='lembretes')return;
 const account=Cloud.user?.id,prompt=document.createElement('dialog');reminderSetupPrompt=prompt;prompt.className='daily-record-prompt reminder-setup-prompt';prompt.setAttribute('aria-labelledby','reminderSetupTitle');
 prompt.innerHTML=`<p class="eyebrow">SUA ROTINA, DO SEU JEITO</p><h2 id="reminderSetupTitle">Quando vamos lembrar você?</h2><p class="sub">Você ainda não configurou seus lembretes. Escolha os dias e horários para registrar peso, medidas e aplicações e aproveitar melhor o aplicativo.</p><div class="space"><button type="button" class="primary full" data-reminder-setup="configure">Configurar lembretes</button><button type="button" class="secondary full space" data-reminder-setup="skip">Pular por enquanto</button></div><p class="sub space">Você pode configurar depois pelo sininho no topo da tela.</p><p class="error" role="status" data-reminder-setup-status></p>`;
 let saving=false;async function choose(configure){if(saving)return;saving=true;prompt.querySelectorAll('button').forEach(b=>b.disabled=true);try{if(Cloud.user?.id!==account)throw Error('Sua conta mudou.');await Cloud.saveProfile(state.profile,{...state.settings,reminderIntroSeen:true,reminderSetupPromptDate:C.today()});if(Cloud.user?.id!==account||reminderSetupPrompt!==prompt)return;await reloadCloud();if(Cloud.user?.id!==account||reminderSetupPrompt!==prompt)return;prompt.remove();reminderSetupPrompt=null;if(configure)await go('lembretes');else{toast('Quando quiser, toque no sininho no topo para configurar seus lembretes.');scheduleDailyCheck();}}catch{if(reminderSetupPrompt===prompt){prompt.querySelector('[data-reminder-setup-status]').textContent='Não foi possível salvar sua escolha. Tente novamente.';prompt.querySelectorAll('button').forEach(b=>b.disabled=false);}}finally{saving=false;}}
 prompt.addEventListener('click',e=>{const b=e.target.closest('[data-reminder-setup]');if(b)choose(b.dataset.reminderSetup==='configure');});prompt.addEventListener('cancel',e=>{e.preventDefault();choose(false);});document.body.append(prompt);prompt.showModal?.();
}
function checkDailyRecords(){
 const owner=mode==='cloud'&&!demo?Cloud.user?.id:null;
 if(owner!==dailyOwner){resetDailyVisit();dailyOwner=owner;}
 if(dailyDate!==C.today())resetDailyVisit();
 if(window.NeoInstall?.blocking||!owner||!arrivalReady||!Cloud.onboardingComplete||!state.profile.consent||document.visibilityState==='hidden'||['bemvindo','preparar','onboarding','termos','privacidade'].includes(page)){dailyPrompt?.remove();dailyPrompt=null;reminderSetupPrompt?.remove();reminderSetupPrompt=null;return;}
 if(reminderSetupPrompt)return;
 if(busy||formDirty||document.querySelector('.deletion-choice, .neo-campaign-dialog[open]')||$('#dialog').open||$('#dialog').hasAttribute('open')||document.querySelector('[data-arrival]'))return;
 const pending=C.pendingDailyRecords(state).filter(r=>dailyPrompt||!dailySeen.has(r.kind));
 if(!pending.length){dailyPrompt?.remove();dailyPrompt=null;checkReminderSetup();return;}
 const signature=pending.map(r=>r.kind).join(',');if(dailyPrompt?.dataset.signature===signature)return;
 pending.forEach(r=>dailySeen.add(r.kind));
 dailyPrompt?.remove();dailyPrompt=document.createElement('dialog');dailyPrompt.className='daily-record-prompt';dailyPrompt.dataset.signature=signature;dailyPrompt.setAttribute('aria-labelledby','dailyRecordTitle');
 dailyPrompt.innerHTML=`<p class="eyebrow">SEU CUIDADO DE HOJE</p><h2 id="dailyRecordTitle">Vamos atualizar sua jornada?</h2><p class="sub">Você ainda tem registros para hoje.</p>${pending.map(r=>{const label={weight:'Peso',measure:'Medidas',dose:'Aplicação'}[r.kind],symbol={weight:'weight',measure:'measure',dose:'drop'}[r.kind];return `<section class="daily-record-item" aria-label="${esc(r.title)}"><div class="daily-record-heading"><span class="daily-record-symbol" aria-hidden="true">${icon(symbol)}</span><h3>${label}</h3></div><p class="sub">${esc(r.text)}</p><button type="button" class="primary full" data-daily-register="${r.kind}">Registrar ${label.toLowerCase()} agora</button></section>`}).join('')}<button type="button" class="secondary full space" data-daily-later>Deixar para depois</button>`;
 document.body.append(dailyPrompt);const prompt=dailyPrompt;prompt.addEventListener('close',()=>{prompt.remove();if(dailyPrompt===prompt)dailyPrompt=null;scheduleDailyCheck();});prompt.showModal?.();
 dailyPrompt.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;const kind=button.dataset.dailyRegister;if(!kind&&!button.hasAttribute('data-daily-later'))return;dailyPrompt.remove();dailyPrompt=null;if(kind)openRecord(kind);else scheduleDailyCheck();});
}
function scheduleDailyCheck(){setTimeout(checkDailyRecords,0);}
document.addEventListener('neo-arrival-finished',scheduleDailyCheck);
let dailyHidden=false;document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){dailyHidden=true;return;}if(dailyHidden){dailyHidden=false;setHomeDetails(false);resetDailyVisit();if(mode==='cloud'&&Cloud.user&&!demo){arrivalReady=false;reloadCloud().catch(()=>{});}}});
window.addEventListener('neo-install-continue',()=>render());
let sessionLoading=false,sessionFailed=false;
let signupBadgeAccount=null,signupBadgeCount=0,signupBadgeRequest=null;
function paintSignupBadge(link,count){
 link.innerHTML=icon('shield');
 const label=count?'Painel administrativo · '+count.toLocaleString('pt-BR')+' novos cadastros':'Painel administrativo';
 link.setAttribute('aria-label',label);
 link.title=label;
 if(count){
  const badge=document.createElement('span');
  badge.className='admin-signup-badge';
  badge.setAttribute('aria-hidden','true');
  badge.textContent=count.toLocaleString('pt-BR');
  link.append(badge);
 }
}
function renderSignupBadge(link,account){
 const changed=signupBadgeAccount!==account;
 if(changed){signupBadgeAccount=account;signupBadgeCount=0;signupBadgeRequest=null}
 paintSignupBadge(link,signupBadgeCount);
 if(changed&&account)void refreshSignupBadge();
}
async function refreshSignupBadge(){
 const link=$('#adminShortcut'),account=signupBadgeAccount;
 if(!link||link.hidden||!account||signupBadgeRequest||document.visibilityState==='hidden'||navigator.onLine===false)return;
 const generation=loadGeneration,request={};
 signupBadgeRequest=request;
 try{
  const result=await Cloud.adminSignups('count');
  if(signupBadgeRequest!==request||loadGeneration!==generation||Cloud.user?.id!==account||link.hidden)return;
  signupBadgeCount=Math.max(0,Number(result.count)||0);
  paintSignupBadge(link,signupBadgeCount);
 }catch{
  if(signupBadgeRequest===request&&loadGeneration===generation){
   signupBadgeCount=0;
   paintSignupBadge(link,0);
  }
 }finally{
  if(signupBadgeRequest===request)signupBadgeRequest=null;
 }
}
setInterval(refreshSignupBadge,30000);
window.addEventListener('focus',refreshSignupBadge);
window.addEventListener('pageshow',refreshSignupBadge);

let campaignOwner=null,campaignChecked=false,campaignPending=false,campaignDialog=null,campaignTimer=null;
function campaignReady(){
 return !sessionLoading&&!recoveryFlow&&mode==='cloud'&&!demo&&arrivalReady&&Cloud.onboardingComplete===true
  &&!['bemvindo','preparar','onboarding','permissoes-iniciais','termos','privacidade'].includes(page);
}
function campaignBlocked(){
 return document.visibilityState==='hidden'||busy||formDirty||window.NeoInstall?.blocking||document.querySelector('dialog[open], [data-arrival]');
}
function syncCampaign(){
 if(!Cloud.campaignVisit)return;
 const owner=mode==='cloud'&&!demo?Cloud.user?.id:null;
 if(owner!==campaignOwner){
  campaignOwner=owner;campaignChecked=false;campaignPending=false;
  if(campaignTimer)clearTimeout(campaignTimer);
  campaignTimer=null;campaignDialog?.close();campaignDialog=null;
 }
 if(!owner||!campaignReady()||campaignChecked||campaignPending)return;
 if(campaignBlocked()){
  if(!campaignTimer&&document.visibilityState!=='hidden')campaignTimer=setTimeout(()=>{campaignTimer=null;syncCampaign()},1500);
  return;
 }
 campaignPending=true;
 Cloud.campaignVisit('next').then(item=>{
  if(owner!==campaignOwner||owner!==Cloud.user?.id||!campaignReady())return;
  campaignChecked=true;
  if(!item||campaignBlocked()||typeof HTMLDialogElement==='undefined')return;
  const dialog=document.createElement('dialog');
  dialog.className='neo-campaign-dialog';dialog.setAttribute('aria-labelledby','neoCampaignTitle');
  dialog.innerHTML=`<h2 id="neoCampaignTitle">${esc(item.title)}</h2>${item.image_url&&!item.image_path?`<img src="${esc(item.image_url)}" alt="">`:''}<p>${esc(item.body)}</p>
   <div class="neo-campaign-actions">${item.link_url?`<a class="primary" target="_blank" rel="noopener noreferrer" href="${esc(item.link_url)}">${esc(item.link_label)}</a>`:''}
   <form method="dialog"><button class="secondary" autofocus>Fechar</button></form></div>`;
  if(item.image_path&&Cloud.campaignImageURL){
   Cloud.campaignImageURL(item.image_path).then(url=>{
    if(campaignDialog!==dialog||owner!==Cloud.user?.id)return;
    const image=document.createElement('img');image.src=url;image.alt='';
    dialog.querySelector('h2').after(image);
   }).catch(()=>{});
  }
  dialog.addEventListener('close',()=>{dialog.remove();if(campaignDialog===dialog)campaignDialog=null;},{once:true});
  document.body.append(dialog);dialog.showModal();campaignDialog=dialog;
  const shown=Cloud.campaignVisit('displayed',item.impression).catch(()=>false);
  dialog.querySelector('a')?.addEventListener('click',event=>{
   const url=new URL(event.currentTarget.href,location.href),route=url.hash.slice(1);
   const material=url.searchParams.get('material'),product=url.searchParams.get('produto');
   if(url.origin===location.origin&&['/','/neo/'].includes(url.pathname)&&(validSharedMaterial(material)||(route==='loja'&&validSharedMaterial(product))||(!url.search&&Object.hasOwn(routes,route)))){
    event.preventDefault();
    dialog.close();
    if(validSharedMaterial(material))void go('comunidade',true,false,'library',material);
    else if(validSharedMaterial(product)){window.NeoShop?.openCampaignProduct?.(product,Cloud.user);void go('loja');}
    else void go(route);
   }
   void shown.then(ok=>{if(ok&&owner===Cloud.user?.id)return Cloud.campaignVisit('clicked',item.impression)}).catch(()=>{});
  },{once:true});
 }).catch(()=>{if(owner===campaignOwner)campaignChecked=true;}).finally(()=>{if(owner===campaignOwner)campaignPending=false;});
}
// A campanha de homologação usa apenas a caixa interna de Teste, separada da fila oficial.
if(window.NEO_CONFIG?.supabaseUrl==='https://qnuluspqfazdppciermw.supabase.co'&&Cloud.campaignTestVisit){
 let testCampaignPending=false;
 async function syncTestCampaign(){
  const owner=Cloud.user?.id;
  if(!owner||testCampaignPending||!campaignReady()||campaignBlocked())return;
  testCampaignPending=true;
  try{
   const item=await Cloud.campaignTestVisit('next');
   if(!item||owner!==Cloud.user?.id||!campaignReady()||campaignBlocked())return;
   const dialog=document.createElement('dialog');
   if(typeof dialog.showModal!=='function')return;
   dialog.className='neo-campaign-dialog';
   dialog.setAttribute('aria-labelledby','neoTestCampaignTitle');
   dialog.innerHTML=`<p class="sub">Campanha de homologação</p><h2 id="neoTestCampaignTitle">${esc(item.title)}</h2><p>${esc(item.body)}</p><form method="dialog"><button type="submit" class="secondary" autofocus>Fechar</button></form>`;
   dialog.addEventListener('close',()=>{dialog.remove();if(campaignDialog===dialog)campaignDialog=null;},{once:true});
   document.body.append(dialog);dialog.showModal();campaignDialog=dialog;
   await Cloud.campaignTestVisit('displayed',item.id);
  }catch{}finally{testCampaignPending=false;}
 }
 setInterval(()=>void syncTestCampaign(),45000);
 window.addEventListener('focus',()=>void syncTestCampaign());
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')syncCampaign();});
function render(){applyTheme();void Promise.resolve().then(syncCampaign);void Promise.resolve().then(syncAudience);void Promise.resolve().then(syncEngagement);void Promise.resolve().then(syncGeo);if(sessionLoading){
 document.body.classList.add('auth-screen');
 document.querySelector('.app-header').hidden=true;
 $('#nav').hidden=true;
 document.querySelector('#app > footer').hidden=true;
 $('#banner').innerHTML='';
 $('#content').innerHTML='<div class="session-start" role="status"><img src="assets/logo-neopep.png" alt=""><p>Verificando sua sessão…</p></div>';
 return;
}if(window.NeoInstall?.blocking){document.body.classList.add('auth-screen');document.body.classList.remove('community-route');document.querySelector('.app-header').hidden=true;$('#nav').hidden=true;document.querySelector('#app > footer').hidden=true;$('#banner').innerHTML='';$('#content').innerHTML=window.NeoInstall.screen();window.NeoArrival?.sync(false,false);window.NeoCaptcha?.remove();return;}window.NeoLibraryShelf?.session?.(mode==='cloud'&&!demo?Cloud.user:null);window.NeoCommunity?.materialSession?.(mode==='cloud'&&!demo?Cloud.user:null);if(page!=='comunidade')window.NeoCommunity?.closeMaterialEditor?.();window.NeoLibraryFiles?.session(mode==='cloud'&&!demo?Cloud.user:null);if(page!=='comunidade')window.NeoLibraryFiles?.close();if(page!=='comunidade')window.NeoSupport?.leave?.();window.NeoShop?.session(mode==='cloud'&&!demo?Cloud.user:null);window.NeoLibrary?.session(mode==='cloud'&&!demo?Cloud.user:null);window.NeoSupport?.session(mode==='cloud'&&!demo?Cloud.user:null);document.body.classList.toggle('community-route',page==='comunidade');const authScreen=['bemvindo','preparar','onboarding','permissoes-iniciais'].includes(page)||!(demo||(mode==='cloud'&&Cloud.user)||workspaceEntered);document.body.classList.toggle('auth-screen',authScreen);document.querySelector('.app-header').hidden=authScreen;const showAdmin=!authScreen&&mode==='cloud'&&!demo&&!!Cloud.user&&Cloud.admin===true;$('#adminShortcut').hidden=!showAdmin;renderSignupBadge($('#adminShortcut'),showAdmin?Cloud.user.id:null);document.querySelector('.app-header').classList.toggle('has-admin-shortcut',showAdmin);$('#nav').hidden=authScreen;document.querySelector('#app > footer').hidden=authScreen;const active=['peso','evolucao'].includes(page)?'evolucao':['aplicacoes','diario','protocolos','calculadora','relatorios','fotos','lembretes'].includes(page)?'registros':page;$('#nav').innerHTML=[['inicio','Início','home'],['evolucao','Evolução','trend'],['comunidade','Comunidade','community'],['registros','Registros','plus'],['loja','Loja','shop']].map(([p,t,i])=>`<button data-go="${p}" class="${p==='comunidade'?'nav-community ':''}${active===p?'active':''}" ${active===p?'aria-current="page"':''}>${icon(i)}<span>${t}</span>${p==='comunidade'?'<b class="nav-community-count" data-message-badge="all" hidden></b>':''}</button>`).join('');$('#bell').innerHTML=icon('bell');$('#connection').textContent=demo?'Demonstração':mode==='cloud'?(navigator.onLine?'Conta conectada':'Sem conexão'):'Neste dispositivo';$('#avatar').innerHTML=avatarURL&&!demo?`<img src="${esc(avatarURL)}" alt="Sua foto">`:esc(state.profile.name.slice(0,1).toUpperCase()||'N');let banner='';if(demo)banner+='<div class="banner demo-banner"><span>Demonstração · Dados fictícios, separados dos seus registros.</span><button class="text-btn" id="exitDemo">Sair</button></div>';else if(mode==='local'&&page!=='bemvindo')banner+='<div class="banner"><span>Modo local · Seus registros ficam neste dispositivo.</span><button class="text-btn" data-go="bemvindo">Minha conta</button></div>';if(!navigator.onLine)banner+='<div class="banner offline-banner">Sem conexão. '+(mode==='cloud'?'Os dados da conta não podem ser alterados agora.':'Seus registros locais continuam disponíveis.')+'</div>';if(localError)banner+='<div class="notice error">'+esc(localError)+'</div>';if(cloudError)banner+='<div class="notice error">'+esc(cloudError)+' <button class="text-btn" id="refresh">Tentar novamente</button></div>';if(window.NeoWaitingWorker)banner+='<div class="banner"><span>Atualização disponível. Salve os registros antes de atualizar.</span><button class="text-btn" id="applyUpdate">Atualizar agora</button></div>';$('#banner').innerHTML=banner;
const privacyForm=$('#privacyPreferences');
if(sessionFailed||mode!=='cloud'||demo||!privacyForm||privacyForm.dataset.privacyAccount!==Cloud.user?.id||privacyForm.dataset.privacyPage!==page)
 $('#content').innerHTML=sessionFailed
 ?'<div class="session-start" role="alert"><p>Não foi possível verificar sua sessão. Confira a conexão e tente novamente.</p><button class="primary" id="retrySession">Tentar novamente</button></div>'
 :(routes[page]||overview)();mountPrivacyPreferences();if(page==='calculadora')restoreCalcSaved();hydratePhotoImages();window.NeoArrival?.sync(arrivalReady&&page==='inicio'&&mode==='cloud'&&!demo&&Cloud.onboardingComplete===true,state.settings.showArrivalGuide!==false);scheduleDailyCheck();updateResetCooldown();document.title=(window.NEO_CONFIG?.appDisplayName||'NeoPep')+' — Sua evolução, em suas mãos.';if(page==='bemvindo')window.NeoCaptcha?.mount();else if(!document.querySelector('.deletion-choice #captcha'))window.NeoCaptcha?.remove();window.NeoCommunityAlerts?.refresh(mode==='cloud'&&!demo?Cloud.user:null);if(page==='inicio'&&mode==='cloud'&&!demo)window.NeoShop?.loadHome?.({cloud:true,user:Cloud.user,admin:Cloud.admin,sanitizePhoto});if(page==='inicio'&&mode==='cloud'&&!demo)window.NeoLibrary?.loadHome?.({cloud:true,user:Cloud.user,admin:Cloud.admin});if(page==='loja')window.NeoShop.load();if(page==='comunidade')window.NeoCommunity.load({cloud:mode==='cloud'&&!demo,user:Cloud.user,admin:Cloud.admin,demo,sanitizePhoto,profileName:state.profile.name,avatarURL});}
function navigateBack(fallback='auto'){if(formDirty&&!confirm('Há alterações não salvas. Deseja voltar?'))return;if((history.state?.neoDepth||0)>0&&typeof history.back==='function'){history.back();return;}const target=fallback!=='auto'?fallback:page==='permissoes'?'perfil':['diario','aplicacoes','protocolos','fotos','calculadora','relatorios','lembretes'].includes(page)?'registros':'inicio';go(target,false);}
const validSharedMaterial=value=>/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(String(value||''));
function pendingLibraryMaterial(){let fromURL='';try{fromURL=new URL(location.href).searchParams.get('material')||'';}catch{}if(validSharedMaterial(fromURL)){try{if(typeof sessionStorage!=='undefined')sessionStorage.setItem('neo-library-destination',fromURL);}catch{}return fromURL;}try{const saved=typeof sessionStorage!=='undefined'?sessionStorage.getItem('neo-library-destination'):'';return validSharedMaterial(saved)?saved:'';}catch{return '';}}
async function openAccountDestination(checkPrivacy=true){
 const account=Cloud.user?.id;
 if(checkPrivacy&&account&&Cloud.privacyPreferences){
  try{
   const preferences=await Cloud.privacyPreferences();
   if(Cloud.user?.id!==account)return;
   if(preferences.pending)return go('permissoes-iniciais',false);
  }catch{if(Cloud.user?.id!==account)return;}
 }
 const material=pendingLibraryMaterial();if(material){await go('comunidade',true,false,'library',material);try{if(typeof sessionStorage!=='undefined')sessionStorage.removeItem('neo-library-destination');const url=new URL(location.href);url.searchParams.delete('material');history.replaceState(history.state||null,'',url.href);}catch{}return;}if(/[?&]conversa=1(?:&|$)/.test(location.search||''))await go('comunidade',true,true);else await go('inicio');}
async function go(p,focus=true,direct=false,communityTab='feed',materialID=''){if(!routes[p])p='inicio';if(p==='inicio')homeDetailsOpen=false;if(p==='comunidade')window.NeoCommunity?.beginVisit(direct,communityTab,materialID);if(mode==='cloud'&&!demo&&Cloud.onboardingComplete===false&&!['preparar','onboarding','perfil','bemvindo','termos','privacidade'].includes(p))p=arrivalWelcomeStarted?'onboarding':'preparar';formDirty=false;page=p;const previous=history.state?.neoDepth||0;const nav={neoPage:p,neoDepth:previous+(focus&&location.hash!=='#'+p?1:0),direct,communityTab,materialID};if(focus&&location.hash!=='#'+p&&typeof history.pushState==='function')history.pushState(nav,'','#'+p);else history.replaceState(nav,'','#'+p);render();if(p==='comunidade')window.NeoCommunity.load({cloud:mode==='cloud'&&!demo,user:Cloud.user,admin:Cloud.admin,demo,sanitizePhoto,profileName:state.profile.name,avatarURL});if(typeof $('#content').animate==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)$('#content').animate([{opacity:.5,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'ease-out'});if(!photoMetadataLoaded&&(['fotos','perfil','evolucao','peso'].includes(p)||(p==='inicio'&&mode==='local'&&!demo))){try{await loadPhotos();if(page===p)render()}catch(e){if(p==='fotos')toast(e.message)}}if(focus){window.scrollTo({top:0,behavior:'auto'});$('#content').focus({preventScroll:true})}}
function input(name,label,type='number',extra='',value=''){if(type==='password'){const id='auth-'+name,description=name==='confirmPassword'?'confirmação de senha':label.toLowerCase();return `<div class="password-field"><label for="${id}">${label}</label><div class="password-input"><input id="${id}" name="${name}" type="password" ${extra} value="${esc(value)}"><button type="button" class="password-toggle" data-password-toggle="${id}" data-password-label="${esc(description)}" aria-controls="${id}" aria-pressed="false" aria-label="Mostrar ${esc(description)}">${icon('eye')}</button></div></div>`;}return `<label>${label}<input name="${name}" type="${type}" ${extra} value="${esc(value)}"></label>`}
function textarea(name,label,value='',limit=2000){return `<label>${label}<textarea name="${name}" maxlength="${limit}">${esc(value)}</textarea></label>`}
const kindType={weight:'weights',measure:'measures',dose:'doses',journal:'journal',protocol:'protocols',reminder:'reminders'};
function openRecord(kind,record=null){if(busy)return;if(!record&&kind!=='avatar'){if(kind==='weight')engagementTrack('weight_record_started');if(page==='inicio')engagementTrack('home_quick_action');}clearPhotoBatch();draftRecordId=record?.id||uid();formKind=kind;editing=record;$('#recordForm').dataset.photoOwner=mode==='cloud'?Cloud.user?.id||'':'';const r=record||{},title={weight:'Como está seu peso?',measure:'Suas medidas',dose:'Registrar aplicação',journal:'Um momento para você',protocol:'Seu protocolo',reminder:'Novo lembrete',photo:'Foto de evolução',avatar:'Sua foto de perfil'}[kind];$('#dialogTitle').textContent=title;$('#formError').textContent='';$('#saveRecord').disabled=false;$('#saveRecord').textContent='Salvar registro';let fields=input('date','Data','date',`${kind==='reminder'?'':`max="${C.today()}"`} required`,r.date||C.today());if(kind==='weight')fields+=input('value','Peso (kg)','number','required min="1" max="650" step="0.01" inputmode="decimal"',r.value??'')+input('fat','Gordura corporal (%) · opcional','number','min="1" max="80" step="0.1" inputmode="decimal"',r.fat??'')+textarea('note','Como você está se sentindo? (opcional)',r.note,500)+'<p class="form-help">Se houver peso nesta data, confirme para atualizar esse registro.</p>';if(kind==='measure')fields+='<div class="form-grid">'+[['waist','Cintura'],['hip','Quadril'],['chest','Peito'],['arm','Braço'],['thigh','Coxa']].map(([k,l])=>input(k,l+' (cm)','number',`${k==='waist'?'required':''} min="1" max="400" step="0.1" inputmode="decimal"`,r[k]??'')).join('')+input('fat','Gordura corporal (%)','number','min="1" max="80" step="0.1"',r.fat??'')+'</div>'+textarea('note','Observações (opcional)',r.note,500);if(kind==='dose')fields+=input('product','Nome do produto','text','required maxlength="80"',r.product||'')+'<div class="form-grid">'+input('amount','Dose aplicada','number','required min="0.000001" max="100000" step="any" inputmode="decimal"',r.amount??'')+`<label>Unidade<select name="unit">${['mg','mcg','mL'].map(v=>`<option ${r.unit===v?'selected':''}>${v}</option>`).join('')}</select></label></div>`+input('site','Local de aplicação (opcional)','text','maxlength="80"',r.site||'')+`<label>Protocolo (opcional)<select name="protocolId"><option value="">Sem vínculo</option>${state.protocols.map(p=>`<option value="${esc(p.id)}" ${r.protocolId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>`+textarea('note','Observação pessoal',r.note,500)+calcVialDosePicker(r);if(kind==='journal')fields+='<div class="form-grid">'+[['wellbeing','Bem-estar'],['energy','Energia'],['appetite','Apetite']].map(([k,l])=>`<label>${l} (1 baixo · 5 alto)<select name="${k}"><option value="">Não informar</option>${[1,2,3,4,5].map(v=>`<option value="${v}" ${+r[k]===v?'selected':''}>${v}</option>`).join('')}</select></label>`).join('')+input('sleep','Sono (horas)','number','min="0" max="24" step="0.1"',r.sleep??'')+input('water','Água (litros)','number','min="0" max="15" step="0.1"',r.water??'')+input('activity','Atividade física (minutos)','number','min="0" max="1440" step="1"',r.activity??'')+'</div>'+textarea('note','Suas observações',r.note);if(kind==='protocol')fields+=input('name','Nome do protocolo','text','required maxlength="100"',r.name||'')+input('end','Data de encerramento (opcional)','date','max="'+C.today()+'"',r.end||'')+`<label>Status<select name="status"><option value="active">Em acompanhamento</option><option value="closed" ${r.status==='closed'?'selected':''}>Encerrado</option></select></label>`+textarea('note','Informações cadastradas por você',r.note);if(kind==='reminder')fields+=`<label>Registro associado<select name="recordTarget">${[['general','Outro lembrete'],['weight','Peso'],['measure','Medidas'],['dose','Aplicação']].map(([value,label])=>`<option value="${value}" ${(C.reminderRecordKind(r)||'general')===value?'selected':''}>${label}</option>`).join('')}</select></label>`+input('title','Título do lembrete','text','required maxlength="80"',(r.title||'').replace(/^(Peso|Medidas|Aplicação|Lembrete) · /,''))+input('time','Horário','time','required',r.time||'09:00')+`<label>Repetição<select name="repeat">${[['once','Uma vez'],['daily','Todos os dias'],['weekly','Semanalmente no dia selecionado']].map(([v,l])=>`<option value="${v}" ${r.repeat===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="check"><input type="checkbox" name="enabled" ${r.enabled!==false?'checked':''}>Lembrete ativo</label>`;if(kind==='photo'||kind==='avatar')fields+=(mode==='cloud'?`<label class="check"><input type="checkbox" name="photoConsent" required ${Cloud.user?.id&&Cloud.hasConsent('photos')?'checked':''}>Autorizo guardar esta fotografia em armazenamento privado da minha conta, para perfil ou acompanhamento.</label>`:'')+input('photo','Arquivo de imagem','file',(kind==='photo'?'multiple':'required')+' accept="image/*,.heic,.heif,.avif"')+(kind==='photo'?'<p id="photoBatchTotal" role="status"></p><progress id="photoBatchProgress" aria-label="Fotos enviadas"></progress><label class="check" id="photoBatchDateMode" hidden><input type="checkbox" name="captureDate">Usar a data de captura quando disponível; nas demais, usar a data comum.</label><ul id="photoBatchList" class="photo-batch"></ul>':'')+'<p class="form-help">Fotos do aparelho, incluindo HEIC quando suportado. Máximo 25 MB. A imagem será convertida para JPEG, sem metadados, e reduzida antes do envio.</p>';$('#fields').innerHTML=fields;if(kind==='photo')paintPhotoBatch();$('#dialog').showModal()}
async function action(fn){if(busy)return;busy=true;try{await fn()}catch(e){toast(e.message||'Não foi possível concluir. Tente novamente.')}finally{busy=false}}
let formDirty=false,lastCloudSync=null;
async function reloadCloud(){cloudError='';const gen=loadGeneration;try{const next=await Cloud.load();if(gen!==loadGeneration||demo||mode!=='cloud')return;state=next;try{await loadPhotos()}catch{/* A conta continua disponível e a foto será tentada novamente na próxima sincronização. */}if(gen!==loadGeneration||demo||mode!=='cloud')return;arrivalReady=true;lastCloudSync=new Date();render()}catch(e){Cloud.reportError?.('sync_failed');cloudError='Não foi possível carregar a nuvem. Os dados locais e os registros já salvos foram preservados.';render();throw e}}
async function refreshAfterWrite(next){state=next;try{await reloadCloud()}catch{cloudError='A alteração foi salva na sua conta, mas não foi possível atualizar o histórico completo. Use Atualizar para conferir novamente.';render()}}
async function putRecord(type,raw){if(mode==='cloud'&&!demo&&!state.profile.consent)throw Error('Salve seu perfil e o consentimento antes de adicionar registros à conta.');let r=C.validRecord(type,raw);if(type==='journal'&&!r.note&&['wellbeing','energy','sleep','appetite','water','activity'].every(k=>r[k]==null))throw Error('Preencha ao menos um campo do diário ou escreva uma observação.');let next={...state,[type]:[...state[type]]},existing=editing;if(type==='weights'&&!existing)existing=state.weights.find(w=>w.date===r.date);if(existing){if(type==='weights'&&!editing&&!confirm('Já existe um peso nesta data. Atualizar esse registro?'))return false;r={...r,id:existing.id,_revision:existing._revision};next[type]=next[type].filter(x=>x.id!==existing.id)}next[type].push(r);if(mode==='cloud'&&!demo){if(!navigator.onLine)throw Error('Conecte-se para salvar na sua conta.');const owner=Cloud.user?.id;const saved=await Cloud.put(type,r);if(!existing&&Cloud.user?.id===owner)engagementTrack(({weights:'weight_record_created',measures:'measurement_record_created',journal:'journal_record_created',doses:'application_record_created',protocols:'protocol_record_created',reminders:'reminder_created'})[type]);next[type]=next[type].map(x=>x.id===r.id?(saved||r):x);await refreshAfterWrite(next)}else{if(!localConsent())return false;next.profile={...state.profile,consent:true};persist(next)}return true}
async function toggleReminder(id){const r=state.reminders.find(x=>x.id===id);if(!r)return;const changed={...r,enabled:!r.enabled},next={...state,reminders:state.reminders.map(x=>x.id===id?changed:x)};if(mode==='cloud'&&!demo){const saved=await Cloud.put('reminders',changed);next.reminders=next.reminders.map(x=>x.id===id?(saved||changed):x);await refreshAfterWrite(next)}else persist(next);render();toast(changed.enabled?'Lembrete ativado. Atualize a agenda se necessário.':'Lembrete pausado no aplicativo. Eventos já exportados devem ser ajustados na agenda.')}
let avatarCrop={zoom:1,x:50,y:50},avatarCropURL='',avatarCropImage=null;
function clearAvatarCrop(){if(avatarCropURL)URL.revokeObjectURL(avatarCropURL);avatarCropURL='';avatarCropImage=null;avatarCrop={zoom:1,x:50,y:50}}
function avatarCropRect(width,height,{zoom,x,y}){
 const side=Math.min(width,height)/zoom;
 return [(width-side)*x/100,(height-side)*y/100,side,side];
}
function drawAvatarCrop(canvas,image,rect){
 canvas.getContext('2d').drawImage(image,...rect,0,0,canvas.width,canvas.height);
}
function paintAvatarCrop(){
 const canvas=document.querySelector('.avatar-crop-preview canvas');
 if(!canvas||!avatarCropImage?.naturalWidth)return;
 drawAvatarCrop(canvas,avatarCropImage,avatarCropRect(avatarCropImage.naturalWidth,avatarCropImage.naturalHeight,avatarCrop));
}
async function encodePhoto(file,{maxBytes=25*1024*1024,edge=1800,quality=.88,crop=false}={}){
 const type=String(file?.type||'').toLowerCase(),name=String(file?.name||'').toLowerCase();
 const suffix=name.match(/\.(jpe?g|png|webp|heic|heif|avif)$/)?.[1];
 if(!file?.size||file.size>maxBytes||!(type.startsWith('image/')||suffix))
  throw Error('Escolha uma foto de até '+Math.round(maxBytes/1024/1024)+' MB.');
 const isHeif=/hei[cf]/.test(type)||/^hei[cf]$/.test(suffix||'');
 const source=suffix&&!type.startsWith('image/')?new Blob([file],{type:'image/'+(/^jpe?g$/.test(suffix)?'jpeg':suffix)}):file;
 const framing=crop?{...avatarCrop}:null,url=URL.createObjectURL(source);
 let image,bitmap;
 try{
  try{
   image=await new Promise((resolve,reject)=>{
    const native=new Image();native.onload=()=>resolve(native);native.onerror=reject;native.src=url;
   });
  }catch{
   if(!crop&&typeof createImageBitmap==='function'){
    try{image=bitmap=await createImageBitmap(source);}catch{}
   }
   if(!image)throw Error(isHeif?'Não foi possível converter a foto HEIC neste navegador. Exporte uma cópia em JPEG e tente novamente.':'Não foi possível decodificar esta imagem.');
  }
  const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
  if(!width||!height||width*height>100000000)throw Error('Não foi possível usar a resolução desta imagem.');
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  if(crop){
   const rect=avatarCropRect(width,height,framing);
   canvas.width=canvas.height=Math.max(1,Math.min(1200,Math.round(rect[2])));
   drawAvatarCrop(canvas,image,rect);
  }else{
   const scale=Math.min(1,edge/Math.max(width,height));
   canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
   ctx.drawImage(image,0,0,canvas.width,canvas.height);
  }
  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Falha ao converter a imagem para JPEG.')),'image/jpeg',quality));
 }finally{bitmap?.close();URL.revokeObjectURL(url);}
}
function sanitizePhoto(file,maxBytes){return encodePhoto(file,{maxBytes})}
let photoBatch=[];
function clearPhotoBatch(){
 for(const item of photoBatch)URL.revokeObjectURL(item.preview);
 photoBatch=[];
}
async function captureDate(file){
 // JPEG EXIF DateTimeOriginal is a camera-local date. File modification dates are ignored.
 try{
  const view=new DataView(await file.slice(0,262144).arrayBuffer());
  if(view.getUint16(0)!==0xffd8)return null;
  for(let pos=2;pos+4<=view.byteLength;){
   const marker=view.getUint16(pos),length=view.getUint16(pos+2),end=pos+2+length;
   if(marker===0xffda||marker===0xffd9||length<2||end>view.byteLength)return null;
   if(marker===0xffe1&&length>=16&&view.getUint32(pos+4)===0x45786966&&view.getUint16(pos+8)===0){
    const tiff=pos+10,little=view.getUint16(tiff)===0x4949;
    if(!little&&view.getUint16(tiff)!==0x4d4d)return null;
    const u16=at=>{if(at<tiff||at+2>end)throw Error();return view.getUint16(at,little)};
    const u32=at=>{if(at<tiff||at+4>end)throw Error();return view.getUint32(at,little)};
    const entry=(ifd,tag)=>{
     const count=u16(ifd);
     for(let i=0;i<count;i++){const at=ifd+2+12*i;if(u16(at)===tag)return at}
     return null;
    };
    if(u16(tiff+2)!==42)return null;
    const exif=entry(tiff+u32(tiff+4),0x8769);
    if(exif===null||u16(exif+2)!==4||u32(exif+4)!==1)return null;
    const stamp=entry(tiff+u32(exif+8),0x9003);
    if(stamp===null||u16(stamp+2)!==2||u32(stamp+4)!==20)return null;
    const at=tiff+u32(stamp+8);
    if(at<tiff||at+20>end)return null;
    const raw=String.fromCharCode(...new Uint8Array(view.buffer,at,20));
    const match=/^(\d{4}):(\d{2}):(\d{2}) (?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\0$/.exec(raw);
    const date=match&&match.slice(1,4).join('-');
    return date&&C.validDate(date)&&date<=C.today()?date:null;
   }
   pos=end;
  }
 }catch{/* Ausência de EXIF ou formato incompatível: usar a data escolhida. */}
 return null;
}
function paintPhotoBatch(){
 const list=$('#photoBatchList');
 if(!list)return;
 const completed=photoBatch.filter(item=>item.status==='sent').length;
 const pending=photoBatch.length-completed;
 $('#photoBatchTotal').textContent=`${photoBatch.length} selecionadas · ${completed} enviadas · ${pending} restantes`;
 $('#photoBatchDateMode').hidden=!photoBatch.some(item=>item.capture);
 list.innerHTML=photoBatch.map(item=>`<li><img src="${esc(item.preview)}" alt="" loading="lazy">
  <div><strong>${esc(item.file.name||'Foto')}</strong><br><span>${esc(item.date||(item.capture?'Captura: '+date(item.capture):'Data comum'))} · ${esc(item.error||({pending:'Aguardando',encoding:'Preparando',uploading:'Enviando',sent:'Enviada',failed:'Falhou'}[item.status]))}</span></div>
  ${['encoding','uploading'].includes(item.status)?'<progress class="photo-item-progress" aria-label="Processando foto"></progress>':''}
  ${item.status==='sent'?'':`<button type="button" class="text-btn" data-photo-batch-remove="${item.id}" ${busy?'disabled':''}>Remover</button>`}</li>`).join('');
 $('#saveRecord').disabled=busy||!pending;
 $('#saveRecord').textContent=busy?'Enviando…':photoBatch.some(item=>item.status==='failed')?`Reenviar ${pending} ${pending===1?'foto':'fotos'}`:`Enviar ${pending} ${pending===1?'foto':'fotos'}`;
 const progress=$('#photoBatchProgress');
 progress.max=photoBatch.length||1;
 progress.value=completed;
}
document.addEventListener('change',event=>{
 if(formKind!=='photo'||!event.target.matches('#recordForm input[name=photo]')||busy)return;
 const input=event.target;
 for(const file of Array.from(input.files||[])){
  if(photoBatch.length>=30){$('#formError').textContent='Selecione até 30 fotos por lote.';break}
  if(photoBatch.some(item=>item.file.name===file.name&&item.file.size===file.size&&item.file.lastModified===file.lastModified))continue;
  const item={id:uid(),file,preview:URL.createObjectURL(file),status:'pending',capture:null};
  photoBatch.push(item);
  item.capturePromise=captureDate(file).then(value=>{item.capture=value;if(photoBatch.includes(item)&&formKind==='photo')paintPhotoBatch()});
 }
 input.value='';
 formDirty=photoBatch.length>0;
 paintPhotoBatch();
});
document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-photo-batch-remove]');
 if(!button||busy)return;
 const item=photoBatch.find(p=>p.id===button.dataset.photoBatchRemove);
 if(item){URL.revokeObjectURL(item.preview);photoBatch=photoBatch.filter(p=>p!==item);paintPhotoBatch()}
});
async function runPhotoBatch(items,save,update){
 let index=0;
 async function worker(){
  while(index<items.length){
   const item=items[index++];
   try{await save(item);item.status='sent'}
   catch(error){item.status='failed';item.error=error.message||'Falha no envio.'}
   update();
  }
 }
 await Promise.all([worker(),worker()]);
}
function requirePhotoOwner(form){
 if(!form.dataset.photoOwner||form.dataset.photoOwner!==Cloud.user?.id)throw Error('A conta mudou. Abra novamente o formulário.');
}
async function authorizePhotoUpload(form){
 requirePhotoOwner(form);
 const consent=form.elements.namedItem('photoConsent');
 if(!consent?.checked)throw Error('Confirme a autorização para fotografias.');
 if(Cloud.hasConsent('photos'))return;
 if(consent.hasAttribute('checked')){
  consent.removeAttribute('checked');
  consent.checked=false;
  throw Error('A autorização para fotos mudou. Confirme novamente antes de enviar.');
 }
 await Cloud.setConsent('photos',true);
}
async function submitPhotoBatch(form){
 if(!photoBatch.some(item=>item.status!=='sent'))return;
 const input=new FormData(form),common=String(input.get('date')||''),cloud=mode==='cloud',generation=loadGeneration;
 if(!C.validDate(common)||common>C.today())throw Error('Data inválida.');
 if(demo)throw Error('Fotos reais não são adicionadas à demonstração.');
 if(cloud&&!state.profile.consent)throw Error('Complete seu perfil e consentimento antes de enviar fotos.');
 if(cloud&&!input.has('photoConsent'))throw Error('Confirme a autorização para fotografias.');
 if(!localConsent())return;
 const pending=photoBatch.filter(item=>item.status!=='sent');
 await Promise.all(pending.map(item=>item.capturePromise));
 if(generation!==loadGeneration)throw Error('A conta mudou. Abra novamente o formulário.');
 if(pending.some(item=>item.capture&&!item.date)&&!input.has('captureDate')&&
  !confirm('Algumas fotos têm data de captura. Usar a data comum escolhida para essas fotos?'))return;
 if(cloud)await authorizePhotoUpload(form);
 const current=()=>{if(generation!==loadGeneration)throw Error('A conta mudou. Abra novamente o formulário.')};
 await runPhotoBatch(pending,async item=>{
  current();
  item.date??=input.has('captureDate')&&item.capture?item.capture:common;
  item.error='';item.status='encoding';paintPhotoBatch();
  if(!item.blob){
   const full=await encodePhoto(item.file,{edge:1800,quality:.84});
   item.blob=full.size<=5242880?full:await encodePhoto(item.file,{edge:1440,quality:.76});
  }
  item.thumbnail??=await encodePhoto(item.blob,{edge:160,quality:.68});
  item.previewBlob??=await encodePhoto(item.blob,{edge:800,quality:.8});
  current();
  item.status='uploading';paintPhotoBatch();
  if(cloud){try{await Cloud.uploadProgressPhoto(item.blob,item.thumbnail,item.date,item.id,item.previewBlob)}catch(error){current();observeQuality('upload_failure');throw error}current();engagementTrack('photo_upload_success','fotos');}
  else await photoStore('put',{id:item.id,date:item.date,role:'progress',blob:item.blob,thumbnail:item.thumbnail,preview:item.previewBlob,created_at:new Date().toISOString()});
 },paintPhotoBatch);
 current();
 try{await loadPhotos()}catch{$('#formError').textContent='Envio concluído. Não foi possível atualizar o histórico agora.'}
 render();
 if(photoBatch.some(item=>item.status==='failed')){$('#formError').textContent='Algumas fotos falharam. Reenvie somente as que faltam.';return}
 formDirty=false;
 $('#dialog').close();
 toast('Fotos salvas.');
}
document.addEventListener('change',event=>{
 const input=event.target;
 if(formKind!=='avatar'||!input.matches('#recordForm input[name=photo]'))return;
 clearAvatarCrop();
 input.closest('form')?.querySelector('.avatar-crop-editor')?.remove();
 const file=input.files?.[0];
 if(!file)return;
 const url=avatarCropURL=URL.createObjectURL(file),image=new Image();
 avatarCropImage=image;
 const host=document.createElement('section');
 host.className='avatar-crop-editor';
 host.innerHTML=`<h3>Ajustar foto de perfil</h3><div class="avatar-crop-preview"><canvas width="440" height="440" role="img" aria-label="Prévia do recorte da foto"></canvas></div><label>Aproximar<input type="range" min="1" max="3" step="0.05" value="1" data-avatar-crop="zoom"></label><div class="form-grid"><label>Posição horizontal<input type="range" min="0" max="100" value="50" data-avatar-crop="x"></label><label>Posição vertical<input type="range" min="0" max="100" value="50" data-avatar-crop="y"></label></div><p class="form-help">A área circular mostra como a foto aparecerá no perfil e no grupo.</p>`;
 input.closest('label')?.after(host);
 image.onload=()=>{if(avatarCropURL===url)paintAvatarCrop()};
 image.onerror=()=>{if(avatarCropURL===url)host.querySelector('.form-help').textContent='Não foi possível mostrar a prévia desta imagem.'};
 image.src=url;
});
document.addEventListener('input',event=>{
 const range=event.target.closest?.('[data-avatar-crop]');
 if(!range)return;
 avatarCrop[range.dataset.avatarCrop]=Number(range.value);
 paintAvatarCrop();
});
document.addEventListener('click',event=>{if(!event.target.closest?.('[data-add="avatar"]'))return;setTimeout(()=>{const button=document.querySelector('#saveRecord');if(button)button.textContent=avatarURL?'Alterar foto':'Salvar foto'},0)});
$('#recordForm').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;$('#saveRecord').disabled=true;$('#saveRecord').textContent='Salvando…';let savedWarning='';try{if(formKind==='photo'){await submitPhotoBatch(e.target);return}const f=new FormData(e.target),r=Object.fromEntries(f);r.id=editing?.id||draftRecordId||uid();if(formKind==='avatar'){if(mode==='cloud'&&!state.profile.consent)throw Error('Complete seu perfil e consentimento antes de enviar fotos.');if(demo)throw Error('Fotos reais não são adicionadas à demonstração.');if(!localConsent())return;const generation=loadGeneration;const blob=await encodePhoto(f.get('photo'),{crop:true});if(generation!==loadGeneration)throw Error('A conta mudou. Abra novamente o formulário.');if(!C.validDate(r.date)||r.date>C.today())throw Error('Data inválida.');const role=formKind==='avatar'?'avatar':'progress';let uploaded=null;if(mode==='cloud'){if(!f.has('photoConsent'))throw Error('Confirme a autorização para fotografias.');await authorizePhotoUpload(e.target);const thumbnail=await encodePhoto(blob,{edge:160,quality:.68});requirePhotoOwner(e.target);uploaded=await Cloud.uploadPhoto(blob,r.date,role,thumbnail);requirePhotoOwner(e.target);}else await photoStore('put',{id:r.id,date:r.date,role,blob,thumbnail:await encodePhoto(blob,{edge:160,quality:.68}),created_at:new Date().toISOString()});if(role==='avatar'&&uploaded?.url){avatarURL=uploaded.url;photoList=photoList.filter(p=>p.role!=='avatar').concat(uploaded);window.NeoCommunity?.refreshIdentity?.();if(uploaded.communitySynced===false)savedWarning='Foto aplicada ao perfil. A foto da comunidade não foi atualizada; tente alterar a foto novamente.'}else try{await loadPhotos()}catch{savedWarning='Foto salva. Não foi possível atualizar a galeria; use Atualizar fotos para conferir.'}}else{if(formKind==='reminder'){r.title=C.reminderTitle(r.recordTarget,r.title);r.enabled=f.has('enabled');r.weekday=new Date(r.date+'T12:00').getDay()}if(!await putRecord(kindType[formKind],r))return;if(formKind==='dose'&&f.has('vialId'))try{assignCalcVialDose(r.id,String(f.get('vialId')||''))}catch(error){savedWarning='Aplicação salva, mas o vínculo local com o frasco não pôde ser registrado.'}}formDirty=false;$('#dialog').close();render();toast(savedWarning||(demo?'Alteração apenas na demonstração.':'Registro salvo. Mais um passo na sua jornada.'))}catch(e){if(mode==='cloud'&&!demo)Cloud.reportError?.(formKind==='photo'||formKind==='avatar'?'photo_failed':'profile_failed');$('#formError').textContent=e.message}finally{busy=false;$('#saveRecord').disabled=false;$('#saveRecord').textContent='Salvar registro';if(formKind==='photo')paintPhotoBatch()}});
$('#close').onclick=()=>{if(!busy)$('#dialog').close()};
$('#dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault()});
async function importReview(candidate){const incoming=C.validateBackup(candidate);const preview=C.merge(state,incoming);migrationCandidate=incoming;formKind='migration';editing=null;$('#dialogTitle').textContent='Revisar importação';$('#fields').innerHTML=`<p class="sub">${preview.added} registros novos · ${preview.skipped} duplicados ignorados.</p><div class="notice">Os registros existentes e seu perfil serão preservados. Nada será removido. ${mode==='cloud'?'Os novos registros serão enviados à conta '+esc(Cloud.user?.email||'conectada')+'.':'Os novos registros ficarão neste navegador.'}</div><button type="button" class="secondary full" id="migrationBackup">1. Exportar backup atual</button><label class="check space"><input type="checkbox" id="migrationConsent">Confirmo a importação aditiva e o armazenamento dos registros neste destino.</label><button type="button" class="primary full" id="confirmMigration">2. Importar registros</button>`;$('#formError').textContent='';$('#saveRecord').hidden=true;$('#dialog').showModal();}
$('#dialog').addEventListener('close',()=>{clearPhotoBatch();clearAvatarCrop();$('#saveRecord').hidden=false;migrationCandidate=null;scheduleDailyCheck()});
function deletionChoice(scope){
 if(busy)return;if(demo)return toast('Saia da demonstração para gerenciar seus dados.');
 if(scope==='cloud'&&(mode!=='cloud'||!Cloud.user))return toast('Entre na sua conta para continuar.');
 document.querySelector('.deletion-choice')?.remove();
 const account=Cloud.user?.id,generation=loadGeneration,dialog=document.createElement('dialog');let deleting=false;
 const current=()=>generation===loadGeneration&&!demo&&(scope==='cloud'?mode==='cloud'&&Cloud.user?.id===account:mode==='local');
 const close=()=>{if(dialog.querySelector('#captcha'))window.NeoCaptcha?.remove();dialog.querySelectorAll('input').forEach(field=>field.value='');dialog.remove();};
 const ensureCurrent=()=>{if(!current()){close();throw Error('Sua conta ou modo de acesso mudou. Abra novamente a opção de exclusão.');}};
 dialog.className='deletion-choice';dialog.setAttribute('aria-labelledby','deletionChoiceTitle');dialog.setAttribute('aria-describedby','deletionChoiceText');
 function passwordStep(){ensureCurrent();dialog.innerHTML=`<h2 id="deletionChoiceTitle">Confirme sua senha</h2><p class="sub" id="deletionChoiceText">A exclusão é permanente e remove sua conta, registros e fotos. Informe sua senha de acesso para confirmar.</p><form id="deletionPasswordForm" class="space">${input('deletionPassword','Senha de acesso','password','required minlength="1" maxlength="128" autocomplete="current-password"')}${window.NEO_CONFIG.captchaRequired?'<div id="captcha" class="space" aria-live="polite"></div>':''}<p id="deletionPasswordError" class="error" role="alert"></p><button type="submit" class="delete full space">Excluir minha conta permanentemente</button><button type="button" class="text-btn full space" data-deletion-cancel>Cancelar</button></form>`;window.NeoCaptcha?.mount();
 dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();if(busy)return;action(async()=>{ensureCurrent();const field=dialog.querySelector('[name=deletionPassword]'),password=field.value;dialog.querySelector('#deletionPasswordError').textContent='';if(!password)return void(dialog.querySelector('#deletionPasswordError').textContent='Informe sua senha de acesso.');const captchaToken=window.NeoCaptcha?.take?window.NeoCaptcha.take():window.NeoCaptcha?.token;if(window.NEO_CONFIG.captchaRequired&&!captchaToken)return void(dialog.querySelector('#deletionPasswordError').textContent='Conclua a verificação de segurança.');field.value='';deleting=true;dialog.querySelectorAll('button').forEach(button=>button.disabled=true);try{await Cloud.deleteAccount(password,captchaToken,account);close();if(Cloud.user&&Cloud.user.id!==account)return;await switchLocal(false);toast('Conta e dados da nuvem excluídos.');}catch(error){if(current()&&dialog.isConnected){dialog.querySelector('#deletionPasswordError').textContent=error.message||'Não foi possível excluir sua conta. Tente novamente.';window.NeoCaptcha?.reset();}else close();}finally{deleting=false;dialog.querySelectorAll('button').forEach(button=>button.disabled=false);}});});}
 dialog.innerHTML=`<h2 id="deletionChoiceTitle">${scope==='cloud'?'Excluir sua conta?':'Excluir dados deste dispositivo?'}</h2><p class="sub" id="deletionChoiceText">${scope==='cloud'?'A exclusão é permanente e remove sua conta, registros e fotos da nuvem.':'A exclusão é permanente e remove os registros e fotos do NeoPep neste navegador.'}</p><p class="sub space">Você pode exportar seus dados antes, se quiser. A exportação é opcional; as fotos são exportadas separadamente.</p><div class="space"><button type="button" class="secondary full" data-deletion-export>Exportar meus dados</button><button type="button" class="delete full space" data-deletion-continue>Excluir sem exportar</button><button type="button" class="text-btn full space" data-deletion-cancel>Cancelar</button></div>`;
 dialog.addEventListener('cancel',event=>{if(deleting)event.preventDefault();});dialog.addEventListener('close',close);
 dialog.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||busy)return;if(button.hasAttribute('data-deletion-cancel')){close();return;}
 if(button.hasAttribute('data-deletion-export'))return action(async()=>{ensureCurrent();button.disabled=true;try{await backup();ensureCurrent();if(dialog.isConnected)dialog.querySelector('[data-deletion-continue]').textContent='Continuar com exclusão';}finally{button.disabled=false;}});
 if(button.hasAttribute('data-deletion-continue')){if(scope==='cloud'){try{passwordStep();}catch(error){toast(error.message);}return;}return action(async()=>{ensureCurrent();if(!confirm('Apagar permanentemente os registros e fotos do NeoPep neste navegador?'))return;deleting=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);try{const photos=await photoStore('all');for(const photo of photos)await photoStore('delete',photo.id);ensureCurrent();localStorage.removeItem(KEY);localState=C.blank();localError='';clearPhotoURLs();state=localState;close();render();toast('Dados do Neo excluídos deste dispositivo.');}finally{deleting=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);}});}
 });document.body.append(dialog);dialog.showModal?.();
}

function resetRecordView(){homeDetailsOpen=false;historyPrefs={};selectedProtocol='';}
async function switchLocal(openWorkspace=true){resetRecordView();workspaceEntered=openWorkspace;loadGeneration++;clearPhotoURLs();mode='local';demo=false;state=localState;cloudError='';backupDone=false;go(openWorkspace?'inicio':'bemvindo')}
async function enterDemo(){if(busy)return;resetRecordView();loadGeneration++;clearPhotoURLs();demo=true;state=C.demoState();go('inicio')}
async function authChanged(event,user){if(suppressAuth||demo)return;if(user&&mode==='cloud'&&signedInAccountId===user.id&&['SIGNED_IN','INITIAL_SESSION','TOKEN_REFRESHED'].includes(event))return;if(event==='SIGNED_IN'||event==='SIGNED_OUT')resetRecordView();if(user&&recoveryFlow&&event!=='PASSWORD_RECOVERY'&&['verifycode','newpassword'].includes(authMode)){signedInAccountId=user.id;mode='cloud';return;}if(event==='PASSWORD_RECOVERY'){arrivalReady=false;resetDailyVisit();window.NeoArrival?.reset();recoveryFlow=true;authEmail=user?.email||authEmail;rememberRecovery('newpassword');signedInAccountId=user?.id||null;loadGeneration++;clearPhotoURLs();mode='cloud';state=C.blank();authMode='newpassword';await go('bemvindo');return}if(!user){arrivalReady=false;arrivalWelcomeStarted=false;window.NeoArrival?.reset();signedInAccountId=null;if(mode==='cloud')await switchLocal(false);return}if(mode==='cloud'&&event==='TOKEN_REFRESHED')return;arrivalReady=false;resetDailyVisit();window.NeoArrival?.arm(user.id,event==='SIGNED_IN');signedInAccountId=user.id;loadGeneration++;clearPhotoURLs();mode='cloud';state=C.blank();render();try{await reloadCloud();if(!Cloud.onboardingComplete)await go(arrivalWelcomeStarted?'onboarding':'preparar');else await openAccountDestination();Cloud.heartbeat?.().catch(()=>{});const u=new URL(location.href);if(u.searchParams.has('code')){u.searchParams.delete('code');history.replaceState(history.state||null,'',u)}}catch(e){toast(e.message)}}
document.addEventListener('click',e=>{const b=e.target.closest('button');const tip=e.target.closest('[data-tip]');if(tip){if(page==='evolucao'||page==='peso')engagementTrack('weight_chart_interaction','evolucao');const target=tip.closest('.card').querySelector('.chart-tip');if(target)target.textContent=tip.dataset.tip}if(!b)return;if(b.hasAttribute('data-home-details')){setHomeDetails(!homeDetailsOpen);return;}if(b.dataset.passwordToggle){const field=document.getElementById(b.dataset.passwordToggle);if(!field||!field.closest('#authForm,#deletionPasswordForm'))return;const show=field.type==='password';field.type=show?'text':'password';b.setAttribute('aria-pressed',String(show));b.setAttribute('aria-label',(show?'Ocultar ':'Mostrar ')+b.dataset.passwordLabel);b.innerHTML=icon(show?'eyeOff':'eye');return;}if(b.hasAttribute('data-start-profile')){arrivalWelcomeStarted=true;return go('onboarding');}if(b.dataset.back){navigateBack(b.dataset.back);return;}if(b.dataset.historyReset){delete historyPrefs[b.dataset.historyReset];render();return}if(b.dataset.historyPage){const [type,p]=b.dataset.historyPage.split(':');historyPrefs[type]={...(historyPrefs[type]||{}),page:Math.max(0,Number(p)||0)};render();return}if(b.dataset.protocolApps){selectedProtocol=b.dataset.protocolApps;return go('aplicacoes')}if(b.dataset.toggleReminder)return action(()=>toggleReminder(b.dataset.toggleReminder));if(b.dataset.go==='loja'&&b.closest('#nav'))window.NeoShop?.openCatalog?.();if(b.dataset.go==='comunidade'&&page==='inicio'&&b.dataset.communitySection==='library')engagementTrack('home_library_open');if(b.dataset.go)return go(b.dataset.go,true,b.dataset.supportShortcut==='true',b.dataset.communitySection||'feed',b.dataset.material||'');if(b.dataset.period){if(String(period)!==b.dataset.period)engagementTrack(page==='relatorios'?'reports_period_changed':'comparison_period_changed');period=b.dataset.period;render();return}if(b.dataset.add)return openRecord(b.dataset.add);if(b.dataset.edit){if(page==='calendario')engagementTrack('calendar_event_open','calendario');const [type,...rest]=b.dataset.edit.split(':'),id=rest.join(':'),record=state[type]?.find(r=>r.id===id);if(record)return openRecord(Object.keys(kindType).find(k=>kindType[k]===type),record)}if(b.dataset.auth){if(busy)return;authEmail=$('#authForm [name=email]')?.value||authEmail;authRemember=$('#authForm [name=remember]')?.checked??authRemember;authMode=b.dataset.auth;if(['login','signup','reset'].includes(authMode)){recoveryFlow=false;clearRecovery();}authMessage='';render();return}if(b.dataset.calview){if(calendarView!==b.dataset.calview)engagementTrack('calendar_period_changed','calendario');calendarView=b.dataset.calview;render();return}if(b.dataset.day){selectedDate=b.dataset.day;render();return}if(b.dataset.oauth)return action(async()=>{if(authMode==='signup'&&!$('#authLegalConsent')?.checked)throw Error('Leia a política e aceite os Termos de Uso para criar a conta.');authRemember=$('#authForm [name=remember]')?.checked??authRemember;await Cloud.oauth(b.dataset.oauth,{remember:authRemember})});if(b.dataset.delete)return action(async()=>{const [type,...rest]=b.dataset.delete.split(':'),id=rest.join(':'),r=state[type]?.find(x=>x.id===id);if(!r||!confirm(type==='protocols'?'Excluir este protocolo? As aplicações serão mantidas; a referência ao nome deste protocolo deixará de aparecer.':'Excluir este registro? Essa ação remove somente o item selecionado.'))return;if(mode==='cloud'&&!demo){await Cloud.remove(type,r);await refreshAfterWrite({...state,[type]:state[type].filter(x=>x.id!==id)})}else persist({...state,[type]:state[type].filter(x=>x.id!==id)});render();toast('Registro excluído.')});if(b.dataset.photoOpen)return action(()=>showPhoto(b.dataset.photoOpen,b));if(b.dataset.photoDelete)return action(async()=>{const p=photoList.find(p=>p.id===b.dataset.photoDelete);if(!p||!confirm('Excluir esta foto privada? Exporte antes se quiser manter uma cópia.'))return;if(mode==='cloud')await Cloud.deletePhoto(p);else await photoStore('delete',p.id);await loadPhotos();render();toast('Foto excluída.')});if(b.dataset.photoExport)return action(async()=>{const p=photoList.find(p=>p.id===b.dataset.photoExport);const blob=mode==='cloud'?await Cloud.photoBlob(p):p.blob;download('neopeptideos-foto-'+p.date+'.jpg',blob,blob.type)});switch(b.id){case'retrySession':return location.reload();case'demo':return enterDemo();case'exitDemo':demo=false;return mode==='cloud'?action(async()=>{state=C.blank();await reloadCloud();go('inicio')}):switchLocal();case'localMode':if(Cloud.user)return toast('Saia da conta no Perfil antes de mudar para o modo local.');return switchLocal();case'backup':case'migrationBackup':return action(backup);case'csvPeriod':engagementTrack('reports_csv_export','relatorios');download((demo?'DEMONSTRACAO-':'')+'neopeptideos-periodo-'+C.today()+'.csv',C.exportCsv(C.reportState(state,period)),'text/csv;charset=utf-8');break;case'csv':download((demo?'DEMONSTRACAO-':'')+'neopeptideos-'+C.today()+'.csv',C.exportCsv(state),'text/csv;charset=utf-8');break;case'print':engagementTrack('reports_print_requested','relatorios');window.print();break;case'calendarExport':download('neopeptideos-lembretes.ics',C.calendar(state),'text/calendar;charset=utf-8');break;case'legacyBackup':return action(legacyBackup);case'legacyImport':return action(async()=>{if(!legacyBackupDone)throw Error('Exporte o backup dos registros anteriores primeiro.');await importReview(JSON.parse(localStorage.getItem(LEGACY)))});case'restore':backupDone=false;$('#restoreFile').value='';$('#restoreFile').click();break;case'rawBackup':download('neopeptideos-recuperacao-bruta.json',localStorage.getItem(KEY)||'','application/json');break;case'confirmMigration':return action(async()=>{if(!backupDone)throw Error('Exporte o backup atual antes de importar.');if(!$('#migrationConsent').checked)throw Error('Confirme o destino e o armazenamento antes de importar.');if(!migrationCandidate)throw Error('Selecione os dados novamente.');if(mode==='cloud'&&!demo&&!state.profile.consent)throw Error('Salve seu perfil e consentimento antes de importar.');const result=mode==='cloud'&&!demo?await Cloud.importRecords(migrationCandidate):C.merge(state,migrationCandidate);if(result.data)persist(result.data);else await reloadCloud();$('#dialog').close();render();toast(result.added+' registros importados'+(result.verified?' e conferidos no servidor':'')+'. Original preservado.')});case'clearLocal':return deletionChoice('local');case'deleteAccount':return deletionChoice('cloud');case'refreshPhotos':return action(async()=>{await loadPhotos();render();toast('Fotos atualizadas.');});case'refresh':return action(async()=>{await reloadCloud();if(page==='fotos'||page==='perfil'){await loadPhotos();render()}toast('Dados atualizados.')});case'logoutAll':return action(async()=>{if(!confirm('Encerrar as sessões em todos os dispositivos? Tokens de acesso já emitidos podem permanecer válidos até expirarem.'))return;await Cloud.logout('global');await switchLocal(false);toast('Sessões encerradas. Novos acessos exigem autenticação.');});case'logout':authEmail='';authMessage='';return action(async()=>{if(!confirm('Sair desta conta? Os dados salvos na nuvem permanecem disponíveis no próximo acesso.'))return;suppressAuth=true;try{await Cloud.logout();await switchLocal(false)}finally{suppressAuth=false}toast('Você saiu da conta.')});case'withdrawHealth':return action(async()=>{if(!confirm('Retirar o consentimento para novas gravações de saúde? Você ainda poderá exportar, excluir dados e excluir a conta.'))return;await Cloud.setConsent('health',false);await reloadCloud();go('perfil');toast('Consentimento retirado. Novas gravações estão bloqueadas.');});case'withdrawPhotos':return action(async()=>{if(!confirm('Impedir novos envios de fotos? As fotos existentes continuam disponíveis para você exportar ou excluir.'))return;await Cloud.setConsent('photos',false);render();toast('Autorização para novas fotos retirada.');});case'notify':return action(async()=>{if(!('Notification'in window))throw Error('Este navegador não permite estes avisos. Use a exportação para a agenda.');const permission=await Notification.requestPermission();const next={...state,settings:{...state.settings,enabled:permission==='granted'}};if(mode==='cloud'&&!demo){await Cloud.saveProfile(state.profile,next.settings);await reloadCloud()}else persist(next);toast(permission==='granted'?'Avisos habilitados enquanto o app estiver aberto.':'Permissão não concedida. Use a agenda.');render()});case'prevMonth':case'nextMonth':{engagementTrack('calendar_period_changed','calendario');const n=b.id==='prevMonth'?-1:1;if(calendarView==='week')calendarDate.setDate(calendarDate.getDate()+n*7);else calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+n,1);selectedDate=C.today(calendarDate);render();break}case'calToday':calendarDate=new Date();selectedDate=C.today();render();break;case'applyUpdate':swReloadAllowed=true;window.NeoWaitingWorker?.postMessage({type:'SKIP_WAITING'});break;}});
document.addEventListener('submit',e=>{const type=e.target.dataset.historyFilter;if(!type)return;e.preventDefault();const values=Object.fromEntries(new FormData(e.target));try{C.filterRecords(state[type],values);historyPrefs[type]={...values,page:0};formDirty=false;render()}catch(err){toast(err.message)}});
document.addEventListener('change',e=>{if(e.target.id==='measureSeries'){selectedMeasure=e.target.value;render()}if(e.target.id==='protocolFilter'){selectedProtocol=e.target.value;delete historyPrefs.doses;render()}});
document.addEventListener('focusin',e=>{const tip=e.target.closest('[data-tip]');if(tip){const target=tip.closest('.card').querySelector('.chart-tip');if(target)target.textContent=tip.dataset.tip}});
document.addEventListener('submit',e=>{const form=e.target;if(!['calcForm','profileForm','settingsForm','authForm','onboardingForm'].includes(form.id))return;e.preventDefault();if(form.id==='calcForm'){if(!engagementCalcStarted){engagementCalcStarted=true;engagementTrack('calculator_started','calculadora')}updateCalc(true);return}action(async()=>{const f=new FormData(form),data=Object.fromEntries(f),submit=form.querySelector('button[type=submit],button.primary');if(submit)submit.disabled=true;try{if(form.id==='onboardingForm'){if(mode!=='cloud'||demo)throw Error('Entre na sua conta real para concluir o cadastro.');const p=C.profile({...state.profile,...data,consent:f.has('health'),tracking:Object.fromEntries(['weight','measures','journal','photos','applications'].map(k=>[k,f.has('track_'+k)]))});await Cloud.onboard(p,state.settings,f.has('health'),f.has('terms'));engagementTrack('onboarding_completed','onboarding');formDirty=false;await reloadCloud();window.NeoArrival?.arm(Cloud.user.id,true);await openAccountDestination()}if(form.id==='profileForm'){const p=C.profile({...state.profile,...data,tracking:Object.fromEntries(['weight','measures','journal','photos','applications'].map(k=>[k,f.has('track_'+k)])),consent:mode==='cloud'&&!demo?Cloud.hasConsent('health'):f.has('consent')});if(!p.consent)throw Error('Para guardar o perfil, confirme o consentimento. Você pode excluir seus dados para retirá-lo.');if(mode==='cloud'&&!demo){await Cloud.saveProfile(p,state.settings);engagementTrack('profile_updated','perfil');await reloadCloud()}else persist({...state,profile:p});formDirty=false;render();toast('Perfil atualizado.')}if(form.id==='settingsForm'){const settings=C.validateBackup({settings:{...state.settings,...data,reminderScheduleConfigured:true}}).settings;if(mode==='cloud'&&!demo){await Cloud.saveProfile(state.profile,settings);engagementTrack('reminder_settings_saved','lembretes');await reloadCloud()}else persist({...state,settings});formDirty=false;toast('Horários salvos. Atualize sua agenda se necessário.')}if(form.id==='authForm'){const intent=authMode;if(intent==='reset'&&Date.now()<resetNextAt)throw Error('Aguarde um minuto antes de pedir outro código. Confira também sua caixa de entrada e o spam.');if($('#authError'))$('#authError').textContent='';if(intent==='reset'&&submit)submit.textContent='Enviando…';if(intent==='newpassword'&&data.password!==data.confirmPassword)throw Error('As senhas não conferem. Digite a mesma senha nos dois campos.');if(intent==='signup'&&!f.has('consent'))throw Error('Aceite os Termos de Uso para criar a conta.');authEmail=String(data.email||authEmail).trim();if(intent==='verifycode')data.email=authEmail;if(['signup','login'].includes(intent))authRemember=f.has('remember');authMessage='';const result=await Cloud.email(intent,data.email,data.password,data.name,{code:data.code,captchaToken:['verifycode','newpassword'].includes(intent)?undefined:window.NeoCaptcha?.take?window.NeoCaptcha.take():window.NeoCaptcha?.token,remember:authRemember});window.NeoCaptcha?.reset();if(intent==='signup'){const password=form.querySelector('[name=password]');if(password)password.value='';formDirty=false;if(result.session){authMessage='';const account=result.session.user||result.user||Cloud.user;if(account)await authChanged('SIGNED_IN',account)}else{authMode='login';authMessage='Enviamos um link para confirmar seu e-mail. Abra a mensagem e confirme o cadastro antes de entrar.';if(page==='bemvindo')render()}}if(intent==='reset'){resetNextAt=Date.now()+60000;recoveryFlow=true;authMode='verifycode';rememberRecovery('verifycode');authMessage='Se houver uma conta com esse e-mail, você receberá um código para recuperar sua senha.';formDirty=false;render()}if(intent==='verifycode'){if(!result.session||(!result.session.user&&!result.user))throw Error('Código inválido ou expirado. Solicite um novo.');signedInAccountId=(result.session?.user||result.user).id;mode='cloud';authMode='newpassword';rememberRecovery('newpassword');authMessage='';formDirty=false;await go('bemvindo');}if(intent==='login'&&result.session){formDirty=false;const account=result.session.user||result.user||Cloud.user;if(account)await authChanged('SIGNED_IN',account)}if(intent==='newpassword'){formDirty=false;form.querySelectorAll('input[name=password],input[name=confirmPassword]').forEach(input=>input.value='');clearRecovery();try{await reloadCloud();recoveryFlow=false;authMode='login';authMessage='';if(Cloud.onboardingComplete)await openAccountDestination();else await go('preparar');toast('Senha atualizada. Você já está no seu aplicativo.')}catch{recoveryFlow=false;signedInAccountId=null;authMode='login';authMessage='Sua senha foi atualizada. Entre com a nova senha para continuar.';await go('bemvindo');}}}}catch(err){if(form.id==='authForm'&&$('#authError')){$('#authError').textContent=authMode==='verifycode'&&(/otp|token|expired|invalid/i.test(String(err.code||'')+' '+err.message))?'Código inválido ou expirado. Confira o código ou solicite um novo.':/captcha|timeout-or-duplicate/i.test(String(err.code||'')+' '+err.message)?'A verificação de segurança expirou ou já foi usada. Faça a nova verificação e tente novamente. Se já recebeu o e-mail, use o link recebido.':'Não foi possível concluir: '+err.message;window.NeoCaptcha?.reset();}else if(form.id==='onboardingForm'&&$('#onboardingError'))$('#onboardingError').textContent=err.message;else throw err}finally{if(submit)submit.disabled=form.id==='authForm'&&authMode==='reset'&&Date.now()<resetNextAt;updateResetCooldown();}})});
$('#restoreFile').addEventListener('change',e=>action(async()=>{const file=e.target.files[0];if(!file)return;if(file.size>20*1024*1024)throw Error('Backup grande demais. Limite de 20 MB.');await importReview(JSON.parse(await file.text()))}));
document.addEventListener('input',e=>{if(e.target.closest('form'))formDirty=true});
window.addEventListener('hashchange',()=>{const p=location.hash.slice(1);if(routes[p])go(p,false)});window.addEventListener('online',()=>{render();if(mode==='cloud'&&!demo)action(reloadCloud)});window.addEventListener('offline',render);
let swReloadAllowed=false;
const reminded={};setInterval(()=>{if(demo||document.visibilityState!=='visible'||!state.settings.enabled)return;const now=new Date();for(const r of C.nextReminders(state,new Date(now.getTime()-60000))){if(r.next>now||now-r.next>60000||reminded[r.id]===C.today())continue;reminded[r.id]=C.today();toast(r.title);if('Notification'in window&&Notification.permission==='granted'){try{new Notification('NeoPep',{body:'Abra o aplicativo para registrar sua evolução.'})}catch{}}}},15000);
navigator.serviceWorker?.addEventListener?.('message',event=>{
 if(event.data?.type==='NEO_OPEN_CAMPAIGNS'&&campaignReady()&&!campaignBlocked())void go('inicio');
});
if('serviceWorker'in navigator&&['https:','http:'].includes(location.protocol)){navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(reg=>{const show=worker=>{window.NeoWaitingWorker=worker;toast('Nova versão disponível. Salve seus registros antes de atualizar.');if(!document.querySelector('#applyUpdate'))document.querySelector('#banner').insertAdjacentHTML('beforeend','<div class="banner"><span>Atualização disponível.</span><button class="text-btn" id="applyUpdate">Atualizar agora</button></div>');};if(reg.waiting)show(reg.waiting);reg.addEventListener('updatefound',()=>{const w=reg.installing;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)show(w)})});reg.update().catch(()=>observeQuality('pwa_update_failure'))}).catch(()=>{observeQuality('pwa_update_failure');console.info('Cache offline não disponível neste ambiente.');});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(swReloadAllowed||(!formDirty&&!document.querySelector('dialog[open]')))location.reload();else toast('Atualização instalada. Salve a edição e reabra o aplicativo.')})}
async function backgroundSync(){if(mode!=='cloud'||demo||busy||formDirty||$('#dialog').open||document.querySelector('.deletion-choice')||document.visibilityState==='hidden'||!navigator.onLine)return;const gen=loadGeneration,started=Date.now();try{const next=await Cloud.load();if(gen!==loadGeneration||busy||formDirty||mode!=='cloud'||demo)return;const elapsed=Date.now()-started;if(elapsed>=0&&elapsed<=120000)observeQuality('sync_response',elapsed);if(JSON.stringify(next)!==JSON.stringify(state)){state=next;render()}lastCloudSync=new Date()}catch{if(gen===loadGeneration){observeQuality('sync_failure');Cloud.reportError?.('sync_failed')}}}
setInterval(backgroundSync,30000);window.addEventListener('focus',backgroundSync);setInterval(()=>{if(mode==='cloud'&&!demo&&document.visibilityState!=='hidden'&&navigator.onLine)Cloud.heartbeat?.().catch(()=>{})},300000);
window.NeoArrival?.configure({savePreference:async enabled=>{if(mode!=='cloud'||demo||!Cloud.user)throw Error('Entre na sua conta.');const account=Cloud.user.id;await Cloud.saveProfile(state.profile,{...state.settings,showArrivalGuide:enabled});if(Cloud.user?.id!==account)throw Error('A conta mudou.');await reloadCloud();}});
document.addEventListener('input',event=>{if(!event.target.matches('#onboardingForm [name=initialWeight],#onboardingForm [name=goal]'))return;const form=event.target.form||document.querySelector('#onboardingForm');const message=document.querySelector('#onboardingGoalIntent');if(message)message.textContent=goalIntent(form.querySelector('[name=initialWeight]').value,form.querySelector('[name=goal]').value);});
function updateResetCooldown(){if(page!=='bemvindo'||authMode!=='reset')return;const button=$('#authForm button.primary');if(!button)return;const remaining=Math.max(0,Math.ceil((resetNextAt-Date.now())/1000));if(remaining){button.disabled=true;button.dataset.resetCooldown='true';button.textContent='Reenviar em '+remaining+' s';}else if(button.dataset.resetCooldown){delete button.dataset.resetCooldown;button.textContent='Enviar código';const cfg=window.NEO_CONFIG;button.disabled=!(Cloud.configured&&cfg.providers?.email&&(!cfg.captchaRequired||cfg.captchaSiteKey));}}
setInterval(updateResetCooldown,1000);
const initial=location.hash.slice(1),paymentReturn=/^[a-f0-9-]{36}$/.test(new URL(location.href).searchParams.get('order')||'');let hasLocal=false;try{hasLocal=!!localStorage.getItem(KEY)}catch{}page=paymentReturn?'loja':routes[initial]?initial:hasLocal?'inicio':'bemvindo';workspaceEntered=hasLocal&&page!=='bemvindo';restoreRecovery();
let startupRecovery=null;
async function restoreSession(){
 const checking=!!Cloud.configured;
 sessionLoading=checking;
 sessionFailed=false;
 startupRecovery=null;
 render();
 try{
  const user=await Cloud.init((event,account)=>{
   if(sessionLoading){if(event==='PASSWORD_RECOVERY')startupRecovery=account;return}
   if(!sessionFailed)void authChanged(event,account);
  });
  if(startupRecovery||user){
   await authChanged(startupRecovery?'PASSWORD_RECOVERY':'INITIAL_SESSION',startupRecovery||user);
   sessionLoading=false;
   render();
   return;
  }
  sessionLoading=false;
  if(recoveryFlow&&authMode==='newpassword'){
   clearRecovery();recoveryFlow=false;authMode='reset';
   authMessage='Sua sessão de recuperação expirou. Solicite um novo código.';
   render();
  }
  if(pendingLibraryMaterial()){await go('bemvindo',false);return}
  const link=new URL(location.href);
  if(link.searchParams.has('code')){
   authMode='login';authMessage='Não foi possível abrir uma sessão por este link. Se já confirmou seu e-mail, entre com e-mail e senha.';
   link.searchParams.delete('code');history.replaceState(null,'',link.href);await go('bemvindo',false);return;
  }
  if(['inicio','evolucao','peso'].includes(page)&&mode==='local'&&!demo&&!photoMetadataLoaded){try{await loadPhotos();render()}catch{if(checking)render()}}
  else if(checking)render();
 }catch(e){
  sessionLoading=false;
  if(!Cloud.configured)return;
  const link=new URL(location.href),callback=link.searchParams.has('code')||['bad_code_verifier','flow_state_not_found','flow_state_expired','otp_expired'].includes(e.code);
  if(callback){
   authMode='login';authMessage='Não foi possível concluir o acesso por este link. Se o link expirou, solicite um novo.';
   link.searchParams.delete('code');history.replaceState(null,'',link.href);await go('bemvindo',false);return;
  }
  sessionFailed=true;
  await go('bemvindo',false);
 }
}
void restoreSession();

if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',event=>{if(['NEO_OPEN_REMINDERS','NEO_OPEN_COMMUNITY','NEO_OPEN_SHOP_ORDERS'].includes(event.data?.type)&&(!formDirty||confirm('Abrir o aviso? As alterações ainda não salvas serão descartadas.'))){if(event.data.type==='NEO_OPEN_SHOP_ORDERS'){go(Cloud.user?'loja':'bemvindo',true);setTimeout(()=>window.NeoShop?.openOrders?.(),250);return}go(Cloud.user?(event.data?.type==='NEO_OPEN_COMMUNITY'?'comunidade':'lembretes'):'bemvindo',true,event.data?.direct===true,event.data?.library?'library':'feed')}});

addEventListener('popstate',event=>{const value=event.state||{};go(value.neoPage||location.hash.slice(1)||'inicio',false,value.direct===true,value.communityTab||'feed',value.materialID||'');});
window.NeoGestures?.configure({refresh:async()=>{if(formDirty||document.querySelector('dialog[open]'))throw Error('Salve ou feche a edição antes de atualizar.');if(page==='comunidade'){await window.NeoCommunity.load({cloud:mode==='cloud'&&!demo,user:Cloud.user,admin:Cloud.admin,demo,sanitizePhoto,profileName:state.profile.name,avatarURL});if(document.querySelector('[data-community-tab=direct][aria-pressed=true]'))await window.NeoSupport?.load();}else{if(mode==='cloud'&&!demo)await reloadCloud();if(page==='loja')await window.NeoShop?.load(true);if(page==='inicio'){window.NeoLibrary?.invalidate();await window.NeoLibrary?.loadHome({cloud:mode==='cloud'&&!demo,user:Cloud.user,admin:Cloud.admin});await window.NeoShop?.loadHome({cloud:mode==='cloud'&&!demo,user:Cloud.user,admin:Cloud.admin,sanitizePhoto});}}try{await (await navigator.serviceWorker?.getRegistration())?.update();}catch{}},back:()=>{if(formDirty&&!confirm('Há alterações não salvas. Deseja voltar?'))return;if((history.state?.neoDepth||0)>0&&typeof history.back==='function')history.back();else go('inicio');}});
