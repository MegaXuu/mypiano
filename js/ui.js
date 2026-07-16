/* ==========================================================================
   ui.js — COQUILLE. Navigation (go/FULL), toast, feuilles modales
   (openSheet/closeSheet/confirmSheet) et geste glisser-fermer.
   ========================================================================== */
const FULL = {session:1,settings:1};
function go(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('s-'+name).classList.add('active');
  document.getElementById('tabbar').style.display = FULL[name]?'none':'flex';
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.s===name));
  window.scrollTo(0,0);
  ({home:renderHome,carnet:renderCarnet,rep:renderRep,voyage:renderVoyage,stats:renderStats,settings:renderSettings}[name]||(()=>{}))();
}
let toastT;function toast(m,opts){const t=document.getElementById('toast');t.textContent=m;t.classList.toggle('danger',!!(opts&&opts.danger));t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1900);}
function openSheet(html){
  const sheet=document.getElementById('sheet'),bg=document.getElementById('sheet-bg');
  sheet.style.transition='';sheet.style.animation='';sheet.style.transform='';
  bg.style.transition='';bg.style.background='';
  sheet.innerHTML='<div class="handle"></div>'+html;
  bg.classList.add('show');
}
let _recUrls=[];
function closeSheet(){document.getElementById('sheet-bg').classList.remove('show');_recUrls.forEach(u=>{try{URL.revokeObjectURL(u);}catch(e){}});_recUrls=[];}
document.getElementById('sheet-bg').addEventListener('click',e=>{if(e.target.id==='sheet-bg')closeSheet();});

let _confirmCb=null;
function confirmSheet(message,label,onConfirm){
  _confirmCb=onConfirm;
  openSheet(`<h3>Confirmer</h3>
    <p class="muted" style="font-size:14px;margin-top:-6px;">${esc(message)}</p>
    <button class="btn danger" style="width:100%;margin-top:18px;" onclick="_runConfirm()">${esc(label)}</button>
    <button class="btn ghost sm" style="width:100%;margin-top:10px;" onclick="closeSheet()">Annuler</button>`);
}
function _runConfirm(){const cb=_confirmCb;_confirmCb=null;closeSheet();if(cb)cb();}

/* ---------- Fermeture de la feuille au glisser (poignée) ---------- */
let _sheetDrag=null;
document.getElementById('sheet-bg').addEventListener('pointerdown',e=>{
  const handle=e.target.closest('.handle');
  if(!handle)return;
  const sheet=document.getElementById('sheet');
  _sheetDrag={startY:e.clientY,y:0,h:sheet.getBoundingClientRect().height,pid:e.pointerId,t:Date.now(),vy:0};
  sheet.style.animation='none';sheet.style.transition='none';
  try{handle.setPointerCapture(e.pointerId);}catch(err){}
});
document.getElementById('sheet-bg').addEventListener('pointermove',e=>{
  if(!_sheetDrag||e.pointerId!==_sheetDrag.pid)return;
  const now=Date.now(),dt=Math.max(1,now-_sheetDrag.t),y=Math.max(0,e.clientY-_sheetDrag.startY);
  _sheetDrag.vy=(y-_sheetDrag.y)/dt; // px/ms, geste rapide vers le bas si positif
  _sheetDrag.y=y;_sheetDrag.t=now;
  document.getElementById('sheet').style.transform='translateY('+y+'px)';
  document.getElementById('sheet-bg').style.background='rgba(0,0,0,'+Math.max(0.08,0.5*(1-y/_sheetDrag.h)).toFixed(3)+')';
});
function endSheetDrag(e){
  if(!_sheetDrag||(e&&e.pointerId!==_sheetDrag.pid))return;
  const sheet=document.getElementById('sheet'),bg=document.getElementById('sheet-bg'),drag=_sheetDrag;_sheetDrag=null;
  sheet.style.transition='transform .2s ease';bg.style.transition='background .2s ease';
  const closing=drag.y>Math.min(120,drag.h*0.28)||(drag.y>24&&drag.vy>0.5);
  if(closing){
    sheet.style.transform='translateY(100%)';bg.style.background='rgba(0,0,0,0)';
    setTimeout(closeSheet,180);
  }else{
    sheet.style.transform='';bg.style.background='';
  }
}
document.getElementById('sheet-bg').addEventListener('pointerup',endSheetDrag);
document.getElementById('sheet-bg').addEventListener('pointercancel',endSheetDrag);

