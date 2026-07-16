/* ==========================================================================
   VOYAGE
   ========================================================================== */
let voyageTab='voyage',voyageRanksOpen=false;
function renderVoyage(){
  document.getElementById('s-voyage').innerHTML=`
    <h1 class="serif">Le Grand Voyage</h1>
    <div class="seg voy-tabs">
      <button class="${voyageTab==='voyage'?'on':''}" onclick="setVoyage('voyage')">Voyage</button>
      <button class="${voyageTab==='jardin'?'on':''}" onclick="setVoyage('jardin')">Jardin</button>
      <button class="${voyageTab==='succes'?'on':''}" onclick="setVoyage('succes')">Défis</button>
      <button class="${voyageTab==='cartes'?'on':''}" onclick="setVoyage('cartes')">Cartes</button>
    </div>
    <div id="voyage-body"></div>`;
  renderVoyageBody();
}
function setVoyage(t){voyageTab=t;renderVoyage();}
function toggleVoyageRanks(){voyageRanksOpen=!voyageRanksOpen;renderVoyageBody();}
function renderVoyageBody(){
  const el=document.getElementById('voyage-body');
  if(voyageTab==='succes'){renderSucces(el);return;}
  if(voyageTab==='jardin'){renderJardin(el);return;}
  if(voyageTab==='cartes'){renderCartes(el);return;}
  const hours=totalSeconds()/3600, cur=currentStone(), next=nextStone();
  const hoursDisp=hours<10?hours.toFixed(1):Math.round(hours);
  const prevH=cur?cur.h:0, span=next?(next.h-prevH):1, prog=next?Math.min(1,(hours-prevH)/span):1;
  const focusIdx=Math.max(0,cur?STONES.indexOf(cur):0);
  const from=voyageRanksOpen?0:Math.max(0,focusIdx-3);
  const to=voyageRanksOpen?STONES.length-1:Math.min(STONES.length-1,focusIdx+3);
  let rows='';
  for(let idx=to;idx>=from;idx--){
    const s=STONES[idx],reached=hours>=s.h,isNext=next&&s.n===next.n;
    const rowState=reached?'reached':isNext?'current':'upcoming';
    rows+=`<div class="voy-rank-row ${rowState}">
      <span class="voy-rank-row-dot"></span>
      <div class="between voy-rank-row-body">
        <span class="voy-rank-row-name">${s.n}${isNext?' <span class="tag acc voy-rank-row-tag">en cours</span>':''}</span>
        <span class="num muted">${s.h.toLocaleString('fr-FR')} h</span>
      </div>
    </div>`;
  }
  el.innerHTML=`
    <div class="card hi voy-rank-card">
      <div class="voy-rank-medal">
        <div class="voy-rank-medal-glow"></div>
        <div class="voy-rank-medal-ring"></div>
        <div class="voy-rank-medal-ring2"></div>
        <div class="voy-rank-medal-glyph">${cur?rankGlyph(cur):'♪'}</div>
      </div>
      <div class="eyebrow voy-rank-eyebrow">Rang actuel</div>
      <div class="serif voy-rank-name">${cur?cur.n:'En route'}</div>
      <div class="num it voy-rank-hours">${hoursDisp} heures jouées</div>
      ${next?`<div class="sub voy-rank-next"><span>Prochain · ${next.n}</span><span>${hoursDisp} / ${next.h} h</span></div>
      <div class="bar voy-rank-bar"><i style="width:${Math.round(prog*100)}%;"></i></div>
      <div class="muted voy-rank-next-sub">Encore ${Math.max(0,Math.round(next.h-hours))} h avant ${next.n}</div>`:'<div class="muted voy-rank-done">Voyage accompli — Maestro Assoluto atteint. ♫</div>'}
    </div>
    <div class="muted voy-ranks-label">${voyageRanksOpen?"18 rangs · d'Apprenti à Maestro Assoluto":'Autour de toi · rang '+(focusIdx+1)+' sur 18'}</div>
    <div class="voy-path">${rows}</div>
    <button class="btn ghost sm voy-ranks-toggle" onclick="toggleVoyageRanks()">${voyageRanksOpen?'Réduire':'Voir les 18 rangs'}</button>`;
}
