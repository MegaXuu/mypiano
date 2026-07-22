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

// Catalogue de succès (V5-2) : ~100 succès sur 16 familles, chacun avec une courte
// description et un niveau (1 Facile · 2 Moyen · 3 Difficile). Tout est dérivé des
// données existantes. Les 25 ids historiques sont conservés pour ne pas re-verrouiller
// l'existant. Les récompenses ♪ n'entrent pas dans les seuils « Notes » (basés sur
// baseNotes()), donc ajouter des succès ne fausse pas ces paliers.
const ACH_TIERS={1:'Facile',2:'Moyen',3:'Difficile'};
function achievements(){
  const play=playSessions();
  const streak=bestStreak(),hours=totalSeconds()/3600,mastered=masteredCount();
  const comps=new Set(),epochs=new Set();
  play.forEach(s=>s.blocks.forEach(b=>{if(b.piece===IMPROV)return;const p=pieceById(b.piece);if(p){if(p.composer)comps.add(p.composer.toLowerCase());if(p.epoch)epochs.add(p.epoch);}}));
  const noteCount=S.pieces.reduce((a,p)=>a+((p.notes||[]).length),0);
  const journalDays=Object.values(S.journal).filter(j=>j&&(j.mood||j.energy)).length;
  const improv=play.some(s=>s.blocks.some(b=>b.piece===IMPROV));
  const chopin=S.pieces.filter(p=>p.status==='mastered'&&/chopin/i.test(p.composer||'')).length;
  const bach=S.pieces.filter(p=>p.status==='mastered'&&/bach/i.test(p.composer||'')).length;
  const ensDone=S.pieces.filter(p=>p.isEnsemble&&ensembleCompleted(p)).length;
  const henleMax=Math.max(0,...S.pieces.filter(p=>p.status==='mastered').map(p=>p.diff||0));
  const perfect=S.pieces.some(p=>hasDerivedProgress(p)&&pieceProgress(p)>=100);
  const sessionsCount=play.length;
  const longSession=play.reduce((m,s)=>Math.max(m,sessionSeconds(s)),0);
  const sbd=secondsByDay();
  const bestDay=Math.max(0,...Object.values(sbd));
  let bestWeek=0;const dArr=Object.keys(sbd).sort();
  if(dArr.length){for(let d=new Date(dArr[0]);d<=new Date();d=addDays(d,7)){let t=0;for(let i=0;i<7;i++)t+=sbd[dkey(addDays(d,i))]||0;bestWeek=Math.max(bestWeek,t);}}
  let monthHours=0;for(let i=0;i<31;i++)monthHours+=secondsOnDay(dkey(addDays(new Date(),-i)));monthHours/=3600;
  const repCount=S.pieces.filter(p=>!p.isEnsemble&&p.status!=='wishlist').length;
  const wishCount=S.pieces.filter(p=>p.status==='wishlist').length;
  const tags=new Set();S.pieces.forEach(p=>(p.tags||[]).forEach(t=>{if(t)tags.add(t);}));
  let sectionsOk=0,barsOkTotal=0;const sectionedPieces=S.pieces.filter(p=>secList(p).length>0).length;
  S.pieces.forEach(p=>{secList(p).forEach(s=>{if(s.status==='ok')sectionsOk++;});if(hasDerivedProgress(p))barsOkTotal+=barsOk(p);});
  let recCount=0,recSection=0,recLong=0;
  S.pieces.forEach(p=>(p.recordings||[]).forEach(r=>{recCount++;if(r.section)recSection++;if((r.dur||0)>=180)recLong++;}));
  const concertCount=S.sessions.filter(s=>s.mode==='concert').length;
  const awayCount=awaySessions().length;
  const vacResumed=!!(S.vacation&&S.vacation.resumedAt);
  let earlyBird=0,nightOwl=0,weekendSessions=0;
  play.forEach(s=>{const dt=new Date(s.ts||Date.parse(s.date+'T12:00')),h=dt.getHours(),wd=dt.getDay();
    if(h<8)earlyBird++;if(h>=22)nightOwl++;if(wd===0||wd===6)weekendSessions++;});
  const cc=completedChallenges().length,bn=baseNotes();
  const A=(id,fam,tier,label,desc,on,reward)=>({id,fam,tier,label,desc,on:!!on,reward});
  return [
    // Régularité (série de jours consécutifs)
    A('reg3','Régularité',1,'Trois jours','3 jours d’affilée',streak>=3,40),
    A('reg7','Régularité',1,'Semaine pleine','7 jours d’affilée',streak>=7,100),
    A('reg14','Régularité',2,'Quinzaine','14 jours d’affilée',streak>=14,180),
    A('reg30','Régularité',2,'Assidu','30 jours d’affilée',streak>=30,300),
    A('reg60','Régularité',2,'Deux mois','60 jours d’affilée',streak>=60,500),
    A('reg100','Régularité',3,'Increvable','100 jours d’affilée',streak>=100,1000),
    A('reg200','Régularité',3,'Inébranlable','200 jours d’affilée',streak>=200,1800),
    A('reg365','Régularité',3,'Une année','365 jours d’affilée',streak>=365,3000),
    // Volume (heures cumulées)
    A('vol1','Volume',1,'Première heure','1 h de pratique',hours>=1,40),
    A('vol10','Volume',1,'Premières heures','10 h de pratique',hours>=10,80),
    A('vol25','Volume',1,'En chemin','25 h de pratique',hours>=25,120),
    A('vol50','Volume',2,'Cinquantaine','50 h de pratique',hours>=50,180),
    A('vol100','Volume',2,'Centurion','100 h de pratique',hours>=100,400),
    A('vol250','Volume',2,'Persévérant','250 h de pratique',hours>=250,700),
    A('vol500','Volume',3,'Cinq cents heures','500 h de pratique',hours>=500,1200),
    A('vol1000','Volume',3,'Millénaire','1 000 h de pratique',hours>=1000,2000),
    A('vol2500','Volume',3,'Dévoué','2 500 h de pratique',hours>=2500,3500),
    A('vol5000','Volume',3,'Une vie de piano','5 000 h de pratique',hours>=5000,5000),
    // Séances (nombre et durée)
    A('s1','Séances',1,'Première séance','1 séance jouée',sessionsCount>=1,40),
    A('s10','Séances',1,'Dix séances','10 séances jouées',sessionsCount>=10,80),
    A('long1','Séances',1,'Bonne session','une séance d’1 h',longSession>=3600,60),
    A('s50','Séances',2,'Cinquante séances','50 séances jouées',sessionsCount>=50,200),
    A('s100','Séances',2,'Centième séance','100 séances jouées',sessionsCount>=100,400),
    A('long','Séances',2,'Marathon','une séance de 2 h',longSession>=7200,150),
    A('volm','Séances',2,'Mois intense','10 h en un mois',monthHours>=10,150),
    A('s365','Séances',3,'Trois cent soixante-cinq','365 séances jouées',sessionsCount>=365,1500),
    A('long3','Séances',3,'Endurance','une séance de 3 h',longSession>=10800,400),
    // Journée & semaine (records ponctuels)
    A('day1','Journée & semaine',1,'Belle journée','1 h jouée en une journée',bestDay>=3600,50),
    A('wk3','Journée & semaine',1,'Semaine active','3 h jouées en une semaine',bestWeek>=10800,60),
    A('day2','Journée & semaine',2,'Journée pleine','2 h jouées en une journée',bestDay>=7200,200),
    A('wk7','Journée & semaine',2,'Semaine dense','7 h jouées en une semaine',bestWeek>=25200,220),
    A('day4','Journée & semaine',3,'Journée intense','4 h jouées en une journée',bestDay>=14400,500),
    A('wk15','Journée & semaine',3,'Semaine record','15 h jouées en une semaine',bestWeek>=54000,600),
    // Maîtrise
    A('m1','Maîtrise',1,'Premier sommet','1 morceau maîtrisé',mastered>=1,50),
    A('m3','Maîtrise',1,'Trois sommets','3 morceaux maîtrisés',mastered>=3,100),
    A('m5','Maîtrise',2,'Répertoire','5 morceaux maîtrisés',mastered>=5,150),
    A('m10','Maîtrise',2,'Virtuose en herbe','10 morceaux maîtrisés',mastered>=10,400),
    A('ens','Maîtrise',2,'Ensemble complet','un recueil complété',ensDone>=1,300),
    A('perfect','Maîtrise',2,'Perfectionniste','une pièce à 100 % de mesures au point',perfect,250),
    A('m20','Maîtrise',3,'Grand répertoire','20 morceaux maîtrisés',mastered>=20,800),
    A('m50','Maîtrise',3,'Maître du clavier','50 morceaux maîtrisés',mastered>=50,2000),
    A('chop','Maîtrise',3,'Ami de Chopin','5 Chopin maîtrisés',chopin>=5,400),
    A('bach','Maîtrise',3,'Ami de Bach','5 Bach maîtrisés',bach>=5,400),
    A('hard9','Maîtrise',3,'Everest','une pièce Henle 9 maîtrisée',henleMax>=9,1000),
    // Difficulté (Henle) maîtrisée
    A('diff5','Difficulté',2,'Terrain solide','une pièce Henle 5+ maîtrisée',henleMax>=5,150),
    A('diff7','Difficulté',2,'Haute voltige','une pièce Henle 7+ maîtrisée',henleMax>=7,400),
    A('diff8','Difficulté',3,'Sommet','une pièce Henle 8+ maîtrisée',henleMax>=8,700),
    // Répertoire (collection)
    A('rep1','Répertoire',1,'Premier morceau','1 morceau au répertoire',repCount>=1,30),
    A('rep5','Répertoire',1,'Petit répertoire','5 morceaux au répertoire',repCount>=5,60),
    A('wish5','Répertoire',1,'Liste d’envies','5 morceaux à apprendre',wishCount>=5,50),
    A('tag','Répertoire',1,'Organisé','3 étiquettes utilisées',tags.size>=3,60),
    A('rep15','Répertoire',2,'Bibliothèque','15 morceaux au répertoire',repCount>=15,180),
    A('rep30','Répertoire',2,'Grande collection','30 morceaux au répertoire',repCount>=30,350),
    A('rep50','Répertoire',3,'Collectionneur','50 morceaux au répertoire',repCount>=50,700),
    // Exploration (compositeurs, époques)
    A('e3','Exploration',1,'Curieux','3 compositeurs joués',comps.size>=3,80),
    A('e5','Exploration',1,'Éclectique','5 compositeurs joués',comps.size>=5,120),
    A('ep2','Exploration',1,'Deux époques','2 époques explorées',epochs.size>=2,60),
    A('imp','Exploration',1,'Libre','1re improvisation',improv,50),
    A('e10','Exploration',2,'Grand voyageur','10 compositeurs joués',comps.size>=10,300),
    A('ep3','Exploration',2,'Voyage du temps','3 époques explorées',epochs.size>=3,150),
    A('e20','Exploration',3,'Encyclopédiste','20 compositeurs joués',comps.size>=20,800),
    A('ep5','Exploration',3,'Toutes les époques','5 époques explorées',epochs.size>=5,500),
    // Sections & mesures
    A('sec1','Sections',1,'Découpage','1 morceau découpé en sections',sectionedPieces>=1,50),
    A('sec5','Sections',2,'Méthodique','5 morceaux découpés',sectionedPieces>=5,200),
    A('secok10','Sections',2,'Au point','10 sections au point',sectionsOk>=10,200),
    A('bars500','Sections',2,'Cinq cents mesures','500 mesures au point',barsOkTotal>=500,250),
    A('secok50','Sections',3,'Ouvrier des mesures','50 sections au point',sectionsOk>=50,600),
    A('bars2000','Sections',3,'Deux mille mesures','2 000 mesures au point',barsOkTotal>=2000,800),
    // Carnet & journal
    A('c1','Carnet',1,'Première note','1 note de carnet',noteCount>=1,40),
    A('c10','Carnet',1,'Chroniqueur','10 notes de carnet',noteCount>=10,80),
    A('j7','Carnet',1,'Introspection','journal tenu 7 jours',journalDays>=7,60),
    A('c50','Carnet',2,'Mémorialiste','50 notes de carnet',noteCount>=50,250),
    A('j30','Carnet',2,'Introspectif','journal tenu 30 jours',journalDays>=30,200),
    A('c150','Carnet',3,'Archiviste','150 notes de carnet',noteCount>=150,600),
    A('j100','Carnet',3,'Journal intime','journal tenu 100 jours',journalDays>=100,600),
    // Enregistrements
    A('audio1','Enregistrements',1,'Première prise','1 enregistrement',recCount>=1,50),
    A('audioSec','Enregistrements',1,'Prise ciblée','un enregistrement rattaché à une section',recSection>=1,60),
    A('audio5','Enregistrements',2,'En studio','5 enregistrements',recCount>=5,200),
    A('audioLong','Enregistrements',2,'Prise longue','un enregistrement d’au moins 3 min',recLong>=1,150),
    A('audio20','Enregistrements',3,'Discographie','20 enregistrements',recCount>=20,600),
    // Défis
    A('d1','Défis',1,'Relevé','1 défi réussi',cc>=1,100),
    A('d3','Défis',2,'Régulier','3 défis réussis',cc>=3,200),
    A('d5','Défis',2,'Compétiteur','5 défis réussis',cc>=5,300),
    A('d10','Défis',3,'Champion','10 défis réussis',cc>=10,700),
    // Concert
    A('concert','Concert',2,'Sur scène','1re simulation de concert',concertCount>=1,200),
    A('concert5','Concert',3,'Habitué de la scène','5 simulations de concert',concertCount>=5,600),
    // Vacances (loin du clavier)
    A('away1','Vacances',1,'Loin du clavier','1 séance loin du clavier',awayCount>=1,50),
    A('away5','Vacances',2,'Musicien en voyage','5 séances loin du clavier',awayCount>=5,200),
    A('vacback','Vacances',2,'Retour en forme','une reprise après une pause',vacResumed,150),
    // Moments
    A('morning','Moments',2,'Lève-tôt','10 séances avant 8 h',earlyBird>=10,200),
    A('night','Moments',2,'Oiseau de nuit','10 séances après 22 h',nightOwl>=10,200),
    A('weekend','Moments',2,'Guerrier du week-end','20 séances le week-end',weekendSessions>=20,250),
    // Notes ♪ (prestige)
    A('n1k','Notes',1,'Premier millier','1 000 ♪ accumulés',bn>=1000,60),
    A('n2500','Notes',1,'Petite bourse','2 500 ♪ accumulés',bn>=2500,100),
    A('n5','Notes',2,'Collectionneur','5 000 ♪ accumulés',bn>=5000,200),
    A('n20','Notes',3,'Trésor','20 000 ♪ accumulés',bn>=20000,600),
    A('n50','Notes',3,'Fortune','50 000 ♪ accumulés',bn>=50000,1200),
    A('n100','Notes',3,'Légende dorée','100 000 ♪ accumulés',bn>=100000,2500),
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
  S.challenges[period]=Object.assign({key},opts[idx]);save();closeSheet();renderParcours();}
function freeChallengeSheet(period){openSheet(`<h3>Défi libre</h3><div class="field"><label>Ton défi</label><input id="fc" placeholder="Ex. mémoriser la page 2"></div><button class="btn primary" onclick="saveFree('${period}')">Créer le défi</button>`);}
function saveFree(period){const t=document.getElementById('fc').value.trim();if(!t){toast('Décris ton défi');return;}
  const key=period==='week'?weekKey():monthKey();S.challenges[period]={key,type:'free',target:1,reward:period==='week'?120:300,label:t,doneManual:false};save();closeSheet();renderParcours();}
function completeFree(period){const ch=S.challenges[period];if(ch&&ch.type==='free'){ch.doneManual=true;save();checkChallenges();renderParcours();}}
function checkChallenges(){let changed=false;
  ['week','month'].forEach(period=>{const ch=S.challenges[period];if(!ch)return;
    if(challengeProgress(ch)>=ch.target){const id=period+':'+ch.key;
      if(!(S.challenges.log||[]).some(l=>l.id===id)){S.challenges.log.push({id,reward:ch.reward,label:ch.label});changed=true;celebrate('defi',ch.label,'+'+ch.reward+' ♪');}}});
  if(changed)save();}
// Cartes des deux défis en cours (section « Défis en cours » de Parcours).
function defisCards(){
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
  return card(wk,'week','semaine')+card(mo,'month','mois');
}
const ACH_FAMS=['Régularité','Volume','Séances','Journée & semaine','Maîtrise','Difficulté','Répertoire','Exploration','Sections','Carnet','Enregistrements','Défis','Concert','Vacances','Moments','Notes'];
function succesCount(){const ach=achievements();return ach.filter(a=>a.on).length+' / '+ach.length;}
// Grille des succès (dépliant « Succès » de Parcours) : description toujours visible + niveau.
function succesGrid(){
  const ach=achievements();
  return ACH_FAMS.map(f=>{const list=ach.filter(a=>a.fam===f);if(!list.length)return '';
    return `<div class="muted voy-fam-label">${f}</div>
    <div class="voy-ach-grid">${list.map(a=>`
      <div class="card voy-ach-card ${a.on?'':'off'}">
        <div class="voy-ach-glyph ${a.on?'on':'off'}">${a.on?'♫':'○'}</div>
        <div class="voy-ach-label">${a.label}</div>
        <div class="muted voy-ach-desc">${esc(a.desc)}</div>
        <div class="between voy-ach-foot"><span class="voy-ach-tier">${ACH_TIERS[a.tier]||''}</span><span class="voy-ach-reward">+${a.reward} ♪</span></div></div>`).join('')}</div>`;}).join('');
}

/* ==========================================================================
   LOT 2 — compositeurs, cartes, célébrations, insights, révision
   ========================================================================== */
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
function renderCartes(){
  const comps=ownedComposers();
  if(!comps.length)return emptyState('Joue des morceaux pour collectionner des cartes de compositeurs.','note');
  return `<p class="muted voy-cartes-intro">Niveaux : Bronze 2 · Argent 5 · Or 10 morceaux maîtrisés.</p>
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

