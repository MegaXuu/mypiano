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
}
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
const READY=boot();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}
// iOS peut tuer une PWA en arrière-plan sans avertir : on force le disque avant que ça arrive.
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveNow();else if(document.visibilityState==='visible'&&timer&&timer.running)acquireWakeLock();});
window.addEventListener('pagehide',()=>{saveNow();});
