/* ==========================================================================
   parcours.js — PARCOURS. Ce qu'il reste de la gamification en V6, fondé
   uniquement sur le temps et la régularité : rang (18 paliers), série,
   calendrier des jours joués, records, succès. Repliés : la liste des rangs
   et les succès.
   ========================================================================== */
const parcoursOpen={rangs:false,succes:false};
function toggleParc(k){parcoursOpen[k]=!parcoursOpen[k];renderParcours(true);}

function renderParcours(still){
  const el=document.getElementById('s-parcours');if(!el)return;
  const total=totalSeconds(),n=playSessions().length,streak=computeStreak(),best=bestStreak();
  const ach=achievements(),on=ach.filter(a=>a.on).length;
  el.innerHTML=`
    <h1>Parcours</h1>
    ${rankCardHtml(total)}
    <div class="grid2 mt14">
      <div class="metric"><div class="v num">${durH(total)}</div><div class="l">joués au total</div></div>
      <div class="metric"><div class="v num">${n.toLocaleString('fr-FR')}</div><div class="l">séance${n>1?'s':''}</div></div>
      <div class="metric"><div class="v num">${streak} j</div><div class="l">série en cours</div></div>
      <div class="metric"><div class="v num">${best} j</div><div class="l">meilleure série</div></div>
    </div>
    <h2>Régularité · 16 semaines</h2>
    <div class="card">${heatmap()}</div>
    <h2>Records</h2>
    ${recordsHtml()}
    ${parcFold('rangs','Les 18 rangs','')}
    ${parcFold('succes','Succès',on+' / '+ach.length)}`;
  if(!still)staggerScreen(el);
}
function parcFold(key,title,meta){
  const open=parcoursOpen[key];
  return `<button class="parc-fold ${open?'open':''}" onclick="toggleParc('${key}')" aria-expanded="${open}">
    <span class="parc-fold-title">${title}</span>${meta?`<span class="parc-fold-meta">${meta}</span>`:''}
    <span class="parc-fold-caret">${open?'−':'+'}</span></button>
    ${open?`<div class="parc-fold-body">${key==='rangs'?ranksList():succesGrid()}</div>`:''}`;
}

/* ---------- Rang ---------- */
function rankCardHtml(total){
  const hours=total/3600,cur=currentStone(),next=nextStone();
  const prevH=cur?cur.h:0,prog=next?Math.min(1,(hours-prevH)/(next.h-prevH)):1;
  return `<div class="card hi rank-card">
    <div class="medal"><div class="medal-glow"></div><div class="medal-ring"></div><div class="medal-glyph">${rankGlyph(cur)}</div></div>
    <div class="eyebrow">Rang actuel</div>
    <div class="serif rank-name">${cur?cur.n:'En route'}</div>
    ${next?`<div class="sub rank-next"><span>Prochain · ${next.n}</span><span class="num">${durH(total)} / ${next.h.toLocaleString('fr-FR')} h</span></div>
      <div class="bar rank-bar"><i style="width:${Math.round(prog*100)}%;"></i></div>
      <div class="muted small mt10">Encore ${durH(Math.max(0,next.h*3600-total))}</div>`
      :'<div class="muted small mt10">Maestro Assoluto atteint. Le voyage est accompli.</div>'}
  </div>`;
}
function ranksList(){
  const hours=totalSeconds()/3600,next=nextStone();
  return `<div class="rank-path">${STONES.slice().reverse().map(s=>{
    const st=hours>=s.h?'reached':next&&s.n===next.n?'current':'upcoming';
    return `<div class="rank-row ${st}"><span class="rank-dot"></span><span class="rank-row-name">${s.n}</span><span class="num muted">${s.h.toLocaleString('fr-FR')} h</span></div>`;}).join('')}</div>`;
}

/* ---------- Calendrier & records ---------- */
function heatmap(){
  const m=secondsByDay(),start=addDays(weekStart(),-15*7),today=dkey(),cells=[];
  for(let i=0;i<16*7;i++){const k=dkey(addDays(start,i));cells.push(k>today?null:(m[k]||0));}
  const lv=s=>s===0?0:s<900?1:s<1800?2:s<3600?3:4;
  return `<div class="hm">${cells.map(s=>s===null?'<i class="future"></i>':`<i class="l${lv(s)}"></i>`).join('')}</div>
    <div class="sub hm-legend"><span>il y a 16 semaines → aujourd’hui</span><span class="row hm-scale">moins ${[0,1,2,3,4].map(l=>`<i class="l${l}"></i>`).join('')} plus</span></div>`;
}
function bestWeekSeconds(){
  const m=secondsByDay(),days=Object.keys(m).sort();if(!days.length)return 0;
  const acc={};days.forEach(k=>{const w=weekKey(dateOf(k));acc[w]=(acc[w]||0)+m[k];});
  return Math.max(...Object.values(acc));
}
function recordsHtml(){
  const ps=playSessions(),m=secondsByDay(),y=String(new Date().getFullYear());
  const longest=ps.reduce((a,s)=>Math.max(a,sessionSeconds(s)),0);
  const bestDay=Math.max(0,...Object.values(m));
  const year=Object.keys(m).filter(k=>k.slice(0,4)===y).reduce((a,k)=>a+m[k],0);
  const rec=(l,v)=>`<div class="metric rec"><div class="v num it">${v}</div><div class="l">${l}</div></div>`;
  return `<div class="grid2">${rec('Plus longue séance',dur(longest))}${rec('Meilleure journée',dur(bestDay))}
    ${rec('Meilleure semaine',dur(bestWeekSeconds()))}${rec('En '+y,durH(year))}</div>`;
}

/* ---------- Succès (V6) ----------
   ~30 succès, tous dérivés du temps et de la régularité. Pas de récompense,
   pas de points : juste des jalons. */
const ACH_TIERS={1:'Facile',2:'Moyen',3:'Difficile'};
const ACH_FAMS=['Régularité','Volume','Séances','Objectif','Longueur','Moments','Méthodes','Enregistrements'];
function goalDays(){
  const m=secondsByDay(),goalByDay={};
  playSessions().forEach(s=>{if(s.goal)goalByDay[s.date]=s.goal;});
  return Object.keys(m).filter(k=>m[k]>=(goalByDay[k]||todayGoal())*60).length;
}
function achievements(){
  const ps=playSessions(),streak=bestStreak(),hours=totalSeconds()/3600,n=ps.length;
  const longest=ps.reduce((a,s)=>Math.max(a,sessionSeconds(s)),0)/60;
  const gd=goalDays(),wk=bestWeekSeconds()/3600;
  let early=0,night=0,weekend=0;
  ps.forEach(s=>{const d=new Date(s.ts||Date.parse(s.date+'T12:00')),h=d.getHours(),wd=d.getDay();
    if(h<9)early++;if(h>=22)night++;if(wd===0||wd===6)weekend++;});
  const foci=new Set(ps.map(s=>s.focus).filter(Boolean)).size;
  const recs=S.recordings.length;
  const A=(id,fam,tier,label,desc,on)=>({id,fam,tier,label,desc,on:!!on});
  return [
    A('reg3','Régularité',1,'Trois jours','3 jours d’affilée',streak>=3),
    A('reg7','Régularité',1,'Semaine pleine','7 jours d’affilée',streak>=7),
    A('reg30','Régularité',2,'Assidu','30 jours d’affilée',streak>=30),
    A('reg100','Régularité',3,'Centenaire','100 jours d’affilée',streak>=100),
    A('reg365','Régularité',3,'Une année','365 jours d’affilée',streak>=365),
    A('h1','Volume',1,'Première heure','1 h jouée',hours>=1),
    A('h10','Volume',1,'Dix heures','10 h jouées',hours>=10),
    A('h50','Volume',2,'Cinquante heures','50 h jouées',hours>=50),
    A('h100','Volume',2,'Cent heures','100 h jouées',hours>=100),
    A('h500','Volume',3,'Cinq cents heures','500 h jouées',hours>=500),
    A('h1000','Volume',3,'Mille heures','1 000 h jouées',hours>=1000),
    A('s1','Séances',1,'Première séance','La toute première',n>=1),
    A('s50','Séances',1,'Cinquante séances','50 séances',n>=50),
    A('s200','Séances',2,'Deux cents séances','200 séances',n>=200),
    A('s1000','Séances',3,'Mille séances','1 000 séances',n>=1000),
    A('g1','Objectif',1,'Dans le mille','Objectif du jour atteint une fois',gd>=1),
    A('g30','Objectif',2,'Trente fois','Objectif atteint 30 jours',gd>=30),
    A('g100','Objectif',3,'Cent fois','Objectif atteint 100 jours',gd>=100),
    A('l45','Longueur',1,'Bien installé','Une séance de 45 min',longest>=45),
    A('l90','Longueur',2,'Grande séance','Une séance de 1 h 30',longest>=90),
    A('l180','Longueur',3,'Marathon','Une séance de 3 h',longest>=180),
    A('w5','Longueur',2,'Belle semaine','5 h dans une semaine',wk>=5),
    A('w10','Longueur',3,'Semaine intense','10 h dans une semaine',wk>=10),
    A('early','Moments',1,'Lève-tôt','5 séances avant 9 h',early>=5),
    A('night','Moments',1,'Nocturne','5 séances après 22 h',night>=5),
    A('weekend','Moments',2,'Week-ends en musique','20 séances le week-end',weekend>=20),
    A('foc1','Méthodes',1,'Une intention','Choisir une situation en séance',foci>=1),
    A('foc6','Méthodes',2,'Tous les angles','Les 6 situations essayées',foci>=6),
    A('rec1','Enregistrements',1,'Première écoute','Un enregistrement gardé',recs>=1),
    A('rec20','Enregistrements',2,'Archiviste','20 enregistrements gardés',recs>=20),
  ];
}
function unlockedIds(){return new Set(achievements().filter(a=>a.on).map(a=>a.id));}
function succesGrid(){
  const ach=achievements();
  return ACH_FAMS.map(f=>{const list=ach.filter(a=>a.fam===f);if(!list.length)return '';
    return `<div class="eyebrow ach-fam">${f}</div><div class="ach-grid">${list.map(a=>`<div class="ach ${a.on?'on':'off'}">
      <div class="ach-glyph">${a.on?'♪':'·'}</div><div class="ach-label">${a.label}</div>
      <div class="muted ach-desc">${a.desc}</div><div class="ach-tier">${ACH_TIERS[a.tier]}</div></div>`).join('')}</div>`;}).join('');
}
