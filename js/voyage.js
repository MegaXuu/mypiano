/* ==========================================================================
   VOYAGE
   ========================================================================== */
let voyageTab='voyage',voyageRanksOpen=false;
function renderVoyage(){
  document.getElementById('s-voyage').innerHTML=`
    <h1 class="serif">Le Grand Voyage</h1>
    <div class="seg" style="margin:16px 0;">
      <button class="${voyageTab==='voyage'?'on':''}" onclick="setVoyage('voyage')" style="font-size:12px;">Voyage</button>
      <button class="${voyageTab==='jardin'?'on':''}" onclick="setVoyage('jardin')" style="font-size:12px;">Jardin</button>
      <button class="${voyageTab==='succes'?'on':''}" onclick="setVoyage('succes')" style="font-size:12px;">Défis</button>
      <button class="${voyageTab==='cartes'?'on':''}" onclick="setVoyage('cartes')" style="font-size:12px;">Cartes</button>
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
  for(let idx=to;idx>=from;idx--){const s=STONES[idx],reached=hours>=s.h,isNext=next&&s.n===next.n;
    rows+=`<div class="rank" style="${reached?'':'opacity:.42;'}">
      <div class="dot">${noteIcon(reached?s.c:'#6A6A78',reached?24:19,glyphFor(idx))}</div>
      <div class="between" style="flex:1;min-width:0;"><span style="font-weight:600;color:${reached?'var(--gold)':'var(--tc)'};">${s.n}${isNext?' <span class="tag acc" style="padding:2px 8px;">en cours</span>':''}</span>
      <span class="num muted">${s.h.toLocaleString('fr-FR')} h</span></div></div>`;}
  el.innerHTML=`
    <div class="card hi" style="box-shadow:inset 0 0 0 1px rgba(228,197,138,.25);">
      <div class="between"><div class="row" style="gap:12px;">${noteIcon(cur?cur.c:'#888',32,cur?rankGlyph(cur):'♪')}
        <div><div class="muted" style="font-size:12px;">Rang actuel</div><div class="serif" style="font-size:22px;color:var(--gold);">${cur?cur.n:'En route'}</div></div></div>
        <div style="text-align:right;"><div class="num" style="font-size:34px;font-weight:600;">${hoursDisp}</div><div class="muted" style="font-size:12px;">heures jouées</div></div></div>
      ${next?`<div class="sub" style="margin:16px 0 6px;"><span>Prochain · ${next.n}</span><span>${hoursDisp} / ${next.h} h</span></div>
      <div class="bar"><i style="width:${Math.round(prog*100)}%;background:linear-gradient(90deg,var(--acc),var(--gold));"></i></div>
      <div class="muted" style="font-size:12px;margin-top:8px;">Encore ${Math.max(0,Math.round(next.h-hours))} h avant ${next.n}</div>`:'<div class="muted" style="margin-top:14px;">Voyage accompli — Maestro Assoluto atteint. ♫</div>'}
    </div>
    <div class="muted" style="font-size:12px;margin:20px 0 10px;">${voyageRanksOpen?"18 rangs · d'Apprenti à Maestro Assoluto":'Autour de toi · rang '+(focusIdx+1)+' sur 18'}</div>
    <div class="path">${rows}</div>
    <button class="btn ghost sm" style="width:100%;margin-top:14px;" onclick="toggleVoyageRanks()">${voyageRanksOpen?'Réduire':'Voir les 18 rangs'}</button>`;
}

