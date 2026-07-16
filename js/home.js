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

    <div class="row" style="gap:8px;margin-top:8px;">
      <div class="tag">${flameSvg(14)}${streak} ${streak===1?'jour':'jours'}</div>
      <div class="tag acc">${notesTotal().toLocaleString('fr-FR')} ♪</div>
    </div>

    <div class="card hi" style="margin-top:14px;padding:14px 16px;">
      <div class="row" style="gap:16px;">
        <div class="ring sm">
          <svg width="120" height="120" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="84" fill="none" stroke="var(--surface2)" stroke-width="13"/>
            <circle cx="100" cy="100" r="84" fill="none" stroke="${ringCol}" stroke-width="13" stroke-linecap="round"
              stroke-dasharray="${circ}" stroke-dashoffset="${off}" transform="rotate(-90 100 100)" style="transition:stroke-dashoffset .6s ease;"/>
          </svg>
          <div class="c"><b>${minLabel(done)}</b><span>/ ${goalLabel(goal)}</span></div>
        </div>
        <div style="flex:1;min-width:0;">
          <span class="muted" style="font-size:14px;">Objectif du jour</span>
          <div><button class="btn ghost sm" style="margin-top:10px;" onclick="goalSheet()">Modifier</button></div>
        </div>
      </div>
    </div>

    <button class="btn primary" style="margin-top:14px;font-size:16px;padding:16px;" onclick="startSheet()">
      ${playSvg()} Démarrer une séance</button>

    ${recentPieces(4).length?`<h2>Reprendre</h2><div class="chips">${recentPieces(4).map(id=>`<button class="chip" onclick="quickStart('${id}')">${esc(pieceName(id))}</button>`).join('')}</div>`:''}

    <div class="grid2" style="margin-top:14px;"><button class="btn ghost" onclick="planSheet()">Plan guidé</button><button class="btn ghost" onclick="concertSheet()">Simulation</button></div>

    ${homeAlertsHtml()}

    ${todos.length?`<div class="card" style="margin-top:14px;padding:16px;">
      <div class="tag acc" style="margin-bottom:12px;">À faire</div>
      <div id="home-todos">${todoLines(todos.slice(0,3))}</div>
      ${todos.length>3?`<button class="btn ghost sm" style="width:100%;margin-top:6px;" onclick="showAllTodos(this)">Voir les ${todos.length} œuvres</button>`:''}</div>`:''}

    <h2>Cette semaine</h2>
    <div class="grid2">
      <div class="metric"><div class="v">${dur(weekSeconds())}</div><div class="l">temps joué</div></div>
      <div class="metric"><div class="v">${weekDays()}/7</div><div class="l">jours actifs</div></div>
    </div>
    ${revisionList().length?`<div class="between" style="margin-top:22px;margin-bottom:10px;"><h2 style="margin:0;">À entretenir</h2><button class="btn ghost sm" onclick="startRevision()">Réviser</button></div><div class="card" style="padding:14px 16px;">
      <p class="muted" style="font-size:13px;margin:0 0 8px;">Maîtrisés, mais pas rejoués depuis un moment :</p>
      ${revisionList().slice(0,3).map(p=>`<div class="between" style="padding:8px 0;"><div style="min-width:0;"><div style="font-weight:600;font-size:14px;">${esc(p.title)}</div><div class="muted" style="font-size:12px;">${esc(p.composer||'')}</div></div><button class="btn ghost sm" onclick="quickStart('${p.id}')">Jouer</button></div>`).join('')}</div>`:''}

    <p class="serif" style="font-style:italic;color:var(--t2);font-size:14px;margin:28px 0 6px;text-align:center;">« ${q[0]} » — ${q[1]}</p>`;
}
function homeAlerts(){
  const items=[];
  if(reportReady())items.push({label:'Rapport de la semaine prêt',action:"reportSheet()",cta:'Voir'});
  if(monthReportReady())items.push({label:'Rapport du mois prêt',action:"monthReportSheet()",cta:'Voir'});
  if(backupDue())items.push({label:'Pense à sauvegarder tes données',action:"exportJSON()",cta:'Exporter',warn:true});
  if(goalsUnset())items.push({label:"Objectif hebdo ou mensuel non défini",action:"go('settings')",cta:'Régler'});
  return items;
}
function homeAlertsHtml(){
  const al=homeAlerts();if(!al.length)return '';
  return `<div class="card" style="margin-top:14px;padding:2px 14px;">
    ${al.map((a,i)=>`<div class="between" style="padding:11px 0;${i<al.length-1?'border-bottom:1px solid rgba(255,255,255,.05);':''}cursor:pointer;" onclick="${a.action}"><span style="font-size:13px;">${a.label}</span><span style="color:${a.warn?'var(--warn)':'var(--ok)'};font-size:13px;">${a.cta} ›</span></div>`).join('')}
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

