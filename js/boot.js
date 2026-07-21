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
