/* ==========================================================================
   carnet.js — CARNET. Historique des séances groupé par semaine, détail
   (note, ressenti, situation, enregistrements), modification, suppression,
   séance oubliée, et liste de tous les enregistrements audio.
   Les séances V1–V5 affichent discrètement les morceaux d'alors (lecture seule).
   ========================================================================== */
let carnetShown=60;
function renderCarnet(){
  const recN=S.recordings.length;
  document.getElementById('s-carnet').innerHTML=`
    <h1>Carnet</h1>
    <div class="row carnet-actions">
      <button class="btn ghost sm" onclick="sessionEditSheet()">+ Séance oubliée</button>
      ${recN?`<button class="btn ghost sm" onclick="recordingsSheet()">Enregistrements · ${recN}</button>`:''}
    </div>
    <div id="carnet-body"></div>`;
  renderCarnetBody();
}
function moreCarnet(){carnetShown+=60;renderCarnetBody();}
function truncWord(s,max){s=String(s||'').replace(/\s+/g,' ').trim();if(s.length<=max)return s;const cut=s.slice(0,max+1);const sp=cut.lastIndexOf(' ');return (sp>0?cut.slice(0,sp):cut.slice(0,max))+'…';}
// Texte libre d'une séance : note V6, ou « travaillé / à faire » des anciennes séances.
function sessionText(s){
  if(s.note)return s.note;
  const parts=[];(s.entries||[]).forEach(e=>{if(e.worked)parts.push(e.worked);if(e.next)parts.push('À faire : '+e.next);});
  if(s.worked)parts.push(s.worked);if(s.next)parts.push('À faire : '+s.next);
  return parts.join(' · ');
}
function sessionRecs(s){return S.recordings.filter(r=>r.sessionId===s.id);}
const AWAY_KINDS={ecoute:'Écoute active',lecture:'Lecture de partition',mental:'Travail mental'};

function renderCarnetBody(){
  const el=document.getElementById('carnet-body');if(!el)return;
  const all=[...S.sessions].sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(b.ts||0)-(a.ts||0));
  const shown=all.slice(0,carnetShown);
  if(!shown.length){el.innerHTML=emptyState('Aucune séance pour l’instant.<br>Lance le chrono depuis l’accueil.','stand');return;}
  const curWk=weekKey();
  let html='',gWk='',gSec=0,gDays=new Set(),gItems=[];
  const flush=()=>{if(!gItems.length)return;
    html+=`<div class="carnet-week-head"><span class="eyebrow">${gWk===curWk?'Cette semaine':'Semaine du '+frShort(gWk)}</span>
      <span class="num it muted carnet-week-sub">${dur(gSec)} · ${gDays.size} j</span></div>${gItems.join('')}`;};
  shown.forEach(s=>{
    const wk=weekKey(dateOf(s.date));
    if(wk!==gWk){flush();gWk=wk;gSec=0;gDays=new Set();gItems=[];}
    const away=s.mode==='away';
    if(!away){gSec+=sessionSeconds(s);gDays.add(s.date);}
    const legacy=legacyPieces(s).join(' · ');
    const meta=[away?(AWAY_KINDS[s.awayKind]||'Loin du clavier'):'',s.feeling?feelLabel(s.feeling):'',s.focus?situationLabel(s.focus):'',sessionRecs(s).length?'● '+sessionRecs(s).length:''].filter(Boolean).join(' · ');
    const txt=sessionText(s);
    gItems.push(`<button class="carnet-entry" onclick="sessionDetail('${s.id}')">
      <div class="carnet-entry-body">
        <div class="between"><span class="carnet-entry-title">${cap(frDay(s.date))}</span><span class="num it carnet-entry-dur">${dur(sessionSeconds(s))}</span></div>
        ${meta?`<div class="carnet-entry-meta">${away?'<span class="tag tag-sm">Loin du clavier</span> ':''}${esc(meta)}</div>`:''}
        ${txt?`<div class="carnet-entry-note">${esc(truncWord(txt,90))}</div>`:''}
        ${legacy?`<div class="carnet-entry-legacy">${esc(legacy)}</div>`:''}
      </div></button>`);
  });
  flush();
  el.innerHTML=html+(all.length>carnetShown?`<button class="btn ghost sm btn-full mt18" onclick="moreCarnet()">Afficher 60 séances de plus</button>
    <p class="muted center small">${shown.length} séances sur ${all.length}</p>`:'');
}

/* ---------- Détail ---------- */
function sessionDetail(id){
  const s=S.sessions.find(x=>x.id===id);if(!s)return;
  const away=s.mode==='away',legacy=legacyPieces(s),recs=sessionRecs(s),txt=sessionText(s);
  openSheet(`<h3>${cap(frDay(s.date))}</h3>
    <p class="muted sheet-sub"><span class="num it">${dur(sessionSeconds(s))}</span>${away?' · loin du clavier, non compté dans le temps joué':''}</p>
    ${s.feeling||s.focus?`<div class="chips mb10">${s.feeling?`<span class="tag">${esc(feelLabel(s.feeling))}</span>`:''}${s.focus?`<span class="tag">${esc(situationLabel(s.focus))}</span>`:''}</div>`:''}
    ${txt?`<div class="card detail-note">${esc(txt)}</div>`:''}
    ${legacy.length?`<p class="muted small">Morceaux : ${esc(legacy.join(' · '))}</p>`:''}
    ${recs.length?`<div class="eyebrow mt18">Enregistrements</div>${recs.map(recRow).join('')}`:''}
    ${away?'':`<button class="btn ghost btn-full mt18" onclick="sessionEditSheet('${s.id}')">Modifier</button>`}
    <button class="btn-link danger-txt" onclick="deleteSession('${s.id}')">Supprimer la séance</button>`);
}

/* ---------- Ajout / modification ---------- */
function sessionEditSheet(id){
  const s=id?S.sessions.find(x=>x.id===id):null;
  const minutes=s?Math.max(1,Math.round(sessionSeconds(s)/60)):todayGoal();
  openSheet(`<h3>${s?'Modifier la séance':'Séance oubliée'}</h3>
    <div class="field"><label>Date</label><input type="date" id="a-date" value="${s?s.date:dkey()}" max="${dkey()}"></div>
    <div class="field"><label>Durée (minutes)</label><input type="number" id="a-min" inputmode="numeric" value="${minutes}" min="1"></div>
    <div class="field"><label>Ressenti (facultatif)</label>${dynPicker('a-f',s?s.feeling:'')}</div>
    <div class="field"><label>Une note (facultatif)</label><textarea id="a-n">${esc(s?s.note||'':'')}</textarea></div>
    <button class="btn primary" onclick="saveSessionEdit('${s?s.id:''}')">${s?'Enregistrer':'Ajouter la séance'}</button>`);
}
function saveSessionEdit(id){
  const date=document.getElementById('a-date').value||dkey();
  const sec=Math.max(1,parseInt(document.getElementById('a-min').value)||1)*60;
  const note=document.getElementById('a-n').value.trim(),feeling=_dyn['a-f']||'';
  const beforeRank=currentStone();
  if(id){
    const s=S.sessions.find(x=>x.id===id);if(!s)return;
    const old=sessionSeconds(s);
    // Durée inchangée à la minute près : on garde les secondes exactes. Sinon, répartition au prorata des anciens blocs.
    if(Math.round(old/60)!==sec/60){
      if(s.blocks.length>1){const o=old||1;s.blocks=s.blocks.map(b=>({...b,sec:Math.max(1,Math.round(b.sec/o*sec))}));}
      else s.blocks=[{piece:(s.blocks[0]||{}).piece||'',sec}];
    }
    Object.assign(s,{date,feeling,note});
  }else{
    S.sessions.push({id:uid(),date,mode:'chrono',goal:todayGoal(),feeling,note,focus:null,blocks:[{piece:'',sec}],ts:Date.now()});
  }
  save();closeSheet();renderCarnet();
  const after=currentStone();
  if(after&&(!beforeRank||after.n!==beforeRank.n))celebrate(after.n,'Rang '+(STONES.indexOf(after)+1)+' sur '+STONES.length);
  else toast('Séance enregistrée');
}
function deleteSession(id){confirmSheet('Supprimer cette séance ? Ses enregistrements audio sont conservés.','Supprimer',()=>{
  S.sessions=S.sessions.filter(s=>s.id!==id);
  S.recordings.forEach(r=>{if(r.sessionId===id)r.sessionId=null;});
  save();renderCarnet();toast('Séance supprimée');});}

/* ---------- Enregistrements ---------- */
function fmtBytes(n){if(!n)return '';if(n<1024*1024)return Math.round(n/1024)+' Ko';return (n/1024/1024).toFixed(1).replace('.',',')+' Mo';}
function recRow(r){
  return `<div class="rec-row" id="rec-row-${r.id}">
    <button class="rec-play-btn" onclick="playRecording('${r.id}')" aria-label="Écouter">${playSvg(17)}</button>
    <div class="rec-info">
      <div class="rec-title">${esc(r.label||cap(frDay(r.date)))}</div>
      <div class="muted rec-meta">${r.label?esc(frShort(r.date))+' · ':''}<span class="num">${dur(r.dur)}</span>${r.size?' · <span class="num">'+fmtBytes(r.size)+'</span>':''}${r.feel?' · '+esc(feelLabel(r.feel)):''}</div>
      <div id="rec-pl-${r.id}" class="rec-player"></div>
    </div>
    <button class="btn ghost sm danger-outline" onclick="deleteRecording('${r.id}')">Suppr.</button>
  </div>`;
}
function recordingsSheet(){
  const recs=[...S.recordings].reverse();
  openSheet(`<h3>Enregistrements</h3>
    <p class="muted sheet-sub">${recs.length} enregistrement${recs.length>1?'s':''}, conservé${recs.length>1?'s':''} sur cet appareil.</p>
    ${recs.length?recs.map(recRow).join(''):emptyState('Aucun enregistrement.','stand','empty-sm')}`);
}
async function playRecording(rid){
  const box=document.getElementById('rec-pl-'+rid);if(!box)return;
  box.innerHTML='<span class="muted small">Chargement…</span>';
  const blob=await idbGetBlob(rid);
  if(!blob){box.innerHTML='<span class="muted small">Audio introuvable.</span>';return;}
  const url=URL.createObjectURL(blob);_recUrls.push(url);
  box.innerHTML=`<audio controls autoplay class="rec-audio" src="${url}"></audio>`;
}
function deleteRecording(rid){
  confirmSheet('Supprimer cet enregistrement ?','Supprimer',()=>{
    S.recordings=S.recordings.filter(r=>r.id!==rid);
    save();idbDelBlob(rid);
    if(document.getElementById('s-carnet').classList.contains('active'))renderCarnet();
    toast('Enregistrement supprimé');
  });
}
