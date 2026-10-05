/* ==========================================================================
   Test fumée — charge l'app sous jsdom et exerce les fonctions clés.
   Objectif : attraper les erreurs runtime + vérifier la migration V5 → V6
   (pas de vérif métier fine).
   Lancer :  npm test           (après « npm install » une première fois)

   L'état `let S` n'est PAS une propriété de window : on seed via localStorage
   AVANT l'exécution (loadState() migre depuis là au premier boot), et on lit
   l'état via l'accesseur window.__S injecté après les modules. Le boot est
   asynchrone (IndexedDB) : window.__ready renvoie la promesse de boot,
   window.__flush force l'écriture disque. jsdom n'implémente pas IndexedDB →
   on injecte fake-indexeddb.
   ========================================================================== */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

const root = new URL('.', import.meta.url).pathname;
const read = f => readFileSync(root + f, 'utf8');

// Modules <script> classiques, concaténés dans l'ordre de chargement (miroir d'index.html et sw.js).
const FILES = [
  'js/state.js', 'js/ui.js', 'js/methods.js', 'js/home.js', 'js/session.js',
  'js/carnet.js', 'js/parcours.js', 'js/settings.js', 'js/boot.js',
];
const bundle = FILES.map(read).join('\n');
const html = read('index.html')
  .replace(/<script src="js\/[^"]+"><\/script>\s*/g, '')
  .replace('</body>', `<script>${bundle}</script>\n<script>window.__S=function(){return S;};window.__T=function(){return timer;};window.__ready=function(){return READY;};window.__flush=function(){return saveNow();};</script>\n</body>`);

// Seed au format V5 (données réelles typiques) pour vérifier la migration.
const now = Date.now();
const day = n => { const d = new Date(now - n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const seed = {
  pieces: [
    { id: 'a1', title: 'Nocturne op. 9 no 2', composer: 'Chopin', status: 'active', notes: [], createdAt: now - 40 * 864e5,
      recordings: [{ id: 'r1', date: day(3), dur: 42, feel: 'mf', size: 12000, mime: 'audio/mp4' }] },
    { id: 'a2', title: 'Clair de lune', composer: 'Debussy', status: 'mastered', sections: [{ id: 's1', name: 'A', from: 1, to: 8, status: 'ok' }] },
  ],
  sessions: [
    { id: 's1', date: day(2), mode: 'chrono', blocks: [{ piece: 'a1', sec: 1200 }, { piece: 'a2', sec: 600 }], entries: [{ piece: 'a1', worked: 'Legato', next: 'Pédale' }], feeling: 'f', ts: now - 2 * 864e5 },
    { id: 's2', date: day(1), mode: 'guided', blocks: [{ piece: '__improv__', sec: 900 }], entries: [], ts: now - 864e5 },
    { id: 's3', date: day(1), mode: 'away', awayKind: 'ecoute', blocks: [{ piece: '', sec: 1800 }], entries: [], ts: now - 864e5 },
  ],
  wishlist: [], journal: {}, challenges: { week: null, month: null, log: [] },
  vacation: { on: true, from: day(20), until: null, resumedAt: null },
  settings: { userName: 'Test', dailyGoal: 30, tolerance: 1, planPrefs: { dur: 60, n: 2, intent: 'equilibre' } },
};

const fails = [];
const onError = (label, e) => fails.push(`${label} → ${e && e.message ? e.message : e}`);

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'http://localhost/',
  beforeParse(win) {
    win.fetch = () => Promise.reject(new Error('offline (test)'));
    win.indexedDB = indexedDB;
    win.IDBKeyRange = IDBKeyRange;
    win.scrollTo = () => {};
    win.localStorage.setItem('pianoV2', JSON.stringify(seed));
    win.addEventListener('error', e => onError('window.onerror', e.error || e.message));
  },
});

const win = dom.window;
if (typeof win.__ready === 'function') await win.__ready();
const S = typeof win.__S === 'function' ? win.__S() : undefined;
const call = (label, fn) => { try { fn(); } catch (e) { onError(label, e); } };

// 1) Boot + migration V5 → V6.
if (!S) fails.push('boot → état S inaccessible');
else {
  if (S.pieces.length !== 2) fails.push('migration → les anciens morceaux doivent rester stockés');
  if (!S.recordings.some(r => r.id === 'r1' && r.label === 'Nocturne op. 9 no 2')) fails.push('migration → enregistrement non repris dans S.recordings');
  if (S.vacation.on) fails.push('migration → une pause en cours doit être terminée');
  if (!S.onboarded) fails.push('migration → onboarded doit être vrai avec des données');
  if (win.totalSeconds() !== 2700) fails.push('totalSeconds → ' + win.totalSeconds() + ' (attendu 2700, séance away exclue)');
  if (win.legacyPieces(S.sessions[0]).join('|') !== 'Nocturne op. 9 no 2|Clair de lune') fails.push('legacyPieces → noms des anciens morceaux incorrects');
}

// 1bis) Migration localStorage → IndexedDB.
function idbGetDirect(key) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('pianoV2', 1);
    req.onsuccess = () => {
      const rq = req.result.transaction('state', 'readonly').objectStore('state').get(key);
      rq.onsuccess = () => resolve(rq.result); rq.onerror = () => reject(rq.error);
    };
    req.onerror = () => reject(req.error);
  });
}
try {
  const raw = await idbGetDirect('S');
  if (!raw) fails.push('IndexedDB → clé "S" absente après boot');
  else if (JSON.parse(raw).sessions.length !== 3) fails.push('IndexedDB → séances divergentes');
  const meta = await idbGetDirect('meta');
  if (!meta || meta.from !== 'localStorage') fails.push('IndexedDB → meta.from attendu "localStorage"');
} catch (e) { fails.push('IndexedDB → lecture directe en échec : ' + (e && e.message ? e.message : e)); }

// 2) Navigation.
['home', 'carnet', 'parcours', 'settings', 'home'].forEach(scr => call(`go('${scr}')`, () => win.go(scr)));
call("go('rep') → accueil", () => { win.go('rep'); if (!win.document.getElementById('s-home').classList.contains('active')) throw new Error('écran retiré non redirigé'); });

// 3) Séance complète : démarrage, situation, méthodes, pause, fin, enregistrement.
call('séance : démarrage + situation + méthodes', () => {
  win.beginSession();
  if (!win.__T()) throw new Error('timer absent');
  if (!win.localStorage.getItem('pianoV2.timer')) throw new Error('chrono non persisté');
  win.setFocus('difficile');
  if (win.__T().focus !== 'difficile' || S.settings.focus !== 'difficile') throw new Error('situation non retenue');
  win.nextMethod(); win.nextMethod();
  if (!win.document.querySelector('.method-card')) throw new Error('carte méthode absente');
  win.methodsSheet('difficile'); win.closeSheet();
  win.togglePause(); if (win.__T().since) throw new Error('pause sans effet');
  win.togglePause(); if (!win.__T().since) throw new Error('reprise sans effet');
});
call('séance : chrono à horodatages', () => {
  const t = win.__T(); t.acc = 600; t.since = Date.now() - 60000; // 10 min déjà comptées + 1 min en cours
  if (Math.round(win.elapsed()) !== 660) throw new Error('elapsed() = ' + win.elapsed());
  win.paintSession();
});
call('séance : fin + enregistrement', () => {
  const before = S.sessions.length;
  win.stopSession();
  win.pickDyn('end-f', 'ff');
  win.document.getElementById('end-n').value = 'Main gauche plus libre';
  win.commitSession(660);
  if (S.sessions.length !== before + 1) throw new Error('séance non créée');
  const s = S.sessions[S.sessions.length - 1];
  if (s.feeling !== 'ff' || s.note !== 'Main gauche plus libre' || s.focus !== 'difficile') throw new Error('champs de fin de séance perdus');
  if (win.sessionSeconds(s) !== 660) throw new Error('durée = ' + win.sessionSeconds(s));
  if (win.__T()) throw new Error('timer non libéré');
  if (win.localStorage.getItem('pianoV2.timer')) throw new Error('chrono persistant non effacé');
});
call('séance : durée corrigée à la main', () => {
  win.beginSession(); win.stopSession();
  win.document.getElementById('end-min').value = '45';
  win.commitSession(3);
  if (win.sessionSeconds(S.sessions[S.sessions.length - 1]) !== 2700) throw new Error('correction de durée ignorée');
});
call('séance : abandon', () => {
  const before = S.sessions.length;
  win.beginSession(); win.stopSession(); win.discardSession(); win._runConfirm();
  if (S.sessions.length !== before || win.__T()) throw new Error('abandon incorrect');
});
call('séance : reprise après rechargement', () => {
  win.localStorage.setItem('pianoV2.timer', JSON.stringify({ start: Date.now() - 300000, acc: 0, since: Date.now() - 300000, focus: null, recIds: [] }));
  if (!win.resumeStoredSession()) throw new Error('reprise refusée');
  if (Math.round(win.elapsed()) < 299) throw new Error('temps perdu à la reprise');
  win.stopSession(); win.discardSession(); win._runConfirm();
});

// 4) Carnet.
call('carnet : détail, édition, séance oubliée, suppression', () => {
  win.go('carnet');
  win.sessionDetail('s1'); win.sessionDetail('s3');
  win.sessionEditSheet('s1');
  win.document.getElementById('a-min').value = '60';
  win.saveSessionEdit('s1');
  const s1 = S.sessions.find(s => s.id === 's1');
  if (win.sessionSeconds(s1) !== 3600 || s1.blocks.length !== 2) throw new Error('édition au prorata incorrecte');
  const before = S.sessions.length;
  win.sessionEditSheet(); win.document.getElementById('a-min').value = '20'; win.saveSessionEdit('');
  if (S.sessions.length !== before + 1) throw new Error('séance oubliée non ajoutée');
  win.deleteSession('s2'); win._runConfirm();
  if (S.sessions.some(s => s.id === 's2')) throw new Error('suppression sans effet');
  win.recordingsSheet(); win.closeSheet();
});

// 5) Parcours, succès, réglages.
call('parcours + dépliants + succès', () => {
  win.go('parcours'); win.toggleParc('rangs'); win.toggleParc('succes');
  const ach = win.achievements();
  if (ach.length < 25) throw new Error('catalogue de succès trop court');
  if (!ach.find(a => a.id === 'foc1').on) throw new Error('succès « situation » non débloqué');
  if (!ach.find(a => a.id === 'rec1').on) throw new Error('succès « enregistrement » non débloqué');
});
call('réglages : objectif + tolérance + prénom', () => {
  win.go('settings');
  win.goalSheet(); win.goalStep(5); win.saveGoal();
  if (S.settings.dailyGoal !== 35) throw new Error('objectif non enregistré');
  win.setTol(2); if (S.settings.tolerance !== 2) throw new Error('tolérance non enregistrée');
  win.editName(); win.document.getElementById('un').value = ''; win.saveName();
  if (S.settings.userName !== null) throw new Error('prénom vide non accepté');
  win.aboutSheet(); win.closeSheet();
  win.go('home');
});

// 6) Écriture immédiate puis réinitialisation (→ bienvenue).
try { await win.__flush(); } catch (e) { onError('saveNow (flush)', e); }
try {
  await win.doReset();
  const S2 = win.__S();
  if (S2.sessions.length || S2.onboarded) fails.push('réinitialisation incomplète');
  if (!win.document.getElementById('sheet-bg').classList.contains('show')) fails.push('bienvenue non affichée après réinitialisation');
  win.welcomeStep(2); win.wGoalStep(10); win.finishWelcome();
  if (!win.__S().onboarded || win.__S().settings.dailyGoal !== 30) fails.push('bienvenue : objectif/onboarded incorrects');
} catch (e) { onError('doReset/bienvenue', e); }

// 7) Bilan.
if (fails.length) {
  console.error(`\n✗ ${fails.length} échec(s) :`);
  fails.forEach(f => console.error('  - ' + f));
  process.exit(1);
} else {
  console.log('✓ Test fumée OK — aucune erreur runtime sur les fonctions clés.');
}
