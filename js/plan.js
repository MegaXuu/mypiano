/* ==========================================================================
   LOT 2 partie 2 — plan guidé (Chang), simulation de concert, rapport hebdo
   ========================================================================== */
let _plan=null,_planDraft=null,_planTouchedN=false;
function changConsigne(p){
  if(hasDerivedProgress(p)){
    const pick=pickTodaySection(p),d=pick&&pick.s.diff;
    if(d>=3)return "Section difficile : très lent, mains séparées, en boucles courtes.";
    if(d===1)return "Section facile : consolide et enchaîne sans t'arrêter.";
  }
  const pr=pieceProgress(p);if(pr<30)return "Passage le plus difficile d'abord, mains séparées, très lent.";if(pr<70)return "Mains ensemble, monte le tempo par petits paliers.";return "Peaufine les nuances et joue de mémoire.";}
function sectionConsigne(s){const d=s.diff||0;
  if(d>=3)return "Section difficile : très lent, mains séparées, en boucles courtes.";
  if(d===1)return "Section facile : consolide et enchaîne sans t'arrêter.";
  return "Mains ensemble, monte le tempo par petits paliers.";}

/* ---------- Plan guidé v2 (générateur paramétré, Bêta 4.3) ---------- */
const PLAN_INTENTS=[{k:'apprendre',label:'Apprendre'},{k:'consolider',label:'Consolider'},{k:'entretenir',label:'Entretenir'},{k:'equilibre',label:'Équilibré'}];
function suggestPlanN(dur){return dur<=30?1:dur<=60?2:3;}
// Répartit `total` entre les poids donnés (arrondi proportionnel, écart absorbé par le plus gros bloc), plancher `min`.
function distribute(total,weights,min){
  min=min||0;const n=weights.length;if(!n)return[];
  total=Math.max(total,min*n);
  const sumW=weights.reduce((a,b)=>a+b,0)||n;
  const mins=weights.map(w=>Math.max(min,Math.round(total*w/sumW)));
  const diff=total-mins.reduce((a,b)=>a+b,0);
  if(diff!==0){const idx=mins.indexOf(Math.max(...mins));mins[idx]=Math.max(1,mins[idx]+diff);}
  return mins;
}
function planWeight(p){return hasDerivedProgress(p)?Math.max(1,weightedRemainingBars(p)):Math.max(5,100-pieceProgress(p));}
function planPieceBlocks(p,budgetMin){
  if(hasDerivedProgress(p)){
    const secsNotOk=secList(p).filter(s=>s.status!=='ok');
    if(secsNotOk.length){
      const withDate=secsNotOk.map(s=>({s,d:secLastWorked(p,s)||''}));
      // Plus difficile d'abord ; à difficulté égale, la moins récemment travaillée.
      withDate.sort((a,b)=>{const ad=a.s.diff||0,bd=b.s.diff||0;if(ad!==bd)return bd-ad;if(a.d!==b.d)return a.d<b.d?-1:1;return(a.s.from|0)-(b.s.from|0);});
      const maxSecs=Math.max(1,Math.min(withDate.length,Math.floor(budgetMin/4)||1));
      const chosen=withDate.slice(0,maxSecs).map(x=>x.s);
      const weights=chosen.map(s=>DIFF_WEIGHT[s.diff]||DIFF_WEIGHT[2]);
      const mins=distribute(budgetMin,weights,3);
      return chosen.map((s,i)=>({piece:p.id,sectionId:s.id,focus:s.name,min:mins[i],consigne:sectionConsigne(s)}));
    }
  }
  return[{piece:p.id,focus:'Travail',min:budgetMin,consigne:changConsigne(p)}];
}
function pickPlanPieces(n,intent){
  const learnPool=S.pieces.filter(p=>!p.isEnsemble&&p.status==='active');
  const revPool=revisionList();
  const allPlayable=activePieces();
  let list;
  if(intent==='apprendre'){
    list=learnPool.slice().sort((a,b)=>pieceProgress(a)-pieceProgress(b));
  }else if(intent==='consolider'){
    list=learnPool.filter(p=>{const k=piecePhase(p).k;return k==='consolidation'||k==='polissage';}).sort((a,b)=>pieceProgress(a)-pieceProgress(b));
    if(list.length<n)list=list.concat(learnPool.filter(p=>!list.includes(p)).sort((a,b)=>pieceProgress(a)-pieceProgress(b)));
  }else if(intent==='entretenir'){
    list=revPool.slice();
    if(list.length<n)list=list.concat(allPlayable.filter(p=>!list.includes(p)).sort((a,b)=>(pieceLastPlayed(a.id)||'').localeCompare(pieceLastPlayed(b.id)||'')));
  }else{
    const half=Math.ceil(n/2);
    list=revPool.slice(0,half);
    list=list.concat(learnPool.filter(p=>!list.includes(p)).sort((a,b)=>pieceProgress(a)-pieceProgress(b)));
    if(list.length<n)list=list.concat(allPlayable.filter(p=>!list.includes(p)));
  }
  return list.slice(0,n);
}
function generatePlan(params){
  params=params||S.settings.planPrefs||{dur:60,n:2,intent:'equilibre'};
  const dur=params.dur,n=params.n,intent=params.intent;
  const warm=Math.min(8,Math.max(3,Math.round(dur*0.10)));
  const play=Math.max(3,Math.round(dur*0.08));
  const pieces=pickPlanPieces(n,intent);
  const revCandidate=intent!=='apprendre'&&intent!=='entretenir'?revisionList().find(p=>!pieces.includes(p)):null;
  const maint=revCandidate?Math.max(5,Math.round(dur*0.15)):0;
  const workBudget=Math.max(0,dur-warm-play-maint);
  const blocks=[{piece:null,focus:'Échauffement',min:warm,consigne:'Gammes et mouvements lents, mains détendues.'}];
  if(pieces.length){
    const weights=pieces.map(planWeight);
    const perPiece=distribute(workBudget,weights,5);
    pieces.forEach((p,i)=>blocks.push(...planPieceBlocks(p,perPiece[i])));
  }else if(workBudget>0){
    blocks.push({piece:null,focus:'Travail libre',min:workBudget,consigne:'Improvise ou reprends un morceau récent.'});
  }
  if(revCandidate)blocks.push({piece:revCandidate.id,focus:'Entretien',min:maint,consigne:'Filage lent pour réactiver la mémoire.'});
  const last=pieces[0]||activePieces()[0]||null;
  blocks.push({piece:last?last.id:null,focus:'Filage',min:play,consigne:"Joue en entier sans t'arrêter, comme en concert."});
  return blocks;
}
function renderPlanPreview(){
  _plan=generatePlan(_planDraft);
  return _plan.map(b=>`<div class="card plan-block-card"><div class="between"><span class="plan-block-title">${esc(b.focus)}${b.piece?' · '+esc(pieceName(b.piece)):''}</span><span class="num plan-block-min">${b.min} min</span></div><div class="plan-block-consigne">${esc(b.consigne)}</div></div>`).join('');
}
function regenPlanPreview(){const el=document.getElementById('pg-preview');if(el)el.innerHTML=renderPlanPreview();}
function planSheet(){
  const pr=S.settings.planPrefs||{dur:60,n:2,intent:'equilibre'};
  _planDraft={dur:pr.dur,n:pr.n,intent:pr.intent};_planTouchedN=false;
  openSheet(`<h3>Plan guidé</h3><p class="muted sheet-sub">Compose ta séance : durée, nombre de pièces, intention.</p>
    <div class="field"><label>Durée</label><div class="chips" id="pg-dur">${[30,45,60,75,90].map(m=>`<button class="chip ${m===_planDraft.dur?'on':''}" onclick="pgSetDur(${m},this)">${m} min</button>`).join('')}</div></div>
    <div class="field"><label>Nombre de pièces</label>
      <div class="stepper sess-stepper"><button onclick="pgStepN(-1)">–</button><div class="v" id="pg-n">${_planDraft.n}</div><button onclick="pgStepN(1)">+</button></div></div>
    <div class="field"><label>Intention</label><div class="seg" id="pg-intent">${PLAN_INTENTS.map(it=>`<button class="${it.k===_planDraft.intent?'on':''}" onclick="pgSetIntent('${it.k}',this)">${it.label}</button>`).join('')}</div></div>
    <h2 class="pg-preview-h">Aperçu</h2>
    <div id="pg-preview">${renderPlanPreview()}</div>
    <button class="btn primary" onclick="launchPlan()">Lancer le plan</button>`);
}
function pgSetDur(m,el){
  _planDraft.dur=m;
  document.querySelectorAll('#pg-dur .chip').forEach(b=>b.classList.remove('on'));el.classList.add('on');
  if(!_planTouchedN){_planDraft.n=suggestPlanN(m);const nv=document.getElementById('pg-n');if(nv)nv.textContent=_planDraft.n;}
  regenPlanPreview();
}
function pgStepN(delta){
  _planTouchedN=true;_planDraft.n=Math.max(1,Math.min(4,_planDraft.n+delta));
  const nv=document.getElementById('pg-n');if(nv)nv.textContent=_planDraft.n;
  regenPlanPreview();
}
function pgSetIntent(k,el){
  _planDraft.intent=k;
  document.querySelectorAll('#pg-intent button').forEach(b=>b.classList.remove('on'));el.classList.add('on');
  regenPlanPreview();
}
function startPlanSession(plan){
  if(!plan||!plan.length)return;
  closeSheet();const f=plan[0];
  timer={mode:'guided',target:0,total:0,running:true,last:Date.now(),blocks:[{piece:f.piece||IMPROV,sec:0}],goal:todayGoal(),plan,planIdx:0,blockPending:false,interval:null};
  go('session');renderSession();startTick();acquireWakeLock();
}
function launchPlan(){
  if(!_plan||!_plan.length)return;
  S.settings.planPrefs=Object.assign({},_planDraft);save();
  startPlanSession(_plan);
}
function startRevision(){const list=revisionList().slice(0,3);if(!list.length)return;
  const min=Math.max(5,Math.round((S.settings.dailyGoal||30)/list.length));
  const plan=list.map(p=>({piece:p.id,focus:'Entretien',min,consigne:'Filage lent pour réactiver la mémoire.'}));
  _plan=plan;startPlanSession(plan);
}

let _program=[],_concert=null,_concertInt=null;
function concertSheet(){
  const active=S.pieces.filter(p=>!p.isEnsemble&&(p.status==='active'||p.status==='mastered'));
  openSheet(`<h3>Simulation de concert</h3><p class="muted sheet-sub">Compose ton programme, puis joue-le d'affilée sans t'arrêter.</p>
    <div class="field"><label>Programme (${_program.length})</label>
      ${_program.length?_program.map((id,i)=>`<div class="item concert-item"><div class="title concert-item-title">${i+1}. ${esc(pieceName(id))}</div><button class="btn ghost sm" onclick="progRemove(${i})">Retirer</button></div>`).join(''):'<p class="muted concert-chips-empty">Vide pour l\'instant.</p>'}</div>
    <div class="field"><label>Ajouter</label><div class="chips">${active.length?active.map(p=>`<button class="chip" onclick="progAdd('${p.id}')">${esc(p.title)}</button>`).join(''):'<span class="muted concert-chips-empty">Aucun morceau dans le répertoire.</span>'}</div></div>
    <button class="btn primary" onclick="runConcert()">Lancer la simulation</button>`);
}
function progAdd(id){_program.push(id);concertSheet();}
function progRemove(i){_program.splice(i,1);concertSheet();}
function runConcert(){if(!_program.length){toast('Ajoute au moins un morceau',{danger:true});return;}closeSheet();_concert={idx:0,times:_program.map(()=>0),rates:_program.map(()=>1)};concertStage();}
function concertStage(){
  const id=_program[_concert.idx],isLast=_concert.idx===_program.length-1;
  let o=document.getElementById('concert-ov');if(!o){o=document.createElement('div');o.id='concert-ov';document.body.appendChild(o);}
  o.className='concert-ov';
  o.innerHTML=`<div class="muted concert-ov-eyebrow">MORCEAU ${_concert.idx+1} / ${_program.length}</div>
    <div class="serif concert-ov-title">${esc(pieceName(id))}</div>
    <div class="num concert-ov-time" id="concert-time">00 : 00</div>
    <button class="btn primary concert-ov-btn" onclick="concertNext()">${isLast?'Terminer':'Morceau suivant ▸'}</button>
    <div class="muted concert-ov-hint">Ne t'arrête pas — comme en vrai.</div>`;
  clearInterval(_concertInt);_concert.pieceStart=Date.now();
  _concertInt=setInterval(()=>{const el=document.getElementById('concert-time');if(el)el.textContent=clock((Date.now()-_concert.pieceStart)/1000);},500);
}
function concertNext(){_concert.times[_concert.idx]=Math.round((Date.now()-_concert.pieceStart)/1000);clearInterval(_concertInt);
  if(_concert.idx<_program.length-1){_concert.idx++;concertStage();}else concertDebrief();}
function concertDebrief(){
  const o=document.getElementById('concert-ov');const RATE=['À revoir','Correct','Solide'];
  o.className='concert-debrief-ov';
  o.innerHTML=`<div class="concert-debrief-inner"><h1 class="concert-debrief-h1">Débrief</h1>
    <p class="muted concert-debrief-sub">Comment s'est passé chaque morceau ?</p>
    ${_program.map((id,i)=>`<div class="card concert-debrief-card"><div class="concert-debrief-name">${esc(pieceName(id))}</div>
      <div class="seg">${RATE.map((r,j)=>`<button class="${j===1?'on':''}" onclick="rateConcert(${i},${j},this)">${r}</button>`).join('')}</div></div>`).join('')}
    <button class="btn primary" onclick="saveConcert()">Enregistrer la simulation</button>
    <button class="btn ghost sm concert-debrief-cancel" onclick="closeConcert()">Annuler</button></div>`;
}
function rateConcert(i,j,el){_concert.rates[i]=j;el.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('on'));el.classList.add('on');}
function closeConcert(){const o=document.getElementById('concert-ov');if(o)o.remove();clearInterval(_concertInt);_concert=null;}
function saveConcert(){
  const blocks=_program.map((id,i)=>({piece:id,sec:Math.max(1,_concert.times[i]||0)}));
  const first=!S.sessions.some(s=>s.mode==='concert');
  S.sessions.push({id:uid(),date:dkey(),mode:'concert',goal:todayGoal(),feeling:'',blocks,concert:{rates:_concert.rates},ts:Date.now()});
  S.challenges.log.push({id:'concert:'+uid(),reward:300,label:'Simulation de concert'});
  save();checkChallenges();closeConcert();_program=[];go('home');
  celebrate('concert',blocks.length+' morceau'+(blocks.length>1?'x':'')+', sans arrêt','+300 ♪'+(first?' · succès « Sur scène »':''));
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
  const topHtml=r.top.length?('<div class="muted report-top-label">Le plus travaillé</div>'+r.top.map(function(e){return '<div class="between report-top-row"><span>'+esc(pieceName(e[0]))+'</span><span class="muted">'+dur(e[1])+'</span></div>';}).join('')):'<p class="muted report-empty">Semaine calme — rien enregistré.</p>';
  openSheet(`<h3>Rapport de la semaine</h3><p class="muted sheet-sub">Semaine du ${frShort(dkey(r.ws))}</p>
    <div class="grid2 report-grid"><div class="metric"><div class="v">${dur(r.sec)}</div><div class="l">temps joué</div></div><div class="metric"><div class="v">${r.days}/7</div><div class="l">jours actifs</div></div></div>
    <div class="grid2 report-grid-2"><div class="metric"><div class="v">${r.sessions}</div><div class="l">séances</div></div><div class="metric"><div class="v">${r.days?dur(Math.round(r.sec/r.days)):'0 min'}</div><div class="l">moy./jour actif</div></div></div>
    ${topHtml}
    <button class="btn primary report-close" onclick="closeSheet()">Fermer</button>`);
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
function enableNotifs(){if(typeof Notification==='undefined'){toast('Notifications non supportées',{danger:true});return;}
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
  const topHtml=r.top.length?('<div class="muted report-top-label">Le plus travaillé</div>'+r.top.map(function(e){return '<div class="between report-top-row"><span>'+esc(pieceName(e[0]))+'</span><span class="muted">'+dur(e[1])+'</span></div>';}).join('')):'<p class="muted report-empty">Mois calme — rien enregistré.</p>';
  openSheet(`<h3>Rapport du mois</h3><p class="muted sheet-sub">${cap(r.md.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}))}</p>
    <div class="grid2 report-grid"><div class="metric"><div class="v">${dur(r.sec)}</div><div class="l">temps joué</div></div><div class="metric"><div class="v">${r.days}</div><div class="l">jours actifs</div></div></div>
    <div class="metric report-grid-2"><div class="v">${r.sessions}</div><div class="l">séances</div></div>
    ${topHtml}
    <button class="btn primary report-close" onclick="closeSheet()">Fermer</button>`);
}
function maybeNotifyMonth(){if(monthReportReady()&&S.settings.notif.monthly)localNotify('Piano — rapport du mois','Ton bilan du mois est prêt.','rapport-mois');}

/* ---------- Boot ---------- */
