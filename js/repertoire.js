/* ==========================================================================
   RÉPERTOIRE
   ========================================================================== */
let repFilter='active',_ensOpen={},repSort='composer',repGroup=true,_grpOpen={},
    repF={composer:'',epoch:'',genre:'',tag:'',diffMin:1,diffMax:9,notPlayed:0};
const SORT_LABELS={composer:'compositeur',title:'titre',recent:'dernière fois',diff:'difficulté',time:'temps joué',added:'ajout'};
function activeFilterCount(){let n=0;if(repF.composer)n++;if(repF.epoch)n++;if(repF.genre)n++;if(repF.tag)n++;if(repF.diffMin>1||repF.diffMax<9)n++;if(repF.notPlayed>0)n++;return n;}
function distinctVals(key){const s=new Set();S.pieces.forEach(p=>{if(!p.isEnsemble&&p[key])s.add(p[key]);});return [...s].sort((a,b)=>a.localeCompare(b));}
function distinctTags(){const s=new Set();S.pieces.forEach(p=>(p.tags||[]).forEach(t=>s.add(t)));return [...s].sort((a,b)=>a.localeCompare(b));}
function addChoiceSheet(){
  openSheet(`<h3>Ajouter au répertoire</h3>
    <div class="item" style="align-items:flex-start;" onclick="addPieceSheet()">
      <svg viewBox="0 0 24 24" class="ic" style="width:20px;height:20px;color:var(--acc);margin-top:2px;"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.4"/><circle cx="16.5" cy="16" r="2.4"/></svg>
      <div style="min-width:0;"><div class="title">Un morceau</div>
      <div class="meta" style="line-height:1.45;">Une pièce seule, que tu commences à travailler.</div></div>
      <div class="r muted">›</div></div>
    <div class="item" style="align-items:flex-start;" onclick="workSheet()">
      <svg viewBox="0 0 24 24" class="ic" style="width:20px;height:20px;color:var(--acc);margin-top:2px;"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.5h16M4 15h16"/></svg>
      <div style="min-width:0;"><div class="title">Une œuvre à mouvements</div>
      <div class="meta" style="line-height:1.45;">Sonate, suite, cycle… chaque mouvement devient un morceau.</div></div>
      <div class="r muted">›</div></div>
    <div class="item" style="align-items:flex-start;" onclick="wishSheet()">
      <svg viewBox="0 0 24 24" class="ic" style="width:20px;height:20px;color:var(--t2);margin-top:2px;"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/></svg>
      <div style="min-width:0;"><div class="title">À apprendre un jour</div>
      <div class="meta" style="line-height:1.45;">Une envie à garder de côté, sans la commencer.</div></div>
      <div class="r muted">›</div></div>
    <button class="btn ghost sm" style="width:100%;margin-top:12px;" onclick="closeSheet()">Annuler</button>`);
}
function renderRep(){
  document.getElementById('s-rep').innerHTML=`
    <div class="between"><h1>Répertoire</h1><button class="btn primary sm" onclick="addChoiceSheet()">+ Ajouter</button></div>
    <div class="field" style="margin-top:16px;position:relative;">
      <input id="rep-q" placeholder="Compositeur ou œuvre…" oninput="repSearch(this.value)" autocomplete="off">
      <div id="rep-sug"></div></div>
    <div class="seg" style="margin:6px 0 10px;">
      <button class="${repFilter==='wishlist'?'on':''}" onclick="setRep('wishlist')" style="font-size:12px;">Apprendre</button>
      <button class="${repFilter==='active'?'on':''}" onclick="setRep('active')" style="font-size:12px;">En cours</button>
      <button class="${repFilter==='mastered'?'on':''}" onclick="setRep('mastered')" style="font-size:12px;">Maîtrisés</button>
      <button class="${repFilter==='archived'?'on':''}" onclick="setRep('archived')" style="font-size:12px;">Archivés</button>
    </div>
    <div class="row" style="gap:8px;margin-bottom:12px;">
      <button class="btn ghost sm" style="flex:1;" onclick="repSortSheet()">Trier : ${SORT_LABELS[repSort]}</button>
      <button class="btn ghost sm" style="flex:1;${activeFilterCount()?'color:var(--acc);border-color:var(--acc);':''}" onclick="repFilterSheet()">Filtres${activeFilterCount()?' · '+activeFilterCount():''}</button>
    </div>
    <div id="rep-list"></div>`;
  renderRepList();
  if(!S.opusSyncedAt&&typeof navigator!=='undefined'&&navigator.onLine!==false)syncOpus(false);
}
function setRep(f){repFilter=f;renderRep();}
function passFilter(p){
  if(repF.composer&&(p.composer||'')!==repF.composer)return false;
  if(repF.epoch&&(p.epoch||'')!==repF.epoch)return false;
  if(repF.genre&&(p.genre||'')!==repF.genre)return false;
  if(repF.tag&&!((p.tags||[]).includes(repF.tag)))return false;
  const df=p.diff||0;if(df&&(df<repF.diffMin||df>repF.diffMax))return false;
  if(repF.notPlayed>0){const lp=pieceLastPlayed(p.id);const days=lp?Math.floor((Date.now()-new Date(lp+'T00:00'))/86400000):99999;if(days<repF.notPlayed)return false;}
  return true;
}
function renderRepList(){
  const el=document.getElementById('rep-list');
  const match=p=>repFilter==='wishlist'?p.status==='wishlist':repFilter==='active'?p.status==='active':repFilter==='mastered'?p.status==='mastered':(p.status==='archived'||p.status==='abandoned');
  const sorters={
    composer:(a,b)=>(a.composer||'~').localeCompare(b.composer||'~')||a.title.localeCompare(b.title),
    title:(a,b)=>a.title.localeCompare(b.title),
    recent:(a,b)=>(pieceLastPlayed(b.id)||'').localeCompare(pieceLastPlayed(a.id)||''),
    diff:(a,b)=>(b.diff||0)-(a.diff||0),
    time:(a,b)=>pieceSeconds(b.id)-pieceSeconds(a.id),
    added:(a,b)=>(b.createdAt||0)-(a.createdAt||0),
  };
  const items=S.pieces.filter(p=>!p.isEnsemble&&!p.parentId&&match(p)&&passFilter(p)).sort(sorters[repSort]||sorters.composer);
  let html='';
  S.pieces.filter(p=>p.isEnsemble).forEach(e=>{
    const subs=S.pieces.filter(p=>p.parentId===e.id);if(!subs.some(match))return;
    const done=subs.filter(s=>s.status==='mastered').length;const open=_ensOpen[e.id];
    html+=`<div class="item" style="flex-direction:column;align-items:stretch;">
      <div class="row" onclick="toggleEns('${e.id}')" style="cursor:pointer;">
        <svg viewBox="0 0 24 24" class="ic" style="width:20px;height:20px;color:var(--t2);"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.4"/><circle cx="16.5" cy="16" r="2.4"/></svg>
        <div><div class="title">${esc(e.title)}</div><div class="meta">${esc(e.composer||'')} · ${done}/${subs.length} maîtrisés</div></div>
        <div class="r muted" style="transform:rotate(${open?90:0}deg);transition:.2s;">›</div></div>
      ${open?'<div style="margin-top:10px;padding-left:8px;border-left:1px solid var(--surface2);">'+subs.map(s=>repRow(s,true)).join('')+'</div>':''}</div>`;
  });
  if(repGroup&&repSort==='composer'){
    const groups={};items.forEach(p=>{const k=p.composer||'—';(groups[k]=groups[k]||[]).push(p);});
    Object.keys(groups).sort((a,b)=>a.localeCompare(b)).forEach(k=>{
      const open=_grpOpen[k]!==false;
      html+=`<div class="between" style="margin:0 2px;padding:16px 0 10px;cursor:pointer;" onclick="toggleGrp('${encodeURIComponent(k)}')">
        <span style="font-weight:600;font-size:14px;">${esc(k)}</span><span class="muted" style="font-size:12px;">${groups[k].length} ${open?'▾':'▸'}</span></div>`;
      if(open)html+=groups[k].map(p=>repRow(p,false)).join('');
    });
  } else {
    html+=items.map(p=>repRow(p,false)).join('');
  }
  el.innerHTML=html||'<div class="empty">Aucun morceau ne correspond.<br>'+(repFilter==='wishlist'?'Rien pour l\'instant.':'Ajuste les filtres, ou ajoute une œuvre.')+'</div>';
}
function toggleGrp(k){k=decodeURIComponent(k);_grpOpen[k]=_grpOpen[k]===false?true:false;renderRepList();}
function repSortSheet(){
  openSheet(`<h3>Trier le répertoire</h3>
    ${Object.keys(SORT_LABELS).map(k=>`<div class="item" onclick="setSort('${k}')"><div class="title" style="font-size:14px;">Par ${SORT_LABELS[k]}</div><div class="r">${repSort===k?'<span style="color:var(--acc);">✓</span>':''}</div></div>`).join('')}
    <div class="between" style="margin-top:10px;padding:12px 4px;"><span>Regrouper par compositeur</span><div class="toggle ${repGroup?'on':''}" onclick="toggleGroup(this)"></div></div>`);
}
function setSort(k){repSort=k;save();closeSheet();renderRep();}
function toggleGroup(el){repGroup=!repGroup;el.classList.toggle('on');}
function repFilterSheet(){
  const sel=(id,val,opts)=>`<select id="${id}"><option value="">Tous</option>${opts.map(o=>`<option value="${esc(o)}" ${val===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
  openSheet(`<h3>Filtrer</h3>
    <div class="field"><label>Compositeur</label>${sel('f-comp',repF.composer,distinctVals('composer'))}</div>
    <div class="field"><label>Époque</label>${sel('f-epoch',repF.epoch,distinctVals('epoch'))}</div>
    <div class="field"><label>Genre</label>${sel('f-genre',repF.genre,distinctVals('genre'))}</div>
    <div class="field"><label>Tag</label>${sel('f-tag',repF.tag,distinctTags())}</div>
    <div class="grid2"><div class="field"><label>Difficulté min</label><input id="f-dmin" type="number" min="1" max="9" value="${repF.diffMin}"></div>
      <div class="field"><label>Difficulté max</label><input id="f-dmax" type="number" min="1" max="9" value="${repF.diffMax}"></div></div>
    <div class="field"><label>Pas joué depuis (jours) — 0 = ignorer</label><input id="f-np" type="number" min="0" value="${repF.notPlayed}"></div>
    <button class="btn primary" onclick="applyFilters()">Appliquer</button>
    <button class="btn ghost sm" style="width:100%;margin-top:10px;" onclick="resetFilters()">Réinitialiser</button>`);
}
function applyFilters(){const v=id=>document.getElementById(id).value;
  repF.composer=v('f-comp');repF.epoch=v('f-epoch');repF.genre=v('f-genre');repF.tag=v('f-tag');
  repF.diffMin=Math.max(1,parseInt(v('f-dmin'))||1);repF.diffMax=Math.min(9,parseInt(v('f-dmax'))||9);repF.notPlayed=Math.max(0,parseInt(v('f-np'))||0);
  closeSheet();renderRep();}
function resetFilters(){repF={composer:'',epoch:'',genre:'',tag:'',diffMin:1,diffMax:9,notPlayed:0};closeSheet();renderRep();}
function repRow(p,sub){
  const meta=[p.composer,p.diff?('Henle '+p.diff):'',pieceSeconds(p.id)?dur(pieceSeconds(p.id))+' joués':''].filter(Boolean).join(' · ');
  const tags=(p.tags||[]).length?`<div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap;">${p.tags.map(t=>`<span class="tag" style="padding:2px 8px;font-size:11px;">${esc(t)}</span>`).join('')}</div>`:'';
  return `<div class="item" style="${sub?'margin-bottom:8px;background:var(--surface2);':''}" onclick="pieceDetail('${p.id}')">
    <div style="min-width:0;"><div class="title">${esc(p.title)}</div><div class="meta">${esc(meta)}</div>${tags}</div>
    <div class="r">${phaseChip(p)}<span class="muted">›</span></div></div>`;
}
function toggleEns(id){_ensOpen[id]=!_ensOpen[id];renderRepList();}
let _searchTO,_sugList=[];
function repSearch(q){clearTimeout(_searchTO);const box=document.getElementById('rep-sug');
  if(!q.trim()){box.innerHTML='';_sugList=[];return;}
  buildSug(appLocalSearch(q));
  _searchTO=setTimeout(()=>{
    OPUS.onlineComposer(q).then(comps=>{
      if(comps&&comps.length){const c=comps[0];
        OPUS.onlineWorks(c.id,c.name,c.epoch).then(works=>{if(works&&works.length)buildSug({composers:comps,works:works.slice(0,14)});}).catch(()=>{});}
    }).catch(()=>{});
  },350);
}
function buildSug(res){
  const items=[];
  res.composers.slice(0,3).forEach(c=>items.push({type:'compositeur',label:c.full||c.name,sub:c.epoch,data:{composer:c.name,epoch:c.epoch}}));
  res.works.forEach(w=>items.push({type:'œuvre',label:w.title+(w.opus?' '+w.opus:''),sub:w.composer,data:w}));
  _sugList=items.slice(0,10);
  const box=document.getElementById('rep-sug');if(!box)return;
  if(!_sugList.length){box.innerHTML='<div class="empty" style="padding:16px;">Aucun résultat</div>';return;}
  box.innerHTML='<div class="card" style="margin-top:8px;padding:6px;">'+_sugList.map((it,i)=>
    `<div class="row" style="padding:10px;border-radius:10px;" onclick="addSug(${i})">
      <span class="tag" style="padding:3px 9px;">${it.type}</span>
      <div style="min-width:0;"><div class="title" style="font-size:14px;">${esc(it.label)}</div><div class="meta">${esc(it.sub||'')}</div></div>
      <div class="r muted">+</div></div>`).join('')+'</div>';
}
function addSug(i){const it=_sugList[i];if(!it)return;const w=it.data;
  const qi=document.getElementById('rep-q');if(qi)qi.value='';const sb=document.getElementById('rep-sug');if(sb)sb.innerHTML='';_sugList=[];
  if(it.type==='compositeur'){pieceSheet(null,{composer:w.composer,epoch:w.epoch});return;}
  const p={id:uid(),title:w.title,composer:w.composer||'',epoch:w.epoch||'',opus:w.opus||'',genre:w.genre||'',key:w.key||'',diff:w.diff||0,status:'active',bpm:'',notes:[],createdAt:Date.now()};
  S.pieces.push(p);save();renderRepList();toast('Ajouté au répertoire');pieceSheet(p.id);
}
function addPieceSheet(){pieceSheet(null);}
function pieceSheet(id,prefill){
  const isNew=!id;const p=id?pieceById(id):Object.assign({title:'',composer:'',epoch:'',opus:'',genre:'',key:'',diff:0,bpm:'',status:'active'},prefill||{});
  _pstatus=p.status==='mastered'?'mastered':'active';_pdiff=p.diff||0;_worksCache=[];_pprog=p.progress!=null?p.progress:(p.status==='mastered'?100:0);
  const comps=OPUS.ALL.map(c=>`<option value="${c.name}"></option>`).join('');
  openSheet(`<h3>${isNew?'Nouveau morceau':esc(p.title)||'Morceau'}</h3>
    <div class="field"><label>Compositeur</label><input id="p-c" list="dl-comp" value="${esc(p.composer)}" placeholder="Chopin" oninput="onComposerInput(this.value)" autocomplete="off"><datalist id="dl-comp">${comps}</datalist></div>
    <div class="field"><label>Titre / œuvre</label><input id="p-t" list="dl-works" value="${esc(p.title)}" placeholder="Nocturne op. 9 no 2" oninput="onTitleInput(this.value)" autocomplete="off"><datalist id="dl-works"></datalist>
      <div class="muted" style="font-size:12px;margin-top:6px;">Un compositeur pré-chargé complète l'opus, le genre, la tonalité et la difficulté.</div></div>
    <div class="field"><label>Difficulté · Henle 1–9</label><div class="row" id="p-diff" style="gap:5px;">${[1,2,3,4,5,6,7,8,9].map(i=>`<button onclick="setDiff(${i})" data-i="${i}" style="flex:1;height:22px;border-radius:5px;background:${i<=_pdiff?'var(--acc)':'var(--surface2)'};"></button>`).join('')}</div>
      <div class="muted" id="p-diffl" style="font-size:13px;margin-top:6px;">${_pdiff?'Niveau '+_pdiff:'Non défini'}</div></div>
    <button type="button" class="btn ghost sm" id="p-more-btn" style="width:100%;margin:4px 0 2px;" onclick="togglePMore()">${isNew?'Détails (facultatif) ⌄':'Masquer les détails ⌃'}</button>
    <div id="p-more" style="display:${isNew?'none':'block'};">
      <div class="grid2"><div class="field"><label>Époque</label><input id="p-e" value="${esc(p.epoch)}" placeholder="Romantique"></div>
        <div class="field"><label>Opus</label><input id="p-o" value="${esc(p.opus)}" placeholder="op. 9 no 2"></div></div>
      <div class="grid2"><div class="field"><label>Genre</label><input id="p-g" value="${esc(p.genre)}" placeholder="Nocturne"></div>
        <div class="field"><label>Tonalité</label><input id="p-k" value="${esc(p.key)}" placeholder="Mi♭ majeur"></div></div>
      <div class="grid2"><div class="field"><label>Tempo cible (bpm)</label><input id="p-b" inputmode="numeric" value="${esc(p.bpm)}" placeholder="92"></div>
        <div class="field"><label>Mesures totales</label><input id="p-bars" inputmode="numeric" value="${p.bars||''}" placeholder="57"></div></div>
      <div class="field"><label>Tags (séparés par des virgules)</label><input id="p-tags" value="${esc((p.tags||[]).join(', '))}" placeholder="concert, par cœur, déchiffrage"></div>
      ${hasDerivedProgress(p)?`<div class="field"><label>Avancement</label><div class="muted" style="font-size:13px;">Calculé automatiquement à partir des sections (${pieceProgress(p)} %). Modifiable depuis la fiche.</div></div>`
        :`<div class="field"><label>Avancement · <span id="p-progl">${_pprog}</span> %</label><input id="p-prog" type="range" min="0" max="100" step="5" value="${_pprog}" oninput="document.getElementById('p-progl').textContent=this.value"></div>`}
      <div class="field"><label>Statut</label><div class="seg" id="p-st"><button class="${_pstatus==='active'?'on':''}" onclick="setPStatus('active',this)">En cours</button><button class="${_pstatus==='mastered'?'on':''}" onclick="setPStatus('mastered',this)">Maîtrisé</button></div></div>
    </div>
    <button class="btn primary" style="margin-top:6px;" onclick="savePiece('${isNew?'':p.id}')">${isNew?'Ajouter':'Enregistrer'}</button>
    ${isNew?'':`<div class="grid2" style="margin-top:10px;"><button class="btn ghost sm" style="width:100%;" onclick="setPieceStatus('${p.id}','archived')">Archiver</button><button class="btn ghost sm" style="width:100%;color:var(--danger);border-color:var(--danger-border);" onclick="setPieceStatus('${p.id}','abandoned')">Abandonner</button></div>`}
    ${isNew?'':`<div class="card" style="margin-top:14px;padding:12px 14px;"><div class="muted" style="font-size:12px;">Maturité</div>
      <div style="font-size:13px;margin-top:4px;">Ajouté ${p.createdAt?'le '+new Date(p.createdAt).toLocaleDateString('fr-FR'):'—'}${p.masteredAt?' · maîtrisé le '+new Date(p.masteredAt).toLocaleDateString('fr-FR'):''}</div>
      ${estimateText(p)?`<div style="font-size:13px;margin-top:4px;color:var(--acc);">${estimateText(p)}</div>`:''}</div>`}`);
  onComposerInput(p.composer);
}
let _pstatus='active',_pdiff=0,_worksCache=[],_pprog=0;
function setDiff(i){_pdiff=i;paintDiff();}
function paintDiff(){document.querySelectorAll('#p-diff button').forEach(b=>b.style.background=parseInt(b.dataset.i)<=_pdiff?'var(--acc)':'var(--surface2)');const l=document.getElementById('p-diffl');if(l)l.textContent=_pdiff?'Niveau '+_pdiff:'Non défini';}
function setIfEmpty(idv,v){const e=document.getElementById(idv);if(e&&v&&!e.value)e.value=v;}
function setIfAny(idv,v){const e=document.getElementById(idv);if(e&&v)e.value=v;}
function fillWorksDatalist(){const d=document.getElementById('dl-works');if(d)d.innerHTML=_worksCache.map(w=>`<option value="${esc(w.title+(w.opus?' '+w.opus:''))}"></option>`).join('');}
function fetchWorks(id,name,epoch,local){OPUS.onlineWorks(id,name,epoch).then(ws=>{if(ws&&ws.length){const seen={};_worksCache=(local||[]).concat(ws).filter(w=>{const k=w.title+(w.opus||'');if(seen[k])return false;seen[k]=1;return true;});fillWorksDatalist();}}).catch(()=>{});}
function onComposerInput(name){
  if(!document.getElementById('dl-works'))return;
  const local=allWorksOf(name);_worksCache=local.slice();fillWorksDatalist();
  const anyc=OPUS.composerByName(name);if(anyc&&anyc.epoch)setIfEmpty('p-e',anyc.epoch);
  const comp=OPUS.COMPOSERS.find(c=>c.name.toLowerCase()===(name||'').toLowerCase());
  if(comp){fetchWorks(comp.id,comp.name,comp.epoch,local);}
  else if(name&&name.length>2){OPUS.onlineComposer(name).then(cs=>{if(cs&&cs[0]){if(cs[0].epoch)setIfEmpty('p-e',cs[0].epoch);fetchWorks(cs[0].id,cs[0].name,cs[0].epoch,local);}}).catch(()=>{});}
}
function onTitleInput(val){
  const w=(_worksCache||[]).find(x=>(x.title+(x.opus?' '+x.opus:''))===val||x.title===val);
  if(!w)return;
  setIfAny('p-o',w.opus);setIfAny('p-g',w.genre);setIfAny('p-k',w.key);setIfAny('p-e',w.epoch);
  if(w.diff){_pdiff=w.diff;paintDiff();}
}
function setPStatus(s,el){_pstatus=s;document.querySelectorAll('#p-st button').forEach(b=>b.classList.remove('on'));el.classList.add('on');}
function savePiece(id){const title=document.getElementById('p-t').value.trim();if(!title){toast('Donne un titre',{danger:true});return;}
  const data={title,composer:document.getElementById('p-c').value.trim(),epoch:document.getElementById('p-e').value.trim(),
    opus:document.getElementById('p-o').value.trim(),genre:document.getElementById('p-g').value.trim(),key:document.getElementById('p-k').value.trim(),
    bpm:document.getElementById('p-b').value.trim(),diff:_pdiff,status:_pstatus,
    bars:parseInt(document.getElementById('p-bars').value)||0,
    tags:(document.getElementById('p-tags').value||'').split(',').map(t=>t.trim()).filter(Boolean)};
  const progEl=document.getElementById('p-prog');if(progEl)data.progress=parseInt(progEl.value)||0;
  let newlyMastered=false;
  if(id){const p=pieceById(id);const was=p.status==='mastered';Object.assign(p,data);
    if(p.status==='mastered'){if(!p.masteredAt)p.masteredAt=Date.now();if(!was)newlyMastered=true;}}
  else{
    const dup=findDuplicate(data.title,data.composer);
    if(dup){if(confirm('« '+dup.title+' » est déjà dans ton répertoire. Ouvrir sa fiche ?')){closeSheet();pieceDetail(dup.id);return;}}
    const np=Object.assign({id:uid(),notes:[],createdAt:Date.now()},data);if(np.status==='mastered')np.masteredAt=Date.now();S.pieces.push(np);}
  save();closeSheet();renderRep();
  if(newlyMastered)celebrate('piece',title);else toast('Enregistré');}
function togglePMore(){const m=document.getElementById('p-more'),b=document.getElementById('p-more-btn');if(!m)return;
  const open=m.style.display!=='none';m.style.display=open?'none':'block';if(b)b.textContent=open?'Détails (facultatif) ⌄':'Masquer les détails ⌃';}
function setPieceStatus(id,st){pieceById(id).status=st;save();closeSheet();renderRep();toast(st==='archived'?'Archivé':'Abandonné');}
function refreshScreen(){const a=document.querySelector('.screen.active');if(!a)return;const n=a.id.replace('s-','');
  ({home:renderHome,carnet:renderCarnet,rep:renderRep,voyage:renderVoyage,stats:renderStats,settings:renderSettings}[n]||(()=>{}))();}

/* ---------- Fiche morceau unifiée ---------- */
