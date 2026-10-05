/* ==========================================================================
   state.js — SOCLE (chargé en 1er).
   Constantes, persistance IndexedDB, defaults()/migrate(), l'état global `S`,
   et tous les helpers PURS / dérivés (formatage, totaux, série, rangs).
   AUCUN rendu DOM ici. Démarrage : voir js/boot.js.

   V6 « Ad libitum » : plus de morceaux. Une séance = du temps (+ ressenti,
   note, situation facultatifs). Les anciennes données (pieces, journal,
   challenges, vacation…) restent stockées telles quelles mais ne sont plus
   lues, sauf pour nommer les morceaux des anciennes séances au Carnet.
   ========================================================================== */

const KEY = 'pianoV2';
const IMPROV = '__improv__';
const APP_VERSION = 'Bêta 6.0'; // à synchroniser avec CACHE dans sw.js à chaque release

const STONES = [
  {n:'Apprenti',h:10},{n:'Élève',h:20},{n:'Musicien',h:30},{n:'Interprète',h:50},
  {n:'Accompagnateur',h:75},{n:'Chambriste',h:100},{n:'Soliste',h:150},{n:'Récitaliste',h:200},
  {n:'Concertiste',h:300},{n:'Virtuose',h:500},{n:'Maestro',h:750},{n:'Grand Maestro',h:1000},
  {n:'Maître',h:1500},{n:'Grand Maître',h:2000},{n:'Prodige',h:3000},{n:'Légende',h:5000},
  {n:'Immortel',h:7500},{n:'Maestro Assoluto',h:10000},
];
const QUOTES = [
  ['la musique est l’espace entre les notes.','Claude Debussy'],
  ['jouer une fausse note est insignifiant ; jouer sans passion est impardonnable.','Ludwig van Beethoven'],
  ['sans la musique, la vie serait une erreur.','Friedrich Nietzsche'],
  ['le piano est un orchestre à lui seul.','Franz Liszt'],
  ['la simplicité est l’achèvement suprême.','Frédéric Chopin'],
];
const FEEL = {pp:'Laborieux',p:'Difficile',mf:'Correct',f:'Satisfaisant',ff:'Excellent'};
const FEEL_ORDER = ['pp','p','mf','f','ff'];
function feelLabel(f){return f&&FEEL[f]?f+' · '+FEEL[f]:(f||'');}

/* ---------- State ---------- */
const IDB_NAME = 'pianoV2';
const IDB_VERSION = 1;

function defaultSettings(){return {userName:null,dailyGoal:30,tolerance:1,focus:null};}
function defaults(){return {sessions:[],recordings:[],onboarded:false,settings:defaultSettings()};}
function migrate(r){
  r=r||{};
  r.sessions=Array.isArray(r.sessions)?r.sessions:[];
  r.sessions.forEach(s=>{if(!Array.isArray(s.blocks))s.blocks=[];});
  r.recordings=Array.isArray(r.recordings)?r.recordings:[];
  r.settings=Object.assign(defaultSettings(),r.settings||{});
  // V6 : les métadonnées audio quittent les morceaux pour une liste unique (une seule fois).
  // Les anciennes p.recordings restent en place (non destructif), les blobs ne bougent pas.
  if(!r.recMigrated){
    (r.pieces||[]).forEach(p=>(p.recordings||[]).forEach(x=>{
      if(!r.recordings.some(y=>y.id===x.id))r.recordings.push({id:x.id,date:x.date,dur:x.dur,feel:x.feel||'',size:x.size,mime:x.mime,label:p.title||''});
    }));
    r.recordings.sort((a,b)=>(a.date||'')<(b.date||'')?-1:1);
    r.recMigrated=true;
  }
  // Le mode vacances n'existe plus : une pause en cours se termine aujourd'hui (la série reste gelée sur la période).
  if(r.vacation&&r.vacation.on){r.vacation.on=false;r.vacation.until=r.vacation.until||dkey();}
  if(r.onboarded===undefined)r.onboarded=!!(r.sessions.length||(r.pieces||[]).length);
  return r;
}

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
function idbReq(store,mode,fn,fallback){
  return new Promise(resolve=>{
    if(!_db){resolve(fallback);return;}
    try{
      const tx=_db.transaction(store,mode),rq=fn(tx.objectStore(store));
      if(mode==='readonly'){rq.onsuccess=()=>resolve(rq.result);rq.onerror=()=>resolve(fallback);}
      else{tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false);}
    }catch(e){resolve(fallback);}
  });
}
function idbGet(key){return idbReq('state','readonly',st=>st.get(key),undefined);}
function idbSet(key,val){return idbReq('state','readwrite',st=>st.put(val,key),false);}
// Enregistrements audio : blobs stockés à part (jamais dans S / localStorage).
function idbPutBlob(id,blob){return idbReq('recordings','readwrite',st=>st.put(blob,id),false);}
function idbGetBlob(id){return idbReq('recordings','readonly',st=>st.get(id),null).then(b=>b||null);}
function idbDelBlob(id){return idbReq('recordings','readwrite',st=>st.delete(id),false);}
function idbClearRecordings(){return idbReq('recordings','readwrite',st=>st.clear(),false);}

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
// localStorage ne sert que de repli quand IndexedDB est indisponible (mode privé, quota…).
function mirrorLS(){if(_db)return;try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
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
function dateOf(k){return new Date(k+'T00:00');}
function frDate(d){return d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});}
function frShort(k){return dateOf(k).toLocaleDateString('fr-FR',{day:'numeric',month:'short'});}
function frDay(k){return dateOf(k).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'short'});}
function big(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;
  return h?h+' h '+String(m).padStart(2,'0')+'′':m+'′ '+String(s).padStart(2,'0')+'″';}
function dur(sec){const m=Math.round(sec/60);if(m<60)return m+' min';const h=Math.floor(m/60),mm=m%60;return mm?h+' h '+String(mm).padStart(2,'0'):h+' h';}
function durH(sec){const h=sec/3600;return (h<10?h.toFixed(1).replace('.',','):Math.round(h).toLocaleString('fr-FR'))+' h';}
function minLabel(mins){mins=Math.round(mins);if(mins<60)return mins+'′';const h=Math.floor(mins/60),m=mins%60;return h+' h'+(m?' '+String(m).padStart(2,'0'):'');}
function goalLabel(mins){if(mins<60)return mins+' min';const h=Math.floor(mins/60),m=mins%60;return h+' h'+(m?' '+String(m).padStart(2,'0'):'');}
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s;}
function weekStart(d){d=d?new Date(d):new Date();const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);d.setHours(0,0,0,0);return d;}
function weekKey(d){return dkey(weekStart(d));}

/* ---------- Séances & temps ---------- */
function sessionSeconds(se){return (se.blocks||[]).reduce((a,b)=>a+(b.sec||0),0);}
// Séances « loin du clavier » (ancien mode vacances) : visibles au Carnet mais jamais comptées dans le temps joué.
function playSessions(){return S.sessions.filter(s=>s.mode!=='away');}
// Secondes jouées par jour, un seul balayage des séances.
function secondsByDay(){const m={};playSessions().forEach(s=>{m[s.date]=(m[s.date]||0)+sessionSeconds(s);});return m;}
function secondsOnDay(k){return secondsByDay()[k]||0;}
function totalSeconds(){return playSessions().reduce((a,s)=>a+sessionSeconds(s),0);}
function practiceDays(){return new Set(playSessions().map(s=>s.date));}
function weekSecondsArr(){const m=secondsByDay(),ws=weekStart();const out=[];for(let i=0;i<7;i++){const k=dkey(addDays(ws,i));out.push({k,s:m[k]||0});}return out;}
function todayGoal(){return S.settings.dailyGoal||30;}
// Nom d'un morceau d'une ancienne séance (V1–V5), lu dans les données dormantes.
function legacyPieceName(id){if(!id)return '';if(id===IMPROV)return 'Improvisation';const p=(S.pieces||[]).find(x=>x.id===id);return p?p.title:'';}
function legacyPieces(s){return [...new Set((s.blocks||[]).map(b=>legacyPieceName(b.piece)).filter(Boolean))];}

/* ---------- Série ---------- */
// Jours d'une ancienne période de vacances : gelés (ni incrément, ni rupture).
function isVacationDay(k){const v=S.vacation;if(!v||!v.from)return false;return k>=v.from&&k<=(v.until||dkey());}
function computeStreak(){const days=practiceDays();const tol=S.settings.tolerance||0;let st=0,miss=0,d=new Date();
  for(let i=0;i<3000;i++){const k=dkey(d);
    if(days.has(k)){st++;miss=0;}else if(isVacationDay(k)){/* gelé */}else if(i>0){miss++;if(miss>tol)break;}
    d=addDays(d,-1);}return st;}
function bestStreak(){const set=practiceDays();const arr=[...set].sort();if(!arr.length)return 0;const tol=S.settings.tolerance||0;
  let best=0,cur=0,miss=0,d=dateOf(arr[0]),end=new Date();
  while(d<=end){const k=dkey(d);
    if(set.has(k)){cur++;miss=0;best=Math.max(best,cur);}else if(isVacationDay(k)){/* gelé */}else{miss++;if(miss>tol){cur=0;miss=0;}}
    d=addDays(d,1);}return best;}

/* ---------- Rangs ---------- */
function currentStone(){const h=totalSeconds()/3600;let cur=null;for(const s of STONES)if(h>=s.h)cur=s;return cur;}
function nextStone(){const h=totalSeconds()/3600;return STONES.find(s=>s.h>h)||null;}
function glyphFor(i){return i<4?'♩':i<9?'♪':i<13?'♫':i<17?'♬':'𝄞';}
function rankGlyph(st){return st?glyphFor(STONES.indexOf(st)):'♪';}
