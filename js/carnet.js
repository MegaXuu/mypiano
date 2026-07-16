/* ==========================================================================
   CARNET
   ========================================================================== */
let carnetFilter='',carnetShown=60;
function renderCarnet(){
  document.getElementById('s-carnet').innerHTML=`
    <h1>Carnet</h1><p class="eyebrow">Mon journal de travail.</p>
    <div id="carnet-body"></div>`;
  renderCarnetBody();
}
function carnetPieces(){const seen=new Set(),out=[];
  for(let i=S.sessions.length-1;i>=0&&out.length<10;i--){const bl=S.sessions[i].blocks;
    for(let j=bl.length-1;j>=0;j--){const pid=bl[j].piece;if(seen.has(pid))continue;seen.add(pid);out.push(pid);if(out.length>=10)break;}}
  return out;}
function setCarnetFilter(id){carnetFilter=carnetFilter===id?'':id;carnetShown=60;renderCarnetBody();}
function moreCarnet(){carnetShown+=60;renderCarnetBody();}
function truncWord(s,max){if(s.length<=max)return s;const cut=s.slice(0,max+1);const sp=cut.lastIndexOf(' ');return (sp>0?cut.slice(0,sp):cut.slice(0,max))+'…';}
function renderCarnetBody(){
  const el=document.getElementById('carnet-body');
  if(!el)return;
  const all=[...S.sessions].reverse();
  const filtered=carnetFilter?all.filter(s=>s.blocks.some(b=>b.piece===carnetFilter)):all;
  const shown=filtered.slice(0,carnetShown);
  const chips=carnetPieces();
  const chipsHtml=chips.length?`<div class="chips" style="flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;margin-bottom:4px;">
    <button class="chip ${carnetFilter?'':'on'}" style="flex:0 0 auto;" onclick="setCarnetFilter('')">Tous</button>
    ${chips.map(id=>`<button class="chip ${carnetFilter===id?'on':''}" style="flex:0 0 auto;" onclick="setCarnetFilter('${id}')">${esc(pieceName(id))}</button>`).join('')}
  </div>`:'';
  const curWk=weekKey();
  let groups='',gWk='',gSec=0,gDays=new Set(),gItems=[];
  const flush=()=>{if(!gItems.length)return;
    const label=gWk===curWk?'Cette semaine':'Semaine du '+frShort(gWk);
    groups+=`<div class="between" style="margin:22px 2px 8px;">
      <span class="serif" style="font-size:17px;">${label}</span>
      <span class="muted" style="font-size:12px;">${dur(gSec)} · ${gDays.size} j</span></div>${gItems.join('')}`;};
  shown.forEach(s=>{
    const wk=weekKey(new Date(s.date+'T00:00'));
    if(wk!==gWk){flush();gWk=wk;gSec=0;gDays=new Set();gItems=[];}
    gSec+=sessionSeconds(s);gDays.add(s.date);
    const names=[...new Set(s.blocks.map(b=>pieceName(b.piece)))].join(' · ');
    const prev=sessPreview(s);
    gItems.push(`<div class="item" onclick='aposterioriSheet(${JSON.stringify(s).replace(/'/g,"&#39;")})'>
      <div style="min-width:0;"><div class="title">${esc(names)}</div>
      <div class="meta">${frShort(s.date)} · ${dur(sessionSeconds(s))}${s.feeling?' · '+esc(feelLabel(s.feeling)):''}${prev?' · '+esc(truncWord(prev,32)):''}</div></div>
      <div class="r muted">›</div></div>`);
  });
  flush();
  const more=filtered.length>carnetShown?`<button class="btn ghost sm" style="width:100%;margin-top:16px;" onclick="moreCarnet()">Afficher 60 séances de plus</button>
    <p class="muted" style="font-size:12px;text-align:center;margin:10px 0 0;">${shown.length} séance${shown.length>1?'s':''} sur ${filtered.length}</p>`:'';
  el.innerHTML=`<button class="btn ghost sm" style="width:100%;margin:16px 0 14px;" onclick="aposterioriSheet()">+ Ajouter une séance oubliée</button>`+
    chipsHtml+
    (shown.length?groups+more:'<div class="empty">'+(carnetFilter?'Aucune séance pour ce morceau.':'Aucune séance.<br>Lance-toi, ou ajoute une séance oubliée.')+'</div>');
}
function dynScale(label,val,field){const idx=FEEL_ORDER.indexOf(val);
  return `<div style="margin-bottom:12px;"><div class="sub" style="margin-bottom:6px;"><span>${label}</span><span>${val?esc(feelLabel(val)):'—'}</span></div>
    <div class="dyn">${FEEL_ORDER.map((f,i)=>`<button class="${val&&i<=idx?'on':''}" onclick="setJournal('${field}','${f}')">${f}</button>`).join('')}</div></div>`;
}
function setJournal(field,v){const k=dkey();S.journal[k]=S.journal[k]||{mood:'',energy:''};S.journal[k][field]=v;save();
  const mb=document.getElementById('c-mood-body');
  if(mb){const j=S.journal[k];mb.innerHTML=dynScale('Humeur',j.mood,'mood')+dynScale('Énergie',j.energy,'energy');}
  else renderCarnetBody();}
let _noteSecId='';
function noteSheet(pid){_noteSecId='';const p=pieceById(pid),secs=p?secList(p):[];
  openSheet(`<h3>Nouvelle note</h3>
  ${secs.length?`<div class="field"><label>Section (optionnel)</label><div class="chips" id="n-secs">${secs.map(s=>`<button type="button" class="chip" onclick="pickNoteSec('${s.id}',this)">${esc(s.name)}</button>`).join('')}</div></div>`
    :`<div class="field"><label>Mesures / section (optionnel)</label><input id="n-s" placeholder="mes. 12–20, lecture, par cœur…"></div>`}
  <div class="field"><label>Note</label><textarea id="n-t" placeholder="Le legato tient mieux, main droite plus fluide…"></textarea></div>
  <button class="btn primary" onclick="saveNote('${pid}')">Ajouter</button>`);}
function pickNoteSec(id,el){const was=_noteSecId===id;_noteSecId=was?'':id;
  document.querySelectorAll('#n-secs .chip').forEach(b=>b.classList.toggle('on',!was&&b===el));}
function saveNote(pid){const t=document.getElementById('n-t').value.trim();if(!t){toast('Écris une note',{danger:true});return;}
  const p=pieceById(pid);p.notes=p.notes||[];
  const sEl=document.getElementById('n-s'),sec=sEl?sEl.value.trim():_noteSecId;
  p.notes.push({id:uid(),date:dkey(),section:sec,text:t});save();refreshScreen();pieceDetail(pid);toast('Note ajoutée');}
function wishSheet(){_worksCache=[];
  const comps=OPUS.ALL.map(c=>`<option value="${c.name}"></option>`).join('');
  openSheet(`<h3>À apprendre un jour</h3>
    <div class="field"><label>Compositeur</label><input id="p-c" list="dl-comp" placeholder="Liszt" oninput="onComposerInput(this.value)" autocomplete="off"><datalist id="dl-comp">${comps}</datalist></div>
    <div class="field"><label>Titre / œuvre</label><input id="p-t" list="dl-works" placeholder="La Campanella" autocomplete="off"><datalist id="dl-works"></datalist>
      <div class="muted" style="font-size:12px;margin-top:6px;">Choisis un compositeur pré-chargé pour l'autocomplétion.</div></div>
    <button class="btn primary" onclick="saveWish()">Ajouter à la wishlist</button>`);}
function saveWish(){const t=document.getElementById('p-t').value.trim();if(!t){toast('Donne un titre',{danger:true});return;}
  const composer=document.getElementById('p-c').value.trim();
  const dup=findDuplicate(t,composer);if(dup){closeSheet();toast('Ce morceau est déjà dans ta liste');pieceDetail(dup.id);return;}
  S.pieces.push({id:uid(),title:t,composer,epoch:(document.getElementById('p-e')||{}).value||'',status:'wishlist',diff:0,progress:0,tags:[],notes:[],todo:'',createdAt:Date.now()});
  save();closeSheet();refreshScreen();toast('Ajouté à « à apprendre »');}
function startLearning(id){const p=pieceById(id);if(!p)return;p.status='active';if(p.createdAt==null)p.createdAt=Date.now();save();closeSheet();refreshScreen();toast('Direction le répertoire · en cours');}

