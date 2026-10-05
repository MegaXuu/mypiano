/* ==========================================================================
   settings.js — RÉGLAGES. Prénom, objectif du jour, tolérance de série,
   données (export/import JSON), partage, à propos, réinitialisation.
   ========================================================================== */
function renderSettings(){
  const t=S.settings.tolerance||0;
  document.getElementById('s-settings').innerHTML=`
    <button class="btn ghost sm set-back" onclick="go('home')">‹ Accueil</button>
    <h1>Réglages</h1>
    <div class="eyebrow set-group">Pratique</div><div class="card set-card">
      ${setLine('Prénom',S.settings.userName?esc(S.settings.userName):'Non défini',"editName()")}
      ${setLine('Objectif du jour',goalLabel(todayGoal()),"goalSheet()")}
    </div>
    <div class="eyebrow set-group">Série</div><div class="card">
      <div class="seg">${[0,1,2].map(v=>`<button class="${t===v?'on':''}" onclick="setTol(${v})">${v?v+' jour'+(v>1?'s':''):'Aucun'}</button>`).join('')}</div>
      <p class="muted set-hint">Jours sans piano tolérés d'affilée sans casser la série.</p></div>
    <div class="eyebrow set-group">Données</div><div class="card set-card">
      ${setLine('Exporter (JSON)',S.lastBackup?'le '+new Date(S.lastBackup).toLocaleDateString('fr-FR'):'jamais',"exportJSON()")}
      ${setLine('Importer un JSON','',"importJSON()")}
      ${setLine('Partager l’app','',"shareApp()")}
      ${setLine('À propos','',"aboutSheet()")}
      ${setLine('Réinitialiser l’app','',"resetSheet()")}
    </div>
    <p class="muted num it set-version">MyPiano · ${APP_VERSION}</p>
    <input type="file" id="imp" accept="application/json" style="display:none" onchange="doImport(event)">`;
}
function setLine(l,v,fn){return `<button class="set-line" onclick="${fn}"><span>${l}</span><span class="row set-line-r"><span class="muted num">${v}</span><span class="muted">›</span></span></button>`;}
function setTol(t){S.settings.tolerance=t;save();renderSettings();}

let _goal=30;
function goalSheet(){
  _goal=todayGoal();
  openSheet(`<h3>Objectif du jour</h3>
    <p class="muted sheet-sub">Une durée à viser. Tu peux toujours la dépasser.</p>
    <div class="stepper"><button onclick="goalStep(-5)" aria-label="Moins">–</button><div class="v"><span id="g-v">${goalLabel(_goal)}</span></div><button onclick="goalStep(5)" aria-label="Plus">+</button></div>
    <button class="btn primary mt18" onclick="saveGoal()">Valider</button>`);
}
function goalStep(d){_goal=Math.min(600,Math.max(5,_goal+d));document.getElementById('g-v').textContent=goalLabel(_goal);}
function saveGoal(){S.settings.dailyGoal=_goal;save();closeSheet();renderSettings();}
function editName(){
  openSheet(`<h3>Ton prénom</h3>
    <p class="muted sheet-sub">Sert à te saluer sur l'accueil. Peut rester vide.</p>
    <div class="field"><input id="un" type="text" value="${esc(S.settings.userName||'')}"></div>
    <button class="btn primary" onclick="saveName()">Valider</button>`);
}
function saveName(){const v=(document.getElementById('un').value||'').trim();S.settings.userName=v||null;save();closeSheet();renderSettings();}
function shareApp(){
  const url=location.origin+location.pathname;
  if(navigator.share){navigator.share({title:'MyPiano',url:url}).catch(()=>{});return;}
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(()=>toast('Lien copié')).catch(()=>toast('Copie impossible',{danger:true}));return;}
  toast('Partage indisponible',{danger:true});
}
function aboutSheet(){
  openSheet(`<h3>À propos</h3>
    <p class="muted sheet-sub">MyPiano : un chrono pour ta pratique du piano, un objectif du jour, et des idées de méthodes de travail quand tu en veux.</p>
    <p class="muted">Tes données vivent à 100 % sur cet appareil. Rien n'est envoyé sur un serveur.</p>
    <p class="muted">Exporte un JSON de temps en temps, et surtout avant de changer d'appareil : le stockage est lié à cette adresse.</p>
    <p class="muted num it set-version">MyPiano · ${APP_VERSION}</p>
    <button class="btn ghost sm btn-full mt10" onclick="closeSheet()">Fermer</button>`);
}
function resetSheet(){
  openSheet(`<h3>Réinitialiser l'app</h3>
    <p class="muted sheet-sub">Efface toutes tes données de cet appareil : séances, enregistrements, réglages. Sans retour possible.</p>
    <button class="btn ghost btn-full mt18" onclick="exportJSON()">Exporter mes données d'abord</button>
    <button class="btn danger btn-full mt10" onclick="doReset()">Tout effacer</button>
    <button class="btn ghost sm btn-full mt10" onclick="closeSheet()">Annuler</button>`);
}
async function doReset(){
  S=defaults();
  try{await idbClearRecordings();}catch(e){}
  await saveNow();
  closeSheet();go('home');
  try{maybeWelcome();}catch(e){}
}

/* ---------- Export / Import ---------- */
function download(name,text,type){const b=new Blob([text],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),800);}
function backupDue(){if(S.sessions.length<5)return false;return (Date.now()-(S.lastBackup||0))>30*86400000;}
function exportJSON(){S.lastBackup=Date.now();save();download('piano_sauvegarde_'+dkey()+'.json',JSON.stringify(S,null,2),'application/json');toast('Sauvegarde exportée');
  if(document.getElementById('s-settings').classList.contains('active'))renderSettings();
  else if(document.getElementById('s-home').classList.contains('active'))renderHome();}
function importJSON(){document.getElementById('imp').click();}
function doImport(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{let d;try{d=JSON.parse(r.result);if(!d.sessions)throw 0;}catch(err){toast('Fichier invalide',{danger:true});return;}
    confirmSheet('Remplacer toutes tes données par ce fichier ?','Remplacer',()=>{S=migrate(d);saveNow().then(()=>{renderSettings();toast('Données importées');});});
  };
  r.readAsText(f);e.target.value='';}
