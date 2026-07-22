/* ==========================================================================
   ACCUEIL
   ========================================================================== */
function renderHome(){
  const vac=vacationActive();
  const st=currentStone(),streak=computeStreak(),goal=todayGoal();
  const done=secondsOnDay(dkey())/60, pct=vac?0:(goal>0?done/goal:0);
  const q=QUOTES[new Date().getDate()%QUOTES.length];
  const circ=528, off=vac?circ:circ*(1-Math.min(pct,1));
  const reached=!vac&&pct>=1;
  const todos=S.pieces.filter(p=>p.todo&&p.todo.trim());
  const wkSeconds=weekSeconds(), wkDays=weekDays();
  document.getElementById('s-home').innerHTML=`
    <div class="between">
      <span class="eyebrow">${frDate(new Date())} · Programme</span>
      <button class="icbtn" onclick="go('settings')" aria-label="Réglages">
        <svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="3.2"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2l-.3-2.6h-4l-.3 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.3 2.6h4l.3-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6A7 7 0 0 0 19 12Z"/></svg>
      </button>
    </div>
    ${vac?vacationBannerHtml():''}
    ${st?`<div class="tag home-rank-tag cur">${noteIcon(st.c,17,rankGlyph(st))}<span class="home-rank-name">${st.n}</span><span class="muted">· ${Math.floor(totalSeconds()/3600)} h</span></div>`:`<div class="tag home-rank-tag">Début du voyage</div>`}
    <h1 class="home-title">${S.settings.userName?'Bonjour '+esc(S.settings.userName):'Bonjour'}</h1>
    <div class="filet"></div>

    <div class="home-chips">
      <div class="tag">${flameSvg(14)}<span id="home-streak-v">0</span> ${streak===1?'jour':'jours'}</div>
      <div class="tag gold"><span id="home-notes-v">0</span> ♪</div>
    </div>

    <div class="card hi home-goal-card">
      <div class="home-goal-row">
        <div class="ring sm">
          <svg width="120" height="120" viewBox="0 0 200 200">
            <defs><linearGradient id="home-ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="var(--acc)"/><stop offset="100%" stop-color="var(--gold)"/>
            </linearGradient></defs>
            <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="13"/>
            <circle id="home-ring-prog" class="home-ring-prog" cx="100" cy="100" r="84" fill="none"
              stroke="${vac?'transparent':(reached?'var(--gold)':'url(#home-ring-grad)')}" stroke-width="13" stroke-linecap="round"
              stroke-dasharray="${circ}" stroke-dashoffset="${circ}" transform="rotate(-90 100 100)"
              style="filter:drop-shadow(0 0 ${reached?'10px rgba(228,197,138,.45)':'8px rgba(158,147,242,.35)'});"/>
          </svg>
          <div class="c">${vac?'<b class="serif home-ring-rest">Repos</b>':`<b class="num it" id="home-ring-v">0</b><span>/ ${goalLabel(goal)}</span>`}</div>
        </div>
        <div class="home-goal-info">
          <span class="muted home-goal-label">${vac?'Objectif en pause':'Objectif du jour'}</span>
          ${vac?'':`<div><button class="btn ghost sm home-goal-btn" onclick="goalSheet()">Modifier</button></div>${softenedGoalActive()?'<div class="muted home-goal-soft">Objectif adouci · reprise en douceur</div>':''}`}
        </div>
      </div>
    </div>

    <button class="btn primary home-cta" onclick="playSheet()">
      ${playSvg()} Jouer</button>
    ${(!vac&&activePieces().length)?`<p class="muted home-play-sub">${planSummaryLine()}</p>`:''}

    ${homeAlertsHtml()}

    ${todos.length?`<div class="card home-todos-card">
      <div class="tag acc home-todos-tag">À faire</div>
      <div id="home-todos">${todoLines(todos.slice(0,3))}</div>
      ${todos.length>3?`<button class="btn ghost sm home-todos-more" onclick="showAllTodos(this)">Voir les ${todos.length} œuvres</button>`:''}</div>`:''}

    <h2>Cette semaine</h2>
    <div class="grid2">
      <div class="metric"><div class="v num" id="home-week-time-v">0</div><div class="l">temps joué</div></div>
      <div class="metric"><div class="v num" id="home-week-days-v">0</div><div class="l">jours actifs</div></div>
    </div>
    ${vac?'':`<button class="btn ghost sm home-vacation-link" onclick="vacationSheet()">Mode vacances</button>`}
    <p class="num it home-quote">« ${q[0]} » — ${q[1]}</p>`;

  countUp(document.getElementById('home-streak-v'),streak,v=>Math.round(v).toString(),400);
  countUp(document.getElementById('home-notes-v'),notesTotal(),v=>Math.round(v).toLocaleString('fr-FR'),400);
  countUp(document.getElementById('home-ring-v'),done,minLabel,450);
  countUp(document.getElementById('home-week-time-v'),wkSeconds,dur,450);
  countUp(document.getElementById('home-week-days-v'),wkDays,v=>Math.round(v)+'/7',400);
  const ring=document.getElementById('home-ring-prog');
  if(ring){
    if(reduceMotion())ring.style.transition='none';
    raf(()=>raf(()=>{ring.style.strokeDashoffset=off;}));
  }
}
function vacationBannerHtml(){
  const v=S.vacation;
  const label=v.until?'En pause jusqu’au '+frShort(v.until):'En pause depuis le '+frShort(v.from);
  return `<div class="card vac-banner">
    <div class="row vac-banner-row">
      <div class="vac-banner-ic">${EMPTY_ICONS.stand}</div>
      <div class="vac-banner-body">
        <div class="vac-banner-title">${esc(label)}</div>
        <div class="muted vac-banner-sub">Ta série est gelée, tes rappels sont suspendus.</div>
      </div>
    </div>
    <div class="row vac-banner-actions">
      <button class="btn ghost sm" onclick="awaySheet()">Loin du clavier</button>
      <button class="btn ghost sm" onclick="stopVacation()">Je reprends</button>
    </div>
  </div>`;
}
function homeAlerts(){
  if(vacationActive())return [];
  const items=[];
  if(reportReady())items.push({label:'Rapport de la semaine prêt',action:"reportSheet()",cta:'Voir'});
  if(monthReportReady())items.push({label:'Rapport du mois prêt',action:"monthReportSheet()",cta:'Voir'});
  if(backupDue())items.push({label:'Pense à sauvegarder tes données',action:"exportJSON()",cta:'Exporter',warn:true});
  if(goalsUnset())items.push({label:"Objectif hebdo ou mensuel non défini",action:"go('settings')",cta:'Régler'});
  return items;
}
function homeAlertsHtml(){
  const al=homeAlerts();if(!al.length)return '';
  return `<div class="card home-alerts">
    ${al.map(a=>`<div class="between home-alert-row" onclick="${a.action}"><span class="home-alert-label">${a.label}</span><span class="home-alert-cta" style="color:${a.warn?'var(--warn)':'var(--ok)'};">${a.cta} ›</span></div>`).join('')}
  </div>`;
}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
function flameSvg(sz){sz=sz||24;return '<svg viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'" fill="currentColor" class="flame-ic"><path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 1.5 2S12 9 12 7s0-3 0-5Z"/></svg>';}
function playSvg(){return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';}

function goalSheet(){
  openSheet(`<h3>Objectif du jour</h3>
    <p class="muted home-goal-sub">Une durée pour aujourd'hui — tu peux la dépasser.</p>
    <div class="stepper home-goal-stepper">
      <button onclick="gStep(-5)">–</button><div class="v"><span id="gv">${todayGoal()}</span> <span class="home-goal-unit">min</span></div>
      <button onclick="gStep(5)">+</button></div>
    <button class="btn primary" onclick="saveGoal()">Valider</button>`);
}
function gStep(n){const e=document.getElementById('gv');e.textContent=Math.max(5,parseInt(e.textContent)+n);}
function saveGoal(){S.settings.dailyGoal=parseInt(document.getElementById('gv').textContent);save();closeSheet();renderHome();toast('Objectif : '+S.settings.dailyGoal+' min');}

