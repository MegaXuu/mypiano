/* ==========================================================================
   Piano — Pratique · v2 étape A
   PWA hors-ligne, stockage local. Design fidèle au handoff Claude Design.
   ========================================================================== */

const KEY = 'pianoV2';
const IMPROV = '__improv__';
const APP_VERSION = 'Bêta 3.7'; // à synchroniser avec CACHE dans sw.js à chaque release

const STONES = [
  {n:'Apprenti',h:10,c:'#E0A83B'},{n:'Élève',h:20,c:'#C9CDDA'},{n:'Musicien',h:30,c:'#9BA0AE'},
  {n:'Interprète',h:50,c:'#C98A3A'},{n:'Accompagnateur',h:75,c:'#D2694A'},{n:'Chambriste',h:100,c:'#7FC9C4'},
  {n:'Soliste',h:150,c:'#D06E86'},{n:'Récitaliste',h:200,c:'#35C0B9'},{n:'Concertiste',h:300,c:'#9FC93C'},
  {n:'Virtuose',h:500,c:'#6B9BF2'},{n:'Maestro',h:750,c:'#9E8BEA'},{n:'Grand Maestro',h:1000,c:'#E8B23C'},
  {n:'Maître',h:1500,c:'#2FBE86'},{n:'Grand Maître',h:2000,c:'#7FDDE8'},{n:'Prodige',h:3000,c:'#4C82E0'},
  {n:'Légende',h:5000,c:'#A98CF2'},{n:'Immortel',h:7500,c:'#D0A24A'},{n:'Maestro Assoluto',h:10000,c:'#E4C58A'},
];
const QUOTES = [
  ['la musique est l’espace entre les notes.','Claude Debussy'],
  ['jouer une fausse note est insignifiant ; jouer sans passion est impardonnable.','Ludwig van Beethoven'],
  ['sans la musique, la vie serait une erreur.','Friedrich Nietzsche'],
  ['le piano est un orchestre à lui seul.','Franz Liszt'],
];
const FEEL = {pp:'Laborieux',p:'Difficile',mf:'Correct',f:'Satisfaisant',ff:'Excellent'};
const FEEL_ORDER = ['pp','p','mf','f','ff'];
function feelLabel(f){return f&&FEEL[f]?f+' · '+FEEL[f]:(f||'');}

/* ---------- State ---------- */
const IDB_NAME = 'pianoV2';
const IDB_VERSION = 1;
const LS_MIRROR = true; // filet de secours pendant la période de rodage d'IndexedDB (retiré à l'étape 4)

function defaults(){
  return {pieces:[],sessions:[],wishlist:[],journal:{},opusCache:{},challenges:{week:null,month:null,log:[]},
    settings:{tolerance:1,dailyGoal:30,weeklyTime:null,weeklyDays:5,monthly:null,
      notif:{daily:true,dailyTime:'17:00',streak:true,weekly:true,palier:true,monthly:true},theme:'dark',nas:{enabled:false,ip:'',last:''}}};
}
function migrate(r){r.pieces=r.pieces||[];r.sessions=r.sessions||[];r.wishlist=r.wishlist||[];r.journal=r.journal||{};
  r.opusCache=r.opusCache||{};r.challenges=r.challenges||{week:null,month:null,log:[]};r.challenges.log=r.challenges.log||[];
  // Fusion : la wishlist devient un statut du répertoire ('à apprendre').
  if(r.wishlist.length){r.wishlist.forEach(w=>{r.pieces.push({id:w.id||(Date.now().toString(36)+Math.random().toString(36).slice(2,6)),title:w.title||'',composer:w.composer||'',epoch:w.epoch||'',opus:'',genre:'',key:'',diff:0,bpm:'',status:'wishlist',progress:0,tags:[],notes:[],todo:'',createdAt:Date.now()});});r.wishlist=[];}
  r.settings=Object.assign({tolerance:1,dailyGoal:30,weeklyTime:null,weeklyDays:5,monthly:null,
    notif:{daily:true,dailyTime:'17:00',streak:true,weekly:true,palier:true,monthly:true},theme:'dark',nas:{enabled:false,ip:'',last:''}},r.settings||{});
  r.pieces.forEach(p=>{if(p.status==='mastered'&&!p.revInterval)p.revInterval=r.settings.revisionDays||18;});
  return r;}

let S = defaults();
let _db=null;

function openDb(){
  return new Promise(resolve=>{
    if(typeof indexedDB==='undefined'){resolve(null);return;}
    let req;
    try{req=indexedDB.open(IDB_NAME,IDB_VERSION);}catch(e){resolve(null);return;}
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('state'))db.createObjectStore('state');
      if(!db.objectStoreNames.contains('recordings'))db.createObjectStore('recordings');
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>resolve(null);
  });
}
function idbGet(key){
  return new Promise(resolve=>{
    try{
      const rq=_db.transaction('state','readonly').objectStore('state').get(key);
      rq.onsuccess=()=>resolve(rq.result);
      rq.onerror=()=>resolve(undefined);
    }catch(e){resolve(undefined);}
  });
}
function idbSet(key,val){
  return new Promise(resolve=>{
    try{
      const tx=_db.transaction('state','readwrite');
      tx.objectStore('state').put(val,key);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>resolve(false);
      tx.onabort=()=>resolve(false);
    }catch(e){resolve(false);}
  });
}
// Enregistrements audio : blobs stockés à part (jamais dans S / localStorage).
function idbPutBlob(id,blob){
  return new Promise(resolve=>{
    if(!_db){resolve(false);return;}
    try{
      const tx=_db.transaction('recordings','readwrite');
      tx.objectStore('recordings').put(blob,id);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>resolve(false);
      tx.onabort=()=>resolve(false);
    }catch(e){resolve(false);}
  });
}
function idbGetBlob(id){
  return new Promise(resolve=>{
    if(!_db){resolve(null);return;}
    try{
      const rq=_db.transaction('recordings','readonly').objectStore('recordings').get(id);
      rq.onsuccess=()=>resolve(rq.result||null);
      rq.onerror=()=>resolve(null);
    }catch(e){resolve(null);}
  });
}
function idbDelBlob(id){
  return new Promise(resolve=>{
    if(!_db){resolve(false);return;}
    try{
      const tx=_db.transaction('recordings','readwrite');
      tx.objectStore('recordings').delete(id);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>resolve(false);
    }catch(e){resolve(false);}
  });
}

async function loadState(){
  _db=await openDb();
  let lsRaw=null;
  try{lsRaw=localStorage.getItem(KEY);}catch(e){}
  if(_db){
    const raw=await idbGet('S');
    if(raw){try{return migrate(JSON.parse(raw));}catch(e){}}
    // Rien en IndexedDB : migration one-shot depuis localStorage (localStorage n'est pas effacé).
    if(lsRaw){
      try{
        const parsed=migrate(JSON.parse(lsRaw));
        await idbSet('S',JSON.stringify(parsed));
        await idbSet('meta',{migratedAt:Date.now(),from:'localStorage',version:IDB_VERSION});
        return parsed;
      }catch(e){}
    }
    return defaults();
  }
  // IndexedDB indisponible (mode privé, quota, etc.) : on retombe sur localStorage seul.
  if(lsRaw){try{return migrate(JSON.parse(lsRaw));}catch(e){}}
  return defaults();
}

let _dirty=false,_writing=false,_saveTimer=null;
function mirrorLS(){try{if(LS_MIRROR)localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
async function writeState(){
  if(!_db)return;
  let ok=await idbSet('S',JSON.stringify(S));
  if(!ok)ok=await idbSet('S',JSON.stringify(S)); // un retry avant d'alerter
  if(!ok)toast('Sauvegarde impossible');
}
function flush(){
  _saveTimer=null;
  if(_writing){_saveTimer=setTimeout(flush,150);return;}
  if(!_dirty)return;
  _dirty=false;_writing=true;
  writeState().finally(()=>{_writing=false;if(_dirty&&!_saveTimer)_saveTimer=setTimeout(flush,150);});
}
function save(){
  mirrorLS();
  _dirty=true;
  if(!_saveTimer)_saveTimer=setTimeout(flush,150);
}
// Écriture immédiate (import JSON, mise en arrière-plan de l'app) : attend la fin du disque.
function saveNow(){
  mirrorLS();
  if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null;}
  _dirty=false;
  return writeState();
}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

/* ---------- Dates & format ---------- */
function dkey(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function frDate(d){return d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});}
function frShort(iso){return new Date(iso+'T00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'});}
function clock(s){s=Math.max(0,Math.round(s));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),ss=s%60;
  return (h>0?h+' : '+String(m).padStart(2,'0'):String(m).padStart(2,'0'))+' : '+String(ss).padStart(2,'0');}
function big(sec){const m=Math.floor(sec/60),s=Math.round(sec%60);return m+'′ '+String(s).padStart(2,'0')+'″';}
function dur(sec){const m=Math.round(sec/60);if(m<60)return m+' min';const h=Math.floor(m/60),mm=m%60;return mm?h+' h '+String(mm).padStart(2,'0'):h+' h';}
function durH(sec){const h=sec/3600;return (h<10?h.toFixed(1):Math.round(h))+' h';}
function minLabel(mins){mins=Math.round(mins);if(mins<60)return mins+'′';const h=Math.floor(mins/60),m=mins%60;return h+' h'+(m?' '+String(m).padStart(2,'0')+'′':'');}
function goalLabel(mins){if(mins<60)return mins+' min';const h=Math.floor(mins/60),m=mins%60;return h+' h'+(m?' '+String(m).padStart(2,'0'):'');}
function fmtMinLong(m){if(m<60)return m+' min';const h=Math.floor(m/60),mm=m%60;return h+' h '+String(mm).padStart(2,'0')+' min';}
function glyphFor(i){return i<4?'♩':i<9?'♪':i<13?'♫':i<17?'♬':'𝄞';}
function noteIcon(c,sz,g){sz=sz||22;g=g||'♫';return `<span style="color:${c};font-size:${sz}px;line-height:1;display:inline-flex;align-items:center;justify-content:center;">${g}</span>`;}
function rankGlyph(st){return glyphFor(STONES.indexOf(st));}

/* ---------- Derived ---------- */
function pieceById(id){return S.pieces.find(p=>p.id===id);}
function pieceName(id){if(id===IMPROV)return 'Improvisation';const p=pieceById(id);return p?p.title:'—';}
function sessionSeconds(se){return se.blocks.reduce((a,b)=>a+b.sec,0);}
function secondsOnDay(k){return S.sessions.filter(s=>s.date===k).reduce((a,s)=>a+sessionSeconds(s),0);}
function totalSeconds(){return S.sessions.reduce((a,s)=>a+sessionSeconds(s),0);}
function pieceSeconds(id){let t=0;S.sessions.forEach(s=>s.blocks.forEach(b=>{if(b.piece===id)t+=b.sec;}));return t;}
function practiceDays(){return new Set(S.sessions.map(s=>s.date));}
function masteredCount(){return S.pieces.filter(p=>p.status==='mastered').length;}
function pieceSessionCount(id){return S.sessions.filter(s=>s.blocks.some(b=>b.piece===id)).length;}
function needsRevision(p){if(!p||p.status!=='mastered')return false;const days=p.revInterval||S.settings.revisionDays||18;const lp=pieceLastPlayed(p.id);if(!lp)return false;return Math.floor((Date.now()-new Date(lp+'T00:00'))/86400000)>=days;}
// Phase de travail dérivée (jamais stockée) — statut + avancement.
function piecePhase(p){if(!p)return null;
  if(p.status==='wishlist')return{k:'wishlist',label:'À apprendre',col:'var(--t2)'};
  if(p.status==='archived')return{k:'archived',label:'Archivé',col:'var(--t2)'};
  if(p.status==='abandoned')return{k:'abandoned',label:'Abandonné',col:'var(--t2)'};
  if(p.status==='mastered')return needsRevision(p)?{k:'entretien',label:'À entretenir',col:'var(--gold)'}:{k:'mastered',label:'Maîtrisé',col:'var(--acc)'};
  const pr=pieceProgress(p);
  if(pr<30)return{k:'dechiffrage',label:'Déchiffrage',col:'#D2694A'};
  if(pr<70)return{k:'consolidation',label:'Consolidation',col:'#7FC9C4'};
  return{k:'polissage',label:'Polissage',col:'#9FC93C'};}
function phaseChip(p){const ph=piecePhase(p);if(!ph)return '';return `<span class="tag" style="padding:2px 9px;font-size:11px;color:${ph.col};border-color:${ph.col}44;">${ph.label}</span>`;}

/* ---------- Sections & mesures (V3 étape 2) ---------- */
const SEC_STATUS=[{k:'new',label:'Déchiffrage',col:'#D2694A'},{k:'wip',label:'Travail',col:'#7FC9C4'},{k:'poli',label:'Polissage',col:'#9FC93C'},{k:'ok',label:'Au point',col:'var(--acc)'}];
function secStatusInfo(k){return SEC_STATUS.find(s=>s.k===k)||SEC_STATUS[0];}
function secList(p){return (p&&p.sections)||[];}
function sortSections(p){if(p.sections)p.sections.sort((a,b)=>(a.from|0)-(b.from|0));}
function hasDerivedProgress(p){return !!(p&&p.bars&&secList(p).length);}
// Rang par mesure (1..bars) : le meilleur statut connu si des sections se chevauchent. -1 = non couverte.
function sectionRankArr(p){
  const bars=p.bars|0;if(!bars)return[];
  const arr=new Array(bars).fill(-1);
  secList(p).forEach(s=>{const r=SEC_STATUS.findIndex(x=>x.k===s.status);
    const from=Math.max(1,s.from|0||1),to=Math.min(bars,s.to|0||0);
    for(let i=from;i<=to;i++)if(r>arr[i-1])arr[i-1]=r;});
  return arr;
}
function barsOk(p){return sectionRankArr(p).filter(r=>r===3).length;}
function pieceProgress(p){return hasDerivedProgress(p)?Math.round(barsOk(p)/p.bars*100):(p.progress||0);}
function mapSegments(p){
  const arr=sectionRankArr(p);if(!arr.length)return[];
  const segs=[];let cur=arr[0],n=0;
  arr.forEach(r=>{if(r===cur){n++;}else{segs.push({rank:cur,count:n});cur=r;n=1;}});
  segs.push({rank:cur,count:n});
  return segs.map(s=>({count:s.count,col:s.rank===-1?null:SEC_STATUS[s.rank].col,gap:s.rank===-1}));
}
function coverageGaps(p){
  const arr=sectionRankArr(p),gaps=[];let start=null;
  arr.forEach((r,i)=>{const m=i+1;if(r===-1){if(start==null)start=m;}else if(start!=null){gaps.push({from:start,to:m-1});start=null;}});
  if(start!=null)gaps.push({from:start,to:arr.length});
  return gaps;
}
function recordHist(p){if(!hasDerivedProgress(p))return;const d=dkey(),v=barsOk(p);p.hist=p.hist||[];
  const last=p.hist[p.hist.length-1];if(last&&last.d===d)last.m=v;else p.hist.push({d,m:v});}
function secName(p,id){if(!id)return '';const s=secList(p).find(x=>x.id===id);return s?s.name:id;}
function secLastWorked(p,sec){let last=null;S.sessions.forEach(s=>{(s.entries||[]).forEach(e=>{
  if(e.piece===p.id&&e.sections&&e.sections.includes(sec.id)&&(!last||s.date>last))last=s.date;});});return last;}
function pickTodaySection(p){
  const secs=secList(p).filter(s=>s.status!=='ok');if(!secs.length)return null;
  const withDate=secs.map(s=>({s,d:secLastWorked(p,s)}));
  withDate.sort((a,b)=>{const ad=a.d||'',bd=b.d||'';if(ad!==bd)return ad<bd?-1:1;return(a.s.from|0)-(b.s.from|0);});
  return withDate[0];
}
function sectionsReminderLine(p){
  if(!p||!hasDerivedProgress(p))return '';
  const names=secList(p).filter(s=>s.status!=='ok').map(s=>s.name);
  coverageGaps(p).forEach(g=>names.push('mes. '+g.from+'–'+g.to));
  return names.length?'Pas au point : '+names.join(' · '):'';
}
function normStr(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]/g,'');}
function findDuplicate(title,composer,exceptId){const nt=normStr(title),nc=normStr(composer);if(!nt)return null;
  return S.pieces.find(p=>!p.isEnsemble&&p.id!==exceptId&&normStr(p.title)===nt&&normStr(p.composer)===nc)||null;}
function computeStreak(){const days=practiceDays();const tol=S.settings.tolerance||0;let st=0,miss=0,d=new Date();
  for(let i=0;i<800;i++){const k=dkey(d);if(days.has(k)){st++;miss=0;}else if(i>0){miss++;if(miss>tol)break;}d=addDays(d,-1);}return st;}
function bestStreak(){const set=practiceDays();const arr=[...set].sort();if(!arr.length)return 0;const tol=S.settings.tolerance||0;
  let best=0,cur=0,miss=0,d=new Date(arr[0]),end=new Date();
  while(d<=end){if(set.has(dkey(d))){cur++;miss=0;best=Math.max(best,cur);}else{miss++;if(miss>tol){cur=0;miss=0;}}d=addDays(d,1);}return best;}
function bestStreakInYear(y){const set=new Set([...practiceDays()].filter(k=>k.slice(0,4)===String(y)));
  if(!set.size)return 0;const tol=S.settings.tolerance||0;const arr=[...set].sort();
  let best=0,cur=0,miss=0,d=new Date(arr[0]),end=new Date(y,11,31),today=new Date();if(end>today)end=today;
  while(d<=end){if(set.has(dkey(d))){cur++;miss=0;best=Math.max(best,cur);}else{miss++;if(miss>tol){cur=0;miss=0;}}d=addDays(d,1);}return best;}
function weekSeconds(){let t=0;for(let i=0;i<7;i++)t+=secondsOnDay(dkey(addDays(new Date(),-i)));return t;}
function weekDays(){let n=0;for(let i=0;i<7;i++)if(secondsOnDay(dkey(addDays(new Date(),-i)))>0)n++;return n;}
function todayGoal(){return S.settings.dailyGoal||30;}
function goalsUnset(){return S.settings.weeklyTime==null||S.settings.monthly==null;}
function ensembleCompleted(e){const subs=S.pieces.filter(p=>p.parentId===e.id);return subs.length&&subs.every(s=>s.status==='mastered');}
function baseNotes(){let n=Math.round(totalSeconds()/60)+200*masteredCount();
  S.pieces.filter(p=>p.isEnsemble).forEach(e=>{if(ensembleCompleted(e))n+=500;});
  n+=(S.challenges.log||[]).reduce((a,c)=>a+(c.reward||0),0);return n;}
function notesTotal(){return baseNotes()+achievements().filter(a=>a.on).reduce((a,x)=>a+x.reward,0);}
function currentStone(){const h=totalSeconds()/3600;let cur=null;for(const s of STONES)if(h>=s.h)cur=s;return cur;}
function nextStone(){const h=totalSeconds()/3600;return STONES.find(s=>s.h>h)||null;}
function stoneCss(c){return `background:radial-gradient(circle at 32% 28%, #ffffffcc, ${c} 46%, ${shade(c,-30)} 100%);`;}
function shade(hex,p){const n=parseInt(hex.slice(1),16);let r=(n>>16)+p,g=(n>>8&255)+p,b=(n&255)+p;
  r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));
  return '#'+(1<<24|r<<16|g<<8|b).toString(16).slice(1);}

/* ---------- Base de pièces : instantané + cache Open Opus ---------- */
function allWorksOf(name){
  const emb=OPUS.worksOf(name),ep=OPUS.composerByName(name).epoch;
  const cached=(S.opusCache[name]||[]).map(w=>Object.assign({composer:name,epoch:ep},w));
  const seen={};return emb.concat(cached).filter(w=>{const k=w.title+'|'+(w.opus||'');if(seen[k])return false;seen[k]=1;return true;});
}
function appLocalSearch(q){
  const base=OPUS.localSearch(q),ql=(q||'').toLowerCase();
  Object.keys(S.opusCache||{}).forEach(name=>{const ep=OPUS.composerByName(name).epoch;
    (S.opusCache[name]||[]).forEach(w=>{if(w.title.toLowerCase().includes(ql)||name.toLowerCase().includes(ql))base.works.push(Object.assign({composer:name,epoch:ep},w));});});
  const seen={};base.works=base.works.filter(w=>{const k=w.composer+'|'+w.title+'|'+(w.opus||'');if(seen[k])return false;seen[k]=1;return true;}).slice(0,16);
  return base;
}
let _syncing=false;
function syncOpus(manual){
  if(_syncing)return;if(!manual&&S.opusSyncedAt)return;
  _syncing=true;const btn=document.getElementById('sync-btn');if(btn)btn.textContent='Synchronisation…';
  Promise.all(OPUS.COMPOSERS.map(c=>OPUS.onlineWorks(c.id,c.name,c.epoch).then(ws=>{if(ws&&ws.length)S.opusCache[c.name]=ws.map(w=>({title:w.title,opus:w.opus,genre:w.genre,key:w.key}));}).catch(()=>{})))
    .then(()=>{_syncing=false;
      const total=Object.values(S.opusCache).reduce((a,x)=>a+x.length,0);
      if(total>0)S.opusSyncedAt=Date.now();save();
      if(document.getElementById('s-rep').classList.contains('active'))renderRep();
      if(manual)toast(total>0?total+' œuvres dans la base':'Hors-ligne — réessaie connecté');});
}

/* ---------- Navigation ---------- */
const FULL = {session:1,settings:1};
function go(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('s-'+name).classList.add('active');
  document.getElementById('tabbar').style.display = FULL[name]?'none':'flex';
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.s===name));
  window.scrollTo(0,0);
  ({home:renderHome,carnet:renderCarnet,rep:renderRep,voyage:renderVoyage,stats:renderStats,settings:renderSettings}[name]||(()=>{}))();
}
let toastT;function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1900);}
function openSheet(html){
  const sheet=document.getElementById('sheet'),bg=document.getElementById('sheet-bg');
  sheet.style.transition='';sheet.style.animation='';sheet.style.transform='';
  bg.style.transition='';bg.style.background='';
  sheet.innerHTML='<div class="handle"></div>'+html;
  bg.classList.add('show');
}
let _recUrls=[];
function closeSheet(){document.getElementById('sheet-bg').classList.remove('show');_recUrls.forEach(u=>{try{URL.revokeObjectURL(u);}catch(e){}});_recUrls=[];}
document.getElementById('sheet-bg').addEventListener('click',e=>{if(e.target.id==='sheet-bg')closeSheet();});

/* ---------- Fermeture de la feuille au glisser (poignée) ---------- */
let _sheetDrag=null;
document.getElementById('sheet-bg').addEventListener('pointerdown',e=>{
  const handle=e.target.closest('.handle');
  if(!handle)return;
  const sheet=document.getElementById('sheet');
  _sheetDrag={startY:e.clientY,y:0,h:sheet.getBoundingClientRect().height,pid:e.pointerId,t:Date.now(),vy:0};
  sheet.style.animation='none';sheet.style.transition='none';
  try{handle.setPointerCapture(e.pointerId);}catch(err){}
});
document.getElementById('sheet-bg').addEventListener('pointermove',e=>{
  if(!_sheetDrag||e.pointerId!==_sheetDrag.pid)return;
  const now=Date.now(),dt=Math.max(1,now-_sheetDrag.t),y=Math.max(0,e.clientY-_sheetDrag.startY);
  _sheetDrag.vy=(y-_sheetDrag.y)/dt; // px/ms, geste rapide vers le bas si positif
  _sheetDrag.y=y;_sheetDrag.t=now;
  document.getElementById('sheet').style.transform='translateY('+y+'px)';
  document.getElementById('sheet-bg').style.background='rgba(0,0,0,'+Math.max(0.08,0.5*(1-y/_sheetDrag.h)).toFixed(3)+')';
});
function endSheetDrag(e){
  if(!_sheetDrag||(e&&e.pointerId!==_sheetDrag.pid))return;
  const sheet=document.getElementById('sheet'),bg=document.getElementById('sheet-bg'),drag=_sheetDrag;_sheetDrag=null;
  sheet.style.transition='transform .2s ease';bg.style.transition='background .2s ease';
  const closing=drag.y>Math.min(120,drag.h*0.28)||(drag.y>24&&drag.vy>0.5);
  if(closing){
    sheet.style.transform='translateY(100%)';bg.style.background='rgba(0,0,0,0)';
    setTimeout(closeSheet,180);
  }else{
    sheet.style.transform='';bg.style.background='';
  }
}
document.getElementById('sheet-bg').addEventListener('pointerup',endSheetDrag);
document.getElementById('sheet-bg').addEventListener('pointercancel',endSheetDrag);

/* ==========================================================================
   ACCUEIL
   ========================================================================== */
function renderHome(){
  const st=currentStone(),streak=computeStreak(),goal=todayGoal();
  const done=secondsOnDay(dkey())/60, pct=goal>0?done/goal:0;
  const q=QUOTES[new Date().getDate()%QUOTES.length];
  const circ=528, off=circ*(1-Math.min(pct,1));
  const ringCol=pct>=1?'var(--gold)':'var(--acc)';
  const todos=S.pieces.filter(p=>p.todo&&p.todo.trim());
  document.getElementById('s-home').innerHTML=`
    <div class="between">
      <div class="row" style="gap:10px;">
        <span class="eyebrow" style="margin:0;">${cap(frDate(new Date()))}</span>
      </div>
      <button class="icbtn" onclick="go('settings')" aria-label="Réglages">
        <svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="3.2"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2l-.3-2.6h-4l-.3 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.3 2.6h4l.3-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6A7 7 0 0 0 19 12Z"/></svg>
      </button>
    </div>
    ${st?`<div class="tag" style="margin-top:6px;background:var(--surface);">${noteIcon(st.c,17,rankGlyph(st))}<span style="color:var(--gold);">${st.n}</span><span class="muted">· ${Math.floor(totalSeconds()/3600)} h</span></div>`:`<div class="tag" style="margin-top:6px;">Début du voyage</div>`}
    <h1 style="margin-top:12px;">Bonjour Florian</h1>
    <p class="serif" style="font-style:italic;color:var(--t2);font-size:16px;margin:6px 0 2px;">« ${q[0]} » — ${q[1]}</p>

    <div class="grid2" style="margin-top:18px;">
      <div class="metric"><div class="row" style="gap:8px;align-items:flex-end;"><span class="flame" style="display:flex;">${flameSvg(23)}</span><span class="v" style="line-height:.82;">${streak}</span></div><div class="l">${streak===1?'jour de série':'jours de série'}</div></div>
      <div class="metric"><div class="v" style="color:var(--acc);">${notesTotal().toLocaleString('fr-FR')} ♪</div><div class="l">notes accumulées</div></div>
    </div>

    <div class="card hi" style="margin-top:14px;">
      <div class="between"><span class="muted" style="font-size:14px;">Objectif du jour</span>
        <button class="btn ghost sm" onclick="goalSheet()">Modifier</button></div>
      <div class="ring-wrap" style="margin-top:8px;">
        <div class="ring">
          <svg width="184" height="184" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="84" fill="none" stroke="var(--surface2)" stroke-width="13"/>
            <circle cx="100" cy="100" r="84" fill="none" stroke="${ringCol}" stroke-width="13" stroke-linecap="round"
              stroke-dasharray="${circ}" stroke-dashoffset="${off}" transform="rotate(-90 100 100)" style="transition:stroke-dashoffset .6s ease;"/>
          </svg>
          <div class="c"><b>${minLabel(done)}</b><span>/ ${goalLabel(goal)}</span></div>
        </div>
      </div>
    </div>

    <button class="btn primary" style="margin-top:18px;font-size:16px;padding:16px;" onclick="startSheet()">
      ${playSvg()} Démarrer une séance</button>
    <div class="grid2" style="margin-top:10px;"><button class="btn ghost" onclick="planSheet()">Plan guidé</button><button class="btn ghost" onclick="concertSheet()">Simulation</button></div>

    ${homeAlertsHtml()}

    ${todos.length?`<div class="card" style="margin-top:14px;padding:16px;">
      <div class="tag acc" style="margin-bottom:12px;">À faire</div>
      <div id="home-todos">${todoLines(todos.slice(0,3))}</div>
      ${todos.length>3?`<button class="btn ghost sm" style="width:100%;margin-top:6px;" onclick="showAllTodos(this)">Voir les ${todos.length} œuvres</button>`:''}</div>`:''}

    ${recentPieces(4).length?`<h2>Reprendre</h2><div class="chips">${recentPieces(4).map(id=>`<button class="chip" onclick="quickStart('${id}')">${esc(pieceName(id))}</button>`).join('')}</div>`:''}

    <h2>Cette semaine</h2>
    <div class="grid2">
      <div class="metric"><div class="v">${dur(weekSeconds())}</div><div class="l">temps joué</div></div>
      <div class="metric"><div class="v">${weekDays()}/7</div><div class="l">jours actifs</div></div>
    </div>
    ${revisionList().length?`<div class="between" style="margin-top:22px;margin-bottom:10px;"><h2 style="margin:0;">À entretenir</h2><button class="btn ghost sm" onclick="startRevision()">Réviser</button></div><div class="card" style="padding:14px 16px;">
      <p class="muted" style="font-size:13px;margin:0 0 8px;">Maîtrisés, mais pas rejoués depuis un moment :</p>
      ${revisionList().slice(0,3).map(p=>`<div class="between" style="padding:8px 0;"><div style="min-width:0;"><div style="font-weight:600;font-size:14px;">${esc(p.title)}</div><div class="muted" style="font-size:12px;">${esc(p.composer||'')}</div></div><button class="btn ghost sm" onclick="quickStart('${p.id}')">Jouer</button></div>`).join('')}</div>`:''}`;
}
function homeAlerts(){
  const items=[];
  if(reportReady())items.push({label:'Rapport de la semaine prêt',action:"reportSheet()",cta:'Voir'});
  if(monthReportReady())items.push({label:'Rapport du mois prêt',action:"monthReportSheet()",cta:'Voir'});
  if(backupDue())items.push({label:'Pense à sauvegarder tes données',action:"exportJSON()",cta:'Exporter',gold:true});
  if(goalsUnset())items.push({label:"Objectif hebdo ou mensuel non défini",action:"go('settings')",cta:'Régler'});
  return items;
}
function homeAlertsHtml(){
  const al=homeAlerts();if(!al.length)return '';
  return `<div class="card" style="margin-top:14px;padding:2px 14px;">
    ${al.map((a,i)=>`<div class="between" style="padding:11px 0;${i<al.length-1?'border-bottom:1px solid rgba(255,255,255,.05);':''}cursor:pointer;" onclick="${a.action}"><span style="font-size:13px;">${a.label}</span><span style="color:${a.gold?'var(--gold)':'var(--acc)'};font-size:13px;">${a.cta} ›</span></div>`).join('')}
  </div>`;
}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
function flameSvg(sz){sz=sz||24;return '<svg viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'" fill="currentColor" style="display:block;"><path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 1.5 2S12 9 12 7s0-3 0-5Z"/></svg>';}
function playSvg(){return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';}

function goalSheet(){
  openSheet(`<h3>Objectif du jour</h3>
    <p class="muted" style="font-size:14px;margin-top:-6px;">Une durée pour aujourd'hui — tu peux la dépasser.</p>
    <div class="stepper" style="margin:22px 0;">
      <button onclick="gStep(-5)">–</button><div class="v"><span id="gv">${todayGoal()}</span> <span style="font-size:16px;color:var(--t2);">min</span></div>
      <button onclick="gStep(5)">+</button></div>
    <button class="btn primary" onclick="saveGoal()">Valider</button>`);
}
function gStep(n){const e=document.getElementById('gv');e.textContent=Math.max(5,parseInt(e.textContent)+n);}
function saveGoal(){S.settings.dailyGoal=parseInt(document.getElementById('gv').textContent);save();closeSheet();renderHome();toast('Objectif : '+S.settings.dailyGoal+' min');}

/* ==========================================================================
   SÉANCE
   ========================================================================== */
let timer=null,tickInt=null,_mode='chrono',_min=25,_piece=null,_interval=false;
let _wakeLock=null;
async function acquireWakeLock(){try{_wakeLock=await navigator.wakeLock.request('screen');}catch(e){}}
function releaseWakeLock(){try{_wakeLock&&_wakeLock.release();}catch(e){}_wakeLock=null;}
function toggleInterval(el){_interval=!_interval;el.classList.toggle('on');}
function activePieces(){return S.pieces.filter(p=>!p.isEnsemble&&(p.status==='active'||p.status==='mastered'));}
function chipLabel(p){return p.parentId?((pieceById(p.parentId)||{}).title?pieceById(p.parentId).title+' — '+p.title:p.title):p.title;}
function pieceChips(sel,fn,exclude){
  return activePieces().filter(p=>!exclude||!exclude.has(p.id)).map(p=>`<button class="chip ${p.id===sel?'on':''}" onclick="${fn}('${p.id}',this)">${esc(chipLabel(p))}</button>`).join('')
    +`<button class="chip ${sel===IMPROV?'on':''}" onclick="${fn}('${IMPROV}',this)">Improvisation</button>`;
}
function recentPieces(n){const seen=new Set(),out=[];
  for(let i=S.sessions.length-1;i>=0&&out.length<n;i--){const bl=S.sessions[i].blocks;
    for(let j=bl.length-1;j>=0;j--){const pid=bl[j].piece;if(pid===IMPROV||seen.has(pid))continue;const p=pieceById(pid);if(!p||p.status==='archived'||p.status==='abandoned')continue;seen.add(pid);out.push(pid);if(out.length>=n)break;}}
  return out;}
function pieceLastPlayed(id){let d='';S.sessions.forEach(s=>{if(s.date>d&&s.blocks.some(b=>b.piece===id))d=s.date;});return d;}
function sessPreview(s){if(s.entries&&s.entries.length){const e=s.entries.find(x=>x.worked||x.next);return e?(e.worked||e.next):'';}return s.worked||'';}
function filterStartPieces(q){q=(q||'').toLowerCase();const box=document.getElementById('sc');if(!box)return;
  let list=activePieces().filter(p=>!q||p.title.toLowerCase().includes(q)||(p.composer||'').toLowerCase().includes(q));
  if(!q){const rec=new Set(recentPieces(4));list=list.filter(p=>!rec.has(p.id));}
  box.innerHTML=list.map(p=>`<button class="chip ${p.id===_piece?'on':''}" onclick="pickPiece('${p.id}',this)">${esc(chipLabel(p))}</button>`).join('')
    +`<button class="chip ${_piece===IMPROV?'on':''}" onclick="pickPiece('${IMPROV}',this)">Improvisation</button>`;}
function quickStart(id){_mode='chrono';_min=25;_piece=id;_interval=false;beginSession();}
function todoLines(list){return list.map(p=>`<div style="display:flex;gap:9px;margin-bottom:10px;"><span style="color:var(--acc);font-size:16px;line-height:1.4;">♫</span><div style="min-width:0;"><div style="font-weight:600;font-size:14px;">${esc(p.title)}</div><div class="muted" style="font-size:13px;line-height:1.4;">${esc(p.todo)}</div></div></div>`).join('');}
function showAllTodos(btn){const b=document.getElementById('home-todos');if(b)b.innerHTML=todoLines(S.pieces.filter(p=>p.todo&&p.todo.trim()));if(btn)btn.style.display='none';}
function startSheet(){
  _mode='chrono';_min=25;_piece=recentPieces(1)[0]||null;_interval=false;
  openSheet(`<h3>Nouvelle séance</h3>
    <div class="field"><label>Mode</label>
      <div class="seg" id="ms"><button class="on" onclick="pickMode('chrono',this)">Chrono ↑</button><button onclick="pickMode('minuteur',this)">Minuteur ↓</button></div></div>
    <div class="field"><div class="between"><span>Pratique fractionnée (25/5)</span><div class="toggle" id="iv-tog" onclick="toggleInterval(this)"></div></div>
      <p class="muted" style="font-size:12px;margin-top:6px;">Blocs de 25 min entrecoupés de pauses « repose tes mains ».</p></div>
    <div class="field" id="mf" style="display:none;"><label>Durée visée</label>
      <div class="stepper" style="margin:4px 0;"><button onclick="mStep(-5)">–</button><div class="v" id="mv">25 min</div><button onclick="mStep(5)">+</button></div></div>
    <div class="field"><label>Premier morceau</label>
      ${recentPieces(4).length?`<div class="muted" style="font-size:12px;margin-bottom:6px;">Récents</div><div class="chips" id="sc-rec" style="margin-bottom:10px;">${recentPieces(4).map(id=>`<button class="chip ${id===_piece?'on':''}" onclick="pickPiece('${id}',this)">${esc(chipLabel(pieceById(id)))}</button>`).join('')}</div>`:''}
      <input id="sc-q" placeholder="Rechercher dans ton répertoire…" oninput="filterStartPieces(this.value)" autocomplete="off" style="margin-bottom:10px;">
      <div class="chips" id="sc">${pieceChips(_piece,'pickPiece',new Set(recentPieces(4)))}</div>
      <div id="sc-hint"></div>
      ${activePieces().length?'':'<p class="muted" style="font-size:13px;margin-top:8px;">Ajoute des morceaux au répertoire, ou joue en improvisation.</p>'}</div>
    <button class="btn primary" onclick="beginSession()">Commencer</button>
    <button class="btn ghost sm" style="width:100%;margin-top:10px;" onclick="aposterioriSheet()">Ajouter plutôt une séance oubliée</button>`);
}
function pickMode(m,el){_mode=m;document.querySelectorAll('#ms button').forEach(b=>b.classList.remove('on'));el.classList.add('on');document.getElementById('mf').style.display=m==='minuteur'?'block':'none';}
function mStep(n){_min=Math.max(5,_min+n);document.getElementById('mv').textContent=fmtMinLong(_min);}
function pickPiece(id,el){_piece=id;document.querySelectorAll('#sheet .chip').forEach(c=>c.classList.remove('on'));if(el)el.classList.add('on');
  const hint=document.getElementById('sc-hint');if(hint){const p=id!==IMPROV?pieceById(id):null;hint.innerHTML=p&&p.todo?`<div class="card" style="margin-top:10px;padding:12px 14px;border-left:2px solid var(--acc);border-radius:0 12px 12px 0;"><span class="muted" style="font-size:12px;">À faire</span><div style="font-size:14px;margin-top:3px;">${esc(p.todo)}</div></div>`:'';}}
function beginSession(){
  if(!_piece){toast('Choisis un morceau');return;}
  timer={mode:_mode,target:_min*60,total:0,running:true,last:Date.now(),blocks:[{piece:_piece,sec:0}],goal:todayGoal(),interval:_interval?{work:1500,brk:300,phase:'work',phaseSec:0}:null};
  closeSheet();go('session');renderSession();startTick();acquireWakeLock();
}
function startTick(){clearInterval(tickInt);tickInt=setInterval(tick,300);tick();}
function tick(){
  if(!timer)return;
  if(timer.running){
    const now=Date.now(),dt=(now-timer.last)/1000;timer.last=now;const iv=timer.interval;
    if(iv&&iv.phase==='break'){iv.phaseSec+=dt;if(iv.phaseSec>=iv.brk){iv.phase='work';iv.phaseSec=0;buzz();toast('Reprise');}}
    else{
      timer.total+=dt;timer.blocks[timer.blocks.length-1].sec+=dt;
      if(iv){iv.phaseSec+=dt;if(iv.phaseSec>=iv.work){iv.phase='break';iv.phaseSec=0;buzz();toast('Pause · repose tes mains');}}
      if(timer.mode==='minuteur'&&timer.total>=timer.target){timer.total=timer.target;timer.running=false;buzz();toast('Minuteur terminé ✓');}
      if(timer.plan){const cb=timer.plan[timer.planIdx];
        if(timer.blocks[timer.blocks.length-1].sec>=cb.min*60){
          if(timer.planIdx<timer.plan.length-1){timer.planIdx++;const nb=timer.plan[timer.planIdx];timer.blocks.push({piece:nb.piece||IMPROV,sec:0});buzz();toast('Étape : '+nb.focus);}
          else{timer.running=false;buzz();toast('Plan terminé ✓');}
        }
      }
    }
  }
  paintSession();
}
function renderSession(){
  document.getElementById('s-session').innerHTML=`
    <div class="between" style="margin-bottom:12px;">
      <div class="tag acc" id="ss-piece"><span style="width:7px;height:7px;border-radius:50%;background:var(--acc);"></span> —</div>
      <button class="btn ghost sm" onclick="quickCarnet()">Carnet</button>
    </div>
    <div id="ss-todo" style="margin-bottom:14px;"></div>
    <div style="text-align:center;padding:30px 0 10px;">
      <div class="num" id="ss-time" style="font-size:64px;font-weight:600;letter-spacing:.01em;">0′ 00″</div>
      <div class="muted" id="ss-mode" style="margin-top:8px;">chrono</div>
    </div>
    <div class="row" style="justify-content:center;gap:16px;margin-top:14px;">
      <button id="ss-pause" onclick="togglePause()" style="width:76px;height:76px;border-radius:50%;background:var(--acc);color:#191A1B;font-size:28px;">❚❚</button>
      <button onclick="stopSession()" style="width:76px;height:76px;border-radius:50%;border:1px solid var(--border);font-size:24px;">■</button>
      ${recAvailable()?`<button id="ss-rec" onclick="toggleRecording()" style="width:76px;height:76px;border-radius:50%;border:1px solid var(--border);font-size:22px;">●</button>`:''}
    </div>
    <p class="muted" id="ss-pausehint" style="text-align:center;font-size:13px;margin-top:18px;display:none;">En pause, tu peux changer de morceau pour la reprise.</p>
    <h2>Répartition de la séance</h2>
    <div id="ss-blocks"></div>`;
  paintSession();
}
function paintSession(){
  if(!timer)return;
  const cur=timer.blocks[timer.blocks.length-1].piece;
  const disp=timer.mode==='minuteur'?Math.max(0,timer.target-timer.total):timer.total;
  const t=document.getElementById('ss-time');if(t)t.textContent=big(disp);
  const pe=document.getElementById('ss-piece');if(pe)pe.innerHTML=`<span style="width:7px;height:7px;border-radius:50%;background:var(--acc);"></span> ${esc(pieceName(cur))}`;
  const md=document.getElementById('ss-mode');if(md)md.textContent=timer.mode==='minuteur'?('Minuteur · '+Math.round(timer.target/60)+' min'):'Chrono';
  const td=document.getElementById('ss-todo');
  if(td){
    if(timer.plan){const cb=timer.plan[timer.planIdx];td.innerHTML=`<div class="card" style="padding:12px 14px;border-left:2px solid var(--gold);border-radius:0 12px 12px 0;"><span class="muted" style="font-size:12px;">Plan · étape ${timer.planIdx+1}/${timer.plan.length} · ${esc(cb.focus)}</span><div style="font-size:14px;margin-top:3px;">${esc(cb.consigne)}</div></div>`;}
    else{const p=cur!==IMPROV?pieceById(cur):null;const secLine=p?sectionsReminderLine(p):'';
      td.innerHTML=(p&&p.todo)?`<div class="card" style="padding:12px 14px;border-left:2px solid var(--acc);border-radius:0 12px 12px 0;"><span class="muted" style="font-size:12px;">Rappel · à faire</span><div style="font-size:14px;margin-top:3px;">${esc(p.todo)}</div>${secLine?`<div class="muted" style="font-size:12px;margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,.06);">${esc(secLine)}</div>`:''}</div>`
        :secLine?`<div class="card" style="padding:12px 14px;border-left:2px solid var(--acc);border-radius:0 12px 12px 0;"><span class="muted" style="font-size:12px;">${esc(secLine)}</span></div>`:'';}
  }
  if(timer.plan&&md)md.textContent='Plan guidé';
  const iv=timer.interval;if(iv&&iv.phase==='break'){if(t)t.textContent=big(Math.max(0,iv.brk-iv.phaseSec));if(md)md.textContent='Pause · repose tes mains';}
  const pb=document.getElementById('ss-pause');if(pb){pb.textContent=timer.running?'❚❚':'▶';}
  const ph=document.getElementById('ss-pausehint');if(ph)ph.style.display=timer.running?'none':'block';
  const rb=document.getElementById('ss-rec');if(rb){rb.textContent=_rec?'■':'●';rb.style.color=_rec?'#F0857A':'';rb.style.borderColor=_rec?'#F0857A':'';}
  const agg={};timer.blocks.forEach(b=>agg[b.piece]=(agg[b.piece]||0)+b.sec);
  const el=document.getElementById('ss-blocks');
  if(el)el.innerHTML=Object.keys(agg).map(id=>`<div class="item"><div class="title" style="${id===IMPROV?'font-style:italic;color:var(--tc);':''}">${esc(pieceName(id))}</div><div class="r num">${big(agg[id])}</div></div>`).join('')||'<p class="empty">—</p>';
}
function togglePause(){
  if(!timer)return;
  if(timer.running){timer.running=false;paintSession();pauseSheet();}
  else{timer.running=true;timer.last=Date.now();paintSession();}
}
function pauseSheet(){
  const cur=timer.blocks[timer.blocks.length-1].piece;
  openSheet(`<h3>Pause</h3><p class="muted" style="font-size:14px;margin-top:-6px;">Reprends sur le même morceau ou change.</p>
    <div class="chips" style="margin:16px 0;">${pieceChips(cur,'resumeWith')}</div>
    <button class="btn ghost" onclick="closeSheet()">Rester en pause</button>`);
}
function resumeWith(id){const last=timer.blocks[timer.blocks.length-1];
  if(id!==last.piece){if(last.sec<1)last.piece=id;else timer.blocks.push({piece:id,sec:0});}
  timer.running=true;timer.last=Date.now();closeSheet();paintSession();}
function stopSession(){
  if(_rec){toast("Arrête d'abord l'enregistrement en cours");return;}
  timer.running=false;clearInterval(tickInt);const total=Math.round(timer.total);
  if(total<5){if(!confirm('Séance très courte. L\'enregistrer quand même ?')){timer=null;releaseWakeLock();go('home');return;}}
  carnetSheet(total);}
function quickCarnet(){toast('Le carnet se remplit en fin de séance');}
function carnetSheet(total){
  const seen={},pieces=[];timer.blocks.forEach(b=>{if(!seen[b.piece]){seen[b.piece]=1;pieces.push(b.piece);}});
  _carnetPieces=pieces;_mastery={};
  openSheet(`<h3>Carnet de pratique</h3><p class="muted" style="font-size:14px;margin-top:-6px;">${dur(total)} de jeu. Note morceau par morceau.</p>
    ${pieces.map((pid,i)=>{const p=pid!==IMPROV?pieceById(pid):null;const todo=p&&p.todo?esc(p.todo):'';
      if(p&&p.status==='mastered')_mastery[i]='mastered';
      return `<div class="card" style="margin-bottom:12px;padding:15px 16px;">
        <div style="font-weight:600;margin-bottom:12px;${pid===IMPROV?'font-style:italic;color:var(--tc);':''}">${esc(pieceName(pid))}</div>
        <div class="field" style="margin-bottom:10px;"><div class="between"><label>Ce que j'ai travaillé</label>${todo?`<button type="button" class="btn ghost sm" style="padding:2px 10px;height:auto;" onclick="copyTodoToWorked(${i})">Copier l'à faire</button>`:''}</div><textarea id="cw-${i}" placeholder="Main gauche mes. 12–20, tempo lent…"></textarea></div>
        <div class="field" style="margin-bottom:0;"><label>À faire la prochaine fois</label><textarea id="cn-${i}" placeholder="Accélérer, revoir la pédale…">${todo}</textarea></div>
        ${p&&p.status==='mastered'?`<div class="field" style="margin-top:10px;margin-bottom:0;"><label>Cette pièce maîtrisée</label>
          <div class="seg" id="cm-${i}"><button class="on" onclick="pickMastery(${i},'mastered',this)">Toujours maîtrisée</button><button onclick="pickMastery(${i},'active',this)">À retravailler</button></div></div>`:''}
        ${carnetSecBlock(i,p)}
      </div>`;}).join('')}
    <div class="field"><label>Ressenti global</label><div class="dyn" id="c-f">${FEEL_ORDER.map(f=>`<button data-f="${f}" onclick="pickFeel('${f}',this)">${f}</button>`).join('')}</div>
      <div class="muted" id="c-fl" style="font-size:13px;margin-top:7px;text-align:center;">—</div></div>
    <div class="field" style="margin-top:4px;">
      <button type="button" class="btn ghost sm" id="c-mood-btn" style="width:100%;" onclick="toggleMoodEnergy()">Humeur &amp; énergie (facultatif) ⌄</button>
      <div id="c-mood-body" style="display:none;margin-top:12px;">
        ${dynScale('Humeur',(S.journal[dkey()]||{}).mood,'mood')}${dynScale('Énergie',(S.journal[dkey()]||{}).energy,'energy')}
      </div>
    </div>
    <button class="btn primary" onclick="commitSession(${total})">Enregistrer la séance</button>`);
  _feel='';
}
function carnetSecBlock(i,p){
  if(!p||!hasDerivedProgress(p))return '';
  return `<div class="field" style="margin:12px 0 0;">
    <button type="button" class="btn ghost sm" id="csec-btn-${i}" style="width:100%;" onclick="toggleCarnetSec(${i})">Sections travaillées (facultatif) ⌄</button>
    <div id="csec-body-${i}" style="display:none;margin-top:12px;">
      <div class="chips" id="csec-chips-${i}" style="margin-bottom:10px;">
        ${secList(p).map(s=>`<button type="button" class="chip" data-sid="${s.id}" style="padding:7px 12px;font-size:13px;" onclick="toggleCarnetChip(${i},'${p.id}','${s.id}',this)">${esc(s.name)}</button>`).join('')}</div>
      ${secList(p).map(s=>carnetSecRow(i,p,s,false)).join('')}
      <div class="muted" style="font-size:11px;margin-top:2px;line-height:1.45;">Le bouton fait passer la section à l'étape suivante. Laisse le tempo vide si tu n'as rien mesuré.</div>
    </div></div>`;
}
function carnetSecRow(i,p,s,visible){
  const info=secStatusInfo(s.status),order=['new','wip','poli','ok'];
  const nextK=order[Math.min(order.length-1,order.indexOf(s.status)+1)],nextInfo=secStatusInfo(nextK);
  const lastBpm=(s.bpm||[])[(s.bpm||[]).length-1];
  return `<div class="between" id="csec-row-${i}-${s.id}" style="background:var(--surface2);border-radius:11px;padding:11px 12px;margin-bottom:7px;display:${visible?'flex':'none'};">
    <div style="flex:1;min-width:0;">
      <div class="between" style="margin-bottom:9px;">
        <span style="font-size:13px;font-weight:600;">${esc(s.name)}</span>
        <span class="tag" style="padding:3px 9px;font-size:11px;color:${info.col};background:none;">${info.label}</span></div>
      <div class="row" style="gap:8px;">
        ${s.status!=='ok'?`<button type="button" class="btn ghost sm" id="csec-adv-${i}-${s.id}" style="flex:1;font-size:12px;padding:7px 8px;" onclick="advanceCarnetSec(${i},'${p.id}','${s.id}')">${nextK==='ok'?'Au point ✓':nextInfo.label+' →'}</button>`:'<span class="muted" style="flex:1;font-size:12px;">Déjà au point</span>'}
        <span class="muted num" style="font-size:12px;">${lastBpm?lastBpm.v+' →':''}</span>
        <input class="num" id="cbpm-${i}-${s.id}" inputmode="numeric" placeholder="bpm" style="width:70px;flex:0 0 auto;padding:7px 8px;text-align:center;">
      </div></div></div>`;
}
function advanceCarnetSec(i,pid,sid){
  const p=pieceById(pid);const s=p&&secList(p).find(x=>x.id===sid);if(!s)return;
  const order=['new','wip','poli','ok'];s.status=order[Math.min(order.length-1,order.indexOf(s.status)+1)];
  recordHist(p);save();
  const row=document.getElementById('csec-row-'+i+'-'+sid);if(row)row.outerHTML=carnetSecRow(i,p,s,true);
}
function toggleCarnetChip(i,pid,sid,el){
  el.classList.toggle('on');
  const row=document.getElementById('csec-row-'+i+'-'+sid);if(row)row.style.display=el.classList.contains('on')?'flex':'none';
}
function toggleCarnetSec(i){
  const b=document.getElementById('csec-body-'+i),btn=document.getElementById('csec-btn-'+i);if(!b)return;
  const open=b.style.display!=='none';b.style.display=open?'none':'block';
  if(btn)btn.textContent=open?'Sections travaillées (facultatif) ⌄':'Sections travaillées (facultatif) ⌃';
}
function toggleMoodEnergy(){const b=document.getElementById('c-mood-body'),btn=document.getElementById('c-mood-btn');if(!b)return;
  const open=b.style.display!=='none';b.style.display=open?'none':'block';if(btn)btn.textContent=open?'Humeur & énergie (facultatif) ⌄':'Humeur & énergie (facultatif) ⌃';}
function copyTodoToWorked(i){const cn=document.getElementById('cn-'+i),cw=document.getElementById('cw-'+i);if(!cn||!cw)return;cw.value=cw.value?cw.value+'\n'+cn.value:cn.value;}
function pickMastery(i,val,el){_mastery[i]=val;const seg=document.getElementById('cm-'+i);if(seg)seg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===el));}
let _feel='',_carnetPieces=[],_mastery={};
function pickFeel(f,el){_feel=f;const idx=FEEL_ORDER.indexOf(f);document.querySelectorAll('#c-f button').forEach((b,i)=>b.classList.toggle('on',i<=idx));document.getElementById('c-fl').textContent=FEEL[f];}
function commitSession(total){
  const blocks=timer.blocks.filter(b=>b.sec>=1).map(b=>({piece:b.piece,sec:Math.round(b.sec)}));
  if(!blocks.length)blocks.push({piece:timer.blocks[0].piece,sec:total});
  const before=currentStone();
  const val=id=>{const e=document.getElementById(id);return e?e.value.trim():'';};
  const entries=_carnetPieces.map((pid,i)=>{
    const p=pid!==IMPROV?pieceById(pid):null;
    const sections=(p&&hasDerivedProgress(p))?[...document.querySelectorAll('#csec-chips-'+i+' .chip.on')].map(el=>el.dataset.sid):[];
    return {piece:pid,worked:val('cw-'+i),next:val('cn-'+i),sections};
  });
  entries.forEach((e,i)=>{if(e.piece===IMPROV)return;const p=pieceById(e.piece);if(!p)return;
    (e.sections||[]).forEach(sid=>{const s=secList(p).find(x=>x.id===sid);if(!s)return;
      const v=parseInt(val('cbpm-'+i+'-'+sid));if(v){s.bpm=s.bpm||[];const d=dkey();const last=s.bpm[s.bpm.length-1];
        if(last&&last.d===d)last.v=v;else s.bpm.push({d,v});}});
    if(e.worked||e.next){p.notes=p.notes||[];p.notes.push({id:uid(),date:dkey(),section:e.sections&&e.sections.length===1?e.sections[0]:'',text:(e.worked||'')+(e.next?((e.worked?' · ':'')+'À faire : '+e.next):'')});}
    p.todo=e.next||'';
    if(hasDerivedProgress(p))recordHist(p);
    if(_mastery[i]==='active'&&p.status==='mastered'){p.status='active';p.masteredAt=null;p.revInterval=S.settings.revisionDays||18;}
    else if(_mastery[i]==='mastered'&&p.status==='mastered'){p.revInterval=Math.min(120,Math.round((p.revInterval||S.settings.revisionDays||18)*1.6));}});
  S.sessions.push({id:uid(),date:dkey(),mode:timer.mode,goal:timer.goal,feeling:_feel,blocks,entries,ts:Date.now(),interval:!!timer.interval});
  save();checkChallenges();timer=null;releaseWakeLock();closeSheet();
  const after=currentStone();
  go('home');
  if(after&&(!before||after.n!==before.n))setTimeout(()=>celebrate('Nouveau rang',after.n),300);
  else toast('Séance enregistrée · '+dur(total));
}
function buzz(){try{navigator.vibrate&&navigator.vibrate([50,40,50]);}catch(e){}}

/* ---------- Enregistrement audio (étape 4 V3) ---------- */
let _rec=null,_recDraft=null;
function recAvailable(){return typeof MediaRecorder!=='undefined'&&!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);}
function recMime(){
  if(typeof MediaRecorder==='undefined')return '';
  const cands=['audio/mp4','audio/aac','audio/webm;codecs=opus','audio/webm','audio/ogg'];
  for(const m of cands){try{if(MediaRecorder.isTypeSupported(m))return m;}catch(e){}}
  return '';
}
async function toggleRecording(){
  if(!timer)return;
  if(_rec){stopRecording();return;}
  if(!recAvailable()){toast('Enregistrement audio indisponible sur cet appareil');return;}
  const cur=timer.blocks[timer.blocks.length-1].piece;
  if(cur===IMPROV){toast('Choisis un morceau pour enregistrer');return;}
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}
  catch(e){toast('Micro indisponible ou refusé');return;}
  const mime=recMime();
  let mr;
  try{mr=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);}
  catch(e){toast('Enregistrement impossible sur cet appareil');stream.getTracks().forEach(t=>t.stop());return;}
  const chunks=[];
  mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  mr.onstop=()=>{
    stream.getTracks().forEach(t=>t.stop());
    const startTs=_rec.startTs,pieceId=_rec.pieceId;
    const blob=new Blob(chunks,{type:mr.mimeType||mime||'audio/webm'});
    _rec=null;paintSession();
    finishRecording(pieceId,blob,Math.max(1,Math.round((Date.now()-startTs)/1000)));
  };
  _rec={mr,pieceId:cur,startTs:Date.now()};
  mr.start();
  paintSession();
}
function stopRecording(){if(_rec&&_rec.mr&&_rec.mr.state!=='inactive')_rec.mr.stop();}
function finishRecording(pieceId,blob,durSec){
  const p=pieceById(pieceId);
  _recDraft={pieceId,blob,durSec,section:'',feel:''};
  const secs=p?secList(p):[];
  openSheet(`<h3>Enregistrement</h3>
    <p class="muted" style="font-size:13px;margin-top:-6px;">${dur(durSec)} · ${esc(p?p.title:'')}</p>
    ${secs.length?`<div class="field"><label>Section (optionnel)</label><div class="chips" id="rec-secs">${secs.map(s=>`<button type="button" class="chip" onclick="pickRecSec('${s.id}',this)">${esc(s.name)}</button>`).join('')}</div></div>`:''}
    <div class="field"><label>Ressenti à l'écoute (optionnel)</label><div class="dyn" id="rec-f">${FEEL_ORDER.map(f=>`<button data-f="${f}" onclick="pickRecFeel('${f}',this)">${f}</button>`).join('')}</div>
      <div class="muted" id="rec-fl" style="font-size:13px;margin-top:7px;text-align:center;">—</div></div>
    <button class="btn primary" onclick="saveRecording()">Enregistrer</button>
    <button class="btn ghost sm" style="width:100%;margin-top:10px;" onclick="discardRecording()">Ne pas garder</button>`);
}
function pickRecSec(id,el){const was=_recDraft.section===id;_recDraft.section=was?'':id;
  document.querySelectorAll('#rec-secs .chip').forEach(b=>b.classList.toggle('on',!was&&b===el));}
function pickRecFeel(f,el){_recDraft.feel=f;const idx=FEEL_ORDER.indexOf(f);document.querySelectorAll('#rec-f button').forEach((b,i)=>b.classList.toggle('on',i<=idx));document.getElementById('rec-fl').textContent=FEEL[f];}
async function saveRecording(){
  if(!_recDraft)return;
  const {pieceId,blob,durSec,section,feel}=_recDraft;
  const p=pieceById(pieceId);
  if(!p){closeSheet();_recDraft=null;return;}
  const id=uid();
  const ok=await idbPutBlob(id,blob);
  if(!ok){toast("Impossible d'enregistrer l'audio");closeSheet();_recDraft=null;return;}
  p.recordings=p.recordings||[];
  const sec=section?secList(p).find(s=>s.id===section):null;
  const bpm=sec&&sec.bpm&&sec.bpm.length?sec.bpm[sec.bpm.length-1].v:null;
  p.recordings.push({id,date:dkey(),dur:durSec,section,bpm,feel,size:blob.size,mime:blob.type});
  save();closeSheet();_recDraft=null;toast('Enregistrement ajouté');
}
function discardRecording(){_recDraft=null;closeSheet();}
function fmtBytes(n){if(!n)return '';if(n<1024*1024)return Math.round(n/1024)+' Ko';return (n/1024/1024).toFixed(1)+' Mo';}
function renderRecordings(p){
  const recs=[...(p.recordings||[])].reverse();
  if(!recs.length)return '<div class="empty" style="padding:14px;">Aucun enregistrement.</div>';
  return recs.map(r=>{
    const label=[r.section?secName(p,r.section):'',frShort(r.date),r.bpm?r.bpm+' bpm':''].filter(Boolean).join(' · ');
    return `<div class="card" style="padding:12px 14px;margin-bottom:10px;">
      <div class="between" style="align-items:flex-start;">
        <div style="min-width:0;">
          <div style="font-size:13px;font-weight:600;">${esc(label||frShort(r.date))}</div>
          <div class="muted" style="font-size:11px;margin-top:2px;">${dur(r.dur)} · ${fmtBytes(r.size)}${r.feel?' · '+esc(feelLabel(r.feel)):''}</div>
        </div>
        <button class="btn ghost sm" style="flex:0 0 auto;color:#F0857A;border-color:#5a2f2b;" onclick="deleteRecording('${p.id}','${r.id}')">Suppr.</button>
      </div>
      <div id="rec-pl-${r.id}" style="margin-top:10px;">
        <button class="btn ghost sm" style="width:100%;" onclick="playRecording('${r.id}')">${playSvg()} Écouter</button>
      </div>
    </div>`;
  }).join('');
}
async function playRecording(rid){
  const box=document.getElementById('rec-pl-'+rid);if(!box)return;
  box.innerHTML='<span class="muted" style="font-size:12px;">Chargement…</span>';
  const blob=await idbGetBlob(rid);
  if(!blob){box.innerHTML='<span class="muted" style="font-size:12px;">Audio introuvable.</span>';return;}
  const url=URL.createObjectURL(blob);_recUrls.push(url);
  box.innerHTML=`<audio controls autoplay style="width:100%;" src="${url}"></audio>`;
}
function deleteRecording(pid,rid){
  if(!confirm('Supprimer cet enregistrement ?'))return;
  const p=pieceById(pid);if(!p)return;
  p.recordings=(p.recordings||[]).filter(r=>r.id!==rid);
  save();idbDelBlob(rid);pieceDetail(pid);
}

/* ---------- Séance a posteriori (ajout / édition) ---------- */
function isRichSession(s){return s.blocks.length>1||!!(s.entries&&s.entries.length);}
function richRecap(s){
  const names=[...new Set(s.blocks.map(b=>pieceName(b.piece)))].join(' · ');
  const prev=sessPreview(s);
  return `<div style="font-weight:600;font-size:14px;">${esc(names)}</div>${prev?`<div class="muted" style="font-size:13px;margin-top:4px;">${esc(prev)}</div>`:''}`;
}
function aposterioriSheet(sess){
  const edit=!!sess;const s=sess||{date:dkey(),blocks:[{piece:activePieces()[0]?activePieces()[0].id:IMPROV,sec:1500}],worked:'',next:'',feeling:'',mode:'chrono'};
  const rich=edit&&isRichSession(s);
  const minutes=Math.round(sessionSeconds(s)/60)||25;
  const pid=s.blocks[0].piece;
  openSheet(`<h3>${edit?'Modifier la séance':'Séance oubliée'}</h3>
    <div class="field"><label>Date</label><input type="date" id="a-date" value="${s.date}" max="${dkey()}"></div>
    <div class="field"><label>Durée (minutes)</label><input type="number" id="a-min" inputmode="numeric" value="${minutes}" min="1"></div>
    ${rich?`<div class="field"><label>Morceaux</label><div class="card" style="padding:12px 14px;">${richRecap(s)}</div></div>`
      :`<div class="field"><label>Morceau</label><div class="chips" id="a-sc">${pieceChips(pid,'aPick')}</div></div>
    <div class="field"><label>Ce que j'ai travaillé</label><textarea id="a-w">${esc(s.worked||'')}</textarea></div>
    <div class="field"><label>À faire la prochaine fois</label><textarea id="a-n">${esc(s.next||'')}</textarea></div>`}
    <button class="btn primary" onclick="saveApost('${edit?s.id:''}')">${edit?'Enregistrer':'Ajouter la séance'}</button>
    ${edit?`<button class="btn ghost sm" style="width:100%;margin-top:10px;color:#F0857A;border-color:#5a2f2b;" onclick="deleteSession('${s.id}')">Supprimer la séance</button>`:''}`);
  _apick=pid;
}
let _apick=null;
function aPick(id,el){_apick=id;document.querySelectorAll('#a-sc .chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');}
function saveApost(id){
  const date=document.getElementById('a-date').value||dkey();
  const min=Math.max(1,parseInt(document.getElementById('a-min').value)||25);
  if(id){
    const s=S.sessions.find(x=>x.id===id);
    if(isRichSession(s)){
      const totalSec=min*60,oldTotal=s.blocks.reduce((a,b)=>a+b.sec,0)||1;
      s.blocks=s.blocks.map(b=>({...b,sec:Math.max(1,Math.round(b.sec/oldTotal*totalSec))}));
      s.date=date;
    }else{
      Object.assign(s,{date,blocks:[{piece:_apick,sec:min*60}],worked:document.getElementById('a-w').value.trim(),next:document.getElementById('a-n').value.trim()});
    }
  }else{
    const data={date,blocks:[{piece:_apick,sec:min*60}],worked:document.getElementById('a-w').value.trim(),next:document.getElementById('a-n').value.trim()};
    S.sessions.push(Object.assign({id:uid(),mode:'chrono',goal:todayGoal(),feeling:'',ts:Date.now()},data));
  }
  save();closeSheet();renderCarnet();toast('Séance enregistrée');
}
function deleteSession(id){if(!confirm('Supprimer cette séance ?'))return;S.sessions=S.sessions.filter(s=>s.id!==id);save();closeSheet();renderCarnet();toast('Séance supprimée');}

/* ==========================================================================
   CARNET
   ========================================================================== */
function renderCarnet(){
  document.getElementById('s-carnet').innerHTML=`
    <h1>Carnet</h1><p class="eyebrow">Mon journal de travail.</p>
    <div id="carnet-body"></div>`;
  renderCarnetBody();
}
function renderCarnetBody(){
  const el=document.getElementById('carnet-body');
  if(!el)return;
  const list=[...S.sessions].reverse();
  el.innerHTML=`<button class="btn ghost sm" style="width:100%;margin:16px 0 14px;" onclick="aposterioriSheet()">+ Ajouter une séance oubliée</button>`+
    (list.length?list.slice(0,60).map(s=>{
      const names=[...new Set(s.blocks.map(b=>pieceName(b.piece)))].join(' · ');
      return `<div class="item" onclick='aposterioriSheet(${JSON.stringify(s).replace(/'/g,"&#39;")})'>
        <div style="min-width:0;"><div class="title">${esc(names)}</div>
        <div class="meta">${frShort(s.date)} · ${dur(sessionSeconds(s))}${s.feeling?' · '+esc(feelLabel(s.feeling)):''}${sessPreview(s)?' · '+esc(sessPreview(s).slice(0,32)):''}</div></div>
        <div class="r muted">›</div></div>`;
    }).join(''):'<div class="empty">Aucune séance.<br>Lance-toi, ou ajoute une séance oubliée.</div>');
}
function dynScale(label,val,field){const idx=FEEL_ORDER.indexOf(val);
  return `<div style="margin-bottom:12px;"><div class="sub" style="margin-bottom:6px;"><span>${label}</span><span>${val?esc(feelLabel(val)):'—'}</span></div>
    <div class="dyn">${FEEL_ORDER.map((f,i)=>`<button class="${val&&i<=idx?'on':''}" onclick="setJournal('${field}','${f}')">${f}</button>`).join('')}</div></div>`;
}
function setJournal(field,v){const k=dkey();S.journal[k]=S.journal[k]||{mood:'',energy:''};S.journal[k][field]=v;save();
  const mb=document.getElementById('c-mood-body');
  if(mb){const j=S.journal[k];mb.innerHTML=dynScale('Humeur',j.mood,'mood')+dynScale('Énergie',j.energy,'energy');}
  else renderCarnetBody();}
let _noteSecId='';
function noteSheet(pid){_noteSecId='';const p=pieceById(pid),secs=p?secList(p):[];
  openSheet(`<h3>Nouvelle note</h3>
  ${secs.length?`<div class="field"><label>Section (optionnel)</label><div class="chips" id="n-secs">${secs.map(s=>`<button type="button" class="chip" onclick="pickNoteSec('${s.id}',this)">${esc(s.name)}</button>`).join('')}</div></div>`
    :`<div class="field"><label>Mesures / section (optionnel)</label><input id="n-s" placeholder="mes. 12–20, lecture, par cœur…"></div>`}
  <div class="field"><label>Note</label><textarea id="n-t" placeholder="Le legato tient mieux, main droite plus fluide…"></textarea></div>
  <button class="btn primary" onclick="saveNote('${pid}')">Ajouter</button>`);}
function pickNoteSec(id,el){const was=_noteSecId===id;_noteSecId=was?'':id;
  document.querySelectorAll('#n-secs .chip').forEach(b=>b.classList.toggle('on',!was&&b===el));}
function saveNote(pid){const t=document.getElementById('n-t').value.trim();if(!t){toast('Écris une note');return;}
  const p=pieceById(pid);p.notes=p.notes||[];
  const sEl=document.getElementById('n-s'),sec=sEl?sEl.value.trim():_noteSecId;
  p.notes.push({id:uid(),date:dkey(),section:sec,text:t});save();refreshScreen();pieceDetail(pid);toast('Note ajoutée');}
function wishSheet(){_worksCache=[];
  const comps=OPUS.ALL.map(c=>`<option value="${c.name}"></option>`).join('');
  openSheet(`<h3>À apprendre un jour</h3>
    <div class="field"><label>Compositeur</label><input id="p-c" list="dl-comp" placeholder="Liszt" oninput="onComposerInput(this.value)" autocomplete="off"><datalist id="dl-comp">${comps}</datalist></div>
    <div class="field"><label>Titre / œuvre</label><input id="p-t" list="dl-works" placeholder="La Campanella" autocomplete="off"><datalist id="dl-works"></datalist>
      <div class="muted" style="font-size:12px;margin-top:6px;">Choisis un compositeur pré-chargé pour l'autocomplétion.</div></div>
    <button class="btn primary" onclick="saveWish()">Ajouter à la wishlist</button>`);}
function saveWish(){const t=document.getElementById('p-t').value.trim();if(!t){toast('Donne un titre');return;}
  const composer=document.getElementById('p-c').value.trim();
  const dup=findDuplicate(t,composer);if(dup){closeSheet();toast('Ce morceau est déjà dans ta liste');pieceDetail(dup.id);return;}
  S.pieces.push({id:uid(),title:t,composer,epoch:(document.getElementById('p-e')||{}).value||'',status:'wishlist',diff:0,progress:0,tags:[],notes:[],todo:'',createdAt:Date.now()});
  save();closeSheet();refreshScreen();toast('Ajouté à « à apprendre »');}
function startLearning(id){const p=pieceById(id);if(!p)return;p.status='active';if(p.createdAt==null)p.createdAt=Date.now();save();closeSheet();refreshScreen();toast('Direction le répertoire · en cours');}

/* ==========================================================================
   RÉPERTOIRE
   ========================================================================== */
let repFilter='active',_ensOpen={},repSort='composer',repGroup=true,_grpOpen={},
    repF={composer:'',epoch:'',genre:'',tag:'',diffMin:1,diffMax:9,notPlayed:0};
const SORT_LABELS={composer:'compositeur',title:'titre',recent:'dernière fois',diff:'difficulté',time:'temps joué',added:'ajout'};
function activeFilterCount(){let n=0;if(repF.composer)n++;if(repF.epoch)n++;if(repF.genre)n++;if(repF.tag)n++;if(repF.diffMin>1||repF.diffMax<9)n++;if(repF.notPlayed>0)n++;return n;}
function distinctVals(key){const s=new Set();S.pieces.forEach(p=>{if(!p.isEnsemble&&p[key])s.add(p[key]);});return [...s].sort((a,b)=>a.localeCompare(b));}
function distinctTags(){const s=new Set();S.pieces.forEach(p=>(p.tags||[]).forEach(t=>s.add(t)));return [...s].sort((a,b)=>a.localeCompare(b));}
function renderRep(){
  document.getElementById('s-rep').innerHTML=`
    <div class="between"><h1>Répertoire</h1><div class="row" style="gap:8px;"><button class="btn ghost sm" onclick="workSheet()">+ Œuvre</button><button class="btn primary sm" onclick="addPieceSheet()">+ Ajouter</button></div></div>
    <div class="field" style="margin-top:16px;position:relative;">
      <input id="rep-q" placeholder="Compositeur ou œuvre…" oninput="repSearch(this.value)" autocomplete="off">
      <div id="rep-sug"></div></div>
    <div class="row" style="gap:10px;margin:-2px 0 12px;align-items:center;justify-content:center;">
      <button id="sync-btn" class="btn ghost sm" style="flex:0 0 auto;" onclick="syncOpus(true)">↻ Enrichir la base</button>
      <span class="muted" style="font-size:11px;">${Object.values(S.opusCache||{}).reduce((a,x)=>a+x.length,0)?Object.values(S.opusCache).reduce((a,x)=>a+x.length,0)+' œuvres':'hors-ligne'}</span>
    </div>
    <div class="seg" style="margin:6px 0 10px;">
      <button class="${repFilter==='wishlist'?'on':''}" onclick="setRep('wishlist')" style="font-size:12px;">Apprendre</button>
      <button class="${repFilter==='active'?'on':''}" onclick="setRep('active')" style="font-size:12px;">En cours</button>
      <button class="${repFilter==='mastered'?'on':''}" onclick="setRep('mastered')" style="font-size:12px;">Maîtrisés</button>
      <button class="${repFilter==='archived'?'on':''}" onclick="setRep('archived')" style="font-size:12px;">Archivés</button>
    </div>
    <div class="row" style="gap:8px;margin-bottom:12px;">
      <button class="btn ghost sm" style="flex:1;" onclick="repSortSheet()">Trier : ${SORT_LABELS[repSort]}</button>
      <button class="btn ghost sm" style="flex:1;${activeFilterCount()?'color:var(--acc);border-color:var(--acc);':''}" onclick="repFilterSheet()">Filtres${activeFilterCount()?' · '+activeFilterCount():''}</button>
    </div>
    <div id="rep-list"></div>`;
  renderRepList();
  if(!S.opusSyncedAt&&typeof navigator!=='undefined'&&navigator.onLine!==false)syncOpus(false);
}
function setRep(f){repFilter=f;renderRep();}
function passFilter(p){
  if(repF.composer&&(p.composer||'')!==repF.composer)return false;
  if(repF.epoch&&(p.epoch||'')!==repF.epoch)return false;
  if(repF.genre&&(p.genre||'')!==repF.genre)return false;
  if(repF.tag&&!((p.tags||[]).includes(repF.tag)))return false;
  const df=p.diff||0;if(df&&(df<repF.diffMin||df>repF.diffMax))return false;
  if(repF.notPlayed>0){const lp=pieceLastPlayed(p.id);const days=lp?Math.floor((Date.now()-new Date(lp+'T00:00'))/86400000):99999;if(days<repF.notPlayed)return false;}
  return true;
}
function renderRepList(){
  const el=document.getElementById('rep-list');
  const match=p=>repFilter==='wishlist'?p.status==='wishlist':repFilter==='active'?p.status==='active':repFilter==='mastered'?p.status==='mastered':(p.status==='archived'||p.status==='abandoned');
  const sorters={
    composer:(a,b)=>(a.composer||'~').localeCompare(b.composer||'~')||a.title.localeCompare(b.title),
    title:(a,b)=>a.title.localeCompare(b.title),
    recent:(a,b)=>(pieceLastPlayed(b.id)||'').localeCompare(pieceLastPlayed(a.id)||''),
    diff:(a,b)=>(b.diff||0)-(a.diff||0),
    time:(a,b)=>pieceSeconds(b.id)-pieceSeconds(a.id),
    added:(a,b)=>(b.createdAt||0)-(a.createdAt||0),
  };
  const items=S.pieces.filter(p=>!p.isEnsemble&&!p.parentId&&match(p)&&passFilter(p)).sort(sorters[repSort]||sorters.composer);
  let html='';
  S.pieces.filter(p=>p.isEnsemble).forEach(e=>{
    const subs=S.pieces.filter(p=>p.parentId===e.id);if(!subs.some(match))return;
    const done=subs.filter(s=>s.status==='mastered').length;const open=_ensOpen[e.id];
    html+=`<div class="item" style="flex-direction:column;align-items:stretch;">
      <div class="row" onclick="toggleEns('${e.id}')" style="cursor:pointer;">
        <svg viewBox="0 0 24 24" class="ic" style="width:20px;height:20px;color:var(--t2);"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.4"/><circle cx="16.5" cy="16" r="2.4"/></svg>
        <div><div class="title">${esc(e.title)}</div><div class="meta">${esc(e.composer||'')} · ${done}/${subs.length} maîtrisés</div></div>
        <div class="r muted" style="transform:rotate(${open?90:0}deg);transition:.2s;">›</div></div>
      ${open?'<div style="margin-top:10px;padding-left:8px;border-left:1px solid var(--surface2);">'+subs.map(s=>repRow(s,true)).join('')+'</div>':''}</div>`;
  });
  if(repGroup&&repSort==='composer'){
    const groups={};items.forEach(p=>{const k=p.composer||'—';(groups[k]=groups[k]||[]).push(p);});
    Object.keys(groups).sort((a,b)=>a.localeCompare(b)).forEach(k=>{
      const open=_grpOpen[k]!==false;
      html+=`<div class="between" style="margin:16px 2px 8px;cursor:pointer;" onclick="toggleGrp('${encodeURIComponent(k)}')">
        <span style="font-weight:600;font-size:14px;">${esc(k)}</span><span class="muted" style="font-size:12px;">${groups[k].length} ${open?'▾':'▸'}</span></div>`;
      if(open)html+=groups[k].map(p=>repRow(p,false)).join('');
    });
  } else {
    html+=items.map(p=>repRow(p,false)).join('');
  }
  const addWishBtn=repFilter==='wishlist'?'<button class="btn ghost sm" style="width:100%;margin-bottom:12px;" onclick="wishSheet()">+ Ajouter un morceau à apprendre</button>':'';
  el.innerHTML=addWishBtn+(html||'<div class="empty">Aucun morceau ne correspond.<br>'+(repFilter==='wishlist'?'Rien pour l\'instant.':'Ajuste les filtres, ou ajoute une œuvre.')+'</div>');
}
function toggleGrp(k){k=decodeURIComponent(k);_grpOpen[k]=_grpOpen[k]===false?true:false;renderRepList();}
function repSortSheet(){
  openSheet(`<h3>Trier le répertoire</h3>
    ${Object.keys(SORT_LABELS).map(k=>`<div class="item" onclick="setSort('${k}')"><div class="title" style="font-size:14px;">Par ${SORT_LABELS[k]}</div><div class="r">${repSort===k?'<span style="color:var(--acc);">✓</span>':''}</div></div>`).join('')}
    <div class="between" style="margin-top:10px;padding:12px 4px;"><span>Regrouper par compositeur</span><div class="toggle ${repGroup?'on':''}" onclick="toggleGroup(this)"></div></div>`);
}
function setSort(k){repSort=k;save();closeSheet();renderRep();}
function toggleGroup(el){repGroup=!repGroup;el.classList.toggle('on');}
function repFilterSheet(){
  const sel=(id,val,opts)=>`<select id="${id}"><option value="">Tous</option>${opts.map(o=>`<option value="${esc(o)}" ${val===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
  openSheet(`<h3>Filtrer</h3>
    <div class="field"><label>Compositeur</label>${sel('f-comp',repF.composer,distinctVals('composer'))}</div>
    <div class="field"><label>Époque</label>${sel('f-epoch',repF.epoch,distinctVals('epoch'))}</div>
    <div class="field"><label>Genre</label>${sel('f-genre',repF.genre,distinctVals('genre'))}</div>
    <div class="field"><label>Tag</label>${sel('f-tag',repF.tag,distinctTags())}</div>
    <div class="grid2"><div class="field"><label>Difficulté min</label><input id="f-dmin" type="number" min="1" max="9" value="${repF.diffMin}"></div>
      <div class="field"><label>Difficulté max</label><input id="f-dmax" type="number" min="1" max="9" value="${repF.diffMax}"></div></div>
    <div class="field"><label>Pas joué depuis (jours) — 0 = ignorer</label><input id="f-np" type="number" min="0" value="${repF.notPlayed}"></div>
    <button class="btn primary" onclick="applyFilters()">Appliquer</button>
    <button class="btn ghost sm" style="width:100%;margin-top:10px;" onclick="resetFilters()">Réinitialiser</button>`);
}
function applyFilters(){const v=id=>document.getElementById(id).value;
  repF.composer=v('f-comp');repF.epoch=v('f-epoch');repF.genre=v('f-genre');repF.tag=v('f-tag');
  repF.diffMin=Math.max(1,parseInt(v('f-dmin'))||1);repF.diffMax=Math.min(9,parseInt(v('f-dmax'))||9);repF.notPlayed=Math.max(0,parseInt(v('f-np'))||0);
  closeSheet();renderRep();}
function resetFilters(){repF={composer:'',epoch:'',genre:'',tag:'',diffMin:1,diffMax:9,notPlayed:0};closeSheet();renderRep();}
function repRow(p,sub){
  const meta=[p.composer,p.diff?('Henle '+p.diff):'',pieceSeconds(p.id)?dur(pieceSeconds(p.id))+' joués':''].filter(Boolean).join(' · ');
  const tags=(p.tags||[]).length?`<div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap;">${p.tags.map(t=>`<span class="tag" style="padding:2px 8px;font-size:11px;">${esc(t)}</span>`).join('')}</div>`:'';
  return `<div class="item" style="${sub?'margin-bottom:8px;background:var(--surface2);':''}" onclick="pieceDetail('${p.id}')">
    <div style="min-width:0;"><div class="title">${esc(p.title)}</div><div class="meta">${esc(meta)}</div>${tags}</div>
    <div class="r">${phaseChip(p)}<span class="muted">›</span></div></div>`;
}
function toggleEns(id){_ensOpen[id]=!_ensOpen[id];renderRepList();}
let _searchTO,_sugList=[];
function repSearch(q){clearTimeout(_searchTO);const box=document.getElementById('rep-sug');
  if(!q.trim()){box.innerHTML='';_sugList=[];return;}
  buildSug(appLocalSearch(q));
  _searchTO=setTimeout(()=>{
    OPUS.onlineComposer(q).then(comps=>{
      if(comps&&comps.length){const c=comps[0];
        OPUS.onlineWorks(c.id,c.name,c.epoch).then(works=>{if(works&&works.length)buildSug({composers:comps,works:works.slice(0,14)});}).catch(()=>{});}
    }).catch(()=>{});
  },350);
}
function buildSug(res){
  const items=[];
  res.composers.slice(0,3).forEach(c=>items.push({type:'compositeur',label:c.full||c.name,sub:c.epoch,data:{composer:c.name,epoch:c.epoch}}));
  res.works.forEach(w=>items.push({type:'œuvre',label:w.title+(w.opus?' '+w.opus:''),sub:w.composer,data:w}));
  _sugList=items.slice(0,10);
  const box=document.getElementById('rep-sug');if(!box)return;
  if(!_sugList.length){box.innerHTML='<div class="empty" style="padding:16px;">Aucun résultat</div>';return;}
  box.innerHTML='<div class="card" style="margin-top:8px;padding:6px;">'+_sugList.map((it,i)=>
    `<div class="row" style="padding:10px;border-radius:10px;" onclick="addSug(${i})">
      <span class="tag" style="padding:3px 9px;">${it.type}</span>
      <div style="min-width:0;"><div class="title" style="font-size:14px;">${esc(it.label)}</div><div class="meta">${esc(it.sub||'')}</div></div>
      <div class="r muted">+</div></div>`).join('')+'</div>';
}
function addSug(i){const it=_sugList[i];if(!it)return;const w=it.data;
  const qi=document.getElementById('rep-q');if(qi)qi.value='';const sb=document.getElementById('rep-sug');if(sb)sb.innerHTML='';_sugList=[];
  if(it.type==='compositeur'){pieceSheet(null,{composer:w.composer,epoch:w.epoch});return;}
  const p={id:uid(),title:w.title,composer:w.composer||'',epoch:w.epoch||'',opus:w.opus||'',genre:w.genre||'',key:w.key||'',diff:w.diff||0,status:'active',bpm:'',notes:[],createdAt:Date.now()};
  S.pieces.push(p);save();renderRepList();toast('Ajouté au répertoire');pieceSheet(p.id);
}
function addPieceSheet(){pieceSheet(null);}
function pieceSheet(id,prefill){
  const isNew=!id;const p=id?pieceById(id):Object.assign({title:'',composer:'',epoch:'',opus:'',genre:'',key:'',diff:0,bpm:'',status:'active'},prefill||{});
  _pstatus=p.status==='mastered'?'mastered':'active';_pdiff=p.diff||0;_worksCache=[];_pprog=p.progress!=null?p.progress:(p.status==='mastered'?100:0);
  const comps=OPUS.ALL.map(c=>`<option value="${c.name}"></option>`).join('');
  openSheet(`<h3>${isNew?'Nouveau morceau':esc(p.title)||'Morceau'}</h3>
    <div class="field"><label>Compositeur</label><input id="p-c" list="dl-comp" value="${esc(p.composer)}" placeholder="Chopin" oninput="onComposerInput(this.value)" autocomplete="off"><datalist id="dl-comp">${comps}</datalist></div>
    <div class="field"><label>Titre / œuvre</label><input id="p-t" list="dl-works" value="${esc(p.title)}" placeholder="Nocturne op. 9 no 2" oninput="onTitleInput(this.value)" autocomplete="off"><datalist id="dl-works"></datalist>
      <div class="muted" style="font-size:12px;margin-top:6px;">Un compositeur pré-chargé complète l'opus, le genre, la tonalité et la difficulté.</div></div>
    <div class="field"><label>Difficulté · Henle 1–9</label><div class="row" id="p-diff" style="gap:5px;">${[1,2,3,4,5,6,7,8,9].map(i=>`<button onclick="setDiff(${i})" data-i="${i}" style="flex:1;height:22px;border-radius:5px;background:${i<=_pdiff?'var(--acc)':'var(--surface2)'};"></button>`).join('')}</div>
      <div class="muted" id="p-diffl" style="font-size:13px;margin-top:6px;">${_pdiff?'Niveau '+_pdiff:'Non défini'}</div></div>
    <button type="button" class="btn ghost sm" id="p-more-btn" style="width:100%;margin:4px 0 2px;" onclick="togglePMore()">${isNew?'Détails (facultatif) ⌄':'Masquer les détails ⌃'}</button>
    <div id="p-more" style="display:${isNew?'none':'block'};">
      <div class="grid2"><div class="field"><label>Époque</label><input id="p-e" value="${esc(p.epoch)}" placeholder="Romantique"></div>
        <div class="field"><label>Opus</label><input id="p-o" value="${esc(p.opus)}" placeholder="op. 9 no 2"></div></div>
      <div class="grid2"><div class="field"><label>Genre</label><input id="p-g" value="${esc(p.genre)}" placeholder="Nocturne"></div>
        <div class="field"><label>Tonalité</label><input id="p-k" value="${esc(p.key)}" placeholder="Mi♭ majeur"></div></div>
      <div class="grid2"><div class="field"><label>Tempo cible (bpm)</label><input id="p-b" inputmode="numeric" value="${esc(p.bpm)}" placeholder="92"></div>
        <div class="field"><label>Mesures totales</label><input id="p-bars" inputmode="numeric" value="${p.bars||''}" placeholder="57"></div></div>
      <div class="field"><label>Tags (séparés par des virgules)</label><input id="p-tags" value="${esc((p.tags||[]).join(', '))}" placeholder="concert, par cœur, déchiffrage"></div>
      ${hasDerivedProgress(p)?`<div class="field"><label>Avancement</label><div class="muted" style="font-size:13px;">Calculé automatiquement à partir des sections (${pieceProgress(p)} %). Modifiable depuis la fiche.</div></div>`
        :`<div class="field"><label>Avancement · <span id="p-progl">${_pprog}</span> %</label><input id="p-prog" type="range" min="0" max="100" step="5" value="${_pprog}" oninput="document.getElementById('p-progl').textContent=this.value"></div>`}
      <div class="field"><label>Statut</label><div class="seg" id="p-st"><button class="${_pstatus==='active'?'on':''}" onclick="setPStatus('active',this)">En cours</button><button class="${_pstatus==='mastered'?'on':''}" onclick="setPStatus('mastered',this)">Maîtrisé</button></div></div>
    </div>
    <button class="btn primary" style="margin-top:6px;" onclick="savePiece('${isNew?'':p.id}')">${isNew?'Ajouter':'Enregistrer'}</button>
    ${isNew?'':`<div class="grid2" style="margin-top:10px;"><button class="btn ghost sm" style="width:100%;" onclick="setPieceStatus('${p.id}','archived')">Archiver</button><button class="btn ghost sm" style="width:100%;color:#F0857A;border-color:#5a2f2b;" onclick="setPieceStatus('${p.id}','abandoned')">Abandonner</button></div>`}
    ${isNew?'':`<div class="card" style="margin-top:14px;padding:12px 14px;"><div class="muted" style="font-size:12px;">Maturité</div>
      <div style="font-size:13px;margin-top:4px;">Ajouté ${p.createdAt?'le '+new Date(p.createdAt).toLocaleDateString('fr-FR'):'—'}${p.masteredAt?' · maîtrisé le '+new Date(p.masteredAt).toLocaleDateString('fr-FR'):''}</div>
      ${estimateText(p)?`<div style="font-size:13px;margin-top:4px;color:var(--acc);">${estimateText(p)}</div>`:''}</div>`}`);
  onComposerInput(p.composer);
}
let _pstatus='active',_pdiff=0,_worksCache=[],_pprog=0;
function setDiff(i){_pdiff=i;paintDiff();}
function paintDiff(){document.querySelectorAll('#p-diff button').forEach(b=>b.style.background=parseInt(b.dataset.i)<=_pdiff?'var(--acc)':'var(--surface2)');const l=document.getElementById('p-diffl');if(l)l.textContent=_pdiff?'Niveau '+_pdiff:'Non défini';}
function setIfEmpty(idv,v){const e=document.getElementById(idv);if(e&&v&&!e.value)e.value=v;}
function setIfAny(idv,v){const e=document.getElementById(idv);if(e&&v)e.value=v;}
function fillWorksDatalist(){const d=document.getElementById('dl-works');if(d)d.innerHTML=_worksCache.map(w=>`<option value="${esc(w.title+(w.opus?' '+w.opus:''))}"></option>`).join('');}
function fetchWorks(id,name,epoch,local){OPUS.onlineWorks(id,name,epoch).then(ws=>{if(ws&&ws.length){const seen={};_worksCache=(local||[]).concat(ws).filter(w=>{const k=w.title+(w.opus||'');if(seen[k])return false;seen[k]=1;return true;});fillWorksDatalist();}}).catch(()=>{});}
function onComposerInput(name){
  if(!document.getElementById('dl-works'))return;
  const local=allWorksOf(name);_worksCache=local.slice();fillWorksDatalist();
  const anyc=OPUS.composerByName(name);if(anyc&&anyc.epoch)setIfEmpty('p-e',anyc.epoch);
  const comp=OPUS.COMPOSERS.find(c=>c.name.toLowerCase()===(name||'').toLowerCase());
  if(comp){fetchWorks(comp.id,comp.name,comp.epoch,local);}
  else if(name&&name.length>2){OPUS.onlineComposer(name).then(cs=>{if(cs&&cs[0]){if(cs[0].epoch)setIfEmpty('p-e',cs[0].epoch);fetchWorks(cs[0].id,cs[0].name,cs[0].epoch,local);}}).catch(()=>{});}
}
function onTitleInput(val){
  const w=(_worksCache||[]).find(x=>(x.title+(x.opus?' '+x.opus:''))===val||x.title===val);
  if(!w)return;
  setIfAny('p-o',w.opus);setIfAny('p-g',w.genre);setIfAny('p-k',w.key);setIfAny('p-e',w.epoch);
  if(w.diff){_pdiff=w.diff;paintDiff();}
}
function setPStatus(s,el){_pstatus=s;document.querySelectorAll('#p-st button').forEach(b=>b.classList.remove('on'));el.classList.add('on');}
function savePiece(id){const title=document.getElementById('p-t').value.trim();if(!title){toast('Donne un titre');return;}
  const data={title,composer:document.getElementById('p-c').value.trim(),epoch:document.getElementById('p-e').value.trim(),
    opus:document.getElementById('p-o').value.trim(),genre:document.getElementById('p-g').value.trim(),key:document.getElementById('p-k').value.trim(),
    bpm:document.getElementById('p-b').value.trim(),diff:_pdiff,status:_pstatus,
    bars:parseInt(document.getElementById('p-bars').value)||0,
    tags:(document.getElementById('p-tags').value||'').split(',').map(t=>t.trim()).filter(Boolean)};
  const progEl=document.getElementById('p-prog');if(progEl)data.progress=parseInt(progEl.value)||0;
  let newlyMastered=false;
  if(id){const p=pieceById(id);const was=p.status==='mastered';Object.assign(p,data);
    if(p.status==='mastered'){if(!p.masteredAt)p.masteredAt=Date.now();if(!was)newlyMastered=true;}}
  else{
    const dup=findDuplicate(data.title,data.composer);
    if(dup){if(confirm('« '+dup.title+' » est déjà dans ton répertoire. Ouvrir sa fiche ?')){closeSheet();pieceDetail(dup.id);return;}}
    const np=Object.assign({id:uid(),notes:[],createdAt:Date.now()},data);if(np.status==='mastered')np.masteredAt=Date.now();S.pieces.push(np);}
  save();closeSheet();renderRep();
  if(newlyMastered)celebrate('Morceau maîtrisé !',title);else toast('Enregistré');}
function togglePMore(){const m=document.getElementById('p-more'),b=document.getElementById('p-more-btn');if(!m)return;
  const open=m.style.display!=='none';m.style.display=open?'none':'block';if(b)b.textContent=open?'Détails (facultatif) ⌄':'Masquer les détails ⌃';}
function setPieceStatus(id,st){pieceById(id).status=st;save();closeSheet();renderRep();toast(st==='archived'?'Archivé':'Abandonné');}
function refreshScreen(){const a=document.querySelector('.screen.active');if(!a)return;const n=a.id.replace('s-','');
  ({home:renderHome,carnet:renderCarnet,rep:renderRep,voyage:renderVoyage,stats:renderStats,settings:renderSettings}[n]||(()=>{}))();}

/* ---------- Fiche morceau unifiée ---------- */
function pieceDetail(id){const p=pieceById(id);if(!p)return;
  if(_detailPid!==id)_secOpen=null;
  _detailPid=id;
  const ph=piecePhase(p),played=pieceSeconds(p.id),lp=pieceLastPlayed(p.id),nSess=pieceSessionCount(p.id);
  const meta=[p.composer,p.epoch,p.opus].filter(Boolean).join(' · ');
  const stat=(v,l)=>`<div class="metric" style="padding:12px;"><div class="v" style="font-size:20px;">${v}</div><div class="l">${l}</div></div>`;
  const isWish=p.status==='wishlist',closed=p.status==='archived'||p.status==='abandoned';
  const notes=(p.notes||[]).length?'<div class="tl" style="margin-top:6px;">'+[...p.notes].reverse().slice(0,12).map(n=>`<div class="n"><div class="between"><span class="muted" style="font-size:12px;">${frShort(n.date)}</span>${n.section?`<span class="tag" style="padding:3px 9px;">${esc(secName(p,n.section))}</span>`:''}</div><div style="margin-top:5px;line-height:1.5;color:var(--tc);">${esc(n.text)}</div></div>`).join('')+'</div>':'<div class="empty" style="padding:14px;">Aucune note pour l\'instant.</div>';
  openSheet(`<div class="between" style="align-items:flex-start;">
      <div style="min-width:0;"><h3 style="margin:0;">${esc(p.title)}</h3>${meta?`<div class="muted" style="font-size:13px;margin-top:3px;">${esc(meta)}</div>`:''}</div>
      ${phaseChip(p)}</div>
    <div class="row" style="gap:7px;margin:12px 0;flex-wrap:wrap;">
      ${p.diff?`<span class="tag">Henle ${p.diff}</span>`:''}
      ${p.key?`<span class="tag">${esc(p.key)}</span>`:''}
      ${p.genre?`<span class="tag">${esc(p.genre)}</span>`:''}
      ${p.bars?`<span class="tag">${p.bars} mesures</span>`:''}
      ${(p.tags||[]).map(t=>`<span class="tag" style="padding:2px 8px;">${esc(t)}</span>`).join('')}</div>
    <div class="grid2" style="gap:8px;margin-bottom:6px;">${stat(played?dur(played):'—','temps joué')}${stat(nSess||'—','séances')}</div>
    <div class="metric" style="padding:12px;margin-bottom:12px;"><div class="v" style="font-size:16px;">${lp?frShort(lp):'jamais'}</div><div class="l">dernière fois</div></div>
    ${!isWish&&!closed?renderProgressCard(p):''}
    ${p.todo&&p.todo.trim()?`<div class="card" style="padding:12px 14px;margin-bottom:12px;border-left:2px solid var(--acc);border-radius:0 12px 12px 0;"><span class="muted" style="font-size:12px;">À faire</span><div style="font-size:14px;margin-top:3px;">${esc(p.todo)}</div></div>`:''}
    ${isWish?`<button class="btn primary" onclick="startLearning('${p.id}')">Commencer à apprendre</button>
      <div class="grid2" style="margin-top:10px;"><button class="btn ghost sm" onclick="editPiece('${p.id}')">Modifier</button><button class="btn ghost sm" style="color:#F0857A;border-color:#5a2f2b;" onclick="deleteWish('${p.id}')">Retirer</button></div>`
    :closed?`<button class="btn primary" onclick="reopenPiece('${p.id}')">Réactiver (en cours)</button>
      <button class="btn ghost sm" style="width:100%;margin-top:10px;" onclick="editPiece('${p.id}')">Modifier</button>`
    :`<div class="grid2"><button class="btn primary" onclick="detailPlay('${p.id}')">${playSvg()} Jouer</button><button class="btn ghost" onclick="noteSheet('${p.id}')">+ Note</button></div>
      <div class="grid2" style="margin-top:10px;"><button class="btn ghost sm" onclick="editPiece('${p.id}')">Modifier</button><button class="btn ghost sm" onclick="setPieceStatus('${p.id}','archived')">Archiver</button></div>
      <div class="between" style="margin:20px 0 10px;"><h2 style="margin:0;">Sections</h2>${secList(p).length?`<button class="btn ghost sm" onclick="addSection('${p.id}')">+ Ajouter</button>`:''}</div>
      ${renderSections(p)}`}
    ${!isWish?`<h2 style="margin-top:18px;">Enregistrements</h2>${renderRecordings(p)}`:''}
    <h2 style="margin-top:18px;">Notes</h2>${notes}`);
}
function detailPlay(id){closeSheet();quickStart(id);}
function editPiece(id){pieceSheet(id);}
function renderProgressCard(p){
  const pr=pieceProgress(p),derived=hasDerivedProgress(p);
  return `<div class="card" style="padding:14px;margin-bottom:12px;">
      <div class="between" style="margin-bottom:${derived?'4px':'0'};"><span class="muted" style="font-size:13px;">Avancement</span><span style="font-weight:600;${derived?'font-size:17px;':''}">${pr} %</span></div>
      ${derived?`<div class="muted" style="font-size:12px;margin-bottom:11px;">${barsOk(p)} mesures sur ${p.bars} au point${secList(p).some(s=>s.status==='poli')?' · '+secList(p).filter(s=>s.status==='poli').reduce((a,s)=>a+Math.max(0,s.to-s.from+1),0)+' en polissage':''}</div>
        ${renderMap(p)}${mapLegend()}${renderHistCurve(p)}`
      :`<div class="row" style="gap:8px;margin-top:10px;">
        <button class="btn ghost sm" style="flex:1;" onclick="nudgeProgress('${p.id}',-10)">– 10</button>
        <button class="btn ghost sm" style="flex:1;" onclick="nudgeProgress('${p.id}',10)">+ 10</button>
        ${p.status!=='mastered'?`<button class="btn primary sm" style="flex:1;" onclick="markMastered('${p.id}')">Maîtrisé ✓</button>`:''}</div>`}
      ${p.status!=='mastered'&&derived&&pr>=100?`<button class="btn primary sm" style="width:100%;margin-top:12px;" onclick="markMastered('${p.id}')">Maîtrisé ✓</button>`:''}
      ${estimateText(p)?`<div style="font-size:12px;margin-top:8px;color:var(--acc);">${estimateText(p)}</div>`:''}</div>`;
}
function renderMap(p){
  const segs=mapSegments(p);if(!segs.length)return '';
  return `<div class="map">${segs.map(s=>`<i class="${s.gap?'map-gap':''}" style="flex:${s.count};${s.gap?'':'background:'+s.col+';'}"></i>`).join('')}</div>
    <div class="sub" style="margin-top:6px;font-size:10px;"><span class="num">mes. 1</span><span class="num">${p.bars}</span></div>`;
}
function mapLegend(){
  return `<div class="row" style="gap:12px;flex-wrap:wrap;margin-top:10px;font-size:11px;color:var(--t2);">
    ${SEC_STATUS.map(s=>`<span class="row" style="gap:5px;"><i style="width:8px;height:8px;border-radius:2px;background:${s.col};display:inline-block;"></i>${s.label.toLowerCase()}</span>`).join('')}
    <span class="row" style="gap:5px;"><i class="map-gap" style="width:8px;height:8px;border-radius:2px;display:inline-block;"></i>non couvert</span></div>`;
}
function renderHistCurve(p){
  const h=(p.hist||[]).slice(-24);if(h.length<3)return '';
  const w=300,ht=96,padL=30,padR=6,padT=18,padB=14,innerW=w-padL-padR,innerH=ht-padT-padB;
  const x=i=>padL+(h.length===1?0:i/(h.length-1)*innerW);
  const y=v=>padT+innerH-(v/p.bars*innerH);
  const linePts=h.map((pt,i)=>`${x(i).toFixed(1)},${y(pt.m).toFixed(1)}`);
  const baseY=(padT+innerH).toFixed(1);
  const areaD='M'+x(0).toFixed(1)+','+baseY+' L'+linePts.join(' L')+' L'+x(h.length-1).toFixed(1)+','+baseY+' Z';
  const first=h[0],last=h[h.length-1],delta=last.m-first.m;
  const circles=h.map((pt,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(pt.m).toFixed(1)}" r="${i===h.length-1?3.6:1.8}" fill="var(--acc)" ${i===h.length-1?'stroke="#242833" stroke-width="2"':''}/>`).join('');
  return `<div class="mini">
    <div class="between" style="padding:0 2px 4px;"><span class="muted" style="font-size:11px;">Mesures au point</span></div>
    <svg viewBox="0 0 ${w} ${ht}" width="100%" style="display:block;overflow:visible;">
      <line x1="${padL}" y1="${padT}" x2="${w-padR}" y2="${padT}" stroke="var(--gold)" stroke-width="1" stroke-dasharray="3 4" opacity=".7"/>
      <text x="${w-padR}" y="13" fill="var(--gold)" font-size="8" font-family="DM Sans" text-anchor="end" opacity=".9">${p.bars} · le morceau entier</text>
      <text x="${padL-4}" y="${padT+3}" fill="#9B97A8" font-size="8" font-family="EB Garamond" text-anchor="end">${p.bars}</text>
      <text x="${padL-4}" y="${padT+innerH}" fill="#9B97A8" font-size="8" font-family="EB Garamond" text-anchor="end">0</text>
      <path d="${areaD}" fill="rgba(158,147,242,.13)"/>
      <polyline points="${linePts.join(' ')}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${circles}
      <text x="${padL}" y="${ht-2}" fill="#9B97A8" font-size="8" font-family="DM Sans">${frShort(first.d)}</text>
      <text x="${w-padR}" y="${ht-2}" fill="#9B97A8" font-size="8" font-family="DM Sans" text-anchor="end">${frShort(last.d)}</text>
    </svg>
    <div class="sub" style="margin-top:8px;padding:0 2px;"><span>${h.length} relevés</span><span style="color:var(--acc);">${delta>=0?'+ ':'− '}${Math.abs(delta)} mesures</span></div>
  </div>`;
}
function renderTodaySec(p){
  const pick=pickTodaySection(p);if(!pick)return '';
  const days=pick.d?Math.floor((Date.now()-new Date(pick.d+'T00:00'))/86400000):null;
  const sub=pick.d?(days<=0?"travaillée aujourd'hui":`pas ouverte depuis ${days} j`):'jamais travaillée';
  return `<div class="card" style="padding:11px 14px;margin-bottom:10px;border-left:2px solid var(--gold);border-radius:0 12px 12px 0;background:rgba(228,197,138,.06);">
    <div class="between"><div style="min-width:0;">
        <span class="muted" style="font-size:11px;">À travailler aujourd'hui</span>
        <div style="font-size:14px;margin-top:2px;font-weight:600;">${esc(pick.s.name)} · mes. ${pick.s.from}–${pick.s.to}</div>
        <div class="muted" style="font-size:11px;margin-top:2px;">${sub}</div></div>
      <button class="btn ghost sm" style="flex:0 0 auto;" onclick="toggleSec('${p.id}','${pick.s.id}')">Ouvrir</button></div></div>`;
}
function renderSections(p){
  if(!secList(p).length)return `<div class="card" style="padding:14px 16px;margin-bottom:10px;">
    <p class="muted" style="font-size:13px;margin:0 0 12px;line-height:1.5;">Découper un morceau en sections est facultatif. Utile pour organiser le travail passage par passage et voir précisément ce qui est acquis.</p>
    <button class="btn ghost sm" style="width:100%;" onclick="cutSheet('${p.id}')">Découper en sections</button></div>`;
  sortSections(p);
  let html=renderTodaySec(p)+secList(p).map(s=>renderSecRow(p,s)).join('');
  coverageGaps(p).forEach(g=>{html+=`<div class="row" style="gap:10px;padding:11px 14px;border:1px dashed var(--border);border-radius:13px;margin-bottom:8px;">
    <span class="muted" style="font-size:13px;flex:1;">mes. ${g.from}–${g.to} · pas encore couvertes</span>
    <button class="btn ghost sm" style="flex:0 0 auto;" onclick="addSection('${p.id}',${g.from},${g.to})">+ Section</button></div>`;});
  if(!p.bars)html='<div class="card" style="padding:12px 14px;margin-bottom:10px;"><p class="muted" style="font-size:13px;margin:0;">Indique le nombre de mesures (dans « Modifier ») pour calculer ton avancement.</p></div>'+html;
  return html;
}
function renderSecRow(p,s){
  const open=_secOpen===s.id,info=secStatusInfo(s.status);
  return `<div class="sec" style="${open?'box-shadow:inset 0 0 0 1px rgba(158,147,242,.35);':''}">
    <div class="sec-h" style="cursor:${open?'default':'pointer'};" ${open?'':`onclick="toggleSec('${p.id}','${s.id}')"`}>
      <span class="sec-dot" style="background:${info.col};"></span>
      ${open?`<input class="sec-n" id="sec-n-${s.id}" value="${esc(s.name)}">`:`<span class="sec-n">${esc(s.name)}</span>`}
      <span class="sec-r">${s.from}–${s.to}</span>
      <span class="sec-car" style="cursor:pointer;" onclick="toggleSec('${p.id}','${s.id}')">${open?'⌃':'⌄'}</span>
    </div>
    ${!open&&s.todo?`<div class="sec-todo" onclick="toggleSec('${p.id}','${s.id}')" style="cursor:pointer;">${esc(s.todo)}</div>`:''}
    ${open?renderSecBody(p,s):''}
  </div>`;
}
function renderSecBody(p,s){
  const bpmDraft=_secBpm[s.id]!=null?_secBpm[s.id]:((s.bpm&&s.bpm.length)?s.bpm[s.bpm.length-1].v:(parseInt(p.bpm)||92));
  _secBpm[s.id]=bpmDraft;
  const lastBpm=(s.bpm||[])[(s.bpm||[]).length-1];
  return `<div class="sec-body">
    <div class="row" style="gap:8px;margin:12px 0;">
      <span class="muted" style="font-size:13px;flex:0 0 auto;">Mesures</span>
      <input class="num" inputmode="numeric" id="sec-from-${s.id}" value="${s.from}" style="width:56px;padding:8px;text-align:center;" onchange="setSecRange('${p.id}','${s.id}')">
      <span class="muted">→</span>
      <input class="num" inputmode="numeric" id="sec-to-${s.id}" value="${s.to}" style="width:56px;padding:8px;text-align:center;" onchange="setSecRange('${p.id}','${s.id}')">
      <span class="muted" style="font-size:12px;">${Math.max(0,s.to-s.from+1)} mes.</span>
    </div>
    <div class="field" style="margin:0 0 12px;"><div class="seg">${SEC_STATUS.map(st=>`<button class="${s.status===st.k?'on':''}" onclick="setSecStatus('${p.id}','${s.id}','${st.k}')">${st.label}</button>`).join('')}</div></div>
    <div class="field" style="margin-bottom:12px;"><label>À faire sur cette section</label>
      <textarea id="sec-todo-${s.id}" placeholder="Main gauche seule, pédale aux temps faibles…">${esc(s.todo||'')}</textarea></div>
    <div class="field" style="margin-bottom:0;"><label>Tempo stable du jour</label>
      <div class="row" style="gap:10px;">
        <button class="btn ghost" style="width:44px;height:44px;padding:0;border-radius:50%;font-size:20px;flex:0 0 auto;" onclick="secBpmStep('${s.id}',-2)">–</button>
        <div class="num" id="sec-bpmv-${s.id}" style="flex:1;text-align:center;font-size:28px;font-weight:600;">${bpmDraft}<span style="font-size:13px;color:var(--t2);font-family:var(--sans);font-weight:400;"> bpm</span></div>
        <button class="btn ghost" style="width:44px;height:44px;padding:0;border-radius:50%;font-size:20px;flex:0 0 auto;" onclick="secBpmStep('${s.id}',2)">+</button>
        <button class="btn primary sm" style="flex:0 0 auto;" onclick="noteSecBpm('${p.id}','${s.id}')">Noter</button></div>
      <div class="sub" style="margin-top:9px;"><span style="font-size:11px;">Le plus rapide joué proprement${p.bpm?' · cible '+esc(p.bpm):''}</span>
        ${lastBpm?`<span style="font-size:11px;color:var(--acc);">dernier ${lastBpm.v} le ${frShort(lastBpm.d)}</span>`:''}</div></div>
    <button class="btn ghost sm" style="width:100%;margin-top:14px;color:#F0857A;border-color:#5a2f2b;" onclick="deleteSection('${p.id}','${s.id}')">Supprimer la section</button>
  </div>`;
}
let _secOpen=null,_secBpm={},_detailPid=null;
function commitOpenSec(pid){if(!_secOpen)return;const p=pieceById(pid);const s=p&&secList(p).find(x=>x.id===_secOpen);if(!s)return;
  const n=document.getElementById('sec-n-'+s.id),t=document.getElementById('sec-todo-'+s.id);
  if(n)s.name=n.value.trim()||s.name;if(t)s.todo=t.value;}
function toggleSec(pid,sid){commitOpenSec(pid);_secOpen=(_secOpen===sid)?null:sid;save();pieceDetail(pid);}
function addSection(pid,presetFrom,presetTo){commitOpenSec(pid);const p=pieceById(pid);p.sections=p.sections||[];
  const from=presetFrom||((p.sections.length?Math.max(...p.sections.map(s=>s.to)):0)+1);
  const to=presetTo||Math.min(p.bars||from+7,from+7);
  const s={id:uid(),name:'Nouvelle section',from,to,todo:'',status:'new',bpm:[]};
  p.sections.push(s);sortSections(p);recordHist(p);_secOpen=s.id;save();pieceDetail(pid);}
function setSecRange(pid,sid){const p=pieceById(pid);const s=secList(p).find(x=>x.id===sid);if(!s)return;
  const from=parseInt(document.getElementById('sec-from-'+sid).value)||1,to=parseInt(document.getElementById('sec-to-'+sid).value)||from;
  s.from=Math.max(1,from);s.to=Math.max(s.from,to);sortSections(p);recordHist(p);save();pieceDetail(pid);}
function setSecStatus(pid,sid,st){commitOpenSec(pid);const p=pieceById(pid);const s=secList(p).find(x=>x.id===sid);if(!s)return;
  s.status=st;recordHist(p);save();refreshScreen();pieceDetail(pid);}
function secBpmStep(sid,d){_secBpm[sid]=Math.max(20,(_secBpm[sid]||92)+d);paintSecBpm(sid);}
function paintSecBpm(sid){const el=document.getElementById('sec-bpmv-'+sid);if(el)el.innerHTML=_secBpm[sid]+'<span style="font-size:13px;color:var(--t2);font-family:var(--sans);font-weight:400;"> bpm</span>';}
function noteSecBpm(pid,sid){const p=pieceById(pid);const s=secList(p).find(x=>x.id===sid);if(!s)return;
  const v=_secBpm[sid];s.bpm=s.bpm||[];const d=dkey();const last=s.bpm[s.bpm.length-1];
  if(last&&last.d===d)last.v=v;else s.bpm.push({d,v});
  save();toast('Tempo noté');pieceDetail(pid);}
function deleteSection(pid,sid){if(!confirm('Supprimer cette section ?'))return;const p=pieceById(pid);
  p.sections=secList(p).filter(x=>x.id!==sid);if(_secOpen===sid)_secOpen=null;recordHist(p);save();refreshScreen();pieceDetail(pid);}
let _cutSize=16;
function cutSheet(pid){const p=pieceById(pid);if(!p)return;_cutSize=16;
  openSheet(`<h3>Découper en sections</h3>
    <p class="muted" style="font-size:13px;margin:-6px 0 16px;line-height:1.5;">Travailler un morceau par segments indépendants, c'est la façon la plus sûre d'avancer. L'app en tire ton avancement réel.</p>
    <div class="field"><label>Combien de mesures compte le morceau ?</label>
      <input id="cut-bars" class="num" inputmode="numeric" value="${p.bars||''}" placeholder="57" style="text-align:center;font-size:22px;font-weight:600;" oninput="paintCutPreview()"></div>
    <div class="field"><label>Découpage de départ</label>
      <div class="seg" id="cut-seg">
        <button onclick="pickCutSize(8,this)">8 mes.</button>
        <button class="on" onclick="pickCutSize(16,this)">16 mes.</button>
        <button onclick="pickCutSize(32,this)">32 mes.</button>
        <button onclick="pickCutSize('manual',this)">À la main</button></div></div>
    <div class="card" id="cut-preview" style="padding:12px 14px;background:var(--surface2);"></div>
    <button class="btn primary" style="margin-top:16px;" onclick="applyCut('${pid}')">Créer les sections</button>`);
  paintCutPreview();
}
function pickCutSize(v,el){_cutSize=v;document.querySelectorAll('#cut-seg button').forEach(b=>b.classList.remove('on'));el.classList.add('on');paintCutPreview();}
function paintCutPreview(){
  const bars=parseInt((document.getElementById('cut-bars')||{}).value)||0;
  const el=document.getElementById('cut-preview');if(!el)return;
  if(!bars){el.innerHTML='<div class="muted" style="font-size:12px;">Indique le nombre de mesures.</div>';return;}
  if(_cutSize==='manual'){el.innerHTML=`<div class="muted" style="font-size:12px;">${bars} mesures enregistrées. Ajoute les sections une par une depuis la fiche.</div>`;return;}
  const step=_cutSize,ranges=[];for(let f=1;f<=bars;f+=step)ranges.push([f,Math.min(bars,f+step-1)]);
  el.innerHTML=`<div class="muted" style="font-size:11px;margin-bottom:9px;">Aperçu · ${ranges.length} section${ranges.length>1?'s':''}, renommables ensuite</div>
    <div class="map" style="height:16px;">${ranges.map(r=>`<i style="flex:${r[1]-r[0]+1};background:#D2694A;"></i>`).join('')}</div>
    <div class="sub" style="margin-top:9px;font-size:12px;"><span>mes. ${ranges.map(r=>r[0]+'–'+r[1]).join(' · ')}</span></div>`;
}
function applyCut(pid){
  const bars=parseInt((document.getElementById('cut-bars')||{}).value)||0;if(bars<1){toast('Indique le nombre de mesures');return;}
  const p=pieceById(pid);p.bars=bars;p.sections=p.sections||[];
  if(_cutSize!=='manual'){const step=_cutSize;for(let f=1;f<=bars;f+=step)p.sections.push({id:uid(),name:'Section '+(p.sections.length+1),from:f,to:Math.min(bars,f+step-1),todo:'',status:'new',bpm:[]});}
  recordHist(p);save();closeSheet();refreshScreen();pieceDetail(pid);
}
function nudgeProgress(id,d){const p=pieceById(id);if(!p)return;p.progress=Math.max(0,Math.min(100,(p.progress||0)+d));
  if(p.progress>=100&&p.status!=='mastered'){markMastered(id);return;}save();pieceDetail(id);}
function markMastered(id){const p=pieceById(id);if(!p)return;const was=p.status==='mastered';p.status='mastered';p.progress=100;
  if(hasDerivedProgress(p)){secList(p).forEach(s=>s.status='ok');recordHist(p);}
  if(!p.masteredAt)p.masteredAt=Date.now();
  save();closeSheet();refreshScreen();if(!was)celebrate('Morceau maîtrisé !',p.title);else toast('Maîtrisé');}
function reopenPiece(id){const p=pieceById(id);if(!p)return;p.status='active';save();pieceDetail(id);toast('Réactivé · en cours');}
function deleteWish(id){if(!confirm('Retirer ce morceau de « à apprendre » ?'))return;S.pieces=S.pieces.filter(p=>p.id!==id);save();closeSheet();refreshScreen();toast('Retiré');}

/* ---------- Œuvre / recueil à plusieurs mouvements ---------- */
let _workMovs=[];
function workSheet(){
  _workMovs=['',''];
  openSheet(`<h3>Nouvelle œuvre / recueil</h3>
    <p class="muted" style="font-size:14px;margin-top:-6px;">Un morceau composé de plusieurs mouvements (sonate, recueil…) — chaque mouvement devient une pièce à part entière du répertoire.</p>
    <div class="field"><label>Titre de l'œuvre</label><input id="w-t" placeholder="Sonate no 14 « Clair de lune »"></div>
    <div class="field"><label>Compositeur</label><input id="w-c" list="dl-comp-w" placeholder="Beethoven" autocomplete="off"><datalist id="dl-comp-w">${OPUS.ALL.map(c=>`<option value="${c.name}"></option>`).join('')}</datalist></div>
    <div class="field"><label>Époque</label><input id="w-e" placeholder="Classique"></div>
    <div class="field"><label>Mouvements</label><div id="w-rows"></div>
      <button class="btn ghost sm" style="width:100%;margin-top:8px;" onclick="addWorkRow()">+ Ajouter un mouvement</button></div>
    <button class="btn primary" onclick="saveWork()">Créer</button>`);
  paintWorkRows();
}
function paintWorkRows(){const box=document.getElementById('w-rows');if(!box)return;
  box.innerHTML=_workMovs.map((v,i)=>`<div class="row" style="gap:8px;margin-bottom:8px;"><input value="${esc(v)}" placeholder="Mouvement ${i+1}" style="flex:1;" oninput="_workMovs[${i}]=this.value">${_workMovs.length>1?`<button class="btn ghost sm" style="width:auto;padding:0 12px;" onclick="removeWorkRow(${i})">✕</button>`:''}</div>`).join('');}
function addWorkRow(){_workMovs.push('');paintWorkRows();}
function removeWorkRow(i){_workMovs.splice(i,1);paintWorkRows();}
function saveWork(){
  const title=document.getElementById('w-t').value.trim();
  const composer=document.getElementById('w-c').value.trim();
  const epoch=document.getElementById('w-e').value.trim();
  if(!title){toast("Donne un titre à l'œuvre");return;}
  const movs=_workMovs.map(m=>m.trim()).filter(Boolean);
  if(!movs.length){toast('Ajoute au moins un mouvement');return;}
  const parent={id:uid(),title,composer,epoch,opus:'',genre:'',key:'',diff:0,bpm:'',status:'active',progress:0,tags:[],notes:[],todo:'',createdAt:Date.now(),isEnsemble:true};
  S.pieces.push(parent);
  movs.forEach(m=>{S.pieces.push({id:uid(),title:m,composer,epoch,opus:'',genre:'',key:'',diff:0,bpm:'',status:'active',progress:0,tags:[],notes:[],todo:'',createdAt:Date.now(),parentId:parent.id});});
  save();closeSheet();renderRep();toast('Œuvre créée · '+movs.length+' mouvement'+(movs.length>1?'s':''));
}

/* ==========================================================================
   VOYAGE
   ========================================================================== */
let voyageTab='voyage';
function renderVoyage(){
  document.getElementById('s-voyage').innerHTML=`
    <h1 class="serif">Le Grand Voyage</h1>
    <div class="seg" style="margin:16px 0;">
      <button class="${voyageTab==='voyage'?'on':''}" onclick="setVoyage('voyage')" style="font-size:12px;">Voyage</button>
      <button class="${voyageTab==='jardin'?'on':''}" onclick="setVoyage('jardin')" style="font-size:12px;">Jardin</button>
      <button class="${voyageTab==='succes'?'on':''}" onclick="setVoyage('succes')" style="font-size:12px;">Défis</button>
      <button class="${voyageTab==='cartes'?'on':''}" onclick="setVoyage('cartes')" style="font-size:12px;">Cartes</button>
    </div>
    <div id="voyage-body"></div>`;
  renderVoyageBody();
}
function setVoyage(t){voyageTab=t;renderVoyage();}
function renderVoyageBody(){
  const el=document.getElementById('voyage-body');
  if(voyageTab==='succes'){renderSucces(el);return;}
  if(voyageTab==='jardin'){renderJardin(el);return;}
  if(voyageTab==='cartes'){renderCartes(el);return;}
  const hours=totalSeconds()/3600, cur=currentStone(), next=nextStone();
  const hoursDisp=hours<10?hours.toFixed(1):Math.round(hours);
  const prevH=cur?cur.h:0, span=next?(next.h-prevH):1, prog=next?Math.min(1,(hours-prevH)/span):1;
  el.innerHTML=`
    <div class="card hi" style="box-shadow:inset 0 0 0 1px rgba(228,197,138,.25);">
      <div class="between"><div class="row" style="gap:12px;">${noteIcon(cur?cur.c:'#888',32,cur?rankGlyph(cur):'♪')}
        <div><div class="muted" style="font-size:12px;">Rang actuel</div><div class="serif" style="font-size:22px;color:var(--gold);">${cur?cur.n:'En route'}</div></div></div>
        <div style="text-align:right;"><div class="num" style="font-size:34px;font-weight:600;">${hoursDisp}</div><div class="muted" style="font-size:12px;">heures jouées</div></div></div>
      ${next?`<div class="sub" style="margin:16px 0 6px;"><span>Prochain · ${next.n}</span><span>${hoursDisp} / ${next.h} h</span></div>
      <div class="bar"><i style="width:${Math.round(prog*100)}%;background:linear-gradient(90deg,var(--acc),var(--gold));"></i></div>
      <div class="muted" style="font-size:12px;margin-top:8px;">Encore ${Math.max(0,Math.round(next.h-hours))} h avant ${next.n}</div>`:'<div class="muted" style="margin-top:14px;">Voyage accompli — Maestro Assoluto atteint. ♫</div>'}
    </div>
    <div class="muted" style="font-size:12px;margin:20px 0 10px;">18 rangs · d'Apprenti à Maestro Assoluto</div>
    <div class="path">${[...STONES].reverse().map((s,ri)=>{
      const idx=STONES.length-1-ri;const reached=hours>=s.h,isNext=next&&s.n===next.n;
      return `<div class="rank" id="${isNext?'voyage-current':(!next&&cur&&s.n===cur.n?'voyage-current':'')}" style="${reached?'':'opacity:.42;'}">
        <div class="dot">${noteIcon(reached?s.c:'#6A6A78',reached?24:19,glyphFor(idx))}</div>
        <div class="between" style="flex:1;min-width:0;"><span style="font-weight:600;color:${reached?'var(--gold)':'var(--tc)'};">${s.n}${isNext?' <span class="tag acc" style="padding:2px 8px;">en cours</span>':''}</span>
        <span class="num muted">${s.h.toLocaleString('fr-FR')} h</span></div></div>`;}).join('')}</div>`;
  try{(window.requestAnimationFrame||window.setTimeout)(()=>{try{const c=document.getElementById('voyage-current');if(c)c.scrollIntoView({block:'center'});}catch(e){}},0);}catch(e){}
}

/* ==========================================================================
   STATISTIQUES
   ========================================================================== */
let statSplit='composer';
function renderStats(){
  const bars=[];let max=1;for(let i=6;i>=0;i--){const d=addDays(new Date(),-i);const s=secondsOnDay(dkey(d));bars.push({d,s});max=Math.max(max,s);}
  let longest=0;S.sessions.forEach(s=>longest=Math.max(longest,sessionSeconds(s)));
  let bestDay=0;practiceDays().forEach(k=>bestDay=Math.max(bestDay,secondsOnDay(k)));
  let bestWk=0;if(S.sessions.length){const first=new Date([...practiceDays()].sort()[0]);for(let d=new Date(first);d<=new Date();d=addDays(d,7)){let t=0;for(let i=0;i<7;i++)t+=secondsOnDay(dkey(addDays(d,i)));bestWk=Math.max(bestWk,t);}}
  document.getElementById('s-stats').innerHTML=`
    <h1>Statistiques</h1>
    <div class="grid2" style="margin-top:16px;">
      <div class="metric"><div class="v">${durH(totalSeconds())}</div><div class="l">temps total joué</div></div>
      <div class="metric"><div class="v">${S.sessions.length}</div><div class="l">séances au total</div></div>
    </div>
    <h2>Aperçus</h2>${renderInsights()}
    <div class="card" style="margin-top:14px;">
      <div class="between" style="margin-bottom:6px;"><span style="font-weight:600;">7 derniers jours</span><span class="muted" style="font-size:13px;">${dur(weekSeconds())} cette sem.</span></div>
      <div class="bars">${bars.map((x,i)=>{const h=x.s?Math.max(6,Math.round(x.s/max*100)):2;const lb=x.d.toLocaleDateString('fr-FR',{weekday:'short'}).slice(0,3);
        return `<div class="b ${i===6?'today':''}" style="height:${h}%;${x.s?'':'background:var(--surface2);'}"><span class="cap">${x.s?Math.round(x.s/60)+'′':'·'}</span><span class="lb">${lb}</span></div>`;}).join('')}</div>
    </div>
    <h2>Comparaison des semaines</h2>
    ${weekBars()}
    <h2>Régularité · 12 semaines</h2>
    <div class="card">${heatmap()}</div>
    <h2>Meilleurs moments</h2>${hourHeat()}
    <h2>Temps par morceau</h2>${byPiece()}
    <h2>Répartition</h2>
    <div class="seg" style="margin-bottom:12px;"><button class="${statSplit==='composer'?'on':''}" onclick="setSplit('composer')">Compositeur</button><button class="${statSplit==='epoch'?'on':''}" onclick="setSplit('epoch')">Époque</button></div>
    ${splitView()}
    <h2>Records</h2>
    <div class="grid2">
      ${rec('Plus longue séance',dur(longest))}${rec('Meilleure journée',dur(bestDay))}
      ${rec('Meilleure semaine',dur(bestWk))}${rec('Meilleure série',bestStreak()+' j')}
    </div>
    ${retroYears().length?`<h2>Rétrospective</h2><div class="chips">${retroYears().map(y=>`<button class="chip" onclick="yearRetroSheet(${y})">${y}</button>`).join('')}</div>`:''}
    <h2>Historique</h2>${history()}`;
}
function setSplit(s){statSplit=s;renderStats();}
function rec(l,v){return `<div class="metric" style="box-shadow:inset 0 0 0 1px rgba(228,197,138,.22);"><div class="v" style="font-size:20px;">${v}</div><div class="l">${l}</div></div>`;}
function heatmap(){
  const days=[];for(let i=83;i>=0;i--){const d=addDays(new Date(),-i);const s=secondsOnDay(dkey(d));days.push(s);}
  const lv=s=>s===0?0:s<600?1:s<1800?2:s<3600?3:4;
  const col=['var(--surface2)','rgba(158,147,242,.3)','rgba(158,147,242,.55)','rgba(158,147,242,.8)','var(--acc)'];
  return `<div class="hm">${days.map(s=>`<i style="background:${col[lv(s)]}"></i>`).join('')}</div>
    <div class="sub" style="margin-top:10px;justify-content:flex-end;gap:6px;align-items:center;"><span>moins</span>${col.map(c=>`<span style="width:12px;height:12px;border-radius:3px;background:${c};display:inline-block;"></span>`).join('')}<span>plus</span></div>`;
}
function weekBars(){
  const weeks=[];let max=1;
  for(let i=7;i>=0;i--){const ws=addDays(weekStart(),-7*i);let t=0;for(let d=0;d<7;d++)t+=secondsOnDay(dkey(addDays(ws,d)));weeks.push(t);max=Math.max(max,t);}
  const cur=weeks[7],prev=weeks[6],diff=cur-prev;
  return `<div class="card">
    <div class="between" style="margin-bottom:6px;"><span style="font-weight:600;">8 dernières semaines</span>
      <span class="muted" style="font-size:13px;">${dur(cur)}${prev>0?' · '+(diff>=0?'+':'−')+dur(Math.abs(diff))+' vs S-1':''}</span></div>
    <div class="bars">${weeks.map((t,i)=>{const h=t?Math.max(6,Math.round(t/max*100)):2;const lb=i===7?'cette':'S-'+(7-i);
      return `<div class="b ${i===7?'today':''}" style="height:${h}%;${t?'':'background:var(--surface2);'}"><span class="cap">${t?(Math.round(t/3600*10)/10)+'h':''}</span><span class="lb" style="font-size:9px;">${lb}</span></div>`;}).join('')}</div>
  </div>`;
}
function byPiece(){
  const map={};S.sessions.forEach(s=>s.blocks.forEach(b=>map[b.piece]=(map[b.piece]||0)+b.sec));
  const arr=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);if(!arr.length)return '<div class="empty">Pas encore de données.</div>';
  const mx=arr[0][1];
  return arr.map(([id,s])=>`<div style="margin-bottom:12px;"><div class="sub" style="margin-bottom:6px;"><span style="color:var(--tc);">${esc(pieceName(id))}</span><span>${dur(s)}</span></div><div class="bar"><i style="width:${Math.round(s/mx*100)}%"></i></div></div>`).join('');
}
function splitView(){
  const map={};S.sessions.forEach(s=>s.blocks.forEach(b=>{let k;if(b.piece===IMPROV){k='Improvisation';}else{const p=pieceById(b.piece);if(!p)return;k=statSplit==='composer'?(p.composer||'—'):(p.epoch||'—');}map[k]=(map[k]||0)+b.sec;}));
  const arr=Object.entries(map).sort((a,b)=>b[1]-a[1]);if(!arr.length)return '<div class="empty">Renseigne compositeur/époque de tes morceaux.</div>';
  const total=arr.reduce((a,b)=>a+b[1],0);const cols=['#9E93F2','#E4C58A','#6FD3E0','#8DB600','#C65B34','#2FB6B0','#B07A2A'];
  let acc=0;const seg=arr.map(([k,v],i)=>{const from=acc/total*100;acc+=v;const to=acc/total*100;return `${cols[i%cols.length]} ${from}% ${to}%`;}).join(',');
  return `<div class="row" style="gap:18px;align-items:center;"><div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(${seg});flex:0 0 auto;"></div>
    <div style="flex:1;">${arr.map(([k,v],i)=>`<div class="sub" style="margin-bottom:6px;"><span style="color:var(--tc);"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${cols[i%cols.length]};margin-right:7px;"></span>${esc(k)}</span><span>${dur(v)}</span></div>`).join('')}</div></div>`;
}
function history(){const h=[...S.sessions].reverse().slice(0,30);if(!h.length)return '<div class="empty">Aucune séance.</div>';
  return h.map(s=>{const names=[...new Set(s.blocks.map(b=>pieceName(b.piece)))].join(', ');
    return `<div class="item"><div style="min-width:0;"><div class="title">${esc(names)}</div><div class="meta">${frShort(s.date)} · ${dur(sessionSeconds(s))}${s.feeling?' · '+esc(feelLabel(s.feeling)):''}</div></div></div>`;}).join('');}

/* ---------- Aperçus (V3 étape 5) : croisements sobres, pas de sur-analyse ---------- */
const MOMENTS={matin:'le matin',apresmidi:"l'après-midi",soir:'le soir',nuit:'la nuit'};
function momentBucket(h){if(h<6)return 'nuit';if(h<12)return 'matin';if(h<18)return 'apresmidi';return 'soir';}
function feelIdx(f){return FEEL_ORDER.indexOf(f);}
function momentInsight(){
  const buckets={};
  S.sessions.forEach(s=>{if(!s.feeling)return;const idx=feelIdx(s.feeling);if(idx<0)return;
    const t=s.ts||Date.parse(s.date+'T12:00'),b=momentBucket(new Date(t).getHours());
    (buckets[b]=buckets[b]||[]).push(idx);});
  const stats=Object.entries(buckets).filter(([,arr])=>arr.length>=3).map(([k,arr])=>[k,arr.reduce((a,b)=>a+b,0)/arr.length]);
  if(stats.length<2)return '';
  stats.sort((a,b)=>b[1]-a[1]);
  const best=stats[0],worst=stats[stats.length-1];
  if(best[1]-worst[1]<0.6)return '';
  return `Ton ressenti est meilleur ${MOMENTS[best[0]]} que ${MOMENTS[worst[0]]}.`;
}
function stagnantPieces(){
  const cutoff=Date.now()-21*86400000;
  return S.pieces.filter(p=>{
    if(p.isEnsemble||p.status!=='active'||!hasDerivedProgress(p))return false;
    const h=p.hist||[];if(h.length<2)return false;
    let old=null;for(const pt of h){if(new Date(pt.d+'T00:00').getTime()<=cutoff)old=pt;else break;}
    if(!old)return false;
    const recent=h[h.length-1],lp=pieceLastPlayed(p.id);
    const playedSince=lp&&new Date(lp+'T00:00').getTime()>=cutoff;
    return playedSince&&recent.m<=old.m;
  });
}
function stagnationInsight(){
  const list=stagnantPieces().slice(0,2);if(!list.length)return '';
  return list.map(p=>`« ${esc(p.title)} » n'a pas avancé depuis trois semaines malgré tes séances.`).join('<br>');
}
function fractionedInsight(){
  const withF=S.sessions.filter(s=>s.feeling&&(s.mode==='chrono'||s.mode==='minuteur'));
  const frac=withF.filter(s=>s.interval).map(s=>feelIdx(s.feeling)).filter(i=>i>=0);
  const cont=withF.filter(s=>!s.interval).map(s=>feelIdx(s.feeling)).filter(i=>i>=0);
  if(frac.length<3||cont.length<3)return '';
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length,af=avg(frac),ac=avg(cont);
  if(Math.abs(af-ac)<0.5)return '';
  return af>ac?'Tes séances en pratique fractionnée (25/5) donnent en moyenne un ressenti plus satisfaisant.'
    :'Tes séances continues donnent en moyenne un ressenti plus satisfaisant que le fractionné.';
}
function renderInsights(){
  const lines=[momentInsight(),stagnationInsight(),fractionedInsight()].filter(Boolean);
  if(!lines.length)return '<div class="empty">Pas encore assez de données pour un aperçu fiable.</div>';
  return `<div class="card" style="padding:14px 16px;">${lines.map(l=>`<p style="margin:0 0 10px;line-height:1.55;font-size:14px;">${l}</p>`).join('')}</div>`;
}

/* ---------- Rétrospective annuelle (V3 étape 5) ---------- */
function retroYears(){return [...new Set(S.sessions.map(s=>s.date.slice(0,4)))].sort((a,b)=>b-a);}
function yearRetroSheet(year){
  const sessions=S.sessions.filter(s=>s.date.slice(0,4)===String(year));
  if(!sessions.length){toast('Aucune séance en '+year);return;}
  const totalSec=sessions.reduce((a,s)=>a+sessionSeconds(s),0);
  const pieceMap={},composerMap={};
  sessions.forEach(s=>s.blocks.forEach(b=>{
    if(b.piece===IMPROV)return;
    pieceMap[b.piece]=(pieceMap[b.piece]||0)+b.sec;
    const p=pieceById(b.piece);if(p&&p.composer)composerMap[p.composer]=(composerMap[p.composer]||0)+b.sec;
  }));
  const topPieceEntry=Object.entries(pieceMap).sort((a,b)=>b[1]-a[1])[0];
  const topPiece=topPieceEntry?pieceById(topPieceEntry[0]):null;
  const topComposer=Object.entries(composerMap).sort((a,b)=>b[1]-a[1])[0];
  openSheet(`<h3>Rétrospective ${year}</h3>
    <p class="muted" style="font-size:14px;margin-top:-6px;">Une année de piano, en quelques chiffres.</p>
    <div class="grid2" style="margin:16px 0 10px;">
      ${rec('Temps joué',durH(totalSec))}${rec('Séances',sessions.length)}
    </div>
    <div class="grid2" style="margin-bottom:12px;">
      ${rec('Plus longue série',bestStreakInYear(year)+' j')}${rec('Compositeur dominant',topComposer?esc(topComposer[0]):'—')}
    </div>
    ${topPiece?`<div class="card" style="padding:14px;"><span class="muted" style="font-size:12px;">Pièce de l'année</span><div style="font-weight:600;margin-top:4px;">${esc(topPiece.title)}</div><div class="muted" style="font-size:12px;margin-top:2px;">${dur(topPieceEntry[1])} joués</div></div>`:''}
    <button class="btn primary" style="width:100%;margin-top:16px;" onclick="closeSheet()">Fermer</button>`);
}

/* ==========================================================================
   RÉGLAGES
   ========================================================================== */
function renderSettings(){
  const n=S.settings.notif;
  document.getElementById('s-settings').innerHTML=`
    <button class="btn ghost sm" onclick="go('home')" style="width:auto;margin-bottom:10px;">‹ Accueil</button>
    <h1>Réglages</h1>
    <h2>Objectifs</h2><div class="card" style="padding:6px 16px;">
      ${setLine('Objectif du jour',S.settings.dailyGoal+' min',"editNum('dailyGoal','Objectif du jour (min)')")}
      ${setLine('Hebdo · temps',S.settings.weeklyTime==null?'Non défini':Math.round(S.settings.weeklyTime/60*10)/10+' h',"editNum('weeklyTime','Objectif hebdo (min)',true)")}
      ${setLine('Hebdo · jours',S.settings.weeklyDays+' jours',"editNum('weeklyDays','Jours par semaine')")}
      ${setLine('Mensuel · temps',S.settings.monthly==null?'Non défini':Math.round(S.settings.monthly/60)+' h',"editNum('monthly','Objectif mensuel (min)',true)",true)}
    </div>
    <h2>Série</h2><div class="card">
      <div class="seg"><button class="${S.settings.tolerance===0?'on':''}" onclick="setTol(0)">Aucun</button><button class="${S.settings.tolerance===1?'on':''}" onclick="setTol(1)">1 jour</button><button class="${S.settings.tolerance===2?'on':''}" onclick="setTol(2)">2 jours</button></div>
      <p class="muted" style="font-size:13px;margin:12px 0 0;">Jours off autorisés par semaine sans casser la série.</p></div>
    <h2>Révision & estimations</h2><div class="card" style="padding:6px 16px;">
      ${setLine('Entretien après',(S.settings.revisionDays||18)+' j',"editNum('revisionDays','Entretien (jours)')")}
      <div class="between" style="padding:12px 0;"><span>Estimations de maîtrise</span><div class="toggle ${S.settings.estimates!==false?'on':''}" onclick="togEstimates(this)"></div></div>
    </div>
    <h2>Notifications</h2><div class="card" style="padding:6px 16px;">
      ${togLine('Rappel quotidien',n.daily,'daily')}
      ${togLine('Alerte série',n.streak,'streak')}
      ${togLine('Rappel objectif hebdo',n.weekly,'weekly')}
      ${togLine('Rapport du mois',n.monthly,'monthly')}
      ${togLine('Félicitations de palier',n.palier,'palier')}
      ${setLine('Activer les notifications','','enableNotifs()',true)}
    </div>
    <h2>Données</h2><div class="card" style="padding:6px 16px;">
      ${setLine('Exporter en CSV','',"exportCSV()")}
      ${setLine('Exporter tout (JSON)',S.lastBackup?'le '+new Date(S.lastBackup).toLocaleDateString('fr-FR'):'jamais',"exportJSON()")}
      ${setLine('Importer un JSON','',"importJSON()",true)}
    </div>
    <div class="card" style="margin-top:12px;">
      <div class="between"><span style="font-weight:600;">Sauvegarde NAS</span><div class="toggle ${S.settings.nas.enabled?'on':''}" onclick="toggleNas()"></div></div>
      <p class="muted" style="font-size:13px;margin:10px 0 0;">${S.settings.nas.enabled?'Prépare l\'envoi des sauvegardes vers ton NAS (configuration en étape B).':'Désactivé. Ton NAS pourra recevoir des sauvegardes automatiques plus tard.'}</p>
    </div>
    <p class="muted" style="font-size:12px;text-align:center;margin-top:22px;">MyPiano · ${APP_VERSION}</p>
    <input type="file" id="imp" accept="application/json" style="display:none" onchange="doImport(event)">`;
}
function setLine(l,v,fn,last){return `<div class="between" style="padding:13px 0;${last?'':'border-bottom:1px solid rgba(255,255,255,.05);'}cursor:pointer;" onclick="${fn}"><span>${l}</span><span class="row" style="gap:8px;"><span class="muted">${v}</span><span class="muted">›</span></span></div>`;}
function togLine(l,on,key,last){return `<div class="between" style="padding:12px 0;${last?'':'border-bottom:1px solid rgba(255,255,255,.05);'}"><span>${l}</span><div class="toggle ${key==='palier'?'gold ':''}${on?'on':''}" onclick="togNotif('${key}',this)"></div></div>`;}
function togNotif(k,el){S.settings.notif[k]=!S.settings.notif[k];el.classList.toggle('on');save();}
function setTol(t){S.settings.tolerance=t;save();renderSettings();toast('Tolérance : '+t+' jour(s)');}
function editNum(field,label,clearable){openSheet(`<h3>${label}</h3><div class="field"><input id="en" type="number" inputmode="numeric" value="${S.settings[field]==null?'':S.settings[field]}"></div><button class="btn primary" onclick="saveNum('${field}')">Valider</button>${clearable?`<button class="btn ghost sm" style="width:100%;margin-top:10px;" onclick="clearNum('${field}')">Non défini</button>`:''}`);}
function saveNum(field){const v=parseInt(document.getElementById('en').value);if(v>0){S.settings[field]=v;save();}closeSheet();renderSettings();}
function clearNum(field){S.settings[field]=null;save();closeSheet();renderSettings();}
function toggleNas(){S.settings.nas.enabled=!S.settings.nas.enabled;save();renderSettings();}
function togEstimates(el){S.settings.estimates=S.settings.estimates===false?true:false;el.classList.toggle('on');save();}

/* ---------- Export / Import ---------- */
function download(name,text,type){const b=new Blob([text],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),800);}
function exportCSV(){let rows=[['date','duree_min','mode','ressenti','morceaux','travaille','a_faire']];
  S.sessions.forEach(s=>{const names=[...new Set(s.blocks.map(b=>pieceName(b.piece)))].join(' | ');
    rows.push([s.date,Math.round(sessionSeconds(s)/60),s.mode,s.feeling||'',names,(s.worked||'').replace(/\n/g,' '),(s.next||'').replace(/\n/g,' ')]);});
  download('piano_historique.csv',rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv');toast('CSV exporté');}
function backupDue(){if(!S.sessions.length)return false;return (Date.now()-(S.lastBackup||0))>14*86400000;}
function exportJSON(){S.lastBackup=Date.now();save();download('piano_sauvegarde.json',JSON.stringify(S,null,2),'application/json');toast('Sauvegarde exportée');
  if(document.getElementById('s-settings').classList.contains('active'))renderSettings();}
function importJSON(){document.getElementById('imp').click();}
function doImport(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.sessions)throw 0;if(confirm('Remplacer toutes tes données par ce fichier ?')){S=migrate(d);saveNow().then(()=>{renderSettings();toast('Données importées');});}}catch(err){toast('Fichier invalide');}};r.readAsText(f);}

/* ==========================================================================
   ÉTAPE B — Notes ♪, succès, défis (sans boutique)
   ========================================================================== */
function weekStart(d){d=d?new Date(d):new Date();const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);d.setHours(0,0,0,0);return d;}
function weekKey(d){return dkey(weekStart(d));}
function monthKey(d){d=d?new Date(d):new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function thisWeekDays(){let n=0;const ws=weekStart();for(let i=0;i<7;i++)if(secondsOnDay(dkey(addDays(ws,i)))>0)n++;return n;}
function thisWeekHours(){let t=0;const ws=weekStart();for(let i=0;i<7;i++)t+=secondsOnDay(dkey(addDays(ws,i)));return t/3600;}
function monthSessions(){const mk=monthKey();return S.sessions.filter(s=>monthKey(new Date(s.date+'T00:00'))===mk);}
function thisMonthDays(){const set=new Set();monthSessions().forEach(s=>set.add(s.date));return set.size;}
function thisMonthHours(){return monthSessions().reduce((a,s)=>a+sessionSeconds(s),0)/3600;}
function thisMonthComposers(){const set=new Set();monthSessions().forEach(s=>s.blocks.forEach(b=>{if(b.piece===IMPROV)return;const p=pieceById(b.piece);if(p&&p.composer)set.add(p.composer.toLowerCase());}));return set.size;}

function achievements(){
  const streak=bestStreak(),comps=new Set(),epochs=new Set();
  S.sessions.forEach(s=>s.blocks.forEach(b=>{if(b.piece===IMPROV)return;const p=pieceById(b.piece);if(p){if(p.composer)comps.add(p.composer.toLowerCase());if(p.epoch)epochs.add(p.epoch);}}));
  const hours=totalSeconds()/3600;
  const noteCount=S.pieces.reduce((a,p)=>a+((p.notes||[]).length),0);
  const journalDays=Object.values(S.journal).filter(j=>j&&(j.mood||j.energy)).length;
  const improv=S.sessions.some(s=>s.blocks.some(b=>b.piece===IMPROV));
  const chopin=S.pieces.filter(p=>p.status==='mastered'&&/chopin/i.test(p.composer||'')).length;
  const ensDone=S.pieces.filter(p=>p.isEnsemble&&ensembleCompleted(p)).length;
  const longSession=S.sessions.reduce((m,s)=>Math.max(m,sessionSeconds(s)),0);
  let monthHours=0;for(let i=0;i<31;i++)monthHours+=secondsOnDay(dkey(addDays(new Date(),-i)));monthHours/=3600;
  const cc=completedChallenges().length,bn=baseNotes();
  const A=(id,fam,label,desc,on,reward)=>({id,fam,label,desc,on:!!on,reward});
  return [
    A('reg7','Régularité','Semaine pleine','7 jours d’affilée',streak>=7,100),
    A('reg30','Régularité','Assidu','30 jours d’affilée',streak>=30,300),
    A('reg100','Régularité','Increvable','100 jours d’affilée',streak>=100,1000),
    A('reg365','Régularité','Une année','365 jours d’affilée',streak>=365,3000),
    A('vol10','Volume','Premières heures','10 h de pratique',hours>=10,80),
    A('vol100','Volume','Centurion','100 h de pratique',hours>=100,400),
    A('vol1000','Volume','Millénaire','1 000 h de pratique',hours>=1000,2000),
    A('volm','Volume','Mois intense','10 h en un mois',monthHours>=10,150),
    A('long','Volume','Marathon','séance de 2 h',longSession>=7200,150),
    A('m1','Maîtrise','Premier sommet','1 morceau maîtrisé',masteredCount()>=1,50),
    A('m5','Maîtrise','Répertoire','5 morceaux maîtrisés',masteredCount()>=5,150),
    A('m10','Maîtrise','Virtuose en herbe','10 morceaux maîtrisés',masteredCount()>=10,400),
    A('chop','Maîtrise','Ami de Chopin','5 Chopin maîtrisés',chopin>=5,400),
    A('ens','Maîtrise','Ensemble complet','un recueil complété',ensDone>=1,300),
    A('e3','Exploration','Curieux','3 compositeurs',comps.size>=3,80),
    A('e10','Exploration','Éclectique','10 compositeurs',comps.size>=10,300),
    A('ep3','Exploration','Voyage du temps','3 époques',epochs.size>=3,150),
    A('imp','Exploration','Libre','1re improvisation',improv,50),
    A('c10','Carnet','Chroniqueur','10 notes de carnet',noteCount>=10,80),
    A('j30','Carnet','Introspectif','journal 30 jours',journalDays>=30,200),
    A('d1','Défis','Relevé','1 défi réussi',cc>=1,100),
    A('d5','Défis','Compétiteur','5 défis réussis',cc>=5,300),
    A('concert','Défis','Sur scène','1re simulation de concert',S.sessions.some(s=>s.mode==='concert'),200),
    A('n5','Notes','Collectionneur','5 000 ♪',bn>=5000,200),
    A('n20','Notes','Trésor','20 000 ♪',bn>=20000,600),
  ];
}

const WEEK_POOL=[
  {type:'days_week',target:4,reward:120,label:'Jouer 4 jours cette semaine'},
  {type:'days_week',target:6,reward:220,label:'Jouer 6 jours cette semaine'},
  {type:'hours_week',target:3,reward:150,label:'Cumuler 3 h cette semaine'},
  {type:'hours_week',target:5,reward:260,label:'Cumuler 5 h cette semaine'},
];
const MONTH_POOL=[
  {type:'days_month',target:20,reward:400,label:'Jouer 20 jours ce mois'},
  {type:'hours_month',target:15,reward:500,label:'Cumuler 15 h ce mois'},
  {type:'hours_month',target:25,reward:750,label:'Cumuler 25 h ce mois'},
  {type:'composers_month',target:3,reward:300,label:'3 compositeurs différents ce mois'},
];
function challengeProgress(ch){if(!ch)return 0;switch(ch.type){
  case'days_week':return thisWeekDays();case'hours_week':return thisWeekHours();
  case'days_month':return thisMonthDays();case'hours_month':return thisMonthHours();
  case'composers_month':return thisMonthComposers();case'free':return ch.doneManual?ch.target:0;default:return 0;}}
function progressText(ch){const p=challengeProgress(ch);
  return ch.type.indexOf('hours')===0?(Math.round(p*10)/10)+' / '+ch.target+' h':Math.min(p,ch.target)+' / '+ch.target;}
function completedChallenges(){return S.challenges.log||[];}
function pick3(pool,seed){const a=pool.slice(),out=[];let s=seed||1;
  while(out.length<3&&a.length){s=(s*9301+49297)%233280;out.push(a.splice(s%a.length,1)[0]);}return out;}
function poolFor(period){return period==='week'?WEEK_POOL:MONTH_POOL;}
function seedFor(period){const key=period==='week'?weekKey():monthKey();return key.split('-').reduce((a,x)=>a+parseInt(x||0,10),0)+(period==='week'?7:30);}
function pickChallengeSheet(period){
  const opts=pick3(poolFor(period),seedFor(period));
  openSheet(`<h3>Défi ${period==='week'?'de la semaine':'du mois'}</h3>
    <p class="muted" style="font-size:14px;margin-top:-6px;">Choisis-en un, ou crée le tien.</p>
    ${opts.map((o,i)=>`<div class="item" onclick="chooseChallenge('${period}',${i})"><div style="min-width:0;"><div class="title" style="font-size:14px;">${o.label}</div><div class="meta">récompense +${o.reward} ♪</div></div><div class="r" style="color:var(--gold);">›</div></div>`).join('')}
    <button class="btn ghost sm" style="width:100%;margin-top:6px;" onclick="freeChallengeSheet('${period}')">Créer un défi libre</button>`);
}
function chooseChallenge(period,idx){const opts=pick3(poolFor(period),seedFor(period));const key=period==='week'?weekKey():monthKey();
  S.challenges[period]=Object.assign({key},opts[idx]);save();closeSheet();renderVoyage();}
function freeChallengeSheet(period){openSheet(`<h3>Défi libre</h3><div class="field"><label>Ton défi</label><input id="fc" placeholder="Ex. mémoriser la page 2"></div><button class="btn primary" onclick="saveFree('${period}')">Créer le défi</button>`);}
function saveFree(period){const t=document.getElementById('fc').value.trim();if(!t){toast('Décris ton défi');return;}
  const key=period==='week'?weekKey():monthKey();S.challenges[period]={key,type:'free',target:1,reward:period==='week'?120:300,label:t,doneManual:false};save();closeSheet();renderVoyage();}
function completeFree(period){const ch=S.challenges[period];if(ch&&ch.type==='free'){ch.doneManual=true;save();checkChallenges();renderVoyage();}}
function checkChallenges(){let changed=false;
  ['week','month'].forEach(period=>{const ch=S.challenges[period];if(!ch)return;
    if(challengeProgress(ch)>=ch.target){const id=period+':'+ch.key;
      if(!(S.challenges.log||[]).some(l=>l.id===id)){S.challenges.log.push({id,reward:ch.reward,label:ch.label});changed=true;setTimeout(()=>toast('Défi réussi · +'+ch.reward+' ♪'),200);}}});
  if(changed)save();}
function renderSucces(el){
  checkChallenges();
  const wk=S.challenges.week&&S.challenges.week.key===weekKey()?S.challenges.week:null;
  const mo=S.challenges.month&&S.challenges.month.key===monthKey()?S.challenges.month:null;
  const card=(ch,period,lab)=>{
    if(!ch)return `<div class="card" style="margin-bottom:12px;"><div class="between"><span style="font-weight:600;">Défi ${lab}</span><button class="btn primary sm" onclick="pickChallengeSheet('${period}')">Choisir</button></div><p class="muted" style="font-size:13px;margin:8px 0 0;">Choisis un défi parmi 3, ou crée le tien.</p></div>`;
    const p=challengeProgress(ch),done=p>=ch.target,pct=Math.min(100,Math.round(p/ch.target*100));
    return `<div class="card" style="margin-bottom:12px;">
      <div class="between" style="margin-bottom:8px;"><span class="tag ${period==='week'?'acc':'gold'}" style="padding:3px 10px;">${lab}</span><span style="color:var(--gold);font-weight:600;">+${ch.reward} ♪</span></div>
      <div style="font-weight:600;margin-bottom:10px;">${esc(ch.label)}</div>
      <div class="bar"><i style="width:${pct}%;${done?'background:var(--gold);':''}"></i></div>
      <div class="between" style="margin-top:8px;"><span class="muted" style="font-size:12px;">${done?'Réussi ✓':progressText(ch)}</span>
      ${ch.type==='free'&&!ch.doneManual?`<button class="btn ghost sm" onclick="completeFree('${period}')">Marquer réussi</button>`:`<button class="btn ghost sm" onclick="pickChallengeSheet('${period}')">Changer</button>`}</div></div>`;
  };
  const ach=achievements(),unlocked=ach.filter(a=>a.on).length;
  const fams=['Régularité','Volume','Maîtrise','Exploration','Carnet','Défis','Notes'];
  el.innerHTML=`
    <div style="font-weight:600;margin-bottom:10px;">Défis en cours</div>
    ${card(wk,'week','semaine')}${card(mo,'month','mois')}
    <div class="between" style="margin:20px 0 10px;"><span style="font-weight:600;">Succès</span><span class="muted">${unlocked} / ${ach.length}</span></div>
    ${fams.map(f=>{const list=ach.filter(a=>a.fam===f);if(!list.length)return '';
      return `<div class="muted" style="font-size:12px;margin:14px 0 8px;">${f}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">${list.map(a=>`
        <div class="card" style="padding:12px 8px;text-align:center;${a.on?'':'opacity:.42;'}">
          <div style="font-size:22px;color:${a.on?'var(--gold)':'var(--t2)'};line-height:1;">${a.on?'♫':'○'}</div>
          <div style="font-size:12px;font-weight:600;margin-top:7px;line-height:1.2;">${a.label}</div>
          <div class="muted" style="font-size:10px;margin-top:3px;">${a.on?'+'+a.reward+' ♪':esc(a.desc)}</div></div>`).join('')}</div>`;}).join('')}`;
}

/* ==========================================================================
   LOT 2 — compositeurs, cartes, jardin, célébrations, insights, révision
   ========================================================================== */
function hashStr(s){s=s||'';let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h;}
function masteredByComposer(name){name=(name||'').toLowerCase();return S.pieces.filter(p=>!p.isEnsemble&&p.status==='mastered'&&(p.composer||'').toLowerCase()===name).length;}
function ownedComposers(){const s=new Set();S.pieces.forEach(p=>{if(!p.isEnsemble&&p.composer)s.add(p.composer);});return [...s].sort((a,b)=>a.localeCompare(b));}
function cardLevel(n){return n>=30?{n:'Or',c:'#E4C58A'}:n>=20?{n:'Argent',c:'#C9CDDA'}:n>=10?{n:'Bronze',c:'#C98A3A'}:null;}

function composerSheet(name){
  const c=OPUS.composerByName(name);const dates=c.b?(c.b+(c.d?'–'+c.d:'– …')):'';
  const total=S.pieces.filter(p=>!p.isEnsemble&&(p.composer||'').toLowerCase()===name.toLowerCase()).length;
  openSheet(`<h3>${esc(name)}</h3>
    <div id="comp-portrait" style="text-align:center;margin:4px 0 14px;"></div>
    <div class="between" style="padding:11px 2px;border-bottom:1px solid rgba(255,255,255,.05);"><span class="muted">Époque</span><span>${esc(c.epoch||'—')}</span></div>
    <div class="between" style="padding:11px 2px;border-bottom:1px solid rgba(255,255,255,.05);"><span class="muted">Dates</span><span>${dates||'—'}</span></div>
    <div class="between" style="padding:11px 2px;"><span class="muted">Tes morceaux</span><span>${total} · ${masteredByComposer(name)} maîtrisés</span></div>
    <button class="btn ghost" style="margin-top:14px;" onclick="closeSheet()">Fermer</button>`);
  OPUS.onlineComposer(name).then(cs=>{const el=document.getElementById('comp-portrait');if(el&&cs&&cs[0]&&cs[0].portrait)el.innerHTML=`<img src="${cs[0].portrait}" alt="" style="width:108px;height:108px;border-radius:16px;object-fit:cover;">`;}).catch(()=>{});
}
function renderCartes(el){
  const comps=ownedComposers();
  if(!comps.length){el.innerHTML='<div class="empty">Joue des morceaux pour collectionner des cartes de compositeurs.</div>';return;}
  el.innerHTML=`<p class="muted" style="font-size:13px;margin:0 0 12px;">Niveaux : Bronze 10 · Argent 20 · Or 30 morceaux maîtrisés.</p>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">${comps.map(name=>{const m=masteredByComposer(name),lv=cardLevel(m),c=OPUS.composerByName(name);
     return `<div class="card" style="padding:14px;${lv?'box-shadow:inset 0 0 0 1px '+lv.c+';':''}" onclick="composerSheet('${name.replace(/'/g,"\\'")}')">
       <div class="serif" style="font-size:17px;">${esc(name)}</div>
       <div class="muted" style="font-size:12px;margin-top:2px;">${esc(c.epoch||'')}</div>
       <div class="between" style="margin-top:12px;"><span class="num" style="font-size:20px;">${m}</span>${lv?`<span class="tag" style="background:${lv.c}22;color:${lv.c};">${lv.n}</span>`:`<span class="muted" style="font-size:12px;">${m}/10</span>`}</div></div>`;}).join('')}</div>`;
}
function renderJardin(el){
  const hours=totalSeconds()/3600,streak=computeStreak(),mastered=S.pieces.filter(p=>!p.isEnsemble&&p.status==='mastered');
  const rankIdx=STONES.reduce((a,s,i)=>hours>=s.h?i:a,-1);
  const growth=Math.max(0.14,Math.min(1,(rankIdx+2)/19));
  const cx=200,groundY=340,trunkH=60+growth*130,topY=groundY-trunkH,canopyR=42+growth*72;
  const leafN=Math.min(70,8+streak*3);let leaves='';
  for(let i=0;i<leafN;i++){const a=(hashStr('l'+i)%628)/100,r=(hashStr('r'+i)%100)/100*canopyR;const x=cx+Math.cos(a)*r,y=topY+Math.sin(a)*r*0.92;leaves+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${4+hashStr('s'+i)%4}" fill="#3E7D4E" opacity="0.85"/>`;}
  let flowers='';const cols=['#E4C58A','#9E93F2','#D06E86','#6FD3E0','#8DB600','#E5A100'];
  mastered.slice(0,44).forEach((p,i)=>{const a=(i/Math.max(1,mastered.length))*6.283,r=canopyR*(0.35+0.55*((i%3)/2));const x=cx+Math.cos(a)*r,y=topY+Math.sin(a)*r*0.92;flowers+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="4.5" fill="${cols[hashStr(p.composer||p.title)%cols.length]}"/>`;});
  const cur=currentStone();
  el.innerHTML=`<div class="card" style="padding:8px;background:linear-gradient(180deg,#1c1e2c,#191a1b);">
    <svg viewBox="0 0 400 360" width="100%">
      <ellipse cx="200" cy="346" rx="118" ry="12" fill="#0f2417" opacity="0.55"/>
      <path d="M${cx-9} ${groundY} C ${cx-15} ${topY+trunkH*0.4} ${cx-6} ${topY+18} ${cx} ${topY} C ${cx+6} ${topY+18} ${cx+15} ${topY+trunkH*0.4} ${cx+9} ${groundY} Z" fill="#5b4632"/>
      <circle cx="${cx}" cy="${topY}" r="${canopyR}" fill="#2f6b3f" opacity="0.92"/>${leaves}${flowers}
    </svg>
    <div style="padding:8px 12px 6px;text-align:center;"><div class="serif" style="font-size:18px;color:var(--gold);">${cur?cur.n:'La graine'}</div>
      <div class="muted" style="font-size:13px;margin-top:4px;">${Math.round(hours)} h cultivées · ${streak} j de série · ${mastered.length} fleurs</div></div></div>
    <p class="muted" style="font-size:12px;text-align:center;margin-top:10px;line-height:1.5;">Ton arbre grandit avec tes heures, se garnit selon ta série, et fleurit à chaque morceau maîtrisé.</p>`;
}
function celebrate(title,sub){
  buzz();const o=document.createElement('div');
  o.style.cssText='position:fixed;inset:0;z-index:80;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,10,12,.74);animation:fade .3s;overflow:hidden;';
  let conf='';for(let i=0;i<44;i++){const c=['#E4C58A','#9E93F2','#6FD3E0','#D06E86'][i%4],l=(hashStr('c'+i)%100),d=(1+(hashStr('d'+i)%150)/100).toFixed(2),de=((hashStr('e'+i)%80)/100).toFixed(2);
    conf+=`<span style="position:absolute;top:-24px;left:${l}%;width:8px;height:13px;background:${c};border-radius:2px;animation:conffall ${d}s ease-in ${de}s forwards;"></span>`;}
  o.innerHTML=`${conf}<div style="font-size:56px;">♫</div><div class="serif" style="font-size:26px;color:var(--gold);margin-top:8px;text-align:center;padding:0 24px;">${esc(title)}</div><div class="muted" style="margin-top:6px;text-align:center;">${esc(sub||'')}</div>`;
  o.onclick=()=>o.remove();document.body.appendChild(o);setTimeout(()=>{try{o.remove();}catch(e){}},2600);
}
function hourHeat(){
  const hrs=new Array(24).fill(0);S.sessions.forEach(s=>{const t=s.ts||Date.parse(s.date+'T12:00');const h=new Date(t).getHours();hrs[h]+=sessionSeconds(s);});
  const max=Math.max(1,...hrs);const best=hrs.map((v,i)=>[i,v]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]+'h');
  return `<div class="card"><div class="between" style="margin-bottom:10px;"><span style="font-weight:600;">Heure de la journée</span>${best.length?`<span class="muted" style="font-size:13px;">meilleur : ${best.join(', ')}</span>`:''}</div>
    <div style="display:flex;align-items:flex-end;gap:2px;height:66px;">${hrs.map((v,i)=>`<div style="flex:1;background:${v?'var(--acc)':'var(--surface2)'};height:${v?Math.max(7,Math.round(v/max*100)):4}%;border-radius:2px;opacity:${v?(0.45+0.55*v/max).toFixed(2):1};"></div>`).join('')}</div>
    <div class="sub" style="margin-top:6px;"><span>0h</span><span>12h</span><span>23h</span></div></div>`;
}
function revisionList(){const now=Date.now();
  return S.pieces.filter(p=>!p.isEnsemble&&p.status==='mastered').map(p=>{const days=p.revInterval||S.settings.revisionDays||18;const lp=pieceLastPlayed(p.id);const d=lp?Math.floor((now-new Date(lp+'T00:00'))/86400000):9999;return {p,d,days};}).filter(x=>x.d>=x.days).sort((a,b)=>b.d-a.d).map(x=>x.p);}
function estimateText(p){if(S.settings.estimates===false||!p||!p.createdAt)return '';
  const pr=pieceProgress(p);if(pr>=100)return '';
  const days=(Date.now()-p.createdAt)/86400000;if(days<3||!pr)return '';const rate=pr/days;if(rate<=0)return '';
  const rem=(100-pr)/rate;if(rem>3650)return '';return 'Maîtrise estimée dans ~'+(rem<14?Math.round(rem)+' j':Math.round(rem/7)+' sem.');}

/* ==========================================================================
   LOT 2 partie 2 — plan guidé (Chang), simulation de concert, rapport hebdo
   ========================================================================== */
let _plan=null;
function changConsigne(p){const pr=pieceProgress(p);if(pr<30)return "Passage le plus difficile d'abord, mains séparées, très lent.";if(pr<70)return "Mains ensemble, monte le tempo par petits paliers.";return "Peaufine les nuances et joue de mémoire.";}
function generatePlan(){
  const goal=todayGoal();const active=S.pieces.filter(p=>!p.isEnsemble&&p.status==='active');const rev=revisionList();
  const blocks=[];const warm=Math.max(5,Math.round(goal*0.12));
  blocks.push({piece:null,focus:'Échauffement',min:warm,consigne:'Gammes et mouvements lents, mains détendues.'});
  const maint=rev.length?Math.max(5,Math.round(goal*0.15)):0;const play=Math.max(3,Math.round(goal*0.10));
  const workTime=Math.max(5,goal-warm-maint-play);
  const targets=active.slice().sort((a,b)=>(pieceProgress(a)-pieceProgress(b))||((b.diff||0)-(a.diff||0))).slice(0,3);
  if(targets.length){const per=Math.max(5,Math.round(workTime/targets.length));targets.forEach(p=>blocks.push({piece:p.id,focus:'Travail',min:per,consigne:changConsigne(p)}));}
  if(maint&&rev[0])blocks.push({piece:rev[0].id,focus:'Entretien',min:maint,consigne:'Filage lent pour réactiver la mémoire.'});
  const last=targets[0]||active[0]||null;blocks.push({piece:last?last.id:null,focus:'Filage',min:play,consigne:"Joue en entier sans t'arrêter, comme en concert."});
  return blocks;
}
function planSheet(){const plan=_plan=generatePlan();
  openSheet(`<h3>Plan guidé du jour</h3><p class="muted" style="font-size:14px;margin-top:-6px;">D'après ton objectif (${todayGoal()} min) et la méthode Chang : passages difficiles d'abord, mains séparées puis ensemble, lent puis rapide, filage final.</p>
    ${plan.map(b=>`<div class="card" style="margin-bottom:10px;padding:13px 15px;"><div class="between"><span style="font-weight:600;">${b.focus}${b.piece?' · '+esc(pieceName(b.piece)):''}</span><span class="num muted">${b.min} min</span></div><div class="muted" style="font-size:13px;margin-top:5px;">${esc(b.consigne)}</div></div>`).join('')}
    <button class="btn primary" onclick="startGuided()">Lancer le plan</button>`);
}
function startGuided(){if(!_plan||!_plan.length)return;closeSheet();const plan=_plan;const f=plan[0];
  timer={mode:'guided',target:0,total:0,running:true,last:Date.now(),blocks:[{piece:f.piece||IMPROV,sec:0}],goal:todayGoal(),plan,planIdx:0,interval:null};
  go('session');renderSession();startTick();acquireWakeLock();}
function startRevision(){const list=revisionList().slice(0,3);if(!list.length)return;
  const min=Math.max(5,Math.round((S.settings.dailyGoal||30)/list.length));
  const plan=list.map(p=>({piece:p.id,focus:'Entretien',min,consigne:'Filage lent pour réactiver la mémoire.'}));
  _plan=plan;const f=plan[0];
  timer={mode:'guided',target:0,total:0,running:true,last:Date.now(),blocks:[{piece:f.piece,sec:0}],goal:min*plan.length,plan,planIdx:0,interval:null};
  go('session');renderSession();startTick();acquireWakeLock();}

let _program=[],_concert=null,_concertInt=null;
function concertSheet(){
  const active=S.pieces.filter(p=>!p.isEnsemble&&(p.status==='active'||p.status==='mastered'));
  openSheet(`<h3>Simulation de concert</h3><p class="muted" style="font-size:14px;margin-top:-6px;">Compose ton programme, puis joue-le d'affilée sans t'arrêter.</p>
    <div class="field"><label>Programme (${_program.length})</label>
      ${_program.length?_program.map((id,i)=>`<div class="item" style="padding:10px 14px;"><div class="title" style="font-size:14px;">${i+1}. ${esc(pieceName(id))}</div><button class="btn ghost sm" onclick="progRemove(${i})">Retirer</button></div>`).join(''):'<p class="muted" style="font-size:13px;">Vide pour l\'instant.</p>'}</div>
    <div class="field"><label>Ajouter</label><div class="chips">${active.length?active.map(p=>`<button class="chip" onclick="progAdd('${p.id}')">${esc(p.title)}</button>`).join(''):'<span class="muted" style="font-size:13px;">Aucun morceau dans le répertoire.</span>'}</div></div>
    <button class="btn primary" onclick="runConcert()">Lancer la simulation</button>`);
}
function progAdd(id){_program.push(id);concertSheet();}
function progRemove(i){_program.splice(i,1);concertSheet();}
function runConcert(){if(!_program.length){toast('Ajoute au moins un morceau');return;}closeSheet();_concert={idx:0,times:_program.map(()=>0),rates:_program.map(()=>1)};concertStage();}
function concertStage(){
  const id=_program[_concert.idx],isLast=_concert.idx===_program.length-1;
  let o=document.getElementById('concert-ov');if(!o){o=document.createElement('div');o.id='concert-ov';document.body.appendChild(o);}
  o.style.cssText='position:fixed;inset:0;z-index:70;background:radial-gradient(circle at 50% 28%, #26222f, #0d0d10);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;';
  o.innerHTML=`<div class="muted" style="font-size:13px;letter-spacing:.12em;">MORCEAU ${_concert.idx+1} / ${_program.length}</div>
    <div class="serif" style="font-size:30px;color:var(--tp);margin:14px 0 6px;padding:0 10px;">${esc(pieceName(id))}</div>
    <div class="num" id="concert-time" style="font-size:44px;margin:18px 0;">00 : 00</div>
    <button class="btn primary" style="max-width:240px;" onclick="concertNext()">${isLast?'Terminer':'Morceau suivant ▸'}</button>
    <div class="muted" style="font-size:12px;margin-top:16px;">Ne t'arrête pas — comme en vrai.</div>`;
  clearInterval(_concertInt);_concert.pieceStart=Date.now();
  _concertInt=setInterval(()=>{const el=document.getElementById('concert-time');if(el)el.textContent=clock((Date.now()-_concert.pieceStart)/1000);},500);
}
function concertNext(){_concert.times[_concert.idx]=Math.round((Date.now()-_concert.pieceStart)/1000);clearInterval(_concertInt);
  if(_concert.idx<_program.length-1){_concert.idx++;concertStage();}else concertDebrief();}
function concertDebrief(){
  const o=document.getElementById('concert-ov');const RATE=['À revoir','Correct','Solide'];
  o.style.cssText='position:fixed;inset:0;z-index:70;background:var(--bg);overflow:auto;padding:20px;';
  o.innerHTML=`<div style="max-width:430px;margin:0 auto;"><h1 style="text-align:center;">Débrief</h1>
    <p class="muted" style="text-align:center;font-size:14px;">Comment s'est passé chaque morceau ?</p>
    ${_program.map((id,i)=>`<div class="card" style="margin:10px 0;padding:14px 16px;"><div style="font-weight:600;margin-bottom:10px;">${esc(pieceName(id))}</div>
      <div class="seg">${RATE.map((r,j)=>`<button class="${j===1?'on':''}" onclick="rateConcert(${i},${j},this)">${r}</button>`).join('')}</div></div>`).join('')}
    <button class="btn primary" onclick="saveConcert()">Enregistrer la simulation</button>
    <button class="btn ghost sm" style="width:100%;margin:10px 0 30px;" onclick="closeConcert()">Annuler</button></div>`;
}
function rateConcert(i,j,el){_concert.rates[i]=j;el.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('on'));el.classList.add('on');}
function closeConcert(){const o=document.getElementById('concert-ov');if(o)o.remove();clearInterval(_concertInt);_concert=null;}
function saveConcert(){
  const blocks=_program.map((id,i)=>({piece:id,sec:Math.max(1,_concert.times[i]||0)}));
  const first=!S.sessions.some(s=>s.mode==='concert');
  S.sessions.push({id:uid(),date:dkey(),mode:'concert',goal:todayGoal(),feeling:'',blocks,concert:{rates:_concert.rates},ts:Date.now()});
  S.challenges.log.push({id:'concert:'+uid(),reward:300,label:'Simulation de concert'});
  save();checkChallenges();closeConcert();_program=[];go('home');
  celebrate('Concert terminé !','+300 ♪'+(first?' · succès « Sur scène »':''));
}

// Rapport hebdomadaire
function lastWeekReport(){
  const ws=addDays(weekStart(),-7);let sec=0,days=0,sessions=0;const pieceMap={};
  for(let i=0;i<7;i++){const s=secondsOnDay(dkey(addDays(ws,i)));if(s>0)days++;sec+=s;}
  S.sessions.forEach(s=>{const d=new Date(s.date+'T00:00');if(d>=ws&&d<addDays(ws,7)){sessions++;s.blocks.forEach(b=>{if(b.piece!==IMPROV)pieceMap[b.piece]=(pieceMap[b.piece]||0)+b.sec;});}});
  return {ws,sec,days,sessions,top:Object.entries(pieceMap).sort((a,b)=>b[1]-a[1]).slice(0,3)};
}
function reportReady(){return S.sessions.length&&S.lastReportSeen!==weekKey(addDays(weekStart(),-7));}
function reportSheet(){const r=lastWeekReport();S.lastReportSeen=weekKey(addDays(weekStart(),-7));save();
  const topHtml=r.top.length?('<div class="muted" style="font-size:13px;margin:4px 0 8px;">Le plus travaillé</div>'+r.top.map(function(e){return '<div class="between" style="padding:6px 0;"><span>'+esc(pieceName(e[0]))+'</span><span class="muted">'+dur(e[1])+'</span></div>';}).join('')):'<p class="muted" style="font-size:13px;">Semaine calme — rien enregistré.</p>';
  openSheet(`<h3>Rapport de la semaine</h3><p class="muted" style="font-size:13px;margin-top:-6px;">Semaine du ${frShort(dkey(r.ws))}</p>
    <div class="grid2" style="margin:12px 0;"><div class="metric"><div class="v">${dur(r.sec)}</div><div class="l">temps joué</div></div><div class="metric"><div class="v">${r.days}/7</div><div class="l">jours actifs</div></div></div>
    <div class="grid2" style="margin-bottom:12px;"><div class="metric"><div class="v">${r.sessions}</div><div class="l">séances</div></div><div class="metric"><div class="v">${r.days?dur(Math.round(r.sec/r.days)):'0 min'}</div><div class="l">moy./jour actif</div></div></div>
    ${topHtml}
    <button class="btn primary" style="margin-top:14px;" onclick="closeSheet()">Fermer</button>`);
}
// Notifications locales (pas de push serveur — voir CLAUDE.md pour l'option VAPID écartée).
function localNotify(title,body,tag){
  if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
  try{
    const n=new Notification(title,{body,tag,icon:'icon-192.png',badge:'icon-192.png'});
    n.onclick=()=>{try{window.focus();}catch(e){}n.close();};
  }catch(e){}
}
function maybeNotifyReport(){if(reportReady()&&S.settings.notif.weekly)localNotify('Piano — rapport de la semaine','Ton bilan hebdo est prêt.','rapport-semaine');}
function enableNotifs(){if(typeof Notification==='undefined'){toast('Notifications non supportées');return;}
  Notification.requestPermission().then(p=>toast(p==='granted'?'Notifications activées':'Notifications refusées'));}

// Rapport mensuel
function prevMonthDate(){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return d;}
function lastMonthReport(){
  const md=prevMonthDate(),mk=monthKey(md);
  const sessions=S.sessions.filter(s=>monthKey(new Date(s.date+'T00:00'))===mk);
  let sec=0;const days=new Set(),pieceMap={};
  sessions.forEach(s=>{sec+=sessionSeconds(s);days.add(s.date);s.blocks.forEach(b=>{if(b.piece!==IMPROV)pieceMap[b.piece]=(pieceMap[b.piece]||0)+b.sec;});});
  return {mk,md,sec,days:days.size,sessions:sessions.length,top:Object.entries(pieceMap).sort((a,b)=>b[1]-a[1]).slice(0,3)};
}
function monthReportReady(){return S.sessions.length&&S.lastMonthSeen!==monthKey(prevMonthDate());}
function monthReportSheet(){const r=lastMonthReport();S.lastMonthSeen=r.mk;save();
  const topHtml=r.top.length?('<div class="muted" style="font-size:13px;margin:4px 0 8px;">Le plus travaillé</div>'+r.top.map(function(e){return '<div class="between" style="padding:6px 0;"><span>'+esc(pieceName(e[0]))+'</span><span class="muted">'+dur(e[1])+'</span></div>';}).join('')):'<p class="muted" style="font-size:13px;">Mois calme — rien enregistré.</p>';
  openSheet(`<h3>Rapport du mois</h3><p class="muted" style="font-size:13px;margin-top:-6px;">${cap(r.md.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}))}</p>
    <div class="grid2" style="margin:12px 0;"><div class="metric"><div class="v">${dur(r.sec)}</div><div class="l">temps joué</div></div><div class="metric"><div class="v">${r.days}</div><div class="l">jours actifs</div></div></div>
    <div class="metric" style="margin-bottom:12px;"><div class="v">${r.sessions}</div><div class="l">séances</div></div>
    ${topHtml}
    <button class="btn primary" style="margin-top:14px;" onclick="closeSheet()">Fermer</button>`);
}
function maybeNotifyMonth(){if(monthReportReady()&&S.settings.notif.monthly)localNotify('Piano — rapport du mois','Ton bilan du mois est prêt.','rapport-mois');}

/* ---------- Boot ---------- */
async function boot(){
  S=await loadState();
  renderHome();
  try{maybeNotifyReport();}catch(e){}
  try{maybeNotifyMonth();}catch(e){}
}
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
const READY=boot();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}
// iOS peut tuer une PWA en arrière-plan sans avertir : on force le disque avant que ça arrive.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveNow();else if(document.visibilityState==='visible'&&timer&&timer.running)acquireWakeLock();});
window.addEventListener('pagehide',()=>{saveNow();});
