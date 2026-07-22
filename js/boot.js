/* ==========================================================================
   boot.js — DÉMARRAGE, CHARGÉ EN DERNIER. boot()/READY, persistance du
   stockage, enregistrement du service worker, sauvegarde sur mise en
   arrière-plan (visibilitychange/pagehide). Ne rien charger après ce fichier.
   ========================================================================== */
async function boot(){
  S=await loadState();
  renderHome();
  try{maybeNotifyReport();}catch(e){}
  try{maybeNotifyMonth();}catch(e){}
  // Retour de vacances automatique : la date prévue est dépassée dès le premier lancement suivant.
  try{if(S.vacation&&S.vacation.on&&S.vacation.until&&dkey()>S.vacation.until)stopVacation(true);}catch(e){}
  try{maybeWelcome();}catch(e){}
}

/* ---------- Premier lancement (V5-3) ----------
   Feuille de bienvenue sobre, seulement sur état vierge et jamais revue ensuite
   (marqueur S.onboarded). Trois écrans dans la même feuille. */
let _wName='',_wGoal=20;
function maybeWelcome(){
  if(S.onboarded)return;
  if(S.pieces.length||S.sessions.length)return; // sécurité : état déjà rempli
  _wName='';_wGoal=20;
  welcomeStep(1);
}
function welcomeStep(n){
  const ni=document.getElementById('w-name');if(ni)_wName=ni.value; // garde la saisie entre les écrans
  if(n===1){
    openSheet(`<h3>Bienvenue</h3>
      <p class="muted sheet-sub">Un carnet pour ta pratique du piano : chronométrer tes séances, noter ton travail, garder le fil de tes progrès.</p>
      <p class="muted">Tout reste sur cet appareil — rien n'est envoyé sur un serveur.</p>
      <button class="btn primary btn-full mt18" onclick="welcomeStep(2)">Continuer</button>`);
  }else if(n===2){
    openSheet(`<h3>Faisons connaissance</h3>
      <div class="field"><label>Ton prénom (facultatif)</label><input id="w-name" type="text" value="${esc(_wName)}"></div>
      <p class="muted sheet-sub">Objectif du jour — une durée à viser, tu peux la dépasser.</p>
      <div class="stepper"><button onclick="wGoalStep(-5)">–</button><div class="v"><span id="w-goal">${_wGoal}</span> min</div><button onclick="wGoalStep(5)">+</button></div>
      <button class="btn primary btn-full mt18" onclick="welcomeStep(3)">Continuer</button>`);
  }else{
    openSheet(`<h3>Ton premier morceau</h3>
      <p class="muted sheet-sub">Ajoute une pièce que tu travailles, ou explore l'app d'abord à ton rythme.</p>
      <button class="btn primary btn-full mt18" onclick="finishWelcome(true)">Ajouter un morceau</button>
      <button class="btn ghost sm btn-full mt10" onclick="finishWelcome(false)">Explorer d'abord</button>`);
  }
}
function wGoalStep(d){_wGoal=Math.max(5,_wGoal+d);const e=document.getElementById('w-goal');if(e)e.textContent=_wGoal;}
function finishWelcome(addPiece){
  const ni=document.getElementById('w-name');if(ni)_wName=ni.value;
  const nm=(_wName||'').trim();
  S.settings.userName=nm||null;
  S.settings.dailyGoal=_wGoal;
  S.onboarded=true;
  save();closeSheet();renderHome();
  if(addPiece)addChoiceSheet();
}
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
const READY=boot();
let _swReg=null;
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').then(reg=>{_swReg=reg;}).catch(()=>{}));
  // Le service worker (skipWaiting + clients.claim) prend la main dès qu'une nouvelle
  // version est détectée : on recharge une seule fois pour afficher les fichiers frais
  // (sinon la page déjà ouverte reste sur l'ancien JS malgré le nouveau cache actif).
  let _swRefreshed=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(_swRefreshed)return;_swRefreshed=true;location.reload();
  });
}
// iOS peut tuer une PWA en arrière-plan sans avertir : on force le disque avant que ça arrive.
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){if(_rec)interruptRecording();saveNow();}
  else if(document.visibilityState==='visible'){
    if(_rec)finalizeRecording();if(timer&&timer.running)acquireWakeLock();
    // Vérifie une nouvelle version à chaque retour au premier plan (iOS ne le fait pas de lui-même) ;
    // évite de rester bloqué sur une ancienne Bêta après une mise à jour, sans devoir rouvrir l'app.
    if(_swReg)try{_swReg.update();}catch(e){}
  }
});
window.addEventListener('pagehide',()=>{saveNow();});
