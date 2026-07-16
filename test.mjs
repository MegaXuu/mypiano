/* ==========================================================================
   Test fumée — charge l'app sous jsdom et exerce les fonctions clés.
   Objectif : attraper les erreurs runtime (pas de vérif métier fine).
   Lancer :  npm test           (après « npm install » une première fois)

   Note : dans app.js, l'état `let S` n'est PAS une propriété de window.
   On seed donc via localStorage AVANT l'exécution (c'est loadState() qui migre
   depuis là au premier boot), et on lit l'état via un petit accesseur
   window.__S injecté après app.js. Le boot est désormais asynchrone
   (IndexedDB) : window.__ready renvoie la promesse de boot, window.__flush
   force l'écriture disque avant qu'on aille inspecter IndexedDB directement.
   jsdom n'implémente pas IndexedDB → on injecte fake-indexeddb.
   ========================================================================== */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

const root = new URL('.', import.meta.url).pathname;
const read = f => readFileSync(root + f, 'utf8');

// Inline opus.js + app.js, puis des accesseurs (partage le scope lexical).
const html = read('index.html')
  .replace('<script src="opus.js"></script>', `<script>${read('opus.js')}</script>`)
  .replace('<script src="app.js"></script>',  `<script>${read('app.js')}</script>\n<script>window.__S=function(){return S;};window.__ready=function(){return READY;};window.__flush=function(){return saveNow();};</script>`);

const now = Date.now();
const seed = {
  pieces: [
    { id: 'a1', title: 'Nocturne op. 9 no 2', composer: 'Chopin', epoch: 'Romantique', diff: 6, status: 'active', progress: 20, tags: ['concert'], notes: [{ id: 'n1', date: '2026-07-10', section: 'mes. 1-8', text: 'Legato' }], createdAt: now - 40 * 864e5 },
    { id: 'a2', title: 'Clair de lune', composer: 'Debussy', diff: 7, status: 'active', progress: 55, notes: [], createdAt: now - 20 * 864e5 },
    { id: 'a3', title: 'Gymnopédie no 1', composer: 'Satie', diff: 3, status: 'mastered', progress: 100, masteredAt: now - 60 * 864e5, notes: [], createdAt: now - 120 * 864e5 },
    { id: 'a4', title: 'Fantaisie-Impromptu', composer: 'Chopin', diff: 8, status: 'active', progress: 0, bars: 50, notes: [], createdAt: now - 30 * 864e5,
      sections: [
        { id: 'sec1', name: 'Ouverture', from: 1, to: 20, todo: '', status: 'wip', bpm: [{ d: '2026-07-01', v: 70 }, { d: '2026-07-08', v: 80 }] },
        { id: 'sec2', name: 'Coda', from: 21, to: 50, todo: 'Ralentir', status: 'ok', bpm: [] },
      ],
      hist: [{ d: '2026-06-20', m: 0 }, { d: '2026-06-27', m: 10 }, { d: '2026-07-04', m: 20 }, { d: '2026-07-11', m: 30 }] },
    { id: 'a5', title: 'Étude sans section', composer: 'Czerny', diff: 4, status: 'active', progress: 30, notes: [], createdAt: now - 10 * 864e5 },
  ],
  sessions: [{ id: 's1', date: '2026-07-14', mode: 'chrono', blocks: [{ piece: 'a1', sec: 1200 }], entries: [], ts: now }],
  wishlist: [{ id: 'w1', title: 'La Campanella', composer: 'Liszt' }],
  journal: {}, opusCache: {}, challenges: { week: null, month: null, log: [] },
  settings: {},
};

const fails = [];
const onError = (label, e) => fails.push(`${label} → ${e && e.message ? e.message : e}`);

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: 'http://localhost/',
  beforeParse(win) {
    // Réseau coupé + hors-ligne : pas d'appel Open Opus pendant le test.
    win.fetch = () => Promise.reject(new Error('offline (test)'));
    Object.defineProperty(win.navigator, 'onLine', { get: () => false });
    // jsdom n'implémente pas IndexedDB : on injecte fake-indexeddb (même instance
    // que celle importée ci-dessus dans ce script, pour pouvoir l'inspecter après boot).
    win.indexedDB = indexedDB;
    win.IDBKeyRange = IDBKeyRange;
    // jsdom n'implémente pas scrollTo : no-op pour éviter le bruit console.
    win.scrollTo = () => {};
    // idem pour confirm() (dialogues non implémentés en jsdom) : on approuve toujours.
    win.confirm = () => true;
    // app.js déclare une fonction globale history() (liste des séances) ;
    // en vrai navigateur elle masque sans souci window.history (vérifié),
    // mais l'objet History de jsdom est non-configurable et bloque le
    // shadowing — on le libère avant l'exécution du script.
    try { delete win.history; } catch (e) {}
    // Seed AVANT que app.js exécute load() au boot.
    win.localStorage.setItem('pianoV2', JSON.stringify(seed));
    win.addEventListener('error', e => onError('window.onerror', e.error || e.message));
  },
});

const win = dom.window;
if (typeof win.__ready === 'function') await win.__ready();
const S = typeof win.__S === 'function' ? win.__S() : undefined;

// 1) Le boot a-t-il produit un état exploitable ?
if (!S) fails.push('boot → état S inaccessible (app.js n’a pas exécuté / accesseur absent)');

// 2) Migration de la wishlist.
if (S) {
  if (S.wishlist.length !== 0) fails.push('migration → wishlist non vidée');
  if (!S.pieces.some(p => p.status === 'wishlist')) fails.push('migration → aucune pièce « à apprendre »');
}

// 2bis) Migration localStorage → IndexedDB (étape 3 V3).
function idbGetDirect(key) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('pianoV2', 1);
    req.onsuccess = () => {
      const db = req.result;
      const rq = db.transaction('state', 'readonly').objectStore('state').get(key);
      rq.onsuccess = () => resolve(rq.result);
      rq.onerror = () => reject(rq.error);
    };
    req.onerror = () => reject(req.error);
  });
}
try {
  const idbRaw = await idbGetDirect('S');
  if (!idbRaw) fails.push('IndexedDB → clé "S" absente après boot');
  else {
    const idbState = JSON.parse(idbRaw);
    if (!Array.isArray(idbState.pieces) || idbState.pieces.length !== S.pieces.length)
      fails.push('IndexedDB → nombre de pièces divergent de l’état en mémoire');
  }
  const idbMeta = await idbGetDirect('meta');
  if (!idbMeta || idbMeta.from !== 'localStorage')
    fails.push('IndexedDB → meta.from attendu "localStorage" (migration depuis le seed localStorage)');
} catch (e) {
  fails.push('IndexedDB → lecture directe en échec : ' + (e && e.message ? e.message : e));
}

// 3) Batterie d'appels : chaque fonction ne doit pas throw.
const call = (label, fn) => { try { fn(); } catch (e) { onError(label, e); } };

['home', 'carnet', 'rep', 'voyage', 'stats', 'settings'].forEach(scr =>
  call(`go('${scr}')`, () => win.go(scr))
);
call("renderRep('active')", () => win.setRep('active'));
call("renderRep('mastered')", () => win.setRep('mastered'));
call("renderRep('wishlist')", () => win.setRep('wishlist'));
call('pieceDetail(active)', () => win.pieceDetail('a1'));
call('pieceDetail(mastered)', () => win.pieceDetail('a3'));
call('piecePhase(tous)', () => S && S.pieces.forEach(p => win.piecePhase(p)));
call('findDuplicate', () => { if (!win.findDuplicate('nocturne op.9 no2', 'CHOPIN')) throw new Error('doublon non détecté'); });
call('addPieceSheet', () => win.addPieceSheet());
call('startSheet', () => win.startSheet());
call('setVoyage(sous-onglets)', () => ['voyage', 'jardin', 'succes'].forEach(t => win.setVoyage && win.setVoyage(t)));
call('lastMonthReport', () => win.lastMonthReport());

// 3bis) Sections & mesures (V3 étape 2).
call('pieceDetail(sections)', () => win.pieceDetail('a4'));
call('addSection+deleteSection', () => {
  win.addSection('a4');
  const p = S.pieces.find(x => x.id === 'a4');
  const last = p.sections[p.sections.length - 1];
  win.deleteSection('a4', last.id); // ouvre confirmSheet() (feuille, plus de confirm() natif)
  win._runConfirm(); // simule le tap sur le bouton de confirmation
  if (p.sections.some(s => s.id === last.id)) throw new Error('deleteSection n’a pas supprimé la section');
});
call('toggleSec+secBpmStep+noteSecBpm', () => {
  win.pieceDetail('a4');
  const p = S.pieces.find(x => x.id === 'a4');
  const sid = p.sections[0].id;
  win.toggleSec('a4', sid);
  win.secBpmStep(sid, 2);
  win.noteSecBpm('a4', sid);
});
call('setSecStatus', () => {
  const p = S.pieces.find(x => x.id === 'a4');
  win.setSecStatus('a4', p.sections[0].id, 'poli');
});
call('cutSheet+applyCut(pièce sans sections)', () => {
  win.cutSheet('a5');
  const barsInput = win.document.getElementById('cut-bars');
  barsInput.value = '40';
  win.paintCutPreview();
  const btns = [...win.document.querySelectorAll('#cut-seg button')];
  if (btns[1]) btns[1].click(); // « 16 mes. »
  win.applyCut('a5');
  const p = S.pieces.find(x => x.id === 'a5');
  if (!p.bars || !p.sections.length) throw new Error('découpage assisté n’a rien créé');
});
call('carnetSheet+commitSession(sections)', () => {
  // Démarre une vraie séance (fixe le `timer` interne, pas accessible depuis window autrement).
  win.quickStart('a4');
  win.stopSession(); // total < 5s → ouvre confirmSheet()
  win._runConfirm(); // simule « Enregistrer quand même » → carnetSheet() s'ouvre
  const chip = win.document.querySelector('#csec-chips-0 .chip');
  if (!chip) throw new Error('chip section introuvable dans le carnet');
  chip.click();
  const sid = chip.dataset.sid;
  const adv = win.document.getElementById('csec-adv-0-' + sid);
  if (adv) adv.click();
  const bpmInput = win.document.getElementById('cbpm-0-' + sid);
  if (bpmInput) bpmInput.value = '96';
  win.commitSession(0);
});

// 3ter) Écriture immédiate (utilisée par l'import JSON et la mise en arrière-plan).
if (typeof win.__flush === 'function') {
  try { await win.__flush(); } catch (e) { onError('saveNow (flush)', e); }
}

// 4) Bilan.
if (fails.length) {
  console.error(`\n✗ ${fails.length} échec(s) :`);
  fails.forEach(f => console.error('  - ' + f));
  process.exit(1);
} else {
  console.log('✓ Test fumée OK — aucune erreur runtime sur les fonctions clés.');
}
