# CLAUDE.md — Application piano (mémoire de projet)

> Lu automatiquement par Claude Code à chaque session. Garder ce fichier **court et à jour**.
> But : que tu n'aies jamais à ré-expliquer le projet (économie de tokens).

## Le projet en une phrase
App mobile **personnelle** de pratique du piano : chronométrer et suivre ses séances, tenir un
carnet de travail, et se motiver par la gamification. Cible : iPhone (PWA installée), **100 % hors-ligne**.

## Nature technique
- **PWA en JavaScript pur** (pas de framework, **pas d'étape de build**). Fichiers statiques.
- Stockage **local** : **IndexedDB** (base `pianoV2`, stores `state` et `recordings`), clé `'S'` du
  store `state` = JSON de tout l'état, via `loadState()` / `save()` / `saveNow()`.
  `localStorage['pianoV2']` reste un **miroir** best-effort (filet de sécurité pendant le rodage,
  `LS_MIRROR` — à retirer une fois le rodage jugé suffisant, aucune échéance fixée). Voir « Architecture ».
- Langue de l'interface : **français**. Ton sobre, haut de gamme.
- Versionnage affiché : **Bêta 3.N** (cycle V3 de la feuille de route), synchronisé avec `CACHE` dans `sw.js`.

## Fichiers
- `index.html` — squelette + **tous les styles CSS** (`<style>`) + conteneurs d'écrans (`#s-*`) + tab bar + fonts Google.
- `app.js` — **toute la logique et le rendu** (~2000 lignes, un seul fichier pour l'instant).
- `opus.js` — base de compositeurs (7 favoris avec id, ~100 en tout) + helpers API Open Opus.
- `sw.js` — service worker (cache hors-ligne). **Incrémenter `CACHE` à chaque release** (`piano-b3-N`).
- `manifest.webmanifest`, `icon-180/192/512.png`.

## Lancer / tester
- Ouvrir `index.html` dans un navigateur. Les fonctions PWA (service worker, install, stockage
  persistant, IndexedDB) exigent du **HTTPS** (ou `localhost`) — une IP `http://` ne suffit pas.
- **Vérif syntaxe** : `node --check app.js`.
- **Test fumée** (recommandé après chaque changement) : `npm test` — charge `index.html` sous `jsdom`
  (avec `fake-indexeddb` injecté, `jsdom` n'a pas IndexedDB nativement) en inlinant `opus.js` + `app.js`,
  attend la fin du boot asynchrone (`await window.__ready()`), exécute les fonctions clés (`go`,
  `startSheet`/`beginSession`/`commitSession`, `renderRep`, etc.), vérifie la migration
  localStorage → IndexedDB et `aucune erreur runtime`.
- **À chaque release** : incrémenter `CACHE` dans `sw.js` **et** `APP_VERSION` dans `app.js` (même
  numéro, ex. `piano-b3-5` / `'Bêta 3.5'`), sinon l'app installée garde l'ancienne version.

## Architecture (conventions)
- État global unique `S` (objet) → IndexedDB. `save()` après chaque mutation (signature inchangée,
  42 sites d'appel) : mirror synchrone dans `localStorage`, puis écriture IndexedDB **débouncée
  150 ms** (coalesce les rafales, un seul write en vol à la fois). `saveNow()` (async, attend le
  disque) pour les moments critiques : import JSON, `visibilitychange→hidden`, `pagehide` (iOS peut
  tuer une PWA en arrière-plan sans avertir).
- Boot asynchrone : `S` vaut `defaults()` en mémoire dès le parse (jamais `null`), `boot()` charge
  l'état réel via `loadState()` puis appelle `renderHome()` ; `READY` = promesse du boot, à `await`
  dans un contexte de test. Migration one-shot : si IndexedDB est vide et `localStorage['pianoV2']`
  contient des données, elles sont importées puis IndexedDB fait autorité (`localStorage` n'est pas
  effacé, reste le miroir). Si IndexedDB est indisponible (mode privé, quota…), repli silencieux sur
  `localStorage` seul.
- **Audio (étape 4)** : store IndexedDB `recordings` (clé libre = `id`, valeur = `Blob` brut, pas de
  JSON) via `idbPutBlob`/`idbGetBlob`/`idbDelBlob` — indépendant de `state`/`S`. Capture en séance
  (`toggleRecording`, bouton ● dans `renderSession`, masqué si `!recAvailable()`) : `getUserMedia` +
  `MediaRecorder`, format choisi par `recMime()` (mp4/aac préférés pour iOS Safari, repli webm/ogg).
  Échec micro/permission/API → `toast` et abandon propre, jamais de crash. Fin d'enregistrement
  (`finishRecording`) ouvre une feuille d'auto-éval (section optionnelle + pp–ff `dynScale`-like) qui
  écrit le blob en IndexedDB et pousse la métadonnée dans `p.recordings`. Réécoute paresseuse
  (`playRecording`, un blob chargé à la demande, jamais tous d'un coup) ; URLs objet révoquées à la
  fermeture de feuille (`closeSheet`/`_recUrls`).
- Chaque écran a une fonction `renderX()` qui construit `innerHTML` de `#s-x`.
- Navigation : `go(name)` — écrans : `home, session, carnet, rep, voyage, stats, settings`.
  `FULL={session,settings}` masquent la tab bar.
- Feuilles (modales bas d'écran) : `openSheet(html)` / `closeSheet()`. Fermeture aussi par tap en
  dehors, ou par glisser vers le bas depuis la poignée (`.handle`, zone tactile pleine largeur ×
  44px même si la barre visible reste 38×4px) — Pointer Events **capturés sur la poignée elle-même**
  (pas sur la feuille, pour que `touch-action:none` s'applique bien pendant tout le geste et évite
  que le scroll natif ne batte le `transform` JS). Suivi 1:1 du doigt, fond assombri qui s'éclaircit
  proportionnellement au tiré. Fermeture si distance > ~28 % de la hauteur (plafond 120px) **ou**
  si le relâchement est rapide (vitesse calculée sur le dernier intervalle, `dt` plancher à 1 ms pour
  ne jamais rester bloqué à une vitesse nulle) — sinon rebond élastique. `openSheet` réinitialise le
  transform/transition/animation/fond résiduels à chaque ouverture.
- Toujours échapper le texte utilisateur avec `esc()`.
- **Éditer de façon ciblée** (petits diffs), ne pas réécrire des fichiers entiers.
- **Carnet** = un seul écran (pas d'onglets) : historique chronologique des séances (`renderCarnetBody`).
  Les notes par morceau vivent dans la fiche unifiée (`pieceDetail`), pas dans le Carnet.

## Modèle de données (S)
- `pieces[]` : `{id,title,composer,epoch,opus,genre,key,diff(Henle 1–9),status(wishlist|active|mastered|archived|abandoned),bpm,progress(0–100),tags[],notes[{id,date,section,text}],todo,createdAt,masteredAt,isEnsemble?,parentId?,revInterval?,bars?,sections?[],hist?[]}`
  - `revInterval` (jours, pièces `mastered` seulement) : intervalle d'entretien adaptatif, défaut
    `settings.revisionDays` (18). S'allonge (`×1.6`, plafond 120 j) sur « Toujours maîtrisée » en fin
    de séance, se réinitialise au défaut si repassée `active` (« À retravailler »). `needsRevision`/
    `revisionList` l'utilisent au lieu de l'intervalle fixe. Bouton « Réviser » (accueil) = séance
    entrelacée des 3 pièces les plus en retard (`startRevision`, réutilise `timer.plan/planIdx`).
  - **Fiche unifiée** `pieceDetail(id)` (feuille) = point d'entrée depuis le répertoire : stats, avancement (dérivé si sections, sinon ±10 manuel), notes, transitions de statut. Formulaire `pieceSheet` allégé (champs primaires + dépliant « Détails »). **Phase** dérivée `piecePhase(p)` (À apprendre / Déchiffrage / Consolidation / Polissage / Maîtrisé / À entretenir…). Anti-doublon `findDuplicate` (normalisé).
  - **Sections & mesures (V3 étape 2)** : `bars` (nb de mesures, facultatif) + `sections[] = {id,name,from,to,todo,status(new|wip|poli|ok),bpm:[{d,v}]}`, **entièrement facultatif** — une pièce sans section se comporte comme avant (avancement manuel ±10). Dès que `bars` et au moins une section existent, `hasDerivedProgress(p)` devient vrai et `pieceProgress(p)` **remplace** `p.progress` partout (phase, estimation, tri du plan guidé) : seules les mesures des sections `ok` comptent (`barsOk`, union par rang pour éviter les doubles comptages en cas de chevauchement — `sectionRankArr`). `hist[] = {d,m}` journalise les mesures au point (un point par jour joué ou modifié, `recordHist`) → mini-courbe (`renderHistCurve`, pas de courbe de tempo). Carte visuelle de couverture (`renderMap`/`mapSegments`, trous = `coverageGaps`). Tempo = **saisie manuelle uniquement**, stocké par section (`sec.bpm[]`), jamais de métronome. Découpage assisté = `cutSheet`/`applyCut` (mesures régulières ou « à la main »). Suggestion « à travailler aujourd'hui » = section non `ok` la moins récemment travaillée (`pickTodaySection`, dérivé de `sessions[].entries[].sections`). Rappel en séance = ligne « Pas au point : … » (`sectionsReminderLine`). Carnet de fin de séance = bloc replié « Sections travaillées » (chips + avancer d'un cran + bpm optionnel).
- `sessions[]` : `{id,date,mode(chrono|minuteur|guided|concert),goal,feeling(pp|p|mf|f|ff),blocks[{piece|'__improv__',sec}],entries[{piece,worked,next}],ts,concert?}`
- `journal{date:{mood,energy}}` — capturé en **fin de séance** (`carnetSheet`, bloc repliable « facultatif » sous le ressenti), pas d'écran dédié. `opusCache{composer:[works]}`.
  (`wishlist[]` **fusionnée** dans `pieces` via `status:'wishlist'` — migration auto dans `migrate()`, tableau conservé vide. Accessible uniquement via le filtre « Apprendre » du Répertoire.)
- `challenges{week,month,log[]}`, `settings{tolerance,dailyGoal,weeklyTime,weeklyDays,monthly,revisionDays,estimates,notif{…,monthly},theme,nas{}}`. `weeklyTime`/`monthly` peuvent être `null` (« non défini » → alerte accueil).
- Divers : `lastReportSeen`, `lastMonthSeen`, `lastBackup`, `opusSyncedAt`.
- **Enregistrements audio (V3 étape 4)** : `p.recordings?[] = {id,date,dur(sec),section?,bpm?(dernier bpm connu de la section au moment de l'enregistrement),feel?(pp–ff),size(octets),mime}`, **facultatif**. Le blob audio n'est **jamais** dans `S`/localStorage : il vit à part dans IndexedDB, store `recordings`, clé = `id` (voir « Architecture »). `deleteRecording` supprime la métadonnée **et** le blob.

## Design tokens (dans `index.html :root`)
Fond `#191A1B` · surface `#242833` · surface haute `#2E3242` · bordure `#515060` · texte2 `#9B97A8`
· texte clair `#B9B5C3` · texte principal `#EDEBF2` · **accent améthyste `#9E93F2`** · **or (rangs) `#E4C58A`**.
Polices : titres **Playfair Display**, interface **DM Sans**, chiffres **EB Garamond**. Minuscules de phrase.

## Gamification (repères)
- **Grand Voyage** : `STONES[]` = 18 rangs honorifiques (Apprenti → Maestro Assoluto) + couleur, seuils 10 h → 10 000 h. Icônes notes `glyphFor(i)` (♩♪♫♬𝄞). Palier via `currentStone()`.
- **Notes ♪** = prestige (pas de boutique). `baseNotes()` + succès = `notesTotal()`.
- **Succès** : `achievements()` (6 familles + Notes). **Défis** hebdo/mensuel : `WEEK_POOL/MONTH_POOL`, `checkChallenges()`.
- **Jardin** : `renderJardin()` (arbre SVG). **Cartes compositeurs** : `renderCartes()` (Bronze/Argent/Or 10/20/30).
- Écran Voyage = 4 sous-onglets : Voyage / Jardin / Défis / Cartes.

## Base de pièces (Open Opus)
- `opus.js` : `OPUS.COMPOSERS` (7 favoris avec id), `OPUS.ALL` (~100, hors-ligne), `OPUS.WORKS` (curated),
  `localSearch/worksOf/composerByName/onlineComposer/onlineWorks`.
- App : `allWorksOf`, `appLocalSearch`, `syncOpus` (télécharge et cache les œuvres des favoris), `S.opusCache`.

## Règles / pièges à connaître
- **Incrémenter `CACHE` (sw.js) à chaque release**, et synchroniser `APP_VERSION` (app.js, affiché en
  pied de page des réglages) sur le même numéro. Format : `piano-b3-N` / `'Bêta 3.N'`.
- Les données sont **liées à l'origine (l'URL)** : changer d'hébergement = stockage vide → **exporter le JSON avant, réimporter après**.
- IndexedDB est aussi lié à l'origine, comme `localStorage` — même piège, même parade (export/import JSON).
- Difficulté = **Henle 1–9**. Ressenti/humeur/énergie = **nuances pp–ff**. **Pas de boutique**.
- Pas d'emoji dans l'UI (sauf rares exceptions déjà en place). Français partout.
- **Pas de métronome** (refus explicite). Le suivi de tempo = **saisie manuelle du bpm stable**.
- Déploiement : `git push` → GitHub Pages republie (~1 min). **Incrémenter `CACHE`** sinon l'app
  installée ne voit pas la mise à jour ; ouvrir l'app 2 fois côté iPhone pour activer la nouvelle version.

## État & feuille de route
- **Fait (v2)** : séances, fiche morceau unifiée, répertoire trié/filtré/tags, base compositeurs,
  Voyage/Notes/succès/défis, Jardin, cartes, intervalles, plan guidé, simulation concert, rapport hebdo
  et mensuel, révision, avancement/maturité, filet de sauvegarde JSON, passe UX (accueil réordonné,
  Carnet à un écran, Voyage centré sur le rang courant). **Sous Git + déployé sur GitHub Pages**
  (`https://megaxuu.github.io/mypiano/`, PWA installée sur iPhone).

- **Feuille de route V3 (ordre imposé, dépendances techniques)** — étapes 2 et 3 : présenter
  plan/maquette et faire **valider avant de coder**. Détail dans le prompt Sonnet dédié.
  1. ✅ **Révision adaptative** : intervalle d'entretien par morceau (`p.revInterval`, défaut =
     `settings.revisionDays`) qui s'allonge sur « toujours maîtrisée » et se réinitialise sur
     « à retravailler » ; bouton « Réviser » = séance **entrelacée** de 3 pièces à entretenir.
  2. ✅ **Sections & mesures** (cœur v3) : `p.bars` + `p.sections[]` facultatifs (voir modèle de
     données ci-dessus), avancement dérivé des mesures « au point », carte de couverture + courbe
     de progression, découpage assisté, suggestion « à travailler aujourd'hui ». **Suivi de tempo =
     saisie manuelle du bpm stable par section, JAMAIS de métronome** (refus explicite).
  3. ✅ **Migration IndexedDB** (socle pour l'audio) : `S` en mémoire, persistance async débouncée
     (`save()`/`saveNow()`), boot async (`loadState()`/`READY`), migration one-shot depuis
     localStorage (miroir conservé, `LS_MIRROR`), export/import JSON adapté (`saveNow()` avant le
     toast), store `recordings` créé vide (prêt pour l'étape 4). `test.mjs` adapté (`fake-indexeddb`,
     `window.__ready`/`__flush`). Nommage de version : **Bêta 3.N**.
  4. ✅ **Enregistrement audio** (dépendait de 3) : bouton ● en séance (`toggleRecording`, masqué si
     l'appareil ne supporte pas `MediaRecorder`/`getUserMedia`), blob dans IndexedDB (store
     `recordings`, jamais dans `S`), rattaché à la pièce (et section si étape 2 faite) avec date/durée,
     réécoute paresseuse + suppression + taille affichée dans `pieceDetail`, auto-éval pp–ff à la fin
     de l'enregistrement. **Format à valider sur iPhone réel** (mp4/aac attendu côté Safari — non
     testé en conditions réelles, seulement le repli permission/API refusée).
  5. **Bilans & insights** : croisements (ressenti × moment, stagnation), rétrospective annuelle
     sobre ; **push iOS réel** = nécessite serveur VAPID → à valider séparément (sinon rester en
     notifications locales).

- **Reporté en V4** : **sauvegarde auto vers NAS Synology** (on reste sur GitHub Pages quelques
  mois) ; synchro multi-appareils ; éventuelle migration React+TS+Vite ou app SwiftUI native.

## Stratégie de modèles (économie de crédit)
- **Sonnet 5 par défaut** pour coder au quotidien.
- **Opus 4.8** seulement pour l'architecture / débogage difficile / gros plans (ex. IndexedDB, synchro).
- **Haiku 4.5** pour le trivial (libellés, CSS, commits).
- Planifier en Opus, exécuter en Sonnet. Changer avec `/model`.
- Contexte minimal : laisser Claude Code lire **seulement** les fichiers utiles ; ne pas coller tout `app.js`.
- Après un changement : mettre **ce fichier à jour** s'il devient obsolète.
