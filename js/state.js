/* ==========================================================================
   state.js — SOCLE (chargé en 1er après opus.js).
   Constantes, persistance IndexedDB, defaults()/migrate(), l'état global `S`,
   et tous les helpers PURS / dérivés (formatage, totaux, séries, phases,
   maths sections, notes/rangs, helpers Opus). AUCUN rendu DOM ici.
   Découpé depuis l'ancien app.js monolithique. Démarrage : voir js/boot.js.
   ========================================================================== */

const KEY = 'pianoV2';
const IMPROV = '__improv__';
const APP_VERSION = 'Bêta 3.14'; // à synchroniser avec CACHE dans sw.js à chaque release

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
  if(!ok)toast('Sauvegarde impossible',{danger:true});
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
// Échelle chromatique partagée par piecePhase() et SEC_STATUS : mêmes teintes pour un même degré d'avancement.
const PHASE_COL={dechiffrage:'#D2694A',consolidation:'#7FC9C4',polissage:'#9FC93C'};
function piecePhase(p){if(!p)return null;
  if(p.status==='wishlist')return{k:'wishlist',label:'À apprendre',col:'var(--t2)'};
  if(p.status==='archived')return{k:'archived',label:'Archivé',col:'var(--t2)'};
  if(p.status==='abandoned')return{k:'abandoned',label:'Abandonné',col:'var(--t2)'};
  if(p.status==='mastered')return needsRevision(p)?{k:'entretien',label:'À entretenir',col:'var(--warn)'}:{k:'mastered',label:'Maîtrisé',col:'var(--ok)'};
  const pr=pieceProgress(p);
  if(pr<30)return{k:'dechiffrage',label:'Déchiffrage',col:PHASE_COL.dechiffrage};
  if(pr<70)return{k:'consolidation',label:'Consolidation',col:PHASE_COL.consolidation};
  return{k:'polissage',label:'Polissage',col:PHASE_COL.polissage};}
function phaseChip(p){const ph=piecePhase(p);if(!ph)return '';return `<span class="tag" style="padding:2px 9px;font-size:11px;color:${ph.col};border-color:${ph.col}44;">${ph.label}</span>`;}

/* ---------- Sections & mesures (V3 étape 2) ---------- */
const SEC_STATUS=[{k:'new',label:'Déchiffrage',col:PHASE_COL.dechiffrage},{k:'wip',label:'Travail',col:PHASE_COL.consolidation},{k:'poli',label:'Polissage',col:PHASE_COL.polissage},{k:'ok',label:'Au point',col:'var(--ok)'}];
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
