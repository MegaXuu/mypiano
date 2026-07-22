/* ==========================================================================
   STATISTIQUES
   ========================================================================== */
let statSplit='composer',statsTab='activite';
function renderStats(){
  document.getElementById('s-stats').innerHTML=`
    <h1>Statistiques</h1>
    <div class="grid2 stat-hero-grid">
      <div class="metric"><div class="v num" id="stat-hero-time">0</div><div class="l">temps total joué</div></div>
      <div class="metric"><div class="v num" id="stat-hero-sessions">0</div><div class="l">séances au total</div></div>
    </div>
    <div class="seg stat-tabs">
      <button class="${statsTab==='activite'?'on':''}" onclick="setStatsTab('activite')">Activité</button>
      <button class="${statsTab==='rep'?'on':''}" onclick="setStatsTab('rep')">Répertoire</button>
      <button class="${statsTab==='records'?'on':''}" onclick="setStatsTab('records')">Records</button>
    </div>
    <div id="stats-body"></div>`;
  countUp(document.getElementById('stat-hero-time'),totalSeconds(),durH,500);
  countUp(document.getElementById('stat-hero-sessions'),S.sessions.length,v=>Math.round(v).toString(),400);
  renderStatsBody();
}
function setStatsTab(t){statsTab=t;renderStats();}
function renderStatsBody(){
  const el=document.getElementById('stats-body');
  if(!el)return;
  el.innerHTML=statsTab==='rep'?renderStatsRep():statsTab==='records'?renderStatsRecords():renderStatsActivite();
  if(statsTab==='activite')countUp(document.getElementById('stat-week-time'),weekSeconds(),dur,450);
}
function renderStatsActivite(){
  const bars=[];let max=1;for(let i=6;i>=0;i--){const d=addDays(new Date(),-i);const s=secondsOnDay(dkey(d));bars.push({d,s});max=Math.max(max,s);}
  return `
    <h2>7 derniers jours</h2>
    <div class="card">
      <div class="between stat-card-head"><span class="stat-card-title">7 derniers jours</span><span class="muted stat-card-sub"><span id="stat-week-time">0</span> cette sem.</span></div>
      <div class="stat-bars7">${bars.map((x,i)=>{const h=x.s?Math.max(6,Math.round(x.s/max*100)):2;const lb=x.d.toLocaleDateString('fr-FR',{weekday:'short'}).slice(0,3);
        return `<div class="stat-bar7-col"><div class="stat-bar7 ${i===6?'today':''} ${x.s?'':'empty'}" style="height:${h}%;"><span class="stat-bar7-cap">${x.s?Math.round(x.s/60)+'′':'·'}</span></div><span class="stat-bar7-lb ${i===6?'today':''}">${lb}</span></div>`;}).join('')}</div>
    </div>
    <h2>Comparaison des semaines</h2>
    ${weekCurve()}
    <h2>Régularité · 12 semaines</h2>
    <div class="card">${heatmap()}</div>
    <h2>Meilleurs moments</h2>${hourHeat()}`;
}
function renderStatsRep(){
  return `
    <h2>Temps par morceau</h2>${byPiece()}
    <h2>Répartition</h2>
    <div class="seg stat-split-seg"><button class="${statSplit==='composer'?'on':''}" onclick="setSplit('composer')">Compositeur</button><button class="${statSplit==='epoch'?'on':''}" onclick="setSplit('epoch')">Époque</button></div>
    ${splitView()}
    ${renderInsights()}`;
}
function renderStatsRecords(){
  let longest=0;playSessions().forEach(s=>longest=Math.max(longest,sessionSeconds(s)));
  let bestDay=0;practiceDays().forEach(k=>bestDay=Math.max(bestDay,secondsOnDay(k)));
  let bestWk=0;if(S.sessions.length){const first=new Date([...practiceDays()].sort()[0]);for(let d=new Date(first);d<=new Date();d=addDays(d,7)){let t=0;for(let i=0;i<7;i++)t+=secondsOnDay(dkey(addDays(d,i)));bestWk=Math.max(bestWk,t);}}
  return `
    <h2>Records</h2>
    <div class="grid2">
      ${rec('Plus longue séance',dur(longest))}${rec('Meilleure journée',dur(bestDay))}
      ${rec('Meilleure semaine',dur(bestWk))}${rec('Meilleure série',bestStreak()+' j')}
    </div>
    ${retroYears().length?`<h2>Rétrospective</h2><p class="muted stat-retro-intro">Une année de piano, en quelques chiffres.</p><div class="chips">${retroYears().map(y=>`<button class="chip" onclick="yearRetroSheet(${y})">${y}</button>`).join('')}</div>`:''}`;
}
function setSplit(s){statSplit=s;renderStatsBody();}
function rec(l,v){return `<div class="metric stat-rec"><div class="v stat-rec-v">${v}</div><div class="l">${l}</div></div>`;}
function heatmap(){
  const days=[];for(let i=83;i>=0;i--){const d=addDays(new Date(),-i);const s=secondsOnDay(dkey(d));days.push(s);}
  const lv=s=>s===0?0:s<600?1:s<1800?2:s<3600?3:4;
  const col=['rgba(158,147,242,.08)','rgba(158,147,242,.28)','rgba(158,147,242,.52)','rgba(158,147,242,.78)','var(--acc)'];
  return `<div class="hm">${days.map(s=>`<i style="background:${col[lv(s)]}"></i>`).join('')}</div>
    <div class="sub stat-hm-legend"><span>moins</span>${col.map(c=>`<span class="stat-hm-swatch" style="background:${c};"></span>`).join('')}<span>plus</span></div>`;
}
function smoothLinePath(pts){
  if(pts.length<2)return '';
  const d=['M'+pts[0][0].toFixed(1)+','+pts[0][1].toFixed(1)];
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[i===0?0:i-1],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(i+2,pts.length-1)];
    const c1x=p1[0]+(p2[0]-p0[0])/6,c1y=p1[1]+(p2[1]-p0[1])/6;
    const c2x=p2[0]-(p3[0]-p1[0])/6,c2y=p2[1]-(p3[1]-p1[1])/6;
    d.push('C'+c1x.toFixed(1)+','+c1y.toFixed(1)+' '+c2x.toFixed(1)+','+c2y.toFixed(1)+' '+p2[0].toFixed(1)+','+p2[1].toFixed(1));
  }
  return d.join(' ');
}
function weekCurve(){
  const weeks=[];let max=1;
  for(let i=7;i>=0;i--){const ws=addDays(weekStart(),-7*i);let t=0;for(let d=0;d<7;d++)t+=secondsOnDay(dkey(addDays(ws,d)));weeks.push(t);max=Math.max(max,t);}
  const cur=weeks[7],prev=weeks[6],diff=cur-prev;
  const showDiff=prev>0&&!vacationActive(); // pas de comparaison culpabilisante pendant une pause en cours
  const w=300,h=90,padL=4,padR=4,padT=10,padB=18,innerW=w-padL-padR,innerH=h-padT-padB;
  const pts=weeks.map((t,i)=>[padL+i/(weeks.length-1)*innerW,padT+innerH-(t/max*innerH)]);
  const lineD=smoothLinePath(pts);
  const baseY=(padT+innerH).toFixed(1);
  const areaD=lineD+' L'+pts[pts.length-1][0].toFixed(1)+','+baseY+' L'+pts[0][0].toFixed(1)+','+baseY+' Z';
  const dots=pts.map((pt,i)=>`<circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="${i===7?3.4:1.8}" fill="${i===7?'var(--gold)':'var(--acc)'}"/>`).join('');
  const labels=weeks.map((t,i)=>i===7?'cette':'S-'+(7-i));
  return `<div class="card">
    <div class="between stat-card-head"><span class="stat-card-title">8 dernières semaines</span>
      <span class="muted stat-card-sub">${dur(cur)}${showDiff?' · '+(diff>=0?'+':'−')+dur(Math.abs(diff))+' vs S-1':''}</span></div>
    <svg viewBox="0 0 ${w} ${h}" width="100%" class="stat-curve-svg">
      <defs><linearGradient id="statWkGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--acc)" stop-opacity=".3"/>
        <stop offset="100%" stop-color="var(--acc)" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${areaD}" fill="url(#statWkGrad)"/>
      <path d="${lineD}" class="stat-curve-line"/>
      ${dots}
    </svg>
    <div class="sub stat-curve-labels">${labels.map(l=>`<span>${l}</span>`).join('')}</div>
  </div>`;
}
function byPiece(){
  const map={};playSessions().forEach(s=>s.blocks.forEach(b=>map[b.piece]=(map[b.piece]||0)+b.sec));
  const arr=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);if(!arr.length)return emptyState('Pas encore de données.','staff');
  const mx=arr[0][1];
  return arr.map(([id,s])=>`<div class="stat-piece-row"><div class="sub stat-piece-head"><span class="clair">${esc(pieceName(id))}</span><span>${dur(s)}</span></div><div class="bar"><i style="width:${Math.round(s/mx*100)}%"></i></div></div>`).join('');
}
function splitView(){
  const map={};playSessions().forEach(s=>s.blocks.forEach(b=>{let k;if(b.piece===IMPROV){k='Improvisation';}else{const p=pieceById(b.piece);if(!p)return;k=statSplit==='composer'?(p.composer||'—'):(p.epoch||'—');}map[k]=(map[k]||0)+b.sec;}));
  const arr=Object.entries(map).sort((a,b)=>b[1]-a[1]);if(!arr.length)return emptyState('Renseigne compositeur/époque de tes morceaux.','staff');
  const total=arr.reduce((a,b)=>a+b[1],0);const cols=['#9E93F2','#E4C58A','#6FD3E0','#8DB600','#C65B34','#2FB6B0','#B07A2A'];
  let acc=0;const seg=arr.map(([k,v],i)=>{const from=acc/total*100;acc+=v;const to=acc/total*100;return `${cols[i%cols.length]} ${from}% ${to}%`;}).join(',');
  return `<div class="row stat-split-row"><div class="stat-split-donut" style="background:conic-gradient(${seg});"></div>
    <div class="stat-split-legend">${arr.map(([k,v],i)=>`<div class="sub stat-split-item"><span class="clair"><span class="stat-split-dot" style="background:${cols[i%cols.length]};"></span>${esc(k)}</span><span>${dur(v)}</span></div>`).join('')}</div></div>`;
}

/* ---------- Aperçus (V3 étape 5) : croisements sobres, pas de sur-analyse ---------- */
const MOMENTS={matin:'le matin',apresmidi:"l'après-midi",soir:'le soir',nuit:'la nuit'};
function momentBucket(h){if(h<6)return 'nuit';if(h<12)return 'matin';if(h<18)return 'apresmidi';return 'soir';}
function feelIdx(f){return FEEL_ORDER.indexOf(f);}
function momentInsight(){
  const buckets={};
  S.sessions.forEach(s=>{if(!s.feeling)return;const idx=feelIdx(s.feeling);if(idx<0)return;
    const t=s.ts||Date.parse(s.date+'T12:00'),b=momentBucket(new Date(t).getHours());
    (buckets[b]=buckets[b]||[]).push(idx);});
  const stats=Object.entries(buckets).filter(([,arr])=>arr.length>=3).map(([k,arr])=>[k,arr.reduce((a,b)=>a+b,0)/arr.length]);
  if(stats.length<2)return '';
  stats.sort((a,b)=>b[1]-a[1]);
  const best=stats[0],worst=stats[stats.length-1];
  if(best[1]-worst[1]<0.6)return '';
  return `Ton ressenti est meilleur ${MOMENTS[best[0]]} que ${MOMENTS[worst[0]]}.`;
}
function stagnantPieces(){
  const cutoff=Date.now()-21*86400000;
  return S.pieces.filter(p=>{
    if(p.isEnsemble||p.status!=='active'||!hasDerivedProgress(p))return false;
    const h=p.hist||[];if(h.length<2)return false;
    let old=null;for(const pt of h){if(new Date(pt.d+'T00:00').getTime()<=cutoff)old=pt;else break;}
    if(!old)return false;
    const recent=h[h.length-1],lp=pieceLastPlayed(p.id);
    const playedSince=lp&&new Date(lp+'T00:00').getTime()>=cutoff;
    return playedSince&&recent.m<=old.m;
  });
}
function stagnationInsight(){
  const list=stagnantPieces().slice(0,2);if(!list.length)return '';
  return list.map(p=>`« ${esc(p.title)} » n'a pas avancé depuis trois semaines malgré tes séances.`).join('<br>');
}
function renderInsights(){
  const lines=[momentInsight(),stagnationInsight()].filter(Boolean);
  if(!lines.length)return '';
  return `<h2>Aperçus</h2>${lines.map(l=>`<div class="card stat-insight-card"><div class="stat-insight-rule"></div><p class="stat-insight-text">${l}</p></div>`).join('')}`;
}

/* ---------- Rétrospective annuelle (V3 étape 5) ---------- */
function retroYears(){return [...new Set(S.sessions.map(s=>s.date.slice(0,4)))].sort((a,b)=>b-a);}
function yearRetroSheet(year){
  const all=S.sessions.filter(s=>s.date.slice(0,4)===String(year));
  const sessions=all.filter(s=>s.mode!=='away');
  if(!sessions.length){toast('Aucune séance en '+year);return;}
  const totalSec=sessions.reduce((a,s)=>a+sessionSeconds(s),0);
  const awaySec=all.filter(s=>s.mode==='away').reduce((a,s)=>a+sessionSeconds(s),0);
  const pieceMap={},composerMap={};
  sessions.forEach(s=>s.blocks.forEach(b=>{
    if(b.piece===IMPROV)return;
    pieceMap[b.piece]=(pieceMap[b.piece]||0)+b.sec;
    const p=pieceById(b.piece);if(p&&p.composer)composerMap[p.composer]=(composerMap[p.composer]||0)+b.sec;
  }));
  const topPieceEntry=Object.entries(pieceMap).sort((a,b)=>b[1]-a[1])[0];
  const topPiece=topPieceEntry?pieceById(topPieceEntry[0]):null;
  const topComposer=Object.entries(composerMap).sort((a,b)=>b[1]-a[1])[0];
  openSheet(`<h3>Rétrospective ${year}</h3>
    <p class="muted sheet-sub">Une année de piano, en quelques chiffres.</p>
    <div class="grid2 mt16 mb10">
      ${rec('Temps joué',durH(totalSec))}${rec('Séances',sessions.length)}
    </div>
    <div class="grid2 mb10">
      ${rec('Plus longue série',bestStreakInYear(year)+' j')}${rec('Compositeur dominant',topComposer?esc(topComposer[0]):'—')}
    </div>
    ${awaySec?`<p class="muted stat-retro-away">+ ${durH(awaySec)} loin du clavier</p>`:''}
    ${topPiece?`<div class="card stat-insight-card"><div class="stat-insight-rule gold"></div><span class="muted stat-retro-piece-label">Pièce de l'année</span><div class="stat-retro-piece-title">${esc(topPiece.title)}</div><div class="muted stat-retro-piece-sub">${dur(topPieceEntry[1])} joués</div></div>`:''}
    <button class="btn primary mt16" onclick="closeSheet()">Fermer</button>`);
}

