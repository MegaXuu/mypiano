# CLAUDE.md — MyPiano (mémoire de projet)

> Lu automatiquement par Claude Code à chaque session. Garder ce fichier **court et à jour**.

## Le projet en une phrase
App mobile **personnelle** de pratique du piano : **un chrono avec un objectif du jour, et des
idées de méthodes de travail quand on en veut. C'est tout.** Cible : iPhone (PWA installée),
**100 % hors-ligne**. Déployée sur GitHub Pages (`https://megaxuu.github.io/mypiano/`).

## Principe directeur (V6 « Ad libitum », depuis la Bêta 6.0)
L'utilisateur avait **abandonné l'app** en V5 : trop de cadre (morceaux imposés par le plan,
découpage en sections, saisies). La V6 a tout retiré. **Ne jamais réintroduire de décision ou de
saisie obligatoire** : tout ce qui n'est pas « jouer » est facultatif. Pas de morceaux, pas de
répertoire. Détail et décisions : `ROADMAP-V6.md`. Historique V1–V5 : `ROADMAP-*.md` et git.

## Nature technique
- **PWA en JavaScript pur**, **sans build**, fichiers statiques. Interface en **français**, ton sobre.
- `index.html` = squelette + **tous les styles** (`<style>`) + écrans `#s-*` + dock + fonts Google.
- `js/` = 9 scripts **classiques** (pas d'ES modules), **ordre de chargement impératif**, miroir
  dans `index.html`, `sw.js` (`ASSETS`) et `test.mjs` (`FILES`) :
  `state.js` → `ui.js` → `methods.js` → `home.js` → `session.js` → `carnet.js` → `parcours.js`
  → `settings.js` → **`boot.js` (toujours en dernier)**.
  - Portée globale partagée : `function foo()` devient `window.foo` (appelable depuis `onclick=`),
    `let S` / `const READY` sont globaux. **Aucun export/import, jamais d'IIFE.**
  - Rôles : `state.js` = constantes, IndexedDB, `defaults`/`migrate`, `S`, helpers purs (temps,
    série, rangs) ; `ui.js` = `go`, toast, feuilles, `confirmSheet`, `celebrate`, `dynPicker` ;
    `methods.js` = catalogue `SITUATIONS`/`METHODS` + bibliothèque `methodsSheet` ; `home.js` =
    accueil + `ringSvg` ; `session.js` = chrono, fin de séance, audio ; `carnet.js` = historique,
    détail/édition, séance oubliée, enregistrements ; `parcours.js` = rang, série, calendrier,
    records, `achievements()` ; `settings.js` = réglages, export/import, réinitialisation ;
    `boot.js` = démarrage, bienvenue, service worker, sauvegarde en arrière-plan.
- `sw.js` (racine) : cache hors-ligne, cache-first. **À chaque release** : incrémenter `CACHE`
  (`piano-b6-N`) **et** `APP_VERSION` dans `js/state.js` (`'Bêta 6.N'`), sinon l'app installée
  garde l'ancienne version. `boot.js` vérifie une mise à jour à chaque retour au premier plan.

## Lancer / tester
- Serveur local : config `app` de `.claude/launch.json` (port 8137). Le service worker sert le
  cache : pour voir une modification, désinscrire le SW et vider `caches` avant de recharger.
- `npm run check` (syntaxe de chaque module) puis **`npm test`** (jsdom + fake-indexeddb, seed au
  format V5 pour vérifier la migration, parcours complet séance → carnet → parcours → réglages →
  réinitialisation).
- Déploiement : `git push` sur `main` → GitHub Pages (~1 min, cache Fastly ~10 min).

## Architecture
- État unique `S` → IndexedDB (base `pianoV2`, store `state`, clé `'S'` = JSON). `save()` après
  chaque mutation (écriture débouncée 150 ms), `saveNow()` aux moments critiques (import,
  `visibilitychange→hidden`, `pagehide`). `localStorage['pianoV2']` = migration one-shot au boot
  et repli si IndexedDB est indisponible.
- **Chrono** (`session.js`) : `timer={start,acc,since,focus,recIds,goalHit}`, temps =
  `acc + (now - since)` (horodatages, jamais d'accumulation de ticks). Persisté dans
  `localStorage['pianoV2.timer']` à chaque démarrage/pause/reprise : un rechargement ou iOS qui
  tue la PWA ramène sur la séance en cours (`resumeStoredSession` au boot). Wake lock pendant la
  séance. L'anneau vise l'objectif du jour (déjà joué ce jour + séance en cours), passe à l'or et
  vibre une fois atteint ; on continue librement.
- **Audio** : blobs dans le store IndexedDB `recordings` (clé = id), métadonnées dans
  `S.recordings[]`. Verrouillage d'écran pendant l'enregistrement → `interruptRecording` +
  `finalizeRecording` idempotente (correctif iOS de la Bêta 3.12).
- Écrans : `go(name)` — `home, session, carnet, parcours, settings` ; dock à **3 onglets**
  (Accueil · Carnet · Parcours) ; `session` et `settings` masquent le dock. Un nom d'écran inconnu
  (anciens `rep`, `voyage`…) renvoie à l'accueil.
- Feuilles : `openSheet(html)` / `closeSheet()`, fermeture au tap dehors ou au glisser depuis la
  poignée (Pointer Events capturés sur `.handle`). Confirmations destructives : `confirmSheet`.
- Toujours échapper le texte utilisateur avec `esc()`. Éditer par **petits diffs ciblés**.

## Modèle de données (S)
- `sessions[]` : `{id,date,mode,goal,feeling?(pp–ff),note?,focus?(situation),blocks[{piece,sec}],ts}`.
  Une séance V6 a un seul bloc `{piece:'',sec}` (on garde `blocks` pour la compatibilité :
  `sessionSeconds` somme les blocs). Les séances V1–V5 gardent leurs blocs par morceau,
  `entries[{worked,next}]`, etc. : affichées en lecture seule au Carnet (`legacyPieces`,
  `sessionText`). `mode:'away'` (ancien mode vacances) : visible mais **exclu du temps joué**
  (`playSessions()`).
- `recordings[]` : `{id,date,dur,feel?,size,mime,sessionId?,label?}` (`label` = titre du morceau
  pour les enregistrements migrés depuis `p.recordings`).
- `settings` : `{userName,dailyGoal(min),tolerance(0–2),focus(dernière situation)}`. Les anciens
  réglages restent stockés, sans effet.
- `onboarded` (bool) : bienvenue (`maybeWelcome`) seulement sur état vierge. `recMigrated` :
  marqueur de migration audio. `lastBackup` : rappel discret d'export sur l'accueil après 30 j.
- **Données dormantes, jamais effacées par la migration** : `pieces`, `journal`, `challenges`,
  `vacation` (ses dates gèlent encore la série sur la période passée, `isVacationDay`),
  `opusCache`… Elles restent dans l'export JSON (retour arrière possible).

## Gamification (ce qui reste)
- **Rangs** : `STONES[]` = 18 rangs au temps total (10 h → 10 000 h), `currentStone()`, célébration
  au passage de rang (`celebrate`). **Série** : `computeStreak`/`bestStreak` avec tolérance.
- **Succès** : `achievements()` = 30 jalons (régularité, volume, séances, objectif atteint,
  longueur, moments, méthodes, enregistrements), sans récompense ni points ; toast à la fin d'une
  séance qui en débloque. Retirés en V6 : notes ♪, défis, cartes compositeurs, Jardin.

## Méthodes de travail
`METHODS` (30) regroupées en 6 `SITUATIONS` (Déchiffrer, Passage difficile, Vitesse & aisance,
Mémoriser, Musicalité, Préparer un concert), inspirées de Chang. En séance : chips « Aujourd'hui
je… » (facultatif, mémorisé dans `settings.focus`) + carte qu'on fait défiler d'un tap. Accueil :
une idée du jour (`methodOfDay`) qui ouvre la bibliothèque. **Pas de métronome** (refus explicite) ;
la méthode « Lent ↔ tempo » / « Directement au tempo » suit Chang (pas de montée par paliers).

## Design « Récital » (tokens dans `index.html :root`)
Fond `--bg:#131118`, séance en `--bg-deep`, cartes `--surface-g` + liseré, texte `--tp`/`--tc`/`--t2`.
Polices : titres **Playfair Display**, interface **DM Sans**, chiffres **EB Garamond** (italique).
**Discipline chromatique** : améthyste `--acc` = interaction et progression en cours ; or `--gold`
= accomplissement (objectif atteint, rang, records, succès) ; le reste en neutres.
`prefers-reduced-motion` coupe stagger, halo et transitions d'anneau. Cibles tactiles ≥ 44 px.
Attention aux **collisions de classes** génériques (`.empty`, `.ring`…) : préfixer les nouvelles.

## Règles / pièges
- Données **liées à l'origine (URL)** : changer d'hébergement = stockage vide → exporter le JSON
  avant, réimporter après.
- Pas d'emoji dans l'UI, minuscules de phrase (sauf `.eyebrow`), français partout.
- Ressenti = nuances **pp–ff**. Pas de boutique, pas de métronome, pas de push serveur.

## Pistes écartées / plus tard
Thème clair, synchro multi-appareils, sauvegarde NAS, push iOS réel (VAPID), app native.
Ne rouvrir la question des morceaux que si l'utilisateur le demande explicitement.

## Stratégie de modèles
Sonnet par défaut pour coder ; Opus pour l'architecture et le débogage difficile ; Haiku pour le
trivial. Contexte minimal : ne lire que les fichiers utiles.
