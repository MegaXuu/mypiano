/* ==========================================================================
   Test fumée — charge l'app sous jsdom et exerce les fonctions clés.
   Objectif : attraper les erreurs runtime (pas de vérif métier fine).
   Lancer :  npm test           (après « npm install » une première fois)

   Note : dans app.js, l'état `let S` n'est PAS une propriété de window.
   On seed donc via localStorage AVANT l'exécution (c'est load() qui le lit),
   et on lit l'état via un petit accesseur window.__S injecté après app.js.
   ========================================================================== */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const root = new URL('.', import.meta.url).pathname;
const read = f => readFileSync(root + f, 'utf8');

// Inline opus.js + app.js, puis un accesseur d'état (partage le scope lexical).
const html = read('index.html')
  .replace('<script src="opus.js"></script>', `<script>${read('opus.js')}</script>`)
  .replace('<script src="app.js"></script>',  `<script>${read('app.js')}</script>\n<script>window.__S=function(){return S;};</script>`);

const now = Date.now();
const seed = {
  pieces: [
    { id: 'a1', title: 'Nocturne op. 9 no 2', composer: 'Chopin', epoch: 'Romantique', diff: 6, status: 'active', progress: 20, tags: ['concert'], notes: [{ id: 'n1', date: '2026-07-10', section: 'mes. 1-8', text: 'Legato' }], createdAt: now - 40 * 864e5 },
    { id: 'a2', title: 'Clair de lune', composer: 'Debussy', diff: 7, status: 'active', progress: 55, notes: [], createdAt: now - 20 * 864e5 },
    { id: 'a3', title: 'Gymnopédie no 1', composer: 'Satie', diff: 3, status: 'mastered', progress: 100, masteredAt: now - 60 * 864e5, notes: [], createdAt: now - 120 * 864e5 },
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
    // jsdom n'implémente pas scrollTo : no-op pour éviter le bruit console.
    win.scrollTo = () => {};
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
const S = typeof win.__S === 'function' ? win.__S() : undefined;

// 1) Le boot a-t-il produit un état exploitable ?
if (!S) fails.push('boot → état S inaccessible (app.js n’a pas exécuté / accesseur absent)');

// 2) Migration de la wishlist.
if (S) {
  if (S.wishlist.length !== 0) fails.push('migration → wishlist non vidée');
  if (!S.pieces.some(p => p.status === 'wishlist')) fails.push('migration → aucune pièce « à apprendre »');
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

// 4) Bilan.
if (fails.length) {
  console.error(`\n✗ ${fails.length} échec(s) :`);
  fails.forEach(f => console.error('  - ' + f));
  process.exit(1);
} else {
  console.log('✓ Test fumée OK — aucune erreur runtime sur les fonctions clés.');
}
