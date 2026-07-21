/* ==========================================================================
   ÉTAPE B — Notes ♪, succès, défis (sans boutique)
   ========================================================================== */
function weekStart(d){d=d?new Date(d):new Date();const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);d.setHours(0,0,0,0);return d;}
function weekKey(d){return dkey(weekStart(d));}
function monthKey(d){d=d?new Date(d):new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function thisWeekDays(){let n=0;const ws=weekStart();for(let i=0;i<7;i++)if(secondsOnDay(dkey(addDays(ws,i)))>0)n++;return n;}
function thisWeekHours(){let t=0;const ws=weekStart();for(let i=0;i<7;i++)t+=secondsOnDay(dkey(addDays(ws,i)));return t/3600;}
function monthSessions(){const mk=monthKey();return playSessions().filter(s=>monthKey(new Date(s.date+'T00:00'))===mk);}
function thisMonthDays(){const set=new Set();monthSessions().forEach(s=>set.add(s.date));return set.size;}
function thisMonthHours(){return monthSessions().reduce((a,s)=>a+sessionSeconds(s),0)/3600;}
function thisMonthComposers(){const set=new Set();monthSessions().forEach(s=>s.blocks.forEach(b=>{if(b.piece===IMPROV)return;const p=pieceById(b.piece);if(p&&p.composer)set.add(p.composer.toLowerCase());}));return set.size;}

function achievements(){
  const streak=bestStreak(),comps=new Set(),epochs=new Set();
  playSessions().forEach(s=>s.blocks.forEach(b=>{if(b.piece===IMPROV)return;const p=pieceById(b.piece);if(p){if(p.composer)comps.add(p.composer.toLowerCase());if(p.epoch)epochs.add(p.epoch);}}));
  const hours=totalSeconds()/3600;
  const noteCount=S.pieces.reduce((a,p)=>a+((p.notes||[]).length),0);
  const journalDays=Object.values(S.journal).filter(j=>j&&(j.mood||j.energy)).length;
  const improv=playSessions().some(s=>s.blocks.some(b=>b.piece===IMPROV));
  const chopin=S.pieces.filter(p=>p.status==='mastered'&&/chopin/i.test(p.composer||'')).length;
  const ensDone=S.pieces.filter(p=>p.isEnsemble&&ensembleCompleted(p)).length;
  const longSession=playSessions().reduce((m,s)=>Math.max(m,sessionSeconds(s)),0);
  let monthHours=0;for(let i=0;i<31;i++)monthHours+=secondsOnDay(dkey(addDays(new Date(),-i)));monthHours/=3600;
  const cc=completedChallenges().length,bn=baseNotes();
  const A=(id,fam,label,desc,on,reward)=>({id,fam,label,desc,on:!!on,reward});
  return [
    A('reg7','Régularité','Semaine pleine','7 jours d’affilée',streak>=7,100),
    A('reg30','Régularité','Assidu','30 jours d’affilée',streak>=30,300),
    A('reg100','Régularité','Increvable','100 jours d’affilée',streak>=100,1000),
    A('reg365','Régularité','Une année','365 jours d’affilée',streak>=365,3000),
    A('vol10','Volume','Premières heures','10 h de pratique',hours>=10,80),
    A('vol100','Volume','Centurion','100 h de pratique',hours>=100,400),
    A('vol1000','Volume','Millénaire','1 000 h de pratique',hours>=1000,2000),
    A('volm','Volume','Mois intense','10 h en un mois',monthHours>=10,150),
    A('long','Volume','Marathon','séance de 2 h',longSession>=7200,150),
    A('m1','Maîtrise','Premier sommet','1 morceau maîtrisé',masteredCount()>=1,50),
    A('m5','Maîtrise','Répertoire','5 morceaux maîtrisés',masteredCount()>=5,150),
    A('m10','Maîtrise','Virtuose en herbe','10 morceaux maîtrisés',masteredCount()>=10,400),
    A('chop','Maîtrise','Ami de Chopin','5 Chopin maîtrisés',chopin>=5,400),
    A('ens','Maîtrise','Ensemble complet','un recueil complété',ensDone>=1,300),
    A('e3','Exploration','Curieux','3 compositeurs',comps.size>=3,80),
    A('e10','Exploration','Éclectique','10 compositeurs',comps.size>=10,300),
    A('ep3','Exploration','Voyage du temps','3 époques',epochs.size>=3,150),
    A('imp','Exploration','Libre','1re improvisation',improv,50),
    A('c10','Carnet','Chroniqueur','10 notes de carnet',noteCount>=10,80),
    A('j30','Carnet','Introspectif','journal 30 jours',journalDays>=30,200),
    A('d1','Défis','Relevé','1 défi réussi',cc>=1,100),
    A('d5','Défis','Compétiteur','5 défis réussis',cc>=5,300),
    A('concert','Défis','Sur scène','1re simulation de concert',S.sessions.some(s=>s.mode==='concert'),200),
    A('n5','Notes','Collectionneur','5 000 ♪',bn>=5000,200),
    A('n20','Notes','Trésor','20 000 ♪',bn>=20000,600),
  ];
}

const WEEK_POOL=[
  {type:'days_week',target:4,reward:120,label:'Jouer 4 jours cette semaine'},
  {type:'days_week',target:6,reward:220,label:'Jouer 6 jours cette semaine'},
  {type:'hours_week',target:3,reward:150,label:'Cumuler 3 h cette semaine'},
  {type:'hours_week',target:5,reward:260,label:'Cumuler 5 h cette semaine'},
];
const MONTH_POOL=[
  {type:'days_month',target:20,reward:400,label:'Jouer 20 jours ce mois'},
  {type:'hours_month',target:15,reward:500,label:'Cumuler 15 h ce mois'},
  {type:'hours_month',target:25,reward:750,label:'Cumuler 25 h ce mois'},
  {type:'composers_month',target:3,reward:300,label:'3 compositeurs différents ce mois'},
];
function challengeProgress(ch){if(!ch)return 0;switch(ch.type){
  case'days_week':return thisWeekDays();case'hours_week':return thisWeekHours();
  case'days_month':return thisMonthDays();case'hours_month':return thisMonthHours();
  case'composers_month':return thisMonthComposers();case'free':return ch.doneManual?ch.target:0;default:return 0;}}
function progressText(ch){const p=challengeProgress(ch);
  return ch.type.indexOf('hours')===0?(Math.round(p*10)/10)+' / '+ch.target+' h':Math.min(p,ch.target)+' / '+ch.target;}
function completedChallenges(){return S.challenges.log||[];}
function pick3(pool,seed){const a=pool.slice(),out=[];let s=seed||1;
  while(out.length<3&&a.length){s=(s*9301+49297)%233280;out.push(a.splice(s%a.length,1)[0]);}return out;}
function poolFor(period){return period==='week'?WEEK_POOL:MONTH_POOL;}
function seedFor(period){const key=period==='week'?weekKey():monthKey();return key.split('-').reduce((a,x)=>a+parseInt(x||0,10),0)+(period==='week'?7:30);}
function pickChallengeSheet(period){
  const opts=pick3(poolFor(period),seedFor(period));
  openSheet(`<h3>Défi ${period==='week'?'de la semaine':'du mois'}</h3>
    <p class="muted sheet-sub">Choisis-en un, ou crée le tien.</p>
    ${opts.map((o,i)=>`<div class="item" onclick="chooseChallenge('${period}',${i})"><div class="challenge-opt-info"><div class="title challenge-opt-title">${o.label}</div><div class="meta">récompense +${o.reward} ♪</div></div><div class="r challenge-opt-arrow">›</div></div>`).join('')}
    <button class="btn ghost sm challenge-create-btn" onclick="freeChallengeSheet('${period}')">Créer un défi libre</button>`);
}
function chooseChallenge(period,idx){const opts=pick3(poolFor(period),seedFor(period));const key=period==='week'?weekKey():monthKey();
  S.challenges[period]=Object.assign({key},opts[idx]);save();closeSheet();renderVoyage();}
function freeChallengeSheet(period){openSheet(`<h3>Défi libre</h3><div class="field"><label>Ton défi</label><input id="fc" placeholder="Ex. mémoriser la page 2"></div><button class="btn primary" onclick="saveFree('${period}')">Créer le défi</button>`);}
function saveFree(period){const t=document.getElementById('fc').value.trim();if(!t){toast('Décris ton défi');return;}
  const key=period==='week'?weekKey():monthKey();S.challenges[period]={key,type:'free',target:1,reward:period==='week'?120:300,label:t,doneManual:false};save();closeSheet();renderVoyage();}
function completeFree(period){const ch=S.challenges[period];if(ch&&ch.type==='free'){ch.doneManual=true;save();checkChallenges();renderVoyage();}}
function checkChallenges(){let changed=false;
  ['week','month'].forEach(period=>{const ch=S.challenges[period];if(!ch)return;
    if(challengeProgress(ch)>=ch.target){const id=period+':'+ch.key;
      if(!(S.challenges.log||[]).some(l=>l.id===id)){S.challenges.log.push({id,reward:ch.reward,label:ch.label});changed=true;celebrate('defi',ch.label,'+'+ch.reward+' ♪');}}});
  if(changed)save();}
function renderSucces(el){
  checkChallenges();
  const wk=S.challenges.week&&S.challenges.week.key===weekKey()?S.challenges.week:null;
  const mo=S.challenges.month&&S.challenges.month.key===monthKey()?S.challenges.month:null;
  const card=(ch,period,lab)=>{
    if(!ch)return `<div class="card voy-defi-card"><div class="between voy-defi-head"><span class="voy-succes-title">Défi ${lab}</span><button class="btn primary sm" onclick="pickChallengeSheet('${period}')">Choisir</button></div><p class="muted voy-defi-empty-sub">Choisis un défi parmi 3, ou crée le tien.</p></div>`;
    const p=challengeProgress(ch),done=p>=ch.target,pct=Math.min(100,Math.round(p/ch.target*100));
    return `<div class="card voy-defi-card ${done?'done':''}">
      <div class="between voy-defi-head"><span class="tag ${period==='week'?'acc':'gold'} voy-defi-period-tag">${lab}</span><span class="voy-defi-reward">+${ch.reward} ♪</span></div>
      <div class="voy-defi-label">${esc(ch.label)}</div>
      <div class="bar voy-defi-bar ${done?'done':''}"><i style="width:${pct}%;"></i></div>
      <div class="between voy-defi-foot"><span class="muted voy-defi-status">${done?'Réussi ✓':progressText(ch)}</span>
      ${ch.type==='free'&&!ch.doneManual?`<button class="btn ghost sm" onclick="completeFree('${period}')">Marquer réussi</button>`:`<button class="btn ghost sm" onclick="pickChallengeSheet('${period}')">Changer</button>`}</div></div>`;
  };
  const ach=achievements(),unlocked=ach.filter(a=>a.on).length;
  const fams=['Régularité','Volume','Maîtrise','Exploration','Carnet','Défis','Notes'];
  el.innerHTML=`
    <div class="voy-succes-title mb10">Défis en cours</div>
    ${card(wk,'week','semaine')}${card(mo,'month','mois')}
    <div class="between voy-succes-head"><span class="voy-succes-title">Succès</span><span class="muted">${unlocked} / ${ach.length}</span></div>
    ${fams.map(f=>{const list=ach.filter(a=>a.fam===f);if(!list.length)return '';
      return `<div class="muted voy-fam-label">${f}</div>
      <div class="voy-ach-grid">${list.map(a=>`
        <div class="card voy-ach-card ${a.on?'':'off'}">
          <div class="voy-ach-glyph ${a.on?'on':'off'}">${a.on?'♫':'○'}</div>
          <div class="voy-ach-label">${a.label}</div>
          <div class="muted voy-ach-reward">${a.on?'+'+a.reward+' ♪':esc(a.desc)}</div></div>`).join('')}</div>`;}).join('')}`;
}

/* ==========================================================================
   LOT 2 — compositeurs, cartes, jardin, célébrations, insights, révision
   ========================================================================== */
function hashStr(s){s=s||'';let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h;}
function masteredByComposer(name){name=(name||'').toLowerCase();return S.pieces.filter(p=>!p.isEnsemble&&p.status==='mastered'&&(p.composer||'').toLowerCase()===name).length;}
function ownedComposers(){const s=new Set();S.pieces.forEach(p=>{if(!p.isEnsemble&&p.composer)s.add(p.composer);});return [...s].sort((a,b)=>a.localeCompare(b));}
function cardLevel(n){return n>=10?{n:'Or',c:'#E4C58A'}:n>=5?{n:'Argent',c:'#C9CDDA'}:n>=2?{n:'Bronze',c:'#C98A3A'}:null;}
function cardNext(n,lv){
  if(lv&&lv.n==='Or')return {pct:100,label:'niveau max'};
  const target=!lv?2:lv.n==='Bronze'?5:10,label=!lv?'Bronze':lv.n==='Bronze'?'Argent':'Or';
  return {pct:Math.min(100,Math.round(n/target*100)),label:label+' à '+target};
}
function composerSeconds(name){let t=0;S.pieces.forEach(p=>{if(!p.isEnsemble&&(p.composer||'').toLowerCase()===name.toLowerCase())t+=pieceSeconds(p.id);});return t;}

function composerSheet(name){
  const c=OPUS.composerByName(name);const dates=c.b?(c.b+(c.d?'–'+c.d:'– …')):'';
  const total=S.pieces.filter(p=>!p.isEnsemble&&(p.composer||'').toLowerCase()===name.toLowerCase()).length;
  openSheet(`<h3>${esc(name)}</h3>
    <div id="comp-portrait" class="composer-portrait"></div>
    <div class="between composer-row"><span class="muted">Époque</span><span>${esc(c.epoch||'—')}</span></div>
    <div class="between composer-row"><span class="muted">Dates</span><span>${dates||'—'}</span></div>
    <div class="between composer-row last"><span class="muted">Tes morceaux</span><span>${total} · ${masteredByComposer(name)} maîtrisés</span></div>
    <button class="btn ghost composer-close" onclick="closeSheet()">Fermer</button>`);
  OPUS.onlineComposer(name).then(cs=>{const el=document.getElementById('comp-portrait');if(el&&cs&&cs[0]&&cs[0].portrait)el.innerHTML=`<img src="${cs[0].portrait}" alt="" class="composer-portrait-img">`;}).catch(()=>{});
}
function renderCartes(el){
  const comps=ownedComposers();
  if(!comps.length){el.innerHTML=emptyState('Joue des morceaux pour collectionner des cartes de compositeurs.','note');return;}
  el.innerHTML=`<p class="muted voy-cartes-intro">Niveaux : Bronze 2 · Argent 5 · Or 10 morceaux maîtrisés.</p>
   <div class="voy-card-grid">${comps.map(name=>{
     const m=masteredByComposer(name),lv=cardLevel(m),c=OPUS.composerByName(name),next=cardNext(m,lv),sec=composerSeconds(name);
     return `<div class="card voy-card" ${lv?`style="box-shadow:inset 0 0 0 1px ${lv.c};"`:''} onclick="composerSheet('${name.replace(/'/g,"\\'")}')">
       <div class="between voy-card-head">
         <div class="voy-card-info"><div class="serif voy-card-name">${esc(name)}</div>
         <div class="muted voy-card-epoch">${esc(c.epoch||'')}</div></div>
         ${lv?`<span class="tag voy-card-lvl" style="background:${lv.c}22;color:${lv.c};">${lv.n}</span>`:''}</div>
       <div class="row voy-card-count">
         <span class="num voy-card-count-v" style="${lv?'color:'+lv.c+';':''}">${m}</span>
         <span class="muted voy-card-count-l">${m>1?'maîtrisés':'maîtrisé'}</span></div>
       <div class="bar voy-card-bar"><i style="width:${next.pct}%;${lv?'background:'+lv.c+';':''}"></i></div>
       <div class="muted voy-card-foot">${sec?dur(sec)+' joués · ':''}${next.label}</div></div>`;}).join('')}</div>`;
}
function renderJardin(el){
  const hours=totalSeconds()/3600,streak=computeStreak(),mastered=S.pieces.filter(p=>!p.isEnsemble&&p.status==='mastered');
  const rankIdx=STONES.reduce((a,s,i)=>hours>=s.h?i:a,-1);
  const growth=Math.max(0.14,Math.min(1,(rankIdx+2)/19));
  const W=400,H=340,groundY=286,cx=200,trunkH=66+growth*136;
  let branches='',tips=[];
  const grow=(x,y,ang,len,w,depth)=>{
    const x2=x+Math.cos(ang)*len,y2=y+Math.sin(ang)*len;
    const mx=(x+x2)/2+Math.cos(ang+1.5708)*len*0.16,my=(y+y2)/2+Math.sin(ang+1.5708)*len*0.16;
    branches+=`<path d="M${x.toFixed(1)} ${y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="#E4C58A" stroke-opacity="${(0.35+depth*0.16).toFixed(2)}" stroke-width="${w.toFixed(1)}" stroke-linecap="round" fill="none"/>`;
    if(depth===0){tips.push([x2,y2,ang]);return;}
    const sp=0.46+(hashStr('b'+depth+x.toFixed(0))%20)/100;
    grow(x2,y2,ang-sp,len*0.72,w*0.6,depth-1);
    grow(x2,y2,ang+sp,len*0.68,w*0.6,depth-1);
    if(depth>1)grow(x2,y2,ang+(hashStr('a'+x.toFixed(0))%50-25)/100,len*0.5,w*0.4,depth-2);
  };
  grow(cx,groundY,-1.5708,trunkH*0.5,9+growth*5,3);
  const leafN=Math.min(150,24+streak*9);let leaves='';
  const cols=['#E4C58A','#9E93F2','#C9A9E8','#EDD9AE'];
  for(let i=0;i<leafN;i++){
    const t=tips[hashStr('t'+i)%tips.length];
    const a=(hashStr('la'+i)%628)/100,r=(hashStr('lr'+i)%100)/100*(22+growth*20);
    const x=t[0]+Math.cos(a)*r,y=t[1]+Math.sin(a)*r*0.8;
    const ln=3+hashStr('ll'+i)%4,ang=(hashStr('lg'+i)%180)-90;
    leaves+=`<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x+ln).toFixed(0)}" y2="${y.toFixed(0)}" stroke="${cols[i%4]}" stroke-opacity="${(0.3+(hashStr('lo'+i)%50)/100).toFixed(2)}" stroke-width="1.7" stroke-linecap="round" transform="rotate(${ang} ${x.toFixed(0)} ${y.toFixed(0)})"/>`;
  }
  let flowers='';
  mastered.slice(0,44).forEach((p,i)=>{
    const t=tips[(i*3+1)%tips.length];
    const x=t[0]+Math.cos(t[2])*7,y=t[1]+Math.sin(t[2])*7;
    flowers+=`<g><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="9" fill="url(#gloB)"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2.6" fill="#F6EEDA"/></g>`;
  });
  const cur=currentStone();
  el.innerHTML=`<div class="card voy-jardin-frame">
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;">
      <defs><linearGradient id="skyB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A2440"/><stop offset="52%" stop-color="#221F32"/><stop offset="1" stop-color="#191A1B"/></linearGradient>
      <radialGradient id="gloB"><stop offset="0" stop-color="#F6EEDA" stop-opacity=".75"/><stop offset="1" stop-color="#E4C58A" stop-opacity="0"/></radialGradient>
      <linearGradient id="mistB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9E93F2" stop-opacity="0"/><stop offset="1" stop-color="#9E93F2" stop-opacity=".16"/></linearGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#skyB)"/>
      <circle cx="304" cy="66" r="34" fill="none" stroke="#E4C58A" stroke-opacity=".3" stroke-width="1"/>
      <circle cx="304" cy="66" r="20" fill="#E4C58A" opacity=".1"/>
      <path d="M0 250 Q 90 214 190 240 T 400 226 L400 ${H} L0 ${H} Z" fill="#201E30"/>
      <path d="M0 268 Q 130 236 250 262 T 400 252 L400 ${H} L0 ${H} Z" fill="#1A1926"/>
      <g class="jb-tree">${branches}</g><g class="jb-leaf">${leaves}</g><g class="jb-flo">${flowers}</g>
      <rect x="0" y="248" width="${W}" height="92" fill="url(#mistB)"/>
      <path d="M0 ${groundY+4} H${W}" stroke="#E4C58A" stroke-opacity=".22" stroke-width="1"/>
    </svg>
    <div class="voy-jardin-foot"><div class="serif voy-jardin-title">${cur?cur.n:'La graine'}</div>
      <div class="muted voy-jardin-sub">${Math.round(hours)} h cultivées · ${streak} j de série · ${mastered.length} fleurs</div></div>
  </div>
    <p class="muted voy-jardin-note">Ton arbre grandit avec tes heures, se garnit selon ta série, et fleurit à chaque morceau maîtrisé.</p>`;
  const tree=el.querySelector('.jb-tree'),leafG=el.querySelector('.jb-leaf'),floG=el.querySelector('.jb-flo');
  tree.style.cssText='transform-origin:50% 100%;transform:scaleY(.02);opacity:.3;transition:transform 1s cubic-bezier(.2,.7,.3,1),opacity .6s;';
  leafG.style.cssText='opacity:0;transition:opacity .8s ease .8s;';
  floG.style.cssText='opacity:0;transition:opacity .7s ease 1.5s;';
  (window.requestAnimationFrame||window.setTimeout)(()=>{tree.style.transform='scaleY(1)';tree.style.opacity='1';leafG.style.opacity='1';floG.style.opacity='1';});
}
const CELEB_KIND={
  rang:{glyph:'♫',color:'var(--gold)',label:'Nouveau rang'},
  piece:{glyph:'♬',color:'var(--gold)',label:'Morceau maîtrisé'},
  defi:{glyph:'♪',color:'var(--acc)',label:'Défi accompli'},
  concert:{glyph:'𝄞',color:'var(--gold)',label:'Concert terminé'},
};
function celebrate(kind,title,sub){
  const k=CELEB_KIND[kind]||CELEB_KIND.rang;
  const medalKind=k.color==='var(--acc)'?'acc':'gold';
  buzz();const o=document.createElement('div');
  o.className='celeb-ov';
  o.innerHTML=`<div class="celeb-inner">
    <div class="celeb-medal ${medalKind}">
      <div class="celeb-medal-glow"></div>
      <div class="celeb-medal-ring"></div>
      <div class="celeb-medal-glyph">${k.glyph}</div>
    </div>
    <div class="celeb-kind">${k.label}</div>
    <div class="serif celeb-title">${esc(title)}</div>
    ${sub?`<div class="muted celeb-sub">${esc(sub)}</div>`:''}
    <button class="btn ghost sm celeb-continue">Continuer</button>
  </div>`;
  o.onclick=e=>{if(e.target===o||e.target.tagName==='BUTTON')o.remove();};
  document.body.appendChild(o);
  const inner=o.firstElementChild;
  (window.requestAnimationFrame||window.setTimeout)(()=>{inner.classList.add('show');});
}
function hourHeat(){
  const hrs=new Array(24).fill(0);playSessions().forEach(s=>{const t=s.ts||Date.parse(s.date+'T12:00');const h=new Date(t).getHours();hrs[h]+=sessionSeconds(s);});
  const max=Math.max(1,...hrs);const best=hrs.map((v,i)=>[i,v]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]+'h');
  return `<div class="card"><div class="between stat-card-head"><span class="stat-card-title">Heure de la journée</span>${best.length?`<span class="muted stat-card-sub">meilleur : ${best.join(', ')}</span>`:''}</div>
    <div class="stat-hourheat">${hrs.map((v,i)=>`<div class="stat-hourheat-bar" style="background:${v?'var(--acc)':'var(--surface2)'};height:${v?Math.max(7,Math.round(v/max*100)):4}%;opacity:${v?(0.45+0.55*v/max).toFixed(2):1};"></div>`).join('')}</div>
    <div class="sub stat-hourheat-labels"><span>0h</span><span>12h</span><span>23h</span></div></div>`;
}
function revisionList(){if(vacationActive())return [];const now=Date.now();
  return S.pieces.filter(p=>!p.isEnsemble&&p.status==='mastered').map(p=>{const days=p.revInterval||S.settings.revisionDays||18;const lp=pieceLastPlayed(p.id);const d=lp?Math.floor((now-new Date(lp+'T00:00'))/86400000):9999;return {p,d,days};}).filter(x=>x.d>=x.days).sort((a,b)=>b.d-a.d).map(x=>x.p);}
function estimateText(p){if(S.settings.estimates===false||!p||!p.createdAt)return '';
  const pr=pieceProgress(p);if(pr>=100)return '';
  const days=(Date.now()-p.createdAt)/86400000;if(days<3||!pr)return '';const rate=pr/days;if(rate<=0)return '';
  // Pièce sectionnée : le temps restant est pondéré par la difficulté des sections non « ok »
  // (DIFF_WEIGHT), pas seulement par le pourcentage de mesures manquantes. Sans diff renseignée,
  // le poids reste neutre (1) et le résultat est identique à l'ancienne formule (100-pr)/rate.
  const rem=hasDerivedProgress(p)?weightedRemainingBars(p)*100/(rate*p.bars):(100-pr)/rate;
  if(rem>3650)return '';return 'Maîtrise estimée dans ~'+(rem<14?Math.round(rem)+' j':Math.round(rem/7)+' sem.');}

