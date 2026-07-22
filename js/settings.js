/* ==========================================================================
   RÉGLAGES
   ========================================================================== */
function renderSettings(){
  const n=S.settings.notif;
  document.getElementById('s-settings').innerHTML=`
    <button class="btn ghost sm set-back" onclick="go('home')">‹ Accueil</button>
    <h1>Réglages</h1>
    <div class="eyebrow set-group-label">Profil</div><div class="card set-card">
      ${setLine('Prénom',S.settings.userName?esc(S.settings.userName):'Non défini',"editName()")}
    </div>
    <div class="eyebrow set-group-label">Objectifs</div><div class="card set-card">
      ${setLine('Objectif du jour',S.settings.dailyGoal+' min',"editNum('dailyGoal','Objectif du jour (min)')")}
      ${setLine('Hebdo · temps',S.settings.weeklyTime==null?'Non défini':Math.round(S.settings.weeklyTime/60*10)/10+' h',"editNum('weeklyTime','Objectif hebdo (min)',true)")}
      ${setLine('Hebdo · jours',S.settings.weeklyDays+' jours',"editNum('weeklyDays','Jours par semaine')")}
      ${setLine('Mensuel · temps',S.settings.monthly==null?'Non défini':Math.round(S.settings.monthly/60)+' h',"editNum('monthly','Objectif mensuel (min)',true)")}
    </div>
    <div class="eyebrow set-group-label">Série</div><div class="card">
      <div class="seg"><button class="${S.settings.tolerance===0?'on':''}" onclick="setTol(0)">Aucun</button><button class="${S.settings.tolerance===1?'on':''}" onclick="setTol(1)">1 jour</button><button class="${S.settings.tolerance===2?'on':''}" onclick="setTol(2)">2 jours</button></div>
      <p class="muted set-hint">Jours off autorisés par semaine sans casser la série.</p></div>
    <div class="eyebrow set-group-label">Vacances</div><div class="card set-card">
      ${S.vacation&&S.vacation.on?`<p class="muted set-hint">En pause depuis le ${frShort(S.vacation.from)}${S.vacation.until?' · retour prévu le '+frShort(S.vacation.until):''} — série gelée, rappels suspendus.</p>
        <button class="btn ghost sm btn-full mt10" onclick="stopVacation()">Je reprends</button>`
      :`<p class="muted set-hint">Une pause est un choix : série gelée, pas d'alertes, pas de rappels.</p>
        <button class="btn ghost sm btn-full mt10" onclick="vacationSheet()">Activer le mode vacances</button>`}
    </div>
    <div class="eyebrow set-group-label">Révision &amp; estimations</div><div class="card set-card">
      ${setLine('Entretien après',(S.settings.revisionDays||18)+' j',"editNum('revisionDays','Entretien (jours)')")}
      <div class="set-tog-line"><span>Estimations de maîtrise</span><div class="toggle ${S.settings.estimates!==false?'on':''}" onclick="togEstimates(this)"></div></div>
    </div>
    <div class="eyebrow set-group-label">Notifications</div><div class="card set-card">
      ${togLine('Rappel quotidien',n.daily,'daily')}
      ${togLine('Alerte série',n.streak,'streak')}
      ${togLine('Rappel objectif hebdo',n.weekly,'weekly')}
      ${togLine('Rapport du mois',n.monthly,'monthly')}
      ${togLine('Félicitations de palier',n.palier,'palier')}
      ${setLine('Activer les notifications','',"enableNotifs()")}
    </div>
    <div class="eyebrow set-group-label">Données</div><div class="card set-card">
      ${setLine('Exporter en CSV','',"exportCSV()")}
      ${setLine('Exporter tout (JSON)',S.lastBackup?'le '+new Date(S.lastBackup).toLocaleDateString('fr-FR'):'jamais',"exportJSON()")}
      ${setLine('Importer un JSON','',"importJSON()")}
      ${setLine('Enrichir la base d’œuvres',Object.values(S.opusCache||{}).reduce((a,x)=>a+x.length,0)?Object.values(S.opusCache).reduce((a,x)=>a+x.length,0)+' œuvres':'hors-ligne',"syncOpus(true)")}
      ${setLine('Partager l’app','',"shareApp()")}
      ${setLine('À propos','',"aboutSheet()")}
      ${setLine('Réinitialiser l’app','',"resetSheet()")}
    </div>
    <p class="muted num it set-version">MyPiano · ${APP_VERSION}</p>
    <input type="file" id="imp" accept="application/json" style="display:none" onchange="doImport(event)">`;
}
function setLine(l,v,fn){return `<div class="set-line" onclick="${fn}"><span>${l}</span><span class="row set-line-r"><span class="muted num">${v}</span><span class="muted">›</span></span></div>`;}
function togLine(l,on,key){return `<div class="set-tog-line"><span>${l}</span><div class="toggle ${key==='palier'?'gold ':''}${on?'on':''}" onclick="togNotif('${key}',this)"></div></div>`;}
function togNotif(k,el){S.settings.notif[k]=!S.settings.notif[k];el.classList.toggle('on');save();}
function setTol(t){S.settings.tolerance=t;save();renderSettings();toast('Tolérance : '+t+' jour(s)');}
function editNum(field,label,clearable){openSheet(`<h3>${label}</h3><div class="field"><input id="en" type="number" inputmode="numeric" value="${S.settings[field]==null?'':S.settings[field]}"></div><button class="btn primary" onclick="saveNum('${field}')">Valider</button>${clearable?`<button class="btn ghost sm btn-full mt10" onclick="clearNum('${field}')">Non défini</button>`:''}`);}
function saveNum(field){const v=parseInt(document.getElementById('en').value);if(v>0){S.settings[field]=v;save();}closeSheet();renderSettings();}
function clearNum(field){S.settings[field]=null;save();closeSheet();renderSettings();}
function togEstimates(el){S.settings.estimates=S.settings.estimates===false?true:false;el.classList.toggle('on');save();}

/* ---------- Profil / partage / à propos / réinitialisation (V5-3) ---------- */
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
    <p class="muted sheet-sub">MyPiano — un carnet de pratique du piano : séances chronométrées, journal de travail, suivi des progrès.</p>
    <p class="muted">Tes données vivent à 100 % sur cet appareil. Rien n'est envoyé sur un serveur, personne d'autre n'y a accès.</p>
    <p class="muted">Pense à exporter un JSON de temps en temps, et surtout avant de changer d'appareil ou d'adresse : le stockage est lié à cette adresse.</p>
    <p class="muted num it set-version">MyPiano · ${APP_VERSION}</p>
    <button class="btn ghost sm btn-full mt10" onclick="closeSheet()">Fermer</button>`);
}
function resetSheet(){
  openSheet(`<h3>Réinitialiser l'app</h3>
    <p class="muted sheet-sub">Efface toutes tes données de cet appareil — morceaux, séances, enregistrements, réglages. Sans retour possible.</p>
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
function exportCSV(){let rows=[['date','duree_min','mode','ressenti','morceaux','travaille','a_faire']];
  S.sessions.forEach(s=>{const names=[...new Set(s.blocks.map(b=>pieceName(b.piece)))].join(' | ');
    rows.push([s.date,Math.round(sessionSeconds(s)/60),s.mode,s.feeling||'',names,(s.worked||'').replace(/\n/g,' '),(s.next||'').replace(/\n/g,' ')]);});
  download('piano_historique.csv',rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv');toast('CSV exporté');}
function backupDue(){if(!S.sessions.length)return false;return (Date.now()-(S.lastBackup||0))>14*86400000;}
function exportJSON(){S.lastBackup=Date.now();save();download('piano_sauvegarde.json',JSON.stringify(S,null,2),'application/json');toast('Sauvegarde exportée');
  if(document.getElementById('s-settings').classList.contains('active'))renderSettings();}
function importJSON(){document.getElementById('imp').click();}
function doImport(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{let d;try{d=JSON.parse(r.result);if(!d.sessions)throw 0;}catch(err){toast('Fichier invalide',{danger:true});return;}
    confirmSheet('Remplacer toutes tes données par ce fichier ?','Remplacer',()=>{S=migrate(d);saveNow().then(()=>{renderSettings();toast('Données importées');});});
  };
  r.readAsText(f);}

/* ---------- Mode vacances (V4-4) ---------- */
function vacationSheet(){
  openSheet(`<h3>Mode vacances</h3>
    <p class="muted sheet-sub">Une pause est un choix : série gelée, rappels suspendus, aucune alerte.</p>
    <div class="field"><label>Départ</label><input type="date" id="vac-from" value="${dkey()}" max="${dkey()}"></div>
    <div class="field"><label>Retour prévu (optionnel)</label><input type="date" id="vac-until" min="${dkey()}"></div>
    <button class="btn primary" onclick="activateVacation()">Activer la pause</button>`);
}
function activateVacation(){
  const from=document.getElementById('vac-from').value||dkey();
  const until=document.getElementById('vac-until').value||null;
  S.vacation={on:true,from,until,resumedAt:null};
  save();closeSheet();refreshScreen();toast('Mode vacances activé');
}
function vacationDaysCount(){
  const v=S.vacation;if(!v||!v.from)return 0;
  const until=v.until||dkey();
  return Math.max(1,Math.round((new Date(until+'T00:00')-new Date(v.from+'T00:00'))/86400000)+1);
}
// Arrête la pause (manuellement ou automatiquement si la date de retour est dépassée) et ouvre la feuille de reprise.
function stopVacation(auto){
  if(!S.vacation||!S.vacation.on)return;
  S.vacation.until=S.vacation.until||dkey();
  S.vacation.on=false;
  S.vacation.resumedAt=dkey();
  save();
  resumeSheet(auto);
}
// Décale les échéances d'entretien de la durée de la pause : évite un mur de révisions au retour.
function applyResumeSpread(days){
  S.pieces.forEach(p=>{if(p.status==='mastered')p.revInterval=Math.min(120,(p.revInterval||S.settings.revisionDays||18)+days);});
  save();
}
function resumeSheet(auto){
  const v=S.vacation,days=vacationDaysCount();
  const awayCount=awaySessions().filter(s=>s.date>=v.from&&s.date<=v.until).length;
  const revs=revisionList().slice(0,3);
  applyResumeSpread(days);
  openSheet(`<h3>Retour de pause</h3>
    <p class="muted sheet-sub">${auto?'Ta date de retour est passée — bienvenue à nouveau. ':''}${days} jour${days>1?'s':''} de pause${awayCount?' · '+awayCount+' séance'+(awayCount>1?'s':'')+' loin du clavier':''}.</p>
    <p class="muted">Objectif du jour adouci pendant une semaine, le temps de reprendre tes marques.</p>
    ${revs.length?`<div class="field"><label>Pour reprendre en douceur</label>
      ${revs.map(p=>`<div class="between resume-rev-row"><span>${esc(p.title)}</span><span class="muted">${esc(p.composer||'')}</span></div>`).join('')}
      </div><button class="btn primary btn-full" onclick="closeSheet();startRevision();">Séance de reprise</button>`:''}
    <button class="btn ghost sm btn-full mt10" onclick="closeSheet();refreshScreen();">Plus tard</button>`);
  refreshScreen();
}

