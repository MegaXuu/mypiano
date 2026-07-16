/* ==========================================================================
   RÉGLAGES
   ========================================================================== */
function renderSettings(){
  const n=S.settings.notif;
  document.getElementById('s-settings').innerHTML=`
    <button class="btn ghost sm set-back" onclick="go('home')">‹ Accueil</button>
    <h1>Réglages</h1>
    <div class="eyebrow set-group-label">Objectifs</div><div class="card set-card">
      ${setLine('Objectif du jour',S.settings.dailyGoal+' min',"editNum('dailyGoal','Objectif du jour (min)')")}
      ${setLine('Hebdo · temps',S.settings.weeklyTime==null?'Non défini':Math.round(S.settings.weeklyTime/60*10)/10+' h',"editNum('weeklyTime','Objectif hebdo (min)',true)")}
      ${setLine('Hebdo · jours',S.settings.weeklyDays+' jours',"editNum('weeklyDays','Jours par semaine')")}
      ${setLine('Mensuel · temps',S.settings.monthly==null?'Non défini':Math.round(S.settings.monthly/60)+' h',"editNum('monthly','Objectif mensuel (min)',true)")}
    </div>
    <div class="eyebrow set-group-label">Série</div><div class="card">
      <div class="seg"><button class="${S.settings.tolerance===0?'on':''}" onclick="setTol(0)">Aucun</button><button class="${S.settings.tolerance===1?'on':''}" onclick="setTol(1)">1 jour</button><button class="${S.settings.tolerance===2?'on':''}" onclick="setTol(2)">2 jours</button></div>
      <p class="muted set-hint">Jours off autorisés par semaine sans casser la série.</p></div>
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
    </div>
    <div class="card mt14">
      <div class="between"><span class="fw600">Sauvegarde NAS</span><div class="toggle ${S.settings.nas.enabled?'on':''}" onclick="toggleNas()"></div></div>
      <p class="muted set-hint">${S.settings.nas.enabled?'Prépare l\'envoi des sauvegardes vers ton NAS (configuration en étape B).':'Désactivé. Ton NAS pourra recevoir des sauvegardes automatiques plus tard.'}</p>
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
function toggleNas(){S.settings.nas.enabled=!S.settings.nas.enabled;save();renderSettings();}
function togEstimates(el){S.settings.estimates=S.settings.estimates===false?true:false;el.classList.toggle('on');save();}

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

