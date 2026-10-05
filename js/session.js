/* ==========================================================================
   session.js — SÉANCE. Un chrono qui monte, un anneau qui se remplit vers
   l'objectif du jour, une carte « méthode » facultative, l'enregistrement
   audio, et la fin de séance (tout facultatif).

   Le temps est calculé à partir d'horodatages (acc + depuis `since`), jamais
   par accumulation de ticks : il reste juste après une mise en veille, et le
   chrono en cours est conservé dans localStorage (TIMER_KEY) pour survivre à
   un rechargement ou à iOS qui tue la PWA en arrière-plan.
   ========================================================================== */
const TIMER_KEY='pianoV2.timer';
let timer=null,tickInt=null,_mList=[],_mIdx=0;
let _wakeLock=null;
async function acquireWakeLock(){try{_wakeLock=await navigator.wakeLock.request('screen');}catch(e){}}
function releaseWakeLock(){try{_wakeLock&&_wakeLock.release();}catch(e){}_wakeLock=null;}

function elapsed(){if(!timer)return 0;return timer.acc+(timer.since?(Date.now()-timer.since)/1000:0);}
function persistTimer(){try{if(timer)localStorage.setItem(TIMER_KEY,JSON.stringify(timer));else localStorage.removeItem(TIMER_KEY);}catch(e){}}
function storedTimer(){try{const t=JSON.parse(localStorage.getItem(TIMER_KEY)||'null');return t&&t.start?t:null;}catch(e){return null;}}

function beginSession(){
  if(timer){go('session');renderSession();return;}
  const now=Date.now();
  timer={start:now,acc:0,since:now,focus:S.settings.focus||null,recIds:[],goalHit:false};
  timer.goalHit=secondsOnDay(dkey())>=todayGoal()*60; // déjà atteint aujourd'hui : pas de nouvelle annonce
  persistTimer();shuffleMethods();
  go('session');renderSession();startTick();acquireWakeLock();
}
// Reprise d'un chrono interrompu (rechargement, PWA tuée par iOS) — appelée au boot.
function resumeStoredSession(){
  const t=storedTimer();if(!t)return false;
  timer=Object.assign({recIds:[],goalHit:false},t);shuffleMethods();
  go('session');renderSession();startTick();if(timer.since)acquireWakeLock();
  return true;
}
function startTick(){clearInterval(tickInt);tickInt=setInterval(paintSession,500);paintSession();}
function sessionDay(){return dkey(new Date(timer.start));}

function renderSession(){
  if(!timer)return;
  timer.base=secondsOnDay(sessionDay()); // déjà joué ce jour-là, hors séance en cours
  const startH=new Date(timer.start).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('s-session').innerHTML=`
    <div class="between sess-head">
      <span class="eyebrow">Séance · depuis ${startH}</span>
      <button class="btn ghost sm" onclick="methodsSheet(timer&&timer.focus)">Méthodes</button>
    </div>
    <div class="sess-stage">
      <div class="sess-halo" id="ss-halo"></div>
      <div class="ring sess-ring">${ringSvg('ss-ring',0,false,264)}
        <div class="c"><b class="num it sess-time" id="ss-time">0′ 00″</b><span id="ss-goal"></span></div>
      </div>
    </div>
    <div class="sess-controls">
      <div class="sess-ctrl"><button id="ss-pause" onclick="togglePause()" class="sess-ctrl-btn sess-pause-btn" aria-label="Pause">❚❚</button><div class="sess-ctrl-lbl" id="ss-pause-lbl">Pause</div></div>
      <div class="sess-ctrl"><button onclick="stopSession()" class="sess-ctrl-btn sess-stop-btn" aria-label="Terminer">■</button><div class="sess-ctrl-lbl">Terminer</div></div>
      ${recAvailable()?`<div class="sess-ctrl"><button id="ss-rec" onclick="toggleRecording()" class="sess-ctrl-btn sess-rec-btn" aria-label="Enregistrer">●</button><div class="sess-ctrl-lbl" id="ss-rec-lbl">Enregistrer</div></div>`:''}
    </div>
    <div class="eyebrow sess-label">Aujourd’hui je…</div>
    <div class="chips-scroll" id="ss-focus">${focusChips()}</div>
    <div id="ss-method">${methodCard()}</div>`;
  paintSession();
}
function focusChips(){
  const f=timer&&timer.focus;
  return SITUATIONS.map(s=>`<button class="chip ${f===s.k?'on':''}" onclick="setFocus('${s.k}')">${s.label}</button>`).join('');
}
function setFocus(k){
  if(!timer)return;
  timer.focus=timer.focus===k?null:k;
  S.settings.focus=timer.focus;save();persistTimer();shuffleMethods();
  document.getElementById('ss-focus').innerHTML=focusChips();
  document.getElementById('ss-method').innerHTML=methodCard();
}
function shuffleMethods(){
  _mList=methodsFor(timer&&timer.focus);
  for(let i=_mList.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[_mList[i],_mList[j]]=[_mList[j],_mList[i]];}
  _mIdx=0;
}
function methodCard(){
  const m=_mList[_mIdx];if(!m)return '';
  return `<button class="card method-card" onclick="nextMethod()" aria-label="Méthode suivante">
    <span class="eyebrow">${timer&&timer.focus?'Une idée':esc(situationLabel(m.s))}</span>
    <span class="method-t serif">${esc(m.t)}</span>
    <span class="method-d">${esc(m.d)}</span>
    <span class="method-foot"><span class="muted num">${_mIdx+1} / ${_mList.length}</span><span class="method-next">Une autre idée ›</span></span>
  </button>`;
}
function nextMethod(){_mIdx=(_mIdx+1)%(_mList.length||1);const el=document.getElementById('ss-method');if(el)el.innerHTML=methodCard();}

function paintSession(){
  if(!timer)return;
  const e=elapsed(),goal=todayGoal()*60,day=(timer.base||0)+e,pct=goal?day/goal:0;
  const t=document.getElementById('ss-time');if(t)t.textContent=big(e);
  const g=document.getElementById('ss-goal');
  if(g)g.textContent=pct>=1?'objectif atteint':'encore '+minLabel(Math.ceil((goal-day)/60))+' · objectif';
  const ring=document.getElementById('ss-ring');
  if(ring){ring.style.strokeDashoffset=RING_C*(1-Math.min(1,pct));
    if(pct>=1&&!ring.classList.contains('done')){ring.classList.add('done');ring.setAttribute('stroke','var(--gold)');}}
  if(pct>=1&&!timer.goalHit){timer.goalHit=true;persistTimer();buzz();toast('Objectif du jour atteint');}
  const running=!!timer.since;
  const halo=document.getElementById('ss-halo');if(halo)halo.classList.toggle('paused',!running);
  const pb=document.getElementById('ss-pause');if(pb){pb.textContent=running?'❚❚':'▶';pb.setAttribute('aria-label',running?'Pause':'Reprendre');}
  const pl=document.getElementById('ss-pause-lbl');if(pl)pl.textContent=running?'Pause':'Reprendre';
  if(t)t.classList.toggle('paused',!running);
  const rb=document.getElementById('ss-rec');if(rb){rb.textContent=_rec?'■':'●';rb.classList.toggle('rec',!!_rec);}
  const rl=document.getElementById('ss-rec-lbl');if(rl)rl.textContent=_rec?big((Date.now()-_rec.startTs)/1000):'Enregistrer';
}
function pauseTimer(){if(timer&&timer.since){timer.acc=elapsed();timer.since=null;persistTimer();}}
function resumeTimer(){if(timer&&!timer.since){timer.since=Date.now();persistTimer();acquireWakeLock();}}
function togglePause(){if(!timer)return;if(timer.since)pauseTimer();else resumeTimer();paintSession();}

/* ---------- Fin de séance ---------- */
let _endWasRunning=false;
function stopSession(){
  if(!timer)return;
  if(_rec){toast("Arrête d'abord l'enregistrement en cours",{danger:true});return;}
  _endWasRunning=!!timer.since;pauseTimer();paintSession();
  const total=Math.round(elapsed()),mins=Math.max(1,Math.round(total/60));
  openSheet(`<h3>Fin de séance</h3>
    <div class="end-time num it">${big(total)}</div>
    <div class="field"><label>Durée retenue (minutes)</label><input type="number" id="end-min" inputmode="numeric" min="1" value="${mins}" data-orig="${mins}"></div>
    <div class="field"><label>Ressenti (facultatif)</label>${dynPicker('end-f','')}</div>
    <div class="field"><label>Une note (facultatif)</label><textarea id="end-n" placeholder="Ce qui a marché, ce qui reste à reprendre…"></textarea></div>
    <button class="btn primary" onclick="commitSession(${total})">Enregistrer</button>
    <button class="btn ghost sm btn-full mt10" onclick="backToSession()">Reprendre la séance</button>
    <button class="btn-link danger-txt" onclick="discardSession()">Ne pas enregistrer</button>`);
}
function backToSession(){closeSheet();if(_endWasRunning)resumeTimer();paintSession();}
function discardSession(){confirmSheet('Cette séance ne sera pas comptée.','Ne pas enregistrer',()=>{endTimer();go('home');toast('Séance non enregistrée');});}
function endTimer(){timer=null;persistTimer();clearInterval(tickInt);releaseWakeLock();}
function commitSession(total){
  const minEl=document.getElementById('end-min');
  const min=Math.max(1,parseInt(minEl&&minEl.value)||1);
  const sec=minEl&&String(min)!==minEl.dataset.orig?min*60:Math.max(1,total); // durée exacte sauf correction manuelle
  const note=(document.getElementById('end-n')||{}).value||'';
  const beforeRank=currentStone(),beforeAch=unlockedIds();
  const s={id:uid(),date:sessionDay(),mode:'chrono',goal:todayGoal(),feeling:_dyn['end-f']||'',note:note.trim(),focus:timer.focus||null,
    blocks:[{piece:'',sec}],ts:Date.now()};
  S.sessions.push(s);
  (timer.recIds||[]).forEach(id=>{const r=S.recordings.find(x=>x.id===id);if(r)r.sessionId=s.id;});
  save();endTimer();closeSheet();go('home');
  const after=currentStone(),fresh=achievements().filter(a=>a.on&&!beforeAch.has(a.id));
  if(after&&(!beforeRank||after.n!==beforeRank.n))setTimeout(()=>celebrate(after.n,Math.round(totalSeconds()/3600)+' heures de piano · rang '+(STONES.indexOf(after)+1)+' sur '+STONES.length),300);
  else if(fresh.length)toast('Succès : '+fresh[0].label+(fresh.length>1?' (+'+(fresh.length-1)+')':''));
  else toast('Séance enregistrée · '+dur(sec));
}

/* ---------- Enregistrement audio ---------- */
let _rec=null,_recDraft=null,_recInterrupted=false;
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
  if(!recAvailable()){toast('Enregistrement audio indisponible sur cet appareil',{danger:true});return;}
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}
  catch(e){toast('Micro indisponible ou refusé',{danger:true});return;}
  const mime=recMime();
  let mr;
  try{mr=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);}
  catch(e){toast('Enregistrement impossible sur cet appareil',{danger:true});stream.getTracks().forEach(t=>t.stop());return;}
  const chunks=[];
  mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  mr.onstop=()=>finalizeRecording();
  _rec={mr,stream,mime,chunks,startTs:Date.now(),interruptTs:0};
  _recInterrupted=false;
  mr.start();
  paintSession();
}
function stopRecording(){if(_rec&&_rec.mr&&_rec.mr.state!=='inactive')_rec.mr.stop();}
// iOS suspend la captation micro dès que l'app passe en arrière-plan (écran verrouillé) :
// on fige l'instant d'interruption et on stoppe, pour ne garder que le son réellement capté.
function interruptRecording(){if(!_rec)return;_recInterrupted=true;_rec.interruptTs=Date.now();stopRecording();}
// Finalisation unique et idempotente : appelée par onstop, ou en secours au retour au premier
// plan si onstop n'a pas pu se déclencher pendant la suspension iOS.
function finalizeRecording(){
  if(!_rec)return;
  const {stream,mime,chunks,startTs,interruptTs,mr}=_rec;
  try{stream.getTracks().forEach(t=>t.stop());}catch(e){}
  const blob=new Blob(chunks,{type:(mr&&mr.mimeType)||mime||'audio/webm'});
  const durSec=Math.max(1,Math.round(((interruptTs||Date.now())-startTs)/1000));
  _rec=null;paintSession();
  if(!blob.size){_recInterrupted=false;toast('Enregistrement interrompu, aucun son capté',{danger:true});return;}
  const interrupted=_recInterrupted;_recInterrupted=false;
  _recDraft={blob,durSec};
  openSheet(`<h3>Enregistrement</h3>
    <p class="muted sheet-sub">${dur(durSec)}</p>
    ${interrupted?`<p class="rec-warn">Écran verrouillé pendant l'enregistrement : seul le son capté avant le verrouillage a été gardé.</p>`:''}
    <div class="field"><label>Ressenti à l'écoute (facultatif)</label>${dynPicker('rec-f','')}</div>
    <button class="btn primary" onclick="saveRecording()">Garder</button>
    <button class="btn ghost sm btn-full mt10" onclick="discardRecording()">Ne pas garder</button>`);
}
async function saveRecording(){
  if(!_recDraft)return;
  const {blob,durSec}=_recDraft;_recDraft=null;
  const id=uid();
  const ok=await idbPutBlob(id,blob);
  if(!ok){toast("Impossible d'enregistrer l'audio",{danger:true});closeSheet();return;}
  S.recordings.push({id,date:timer?sessionDay():dkey(),dur:durSec,feel:_dyn['rec-f']||'',size:blob.size,mime:blob.type,sessionId:null});
  if(timer){timer.recIds=timer.recIds||[];timer.recIds.push(id);persistTimer();}
  save();closeSheet();toast('Enregistrement gardé');
}
function discardRecording(){_recDraft=null;closeSheet();}
