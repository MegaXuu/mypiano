/* ==========================================================================
   home.js — ACCUEIL. L'objectif du jour, un bouton « Jouer », la série et la
   semaine. Rien d'autre à décider.
   ========================================================================== */
const RING_C=2*Math.PI*84; // circonférence des anneaux (r=84 dans un viewBox 200)

// Anneau d'objectif : améthyste en cours (interaction), or une fois atteint (accomplissement).
function ringSvg(id,pct,reached,size){
  return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" aria-hidden="true">
    <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="11"/>
    <circle id="${id}" class="ring-prog ${reached?'done':''}" cx="100" cy="100" r="84" fill="none"
      stroke="${reached?'var(--gold)':'var(--acc)'}" stroke-width="11" stroke-linecap="round"
      stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C*(1-Math.min(1,pct))}" transform="rotate(-90 100 100)"/>
  </svg>`;
}

function renderHome(){
  const goal=todayGoal(),done=secondsOnDay(dkey())/60,pct=goal>0?done/goal:0,reached=pct>=1;
  const streak=computeStreak(),st=currentStone();
  const q=QUOTES[new Date().getDate()%QUOTES.length];
  const m=methodOfDay();
  const week=weekSecondsArr(),wkMax=Math.max(goal*60*1.3,...week.map(d=>d.s)),today=dkey();
  const wkTotal=week.reduce((a,d)=>a+d.s,0),wkDays=week.filter(d=>d.s>0).length;
  document.getElementById('s-home').innerHTML=`
    <div class="between">
      <span class="eyebrow">${frDate(new Date())}</span>
      <button class="icbtn" onclick="go('settings')" aria-label="Réglages">
        <svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="3.2"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2l-.3-2.6h-4l-.3 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.3 2.6h4l.3-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6A7 7 0 0 0 19 12Z"/></svg>
      </button>
    </div>
    <h1 class="home-title">${S.settings.userName?'Bonjour '+esc(S.settings.userName):'Bonjour'}</h1>
    <div class="home-chips">
      <span class="tag">${flameSvg(14)} ${streak} ${streak===1?'jour':'jours'} de série</span>
      ${st?`<span class="tag gold">${rankGlyph(st)} ${st.n}</span>`:''}
    </div>

    <div class="home-ring">
      <div class="ring">${ringSvg('home-ring',0,reached,220)}
        <div class="c"><b class="num it" id="home-ring-v">${minLabel(done)}</b><span>sur ${goalLabel(goal)}</span></div>
      </div>
      <div class="muted home-ring-sub">${reached?'Objectif du jour atteint':done>0?'Encore '+minLabel(goal-done)+' pour l’objectif':'Objectif du jour'}</div>
    </div>

    <button class="btn primary home-cta" onclick="beginSession()">${playSvg()} Jouer</button>

    <div class="card home-week">
      <div class="between"><span class="card-title">Cette semaine</span><span class="muted num it">${dur(wkTotal)} · ${wkDays} j</span></div>
      <div class="wk">${week.map(d=>{const h=d.s?Math.max(8,Math.round(d.s/wkMax*100)):3;
        const lb=dateOf(d.k).toLocaleDateString('fr-FR',{weekday:'narrow'});
        return `<div class="wk-col"><div class="wk-track"><div class="wk-goal" style="bottom:${Math.round(goal*60/wkMax*100)}%"></div><div class="wk-bar ${d.s>=goal*60?'done':''} ${d.s?'':'zero'}" style="height:${h}%"></div></div><span class="wk-lb ${d.k===today?'today':''}">${lb}</span></div>`;}).join('')}</div>
    </div>

    <button class="card home-method" onclick="methodsSheet()">
      <span class="eyebrow">Une idée · ${situationLabel(m.s)}</span>
      <span class="home-method-t serif">${esc(m.t)}</span>
      <span class="muted home-method-d">${esc(m.d)}</span>
      <span class="home-method-more">Toutes les méthodes ›</span>
    </button>
    ${backupDue()?`<button class="home-backup muted" onclick="exportJSON()">Dernière sauvegarde il y a longtemps · <span class="acc">exporter</span></button>`:''}
    <p class="num it home-quote">« ${q[0]} » — ${q[1]}</p>`;

  countUp(document.getElementById('home-ring-v'),done,minLabel,450);
  const ring=document.getElementById('home-ring');
  if(ring){ring.style.strokeDashoffset=RING_C;if(reduceMotion())ring.style.transition='none';
    raf(()=>raf(()=>{ring.style.strokeDashoffset=RING_C*(1-Math.min(1,pct));}));}
}
