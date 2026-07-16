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
  if(!_piece){toast('Choisis un morceau',{danger:true});return;}
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
    <div class="row" style="justify-content:center;gap:16px;margin-top:14px;align-items:flex-start;">
      <div style="text-align:center;">
        <button id="ss-pause" onclick="togglePause()" style="width:76px;height:76px;border-radius:50%;background:var(--acc);color:#191A1B;font-size:28px;">❚❚</button>
        <div class="muted" style="font-size:11px;margin-top:6px;">Pause</div>
      </div>
      <div style="text-align:center;">
        <button onclick="stopSession()" style="width:76px;height:76px;border-radius:50%;border:1px solid var(--border);font-size:24px;">■</button>
        <div class="muted" style="font-size:11px;margin-top:6px;">Fin</div>
      </div>
      ${recAvailable()?`<div style="text-align:center;">
        <button id="ss-rec" onclick="toggleRecording()" style="width:76px;height:76px;border-radius:50%;border:1px solid var(--border);font-size:22px;">●</button>
        <div class="muted" style="font-size:11px;margin-top:6px;" id="ss-rec-lbl">Rec</div>
      </div>`:''}
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
  const rb=document.getElementById('ss-rec');if(rb){rb.textContent=_rec?'■':'●';rb.style.color=_rec?'var(--danger)':'';rb.style.borderColor=_rec?'var(--danger)':'';}
  const rl=document.getElementById('ss-rec-lbl');if(rl)rl.textContent=_rec?big(Math.max(0,(Date.now()-_rec.startTs)/1000)):'Rec';
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
  if(_rec){toast("Arrête d'abord l'enregistrement en cours",{danger:true});return;}
  const total=Math.round(timer.total);
  if(total<5){confirmSheet('Séance très courte. L\'enregistrer quand même ?','Enregistrer quand même',()=>finishStop(total));return;}
  finishStop(total);}
function finishStop(total){timer.running=false;clearInterval(tickInt);carnetSheet(total);}
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
  if(after&&(!before||after.n!==before.n))setTimeout(()=>celebrate('rang',after.n,Math.round(totalSeconds()/3600)+' heures de piano. Rang '+(STONES.indexOf(after)+1)+' sur '+STONES.length+'.'),300);
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
  if(!recAvailable()){toast('Enregistrement audio indisponible sur cet appareil',{danger:true});return;}
  const cur=timer.blocks[timer.blocks.length-1].piece;
  if(cur===IMPROV){toast('Choisis un morceau pour enregistrer',{danger:true});return;}
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}
  catch(e){toast('Micro indisponible ou refusé',{danger:true});return;}
  const mime=recMime();
  let mr;
  try{mr=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);}
  catch(e){toast('Enregistrement impossible sur cet appareil',{danger:true});stream.getTracks().forEach(t=>t.stop());return;}
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
  if(!ok){toast("Impossible d'enregistrer l'audio",{danger:true});closeSheet();_recDraft=null;return;}
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
        <span style="display:inline-flex;flex:0 0 auto;padding:10px 14px 10px 10px;margin:-10px -14px -10px -10px;" onclick="deleteRecording('${p.id}','${r.id}')">
          <button class="btn ghost sm" style="flex:0 0 auto;color:var(--danger);border-color:var(--danger-border);">Suppr.</button>
        </span>
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
  confirmSheet('Supprimer cet enregistrement ?','Supprimer',()=>{
    const p=pieceById(pid);if(!p)return;
    p.recordings=(p.recordings||[]).filter(r=>r.id!==rid);
    save();idbDelBlob(rid);pieceDetail(pid);
  });
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
    ${edit?`<button class="btn ghost sm" style="width:100%;margin-top:10px;color:var(--danger);border-color:var(--danger-border);" onclick="deleteSession('${s.id}')">Supprimer la séance</button>`:''}`);
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
function deleteSession(id){confirmSheet('Supprimer cette séance ?','Supprimer',()=>{S.sessions=S.sessions.filter(s=>s.id!==id);save();closeSheet();renderCarnet();toast('Séance supprimée');});}

