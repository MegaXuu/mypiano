/* ==========================================================================
   piece-detail.js — Fiche unifiée pieceDetail(), carte d'avancement,
   carte de couverture / courbe, éditeur de sections & mesures, découpage
   assisté, transitions de statut, œuvres multi-mouvements (workSheet).
   ========================================================================== */
function pieceDetail(id){const p=pieceById(id);if(!p)return;
  if(_detailPid!==id)_secOpen=null;
  _detailPid=id;
  const ph=piecePhase(p),played=pieceSeconds(p.id),lp=pieceLastPlayed(p.id),nSess=pieceSessionCount(p.id);
  const meta=[p.composer,p.epoch,p.opus].filter(Boolean).join(' · ');
  const stat=(v,l)=>`<div class="metric" style="padding:12px;"><div class="v" style="font-size:20px;">${v}</div><div class="l">${l}</div></div>`;
  const isWish=p.status==='wishlist',closed=p.status==='archived'||p.status==='abandoned';
  const notes=(p.notes||[]).length?'<div class="tl" style="margin-top:6px;">'+[...p.notes].reverse().slice(0,12).map(n=>`<div class="n"><div class="between"><span class="muted" style="font-size:12px;">${frShort(n.date)}</span>${n.section?`<span class="tag" style="padding:3px 9px;">${esc(secName(p,n.section))}</span>`:''}</div><div style="margin-top:5px;line-height:1.5;color:var(--tc);">${esc(n.text)}</div></div>`).join('')+'</div>':'<div class="empty" style="padding:14px;">Aucune note pour l\'instant.</div>';
  openSheet(`<div class="between" style="align-items:flex-start;">
      <div style="min-width:0;"><h3 style="margin:0;">${esc(p.title)}</h3>${meta?`<div class="muted" style="font-size:13px;margin-top:3px;">${esc(meta)}</div>`:''}</div>
      ${phaseChip(p)}</div>
    <div class="row" style="gap:7px;margin:12px 0;flex-wrap:wrap;">
      ${p.diff?`<span class="tag">Henle ${p.diff}</span>`:''}
      ${p.key?`<span class="tag">${esc(p.key)}</span>`:''}
      ${p.genre?`<span class="tag">${esc(p.genre)}</span>`:''}
      ${p.bars?`<span class="tag">${p.bars} mesures</span>`:''}
      ${(p.tags||[]).map(t=>`<span class="tag" style="padding:2px 8px;">${esc(t)}</span>`).join('')}</div>
    <div class="grid2" style="gap:8px;margin-bottom:6px;">${stat(played?dur(played):'—','temps joué')}${stat(nSess||'—','séances')}</div>
    <div class="metric" style="padding:12px;margin-bottom:12px;"><div class="v" style="font-size:16px;">${lp?frShort(lp):'jamais'}</div><div class="l">dernière fois</div></div>
    ${!isWish&&!closed?renderProgressCard(p):''}
    ${p.todo&&p.todo.trim()?`<div class="card" style="padding:12px 14px;margin-bottom:12px;border-left:2px solid var(--acc);border-radius:0 12px 12px 0;"><span class="muted" style="font-size:12px;">À faire</span><div style="font-size:14px;margin-top:3px;">${esc(p.todo)}</div></div>`:''}
    ${isWish?`<button class="btn primary" onclick="startLearning('${p.id}')">Commencer à apprendre</button>
      <div class="grid2" style="margin-top:10px;"><button class="btn ghost sm" onclick="editPiece('${p.id}')">Modifier</button><button class="btn ghost sm" style="color:var(--danger);border-color:var(--danger-border);" onclick="deleteWish('${p.id}')">Retirer</button></div>`
    :closed?`<button class="btn primary" onclick="reopenPiece('${p.id}')">Réactiver (en cours)</button>
      <button class="btn ghost sm" style="width:100%;margin-top:10px;" onclick="editPiece('${p.id}')">Modifier</button>`
    :`<div class="grid2"><button class="btn primary" onclick="detailPlay('${p.id}')">${playSvg()} Jouer</button><button class="btn ghost" onclick="noteSheet('${p.id}')">+ Note</button></div>
      <div class="grid2" style="margin-top:10px;"><button class="btn ghost sm" onclick="editPiece('${p.id}')">Modifier</button><button class="btn ghost sm" onclick="setPieceStatus('${p.id}','archived')">Archiver</button></div>
      <div class="between" style="margin:20px 0 10px;"><h2 style="margin:0;">Sections</h2>${secList(p).length?`<button class="btn ghost sm" onclick="addSection('${p.id}')">+ Ajouter</button>`:''}</div>
      ${renderSections(p)}`}
    ${!isWish?`<h2 style="margin-top:18px;">Enregistrements</h2>${renderRecordings(p)}`:''}
    <h2 style="margin-top:18px;">Notes</h2>${notes}`);
}
function detailPlay(id){closeSheet();quickStart(id);}
function editPiece(id){pieceSheet(id);}
function renderProgressCard(p){
  const pr=pieceProgress(p),derived=hasDerivedProgress(p);
  return `<div class="card" style="padding:14px;margin-bottom:12px;">
      <div class="between" style="margin-bottom:${derived?'4px':'0'};"><span class="muted" style="font-size:13px;">Avancement</span><span style="font-weight:600;${derived?'font-size:17px;':''}">${pr} %</span></div>
      ${derived?`<div class="muted" style="font-size:12px;margin-bottom:11px;">${barsOk(p)} mesures sur ${p.bars} au point${secList(p).some(s=>s.status==='poli')?' · '+secList(p).filter(s=>s.status==='poli').reduce((a,s)=>a+Math.max(0,s.to-s.from+1),0)+' en polissage':''}</div>
        ${renderMap(p)}${mapLegend()}${renderHistCurve(p)}`
      :`<div class="row" style="gap:8px;margin-top:10px;">
        <button class="btn ghost sm" style="flex:1;" onclick="nudgeProgress('${p.id}',-10)">– 10</button>
        <button class="btn ghost sm" style="flex:1;" onclick="nudgeProgress('${p.id}',10)">+ 10</button>
        ${p.status!=='mastered'?`<button class="btn primary sm" style="flex:1;" onclick="markMastered('${p.id}')">Maîtrisé ✓</button>`:''}</div>`}
      ${p.status!=='mastered'&&derived&&pr>=100?`<button class="btn primary sm" style="width:100%;margin-top:12px;" onclick="markMastered('${p.id}')">Maîtrisé ✓</button>`:''}
      ${estimateText(p)?`<div style="font-size:12px;margin-top:8px;color:var(--acc);">${estimateText(p)}</div>`:''}</div>`;
}
function renderMap(p){
  const segs=mapSegments(p);if(!segs.length)return '';
  return `<div class="map">${segs.map(s=>`<i class="${s.gap?'map-gap':''}" style="flex:${s.count};${s.gap?'':'background:'+s.col+';'}"></i>`).join('')}</div>
    <div class="sub" style="margin-top:6px;font-size:10px;"><span class="num">mes. 1</span><span class="num">${p.bars}</span></div>`;
}
function mapLegend(){
  return `<div class="row" style="gap:12px;flex-wrap:wrap;margin-top:10px;font-size:11px;color:var(--t2);">
    ${SEC_STATUS.map(s=>`<span class="row" style="gap:5px;"><i style="width:8px;height:8px;border-radius:2px;background:${s.col};display:inline-block;"></i>${s.label.toLowerCase()}</span>`).join('')}
    <span class="row" style="gap:5px;"><i class="map-gap" style="width:8px;height:8px;border-radius:2px;display:inline-block;"></i>non couvert</span></div>`;
}
function renderHistCurve(p){
  const h=(p.hist||[]).slice(-24);if(h.length<3)return '';
  const w=300,ht=96,padL=30,padR=6,padT=18,padB=14,innerW=w-padL-padR,innerH=ht-padT-padB;
  const x=i=>padL+(h.length===1?0:i/(h.length-1)*innerW);
  const y=v=>padT+innerH-(v/p.bars*innerH);
  const linePts=h.map((pt,i)=>`${x(i).toFixed(1)},${y(pt.m).toFixed(1)}`);
  const baseY=(padT+innerH).toFixed(1);
  const areaD='M'+x(0).toFixed(1)+','+baseY+' L'+linePts.join(' L')+' L'+x(h.length-1).toFixed(1)+','+baseY+' Z';
  const first=h[0],last=h[h.length-1],delta=last.m-first.m;
  const circles=h.map((pt,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(pt.m).toFixed(1)}" r="${i===h.length-1?3.6:1.8}" fill="var(--acc)" ${i===h.length-1?'stroke="#242833" stroke-width="2"':''}/>`).join('');
  return `<div class="mini">
    <div class="between" style="padding:0 2px 4px;"><span class="muted" style="font-size:11px;">Mesures au point</span></div>
    <svg viewBox="0 0 ${w} ${ht}" width="100%" style="display:block;overflow:visible;">
      <line x1="${padL}" y1="${padT}" x2="${w-padR}" y2="${padT}" stroke="var(--gold)" stroke-width="1" stroke-dasharray="3 4" opacity=".7"/>
      <text x="${w-padR}" y="13" fill="var(--gold)" font-size="8" font-family="DM Sans" text-anchor="end" opacity=".9">${p.bars} · le morceau entier</text>
      <text x="${padL-4}" y="${padT+3}" fill="#9B97A8" font-size="8" font-family="EB Garamond" text-anchor="end">${p.bars}</text>
      <text x="${padL-4}" y="${padT+innerH}" fill="#9B97A8" font-size="8" font-family="EB Garamond" text-anchor="end">0</text>
      <path d="${areaD}" fill="rgba(158,147,242,.13)"/>
      <polyline points="${linePts.join(' ')}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${circles}
      <text x="${padL}" y="${ht-2}" fill="#9B97A8" font-size="8" font-family="DM Sans">${frShort(first.d)}</text>
      <text x="${w-padR}" y="${ht-2}" fill="#9B97A8" font-size="8" font-family="DM Sans" text-anchor="end">${frShort(last.d)}</text>
    </svg>
    <div class="sub" style="margin-top:8px;padding:0 2px;"><span>${h.length} relevés</span><span style="color:var(--acc);">${delta>=0?'+ ':'− '}${Math.abs(delta)} mesures</span></div>
  </div>`;
}
function renderTodaySec(p){
  const pick=pickTodaySection(p);if(!pick)return '';
  const days=pick.d?Math.floor((Date.now()-new Date(pick.d+'T00:00'))/86400000):null;
  const sub=pick.d?(days<=0?"travaillée aujourd'hui":`pas ouverte depuis ${days} j`):'jamais travaillée';
  return `<div class="card" style="padding:11px 14px;margin-bottom:10px;border-left:2px solid var(--gold);border-radius:0 12px 12px 0;background:rgba(228,197,138,.06);">
    <div class="between"><div style="min-width:0;">
        <span class="muted" style="font-size:11px;">À travailler aujourd'hui</span>
        <div style="font-size:14px;margin-top:2px;font-weight:600;">${esc(pick.s.name)} · mes. ${pick.s.from}–${pick.s.to}</div>
        <div class="muted" style="font-size:11px;margin-top:2px;">${sub}</div></div>
      <button class="btn ghost sm" style="flex:0 0 auto;" onclick="toggleSec('${p.id}','${pick.s.id}')">Ouvrir</button></div></div>`;
}
function renderSections(p){
  if(!secList(p).length)return `<div class="card" style="padding:14px 16px;margin-bottom:10px;">
    <p class="muted" style="font-size:13px;margin:0 0 12px;line-height:1.5;">Découper un morceau en sections est facultatif. Utile pour organiser le travail passage par passage et voir précisément ce qui est acquis.</p>
    <button class="btn ghost sm" style="width:100%;" onclick="cutSheet('${p.id}')">Découper en sections</button></div>`;
  sortSections(p);
  let html=renderTodaySec(p)+secList(p).map(s=>renderSecRow(p,s)).join('');
  coverageGaps(p).forEach(g=>{html+=`<div class="row" style="gap:10px;padding:11px 14px;border:1px dashed var(--border);border-radius:13px;margin-bottom:8px;">
    <span class="muted" style="font-size:13px;flex:1;">mes. ${g.from}–${g.to} · pas encore couvertes</span>
    <button class="btn ghost sm" style="flex:0 0 auto;" onclick="addSection('${p.id}',${g.from},${g.to})">+ Section</button></div>`;});
  if(!p.bars)html='<div class="card" style="padding:12px 14px;margin-bottom:10px;"><p class="muted" style="font-size:13px;margin:0;">Indique le nombre de mesures (dans « Modifier ») pour calculer ton avancement.</p></div>'+html;
  return html;
}
function renderSecRow(p,s){
  const open=_secOpen===s.id,info=secStatusInfo(s.status);
  return `<div class="sec" style="${open?'box-shadow:inset 0 0 0 1px rgba(158,147,242,.35);':''}">
    <div class="sec-h" style="cursor:${open?'default':'pointer'};" ${open?'':`onclick="toggleSec('${p.id}','${s.id}')"`}>
      <span class="sec-dot" style="background:${info.col};"></span>
      ${open?`<input class="sec-n" id="sec-n-${s.id}" value="${esc(s.name)}">`:`<span class="sec-n">${esc(s.name)}</span>`}
      <span class="sec-r">${s.from}–${s.to}</span>
      <span class="sec-car" style="cursor:pointer;" onclick="toggleSec('${p.id}','${s.id}')">${open?'⌃':'⌄'}</span>
    </div>
    ${!open&&s.todo?`<div class="sec-todo" onclick="toggleSec('${p.id}','${s.id}')" style="cursor:pointer;">${esc(s.todo)}</div>`:''}
    ${open?renderSecBody(p,s):''}
  </div>`;
}
function renderSecBody(p,s){
  const bpmDraft=_secBpm[s.id]!=null?_secBpm[s.id]:((s.bpm&&s.bpm.length)?s.bpm[s.bpm.length-1].v:(parseInt(p.bpm)||92));
  _secBpm[s.id]=bpmDraft;
  const lastBpm=(s.bpm||[])[(s.bpm||[]).length-1];
  return `<div class="sec-body">
    <div class="row" style="gap:8px;margin:12px 0;">
      <span class="muted" style="font-size:13px;flex:0 0 auto;">Mesures</span>
      <input class="num" inputmode="numeric" id="sec-from-${s.id}" value="${s.from}" style="width:56px;padding:8px;text-align:center;" onchange="setSecRange('${p.id}','${s.id}')">
      <span class="muted">→</span>
      <input class="num" inputmode="numeric" id="sec-to-${s.id}" value="${s.to}" style="width:56px;padding:8px;text-align:center;" onchange="setSecRange('${p.id}','${s.id}')">
      <span class="muted" style="font-size:12px;">${Math.max(0,s.to-s.from+1)} mes.</span>
    </div>
    <div class="field" style="margin:0 0 12px;"><div class="seg">${SEC_STATUS.map(st=>`<button class="${s.status===st.k?'on':''}" onclick="setSecStatus('${p.id}','${s.id}','${st.k}')">${st.label}</button>`).join('')}</div></div>
    <div class="field" style="margin-bottom:12px;"><label>À faire sur cette section</label>
      <textarea id="sec-todo-${s.id}" placeholder="Main gauche seule, pédale aux temps faibles…">${esc(s.todo||'')}</textarea></div>
    <div class="field" style="margin-bottom:0;"><label>Tempo stable du jour</label>
      <div class="row" style="gap:10px;">
        <button class="btn ghost" style="width:44px;height:44px;padding:0;border-radius:50%;font-size:20px;flex:0 0 auto;" onclick="secBpmStep('${s.id}',-2)">–</button>
        <div class="num" id="sec-bpmv-${s.id}" style="flex:1;text-align:center;font-size:28px;font-weight:600;">${bpmDraft}<span style="font-size:13px;color:var(--t2);font-family:var(--sans);font-weight:400;"> bpm</span></div>
        <button class="btn ghost" style="width:44px;height:44px;padding:0;border-radius:50%;font-size:20px;flex:0 0 auto;" onclick="secBpmStep('${s.id}',2)">+</button>
        <button class="btn primary sm" style="flex:0 0 auto;" onclick="noteSecBpm('${p.id}','${s.id}')">Noter</button></div>
      <div class="sub" style="margin-top:9px;"><span style="font-size:11px;">Le plus rapide joué proprement${p.bpm?' · cible '+esc(p.bpm):''}</span>
        ${lastBpm?`<span style="font-size:11px;color:var(--acc);">dernier ${lastBpm.v} le ${frShort(lastBpm.d)}</span>`:''}</div></div>
    <button class="btn ghost sm" style="width:100%;margin-top:14px;color:var(--danger);border-color:var(--danger-border);" onclick="deleteSection('${p.id}','${s.id}')">Supprimer la section</button>
  </div>`;
}
let _secOpen=null,_secBpm={},_detailPid=null;
function commitOpenSec(pid){if(!_secOpen)return;const p=pieceById(pid);const s=p&&secList(p).find(x=>x.id===_secOpen);if(!s)return;
  const n=document.getElementById('sec-n-'+s.id),t=document.getElementById('sec-todo-'+s.id);
  if(n)s.name=n.value.trim()||s.name;if(t)s.todo=t.value;}
function toggleSec(pid,sid){commitOpenSec(pid);_secOpen=(_secOpen===sid)?null:sid;save();pieceDetail(pid);}
function addSection(pid,presetFrom,presetTo){commitOpenSec(pid);const p=pieceById(pid);p.sections=p.sections||[];
  const from=presetFrom||((p.sections.length?Math.max(...p.sections.map(s=>s.to)):0)+1);
  const to=presetTo||Math.min(p.bars||from+7,from+7);
  const s={id:uid(),name:'Nouvelle section',from,to,todo:'',status:'new',bpm:[]};
  p.sections.push(s);sortSections(p);recordHist(p);_secOpen=s.id;save();pieceDetail(pid);}
function setSecRange(pid,sid){const p=pieceById(pid);const s=secList(p).find(x=>x.id===sid);if(!s)return;
  const from=parseInt(document.getElementById('sec-from-'+sid).value)||1,to=parseInt(document.getElementById('sec-to-'+sid).value)||from;
  s.from=Math.max(1,from);s.to=Math.max(s.from,to);sortSections(p);recordHist(p);save();pieceDetail(pid);}
function setSecStatus(pid,sid,st){commitOpenSec(pid);const p=pieceById(pid);const s=secList(p).find(x=>x.id===sid);if(!s)return;
  s.status=st;recordHist(p);save();refreshScreen();pieceDetail(pid);}
function secBpmStep(sid,d){_secBpm[sid]=Math.max(20,(_secBpm[sid]||92)+d);paintSecBpm(sid);}
function paintSecBpm(sid){const el=document.getElementById('sec-bpmv-'+sid);if(el)el.innerHTML=_secBpm[sid]+'<span style="font-size:13px;color:var(--t2);font-family:var(--sans);font-weight:400;"> bpm</span>';}
function noteSecBpm(pid,sid){const p=pieceById(pid);const s=secList(p).find(x=>x.id===sid);if(!s)return;
  const v=_secBpm[sid];s.bpm=s.bpm||[];const d=dkey();const last=s.bpm[s.bpm.length-1];
  if(last&&last.d===d)last.v=v;else s.bpm.push({d,v});
  save();toast('Tempo noté');pieceDetail(pid);}
function deleteSection(pid,sid){confirmSheet('Supprimer cette section ?','Supprimer',()=>{const p=pieceById(pid);
  p.sections=secList(p).filter(x=>x.id!==sid);if(_secOpen===sid)_secOpen=null;recordHist(p);save();refreshScreen();pieceDetail(pid);});}
let _cutSize=16;
function cutSheet(pid){const p=pieceById(pid);if(!p)return;_cutSize=16;
  openSheet(`<h3>Découper en sections</h3>
    <p class="muted" style="font-size:13px;margin:-6px 0 16px;line-height:1.5;">Travailler un morceau par segments indépendants, c'est la façon la plus sûre d'avancer. L'app en tire ton avancement réel.</p>
    <div class="field"><label>Combien de mesures compte le morceau ?</label>
      <input id="cut-bars" class="num" inputmode="numeric" value="${p.bars||''}" placeholder="57" style="text-align:center;font-size:22px;font-weight:600;" oninput="paintCutPreview()"></div>
    <div class="field"><label>Découpage de départ</label>
      <div class="seg" id="cut-seg">
        <button onclick="pickCutSize(8,this)">8 mes.</button>
        <button class="on" onclick="pickCutSize(16,this)">16 mes.</button>
        <button onclick="pickCutSize(32,this)">32 mes.</button>
        <button onclick="pickCutSize('manual',this)">À la main</button></div></div>
    <div class="card" id="cut-preview" style="padding:12px 14px;background:var(--surface2);"></div>
    <button class="btn primary" style="margin-top:16px;" onclick="applyCut('${pid}')">Créer les sections</button>`);
  paintCutPreview();
}
function pickCutSize(v,el){_cutSize=v;document.querySelectorAll('#cut-seg button').forEach(b=>b.classList.remove('on'));el.classList.add('on');paintCutPreview();}
function paintCutPreview(){
  const bars=parseInt((document.getElementById('cut-bars')||{}).value)||0;
  const el=document.getElementById('cut-preview');if(!el)return;
  if(!bars){el.innerHTML='<div class="muted" style="font-size:12px;">Indique le nombre de mesures.</div>';return;}
  if(_cutSize==='manual'){el.innerHTML=`<div class="muted" style="font-size:12px;">${bars} mesures enregistrées. Ajoute les sections une par une depuis la fiche.</div>`;return;}
  const step=_cutSize,ranges=[];for(let f=1;f<=bars;f+=step)ranges.push([f,Math.min(bars,f+step-1)]);
  el.innerHTML=`<div class="muted" style="font-size:11px;margin-bottom:9px;">Aperçu · ${ranges.length} section${ranges.length>1?'s':''}, renommables ensuite</div>
    <div class="map" style="height:16px;">${ranges.map(r=>`<i style="flex:${r[1]-r[0]+1};background:${PHASE_COL.dechiffrage};"></i>`).join('')}</div>
    <div class="sub" style="margin-top:9px;font-size:12px;"><span>mes. ${ranges.map(r=>r[0]+'–'+r[1]).join(' · ')}</span></div>`;
}
function applyCut(pid){
  const bars=parseInt((document.getElementById('cut-bars')||{}).value)||0;if(bars<1){toast('Indique le nombre de mesures',{danger:true});return;}
  const p=pieceById(pid);p.bars=bars;p.sections=p.sections||[];
  if(_cutSize!=='manual'){const step=_cutSize;for(let f=1;f<=bars;f+=step)p.sections.push({id:uid(),name:'Section '+(p.sections.length+1),from:f,to:Math.min(bars,f+step-1),todo:'',status:'new',bpm:[]});}
  recordHist(p);save();closeSheet();refreshScreen();pieceDetail(pid);
}
function nudgeProgress(id,d){const p=pieceById(id);if(!p)return;p.progress=Math.max(0,Math.min(100,(p.progress||0)+d));
  if(p.progress>=100&&p.status!=='mastered'){markMastered(id);return;}save();pieceDetail(id);}
function markMastered(id){const p=pieceById(id);if(!p)return;const was=p.status==='mastered';p.status='mastered';p.progress=100;
  if(hasDerivedProgress(p)){secList(p).forEach(s=>s.status='ok');recordHist(p);}
  if(!p.masteredAt)p.masteredAt=Date.now();
  save();closeSheet();refreshScreen();if(!was)celebrate('piece',p.title);else toast('Maîtrisé');}
function reopenPiece(id){const p=pieceById(id);if(!p)return;p.status='active';save();pieceDetail(id);toast('Réactivé · en cours');}
function deleteWish(id){confirmSheet('Retirer ce morceau de « à apprendre » ?','Retirer',()=>{S.pieces=S.pieces.filter(p=>p.id!==id);save();closeSheet();refreshScreen();toast('Retiré');});}

/* ---------- Œuvre / recueil à plusieurs mouvements ---------- */
let _workMovs=[];
function workSheet(){
  _workMovs=['',''];
  openSheet(`<h3>Nouvelle œuvre / recueil</h3>
    <p class="muted" style="font-size:14px;margin-top:-6px;">Un morceau composé de plusieurs mouvements (sonate, recueil…) — chaque mouvement devient une pièce à part entière du répertoire.</p>
    <div class="field"><label>Titre de l'œuvre</label><input id="w-t" placeholder="Sonate no 14 « Clair de lune »"></div>
    <div class="field"><label>Compositeur</label><input id="w-c" list="dl-comp-w" placeholder="Beethoven" autocomplete="off"><datalist id="dl-comp-w">${OPUS.ALL.map(c=>`<option value="${c.name}"></option>`).join('')}</datalist></div>
    <div class="field"><label>Époque</label><input id="w-e" placeholder="Classique"></div>
    <div class="field"><label>Mouvements</label><div id="w-rows"></div>
      <button class="btn ghost sm" style="width:100%;margin-top:8px;" onclick="addWorkRow()">+ Ajouter un mouvement</button></div>
    <button class="btn primary" onclick="saveWork()">Créer</button>`);
  paintWorkRows();
}
function paintWorkRows(){const box=document.getElementById('w-rows');if(!box)return;
  box.innerHTML=_workMovs.map((v,i)=>`<div class="row" style="gap:8px;margin-bottom:8px;"><input value="${esc(v)}" placeholder="Mouvement ${i+1}" style="flex:1;" oninput="_workMovs[${i}]=this.value">${_workMovs.length>1?`<button class="btn ghost sm" style="width:auto;padding:0 12px;" onclick="removeWorkRow(${i})">✕</button>`:''}</div>`).join('');}
function addWorkRow(){_workMovs.push('');paintWorkRows();}
function removeWorkRow(i){_workMovs.splice(i,1);paintWorkRows();}
function saveWork(){
  const title=document.getElementById('w-t').value.trim();
  const composer=document.getElementById('w-c').value.trim();
  const epoch=document.getElementById('w-e').value.trim();
  if(!title){toast("Donne un titre à l'œuvre",{danger:true});return;}
  const movs=_workMovs.map(m=>m.trim()).filter(Boolean);
  if(!movs.length){toast('Ajoute au moins un mouvement',{danger:true});return;}
  const parent={id:uid(),title,composer,epoch,opus:'',genre:'',key:'',diff:0,bpm:'',status:'active',progress:0,tags:[],notes:[],todo:'',createdAt:Date.now(),isEnsemble:true};
  S.pieces.push(parent);
  movs.forEach(m=>{S.pieces.push({id:uid(),title:m,composer,epoch,opus:'',genre:'',key:'',diff:0,bpm:'',status:'active',progress:0,tags:[],notes:[],todo:'',createdAt:Date.now(),parentId:parent.id});});
  save();closeSheet();renderRep();toast('Œuvre créée · '+movs.length+' mouvement'+(movs.length>1?'s':''));
}

