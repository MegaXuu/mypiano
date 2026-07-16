/* ==========================================================================
   STATISTIQUES
   ========================================================================== */
let statSplit='composer',statsTab='activite';
function renderStats(){
  document.getElementById('s-stats').innerHTML=`
    <h1>Statistiques</h1>
    <div class="grid2" style="margin-top:16px;">
      <div class="metric"><div class="v">${durH(totalSeconds())}</div><div class="l">temps total joué</div></div>
      <div class="metric"><div class="v">${S.sessions.length}</div><div class="l">séances au total</div></div>
    </div>
    <div class="seg" style="margin:16px 0 4px;">
      <button class="${statsTab==='activite'?'on':''}" onclick="setStatsTab('activite')" style="font-size:12px;">Activité</button>
      <button class="${statsTab==='rep'?'on':''}" onclick="setStatsTab('rep')" style="font-size:12px;">Répertoire</button>
      <button class="${statsTab==='records'?'on':''}" onclick="setStatsTab('records')" style="font-size:12px;">Records</button>
    </div>
    <div id="stats-body"></div>`;
  renderStatsBody();
}
function setStatsTab(t){statsTab=t;renderStats();}
function renderStatsBody(){
  const el=document.getElementById('stats-body');
  if(!el)return;
  el.innerHTML=statsTab==='rep'?renderStatsRep():statsTab==='records'?renderStatsRecords():renderStatsActivite();
}
function renderStatsActivite(){
  const bars=[];let max=1;for(let i=6;i>=0;i--){const d=addDays(new Date(),-i);const s=secondsOnDay(dkey(d));bars.push({d,s});max=Math.max(max,s);}
  return `
    <h2>7 derniers jours</h2>
    <div class="card">
      <div class="between" style="margin-bottom:6px;"><span style="font-weight:600;">7 derniers jours</span><span class="muted" style="font-size:13px;">${dur(weekSeconds())} cette sem.</span></div>
      <div class="bars">${bars.map((x,i)=>{const h=x.s?Math.max(6,Math.round(x.s/max*100)):2;const lb=x.d.toLocaleDateString('fr-FR',{weekday:'short'}).slice(0,3);
        return `<div class="b ${i===6?'today':''}" style="height:${h}%;${x.s?'':'background:var(--surface2);'}"><span class="cap">${x.s?Math.round(x.s/60)+'′':'·'}</span><span class="lb">${lb}</span></div>`;}).join('')}</div>
    </div>
    <h2>Comparaison des semaines</h2>
    ${weekBars()}
    <h2>Régularité · 12 semaines</h2>
    <div class="card">${heatmap()}</div>
    <h2>Meilleurs moments</h2>${hourHeat()}`;
}
function renderStatsRep(){
  return `
    <h2>Temps par morceau</h2>${byPiece()}
    <h2>Répartition</h2>
    <div class="seg" style="margin-bottom:12px;"><button class="${statSplit==='composer'?'on':''}" onclick="setSplit('composer')">Compositeur</button><button class="${statSplit==='epoch'?'on':''}" onclick="setSplit('epoch')">Époque</button></div>
    ${splitView()}
    ${renderInsights()}`;
}
function renderStatsRecords(){
  let longest=0;S.sessions.forEach(s=>longest=Math.max(longest,sessionSeconds(s)));
  let bestDay=0;practiceDays().forEach(k=>bestDay=Math.max(bestDay,secondsOnDay(k)));
  let bestWk=0;if(S.sessions.length){const first=new Date([...practiceDays()].sort()[0]);for(let d=new Date(first);d<=new Date();d=addDays(d,7)){let t=0;for(let i=0;i<7;i++)t+=secondsOnDay(dkey(addDays(d,i)));bestWk=Math.max(bestWk,t);}}
  return `
    <h2>Records</h2>
    <div class="grid2">
      ${rec('Plus longue séance',dur(longest))}${rec('Meilleure journée',dur(bestDay))}
      ${rec('Meilleure semaine',dur(bestWk))}${rec('Meilleure série',bestStreak()+' j')}
    </div>
    ${retroYears().length?`<h2>Rétrospective</h2><p class="muted" style="font-size:13px;margin:-4px 0 12px;">Une année de piano, en quelques chiffres.</p><div class="chips">${retroYears().map(y=>`<button class="chip" onclick="yearRetroSheet(${y})">${y}</button>`).join('')}</div>`:''}`;
}
function setSplit(s){statSplit=s;renderStatsBody();}
function rec(l,v){return `<div class="metric" style="box-shadow:inset 0 0 0 1px rgba(228,197,138,.22);"><div class="v" style="font-size:20px;">${v}</div><div class="l">${l}</div></div>`;}
function heatmap(){
  const days=[];for(let i=83;i>=0;i--){const d=addDays(new Date(),-i);const s=secondsOnDay(dkey(d));days.push(s);}
  const lv=s=>s===0?0:s<600?1:s<1800?2:s<3600?3:4;
  const col=['var(--surface2)','rgba(158,147,242,.3)','rgba(158,147,242,.55)','rgba(158,147,242,.8)','var(--acc)'];
  return `<div class="hm">${days.map(s=>`<i style="background:${col[lv(s)]}"></i>`).join('')}</div>
    <div class="sub" style="margin-top:10px;justify-content:flex-end;gap:6px;align-items:center;"><span>moins</span>${col.map(c=>`<span style="width:12px;height:12px;border-radius:3px;background:${c};display:inline-block;"></span>`).join('')}<span>plus</span></div>`;
}
function weekBars(){
  const weeks=[];let max=1;
  for(let i=7;i>=0;i--){const ws=addDays(weekStart(),-7*i);let t=0;for(let d=0;d<7;d++)t+=secondsOnDay(dkey(addDays(ws,d)));weeks.push(t);max=Math.max(max,t);}
  const cur=weeks[7],prev=weeks[6],diff=cur-prev;
  return `<div class="card">
    <div class="between" style="margin-bottom:6px;"><span style="font-weight:600;">8 dernières semaines</span>
      <span class="muted" style="font-size:13px;">${dur(cur)}${prev>0?' · '+(diff>=0?'+':'−')+dur(Math.abs(diff))+' vs S-1':''}</span></div>
    <div class="bars">${weeks.map((t,i)=>{const h=t?Math.max(6,Math.round(t/max*100)):2;const lb=i===7?'cette':'S-'+(7-i);
      return `<div class="b ${i===7?'today':''}" style="height:${h}%;${t?'':'background:var(--surface2);'}"><span class="cap">${t?(Math.round(t/3600*10)/10)+'h':''}</span><span class="lb" style="font-size:9px;">${lb}</span></div>`;}).join('')}</div>
  </div>`;
}
function byPiece(){
  const map={};S.sessions.forEach(s=>s.blocks.forEach(b=>map[b.piece]=(map[b.piece]||0)+b.sec));
  const arr=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);if(!arr.length)return '<div class="empty">Pas encore de données.</div>';
  const mx=arr[0][1];
  return arr.map(([id,s])=>`<div style="margin-bottom:12px;"><div class="sub" style="margin-bottom:6px;"><span style="color:var(--tc);">${esc(pieceName(id))}</span><span>${dur(s)}</span></div><div class="bar"><i style="width:${Math.round(s/mx*100)}%"></i></div></div>`).join('');
}
function splitView(){
  const map={};S.sessions.forEach(s=>s.blocks.forEach(b=>{let k;if(b.piece===IMPROV){k='Improvisation';}else{const p=pieceById(b.piece);if(!p)return;k=statSplit==='composer'?(p.composer||'—'):(p.epoch||'—');}map[k]=(map[k]||0)+b.sec;}));
  const arr=Object.entries(map).sort((a,b)=>b[1]-a[1]);if(!arr.length)return '<div class="empty">Renseigne compositeur/époque de tes morceaux.</div>';
  const total=arr.reduce((a,b)=>a+b[1],0);const cols=['#9E93F2','#E4C58A','#6FD3E0','#8DB600','#C65B34','#2FB6B0','#B07A2A'];
  let acc=0;const seg=arr.map(([k,v],i)=>{const from=acc/total*100;acc+=v;const to=acc/total*100;return `${cols[i%cols.length]} ${from}% ${to}%`;}).join(',');
  return `<div class="row" style="gap:18px;align-items:center;"><div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(${seg});flex:0 0 auto;"></div>
    <div style="flex:1;">${arr.map(([k,v],i)=>`<div class="sub" style="margin-bottom:6px;"><span style="color:var(--tc);"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${cols[i%cols.length]};margin-right:7px;"></span>${esc(k)}</span><span>${dur(v)}</span></div>`).join('')}</div></div>`;
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
function fractionedInsight(){
  const withF=S.sessions.filter(s=>s.feeling&&(s.mode==='chrono'||s.mode==='minuteur'));
  const frac=withF.filter(s=>s.interval).map(s=>feelIdx(s.feeling)).filter(i=>i>=0);
  const cont=withF.filter(s=>!s.interval).map(s=>feelIdx(s.feeling)).filter(i=>i>=0);
  if(frac.length<3||cont.length<3)return '';
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length,af=avg(frac),ac=avg(cont);
  if(Math.abs(af-ac)<0.5)return '';
  return af>ac?'Tes séances en pratique fractionnée (25/5) donnent en moyenne un ressenti plus satisfaisant.'
    :'Tes séances continues donnent en moyenne un ressenti plus satisfaisant que le fractionné.';
}
function renderInsights(){
  const lines=[momentInsight(),stagnationInsight(),fractionedInsight()].filter(Boolean);
  if(!lines.length)return '';
  return `<h2>Aperçus</h2><div class="card" style="padding:14px 16px;">${lines.map(l=>`<p style="margin:0 0 10px;line-height:1.55;font-size:14px;">${l}</p>`).join('')}</div>`;
}

/* ---------- Rétrospective annuelle (V3 étape 5) ---------- */
function retroYears(){return [...new Set(S.sessions.map(s=>s.date.slice(0,4)))].sort((a,b)=>b-a);}
function yearRetroSheet(year){
  const sessions=S.sessions.filter(s=>s.date.slice(0,4)===String(year));
  if(!sessions.length){toast('Aucune séance en '+year);return;}
  const totalSec=sessions.reduce((a,s)=>a+sessionSeconds(s),0);
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
    <p class="muted" style="font-size:14px;margin-top:-6px;">Une année de piano, en quelques chiffres.</p>
    <div class="grid2" style="margin:16px 0 10px;">
      ${rec('Temps joué',durH(totalSec))}${rec('Séances',sessions.length)}
    </div>
    <div class="grid2" style="margin-bottom:12px;">
      ${rec('Plus longue série',bestStreakInYear(year)+' j')}${rec('Compositeur dominant',topComposer?esc(topComposer[0]):'—')}
    </div>
    ${topPiece?`<div class="card" style="padding:14px;"><span class="muted" style="font-size:12px;">Pièce de l'année</span><div style="font-weight:600;margin-top:4px;">${esc(topPiece.title)}</div><div class="muted" style="font-size:12px;margin-top:2px;">${dur(topPieceEntry[1])} joués</div></div>`:''}
    <button class="btn primary" style="width:100%;margin-top:16px;" onclick="closeSheet()">Fermer</button>`);
}

