/* ==========================================================================
   boot.js — DÉMARRAGE, CHARGÉ EN DERNIER. boot()/READY, premier lancement,
   persistance du stockage, service worker, sauvegarde sur mise en
   arrière-plan (visibilitychange/pagehide). Ne rien charger après ce fichier.
   ========================================================================== */
async function boot(){
  S=await loadState();
  renderHome();
  // Un chrono était en cours (rechargement, PWA tuée par iOS) : on y retourne.
  try{if(resumeStoredSession())return;}catch(e){}
  try{maybeWelcome();}catch(e){}
}

/* ---------- Premier lancement ----------
   Feuille de bienvenue sobre, seulement sur état vierge et jamais revue
   ensuite (marqueur S.onboarded). */
let _wName='',_wGoal=20;
function maybeWelcome(){
  if(S.onboarded||S.sessions.length)return;
  _wName='';_wGoal=20;
  welcomeStep(1);
}
function welcomeStep(n){
  if(n===1){
    openSheet(`<h3>Bienvenue</h3>
      <p class="muted sheet-sub">Un chrono pour ta pratique du piano. Tu joues ce que tu veux, l'app compte le temps et te propose des idées de travail quand tu en as envie.</p>
      <p class="muted">Tout reste sur cet appareil. Rien n'est envoyé sur un serveur.</p>
      <button class="btn primary btn-full mt18" onclick="welcomeStep(2)">Continuer</button>`);
  }else{
    openSheet(`<h3>Faisons connaissance</h3>
      <div class="field"><label>Ton prénom (facultatif)</label><input id="w-name" type="text" value="${esc(_wName)}"></div>
      <p class="muted sheet-sub">Objectif du jour : une durée à viser, tu peux la dépasser.</p>
      <div class="stepper"><button onclick="wGoalStep(-5)" aria-label="Moins">–</button><div class="v"><span id="w-goal">${goalLabel(_wGoal)}</span></div><button onclick="wGoalStep(5)" aria-label="Plus">+</button></div>
      <button class="btn primary btn-full mt18" onclick="finishWelcome()">C'est parti</button>`);
  }
}
function wGoalStep(d){_wGoal=Math.min(600,Math.max(5,_wGoal+d));const e=document.getElementById('w-goal');if(e)e.textContent=goalLabel(_wGoal);}
function finishWelcome(){
  const ni=document.getElementById('w-name');
  S.settings.userName=(ni?ni.value:_wName).trim()||null;
  S.settings.dailyGoal=_wGoal;
  S.onboarded=true;
  save();closeSheet();renderHome();
}
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
const READY=boot();
let _swReg=null;
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').then(reg=>{_swReg=reg;}).catch(()=>{}));
  // Le nouveau service worker prend la main dès qu'une version est détectée : on recharge
  // une seule fois pour afficher les fichiers frais (le chrono en cours survit, cf. TIMER_KEY).
  let _swRefreshed=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(_swRefreshed)return;_swRefreshed=true;
    if(_rec)return; // ne jamais couper un enregistrement en cours
    location.reload();
  });
}
// iOS peut tuer une PWA en arrière-plan sans avertir : on force le disque avant que ça arrive.
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){if(_rec)interruptRecording();persistTimer();saveNow();}
  else if(document.visibilityState==='visible'){
    if(_rec)finalizeRecording();
    if(timer){if(timer.since)acquireWakeLock();paintSession();}
    else if(document.getElementById('s-home').classList.contains('active'))renderHome(); // changement de jour
    // Vérifie une nouvelle version à chaque retour au premier plan (iOS ne le fait pas de lui-même).
    if(_swReg)try{_swReg.update();}catch(e){}
  }
});
window.addEventListener('pagehide',()=>{persistTimer();saveNow();});
