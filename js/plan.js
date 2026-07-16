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
function runConcert(){if(!_program.length){toast('Ajoute au moins un morceau',{danger:true});return;}closeSheet();_concert={idx:0,times:_program.map(()=>0),rates:_program.map(()=>1)};concertStage();}
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
  const topHtml=r.top.length?('<div class="muted" style="font-size:13px;margin:4px 0 8px;">Le plus travaillé</div>'+r.top.map(function(e){return '<div class="between" style="padding:6px 0;"><span>'+esc(pieceName(e[0]))+'</span><span class="muted">'+dur(e[1])+'</span></div>';}).join('')):'<p class="muted" style="font-size:13px;">Mois calme — rien enregistré.</p>';
  openSheet(`<h3>Rapport du mois</h3><p class="muted" style="font-size:13px;margin-top:-6px;">${cap(r.md.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}))}</p>
    <div class="grid2" style="margin:12px 0;"><div class="metric"><div class="v">${dur(r.sec)}</div><div class="l">temps joué</div></div><div class="metric"><div class="v">${r.days}</div><div class="l">jours actifs</div></div></div>
    <div class="metric" style="margin-bottom:12px;"><div class="v">${r.sessions}</div><div class="l">séances</div></div>
    ${topHtml}
    <button class="btn primary" style="margin-top:14px;" onclick="closeSheet()">Fermer</button>`);
}
function maybeNotifyMonth(){if(monthReportReady()&&S.settings.notif.monthly)localNotify('Piano — rapport du mois','Ton bilan du mois est prêt.','rapport-mois');}

/* ---------- Boot ---------- */
