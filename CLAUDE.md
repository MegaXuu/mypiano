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
  `localStorage['pianoV2']` ne sert plus de miroir continu (retiré Bêta 4.5, rodage IndexedDB
  jugé suffisant) : il reste seulement la migration one-shot au boot et le repli complet si
  IndexedDB est indisponible. Voir « Architecture ».
- Langue de l'interface : **français**. Ton sobre, haut de gamme.
- Versionnage affiché : **Bêta 3.N** (cycle V3) puis **Bêta 4.N** (`piano-b4-N`) dès le premier
  lot du cycle V4, synchronisé avec `CACHE` dans `sw.js`.

## Fichiers
- `index.html` — squelette + **tous les styles CSS** (`<style>`) + conteneurs d'écrans (`#s-*`) + tab bar + fonts Google.
- `js/` — **toute la logique et le rendu**, découpée en modules `<script>` **classiques** (pas d'ES
  modules, pas de build). L'ancien `app.js` monolithique (~2130 lignes) a été scindé par domaine
  (Lot E). **Ordre de chargement impératif** (déclaré dans `index.html`, miroir dans `sw.js` et
  `test.mjs`) : `opus.js` → `state.js` → `ui.js` → `home.js` → `session.js` → `carnet.js` →
  `repertoire.js` → `piece-detail.js` → `parcours.js` → `settings.js` → `gamification.js`
  → `plan.js` → **`boot.js` (toujours en dernier)**. (13 modules `js/*.js` depuis la Bêta 5.2 :
  `voyage.js` + `stats.js` fusionnés en `parcours.js`.)
  - Les scripts classiques **partagent une portée globale unique** : `function foo()` devient
    `window.foo` (appelable depuis `onclick=` et depuis tout autre fichier) ; `let`/`const` racine
    (dont `let S`, `const READY`) sont des bindings globaux partagés et mutables entre fichiers.
    Donc **aucun export/import** ; on continue d'ajouter les fonctions au niveau racine (jamais dans
    une IIFE, sinon les `onclick=` HTML ne les voient plus).
  - **Deux seules règles d'ordre** : `state.js` en premier (socle + `S`, aucun rendu DOM), `boot.js`
    en dernier (il touche presque tout au démarrage). Entre les deux, l'ordre est libre (ces fichiers
    n'ont aucun code exécuté au chargement, uniquement des déclarations).
  - Rôle par fichier : `state.js` = constantes + IndexedDB + `defaults`/`migrate` + `S` + helpers
    purs/dérivés ; `ui.js` = navigation `go`/toast/feuilles ; `home.js` = accueil ; `session.js` =
    séance + audio + carnet de fin ; `carnet.js` = écran Carnet + notes + wishlist ; `repertoire.js`
    = liste/filtres/ajout ; `piece-detail.js` = fiche `pieceDetail` + sections/mesures + découpage ;
    `parcours.js` = écran unifié Parcours (rang + défis + activité + dépliants) + Stats/aperçus/
    rétrospective (fusion Voyage+Stats, V5-2) ; `settings.js` =
    réglages + profil (`userName`) + export/import + partage/à propos/réinitialisation (V5-3) ;
    `gamification.js` = notes/succès (~98)/défis + cartes/célébrations +
    révision ; `plan.js` = plan guidé + concert + rapports + notifications ; `boot.js` = démarrage
    + premier lancement (`maybeWelcome`, feuille de bienvenue sur état vierge, V5-3).
- `opus.js` — base de compositeurs (7 favoris avec id, ~100 en tout) + helpers API Open Opus. **Dans `js/`.**
- `sw.js` — service worker (cache hors-ligne), **à la racine** (portée = son emplacement). **Incrémenter
  `CACHE` à chaque release** (`piano-b3-N`) ; `ASSETS` liste les 13 fichiers `./js/*.js`.
- `manifest.webmanifest`, `icon-180/192/512.png`.

## Lancer / tester
- Ouvrir `index.html` dans un navigateur. Les fonctions PWA (service worker, install, stockage
  persistant, IndexedDB) exigent du **HTTPS** (ou `localhost`) — une IP `http://` ne suffit pas.
- **Vérif syntaxe** : `node --check js/<fichier>.js` (par fichier ; chaque module doit parser seul).
- **Test fumée** (recommandé après chaque changement) : `npm test` — charge `index.html` sous `jsdom`
  (avec `fake-indexeddb` injecté, `jsdom` n'a pas IndexedDB nativement) en inlinant les 13 fichiers
  `js/*.js` **concaténés dans l'ordre de chargement** (voir `FILES` dans `test.mjs`) en un seul
  `<script>`, attend la fin du boot asynchrone (`await window.__ready()`), exécute les fonctions clés
  (`go`, `startSheet`/`beginSession`/`commitSession`, `renderRep`, etc.), vérifie la migration
  localStorage → IndexedDB et `aucune erreur runtime`.
- **À chaque release** : incrémenter `CACHE` dans `sw.js` **et** `APP_VERSION` dans `js/state.js`
  (même numéro, ex. `piano-b3-11` / `'Bêta 3.11'`), sinon l'app installée garde l'ancienne version.

## Architecture (conventions)
- État global unique `S` (objet) → IndexedDB. `save()` après chaque mutation (signature inchangée,
  42 sites d'appel) : écriture IndexedDB **débouncée 150 ms** (coalesce les rafales, un seul write
  en vol à la fois). Plus de miroir `localStorage` continu depuis la Bêta 4.5 (rodage IndexedDB
  jugé suffisant) : `mirrorLS()` n'écrit dans `localStorage` que si IndexedDB est indisponible
  (mode privé, quota…), auquel cas c'est lui qui fait autorité. `saveNow()` (async, attend le
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
- Navigation : `go(name)` — écrans : `home, session, carnet, rep, parcours, settings`.
  Tab bar à **4 onglets** (Accueil · Carnet · Répertoire · Parcours, V5-2). Alias hérités
  `go('voyage')`/`go('stats')` → `'parcours'`. `FULL={session,settings}` masquent la tab bar.
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
  - **Sections & mesures (V3 étape 2)** : `bars` (nb de mesures, facultatif) + `sections[] = {id,name,from,to,todo,status(new|wip|poli|ok),bpm:[{d,v}],diff?(1–4)}`, **entièrement facultatif** — une pièce sans section se comporte comme avant (avancement manuel ±10). Dès que `bars` et au moins une section existent, `hasDerivedProgress(p)` devient vrai et `pieceProgress(p)` **remplace** `p.progress` partout (phase, estimation, tri du plan guidé) : seules les mesures des sections `ok` comptent (`barsOk`, union par rang pour éviter les doubles comptages en cas de chevauchement — `sectionRankArr`). `hist[] = {d,m}` journalise les mesures au point (un point par jour joué ou modifié, `recordHist`) → mini-courbe (`renderHistCurve`, pas de courbe de tempo). Carte visuelle de couverture (`renderMap`/`mapSegments`, trous = `coverageGaps`). Tempo = **saisie manuelle uniquement**, stocké par section (`sec.bpm[]`), jamais de métronome. Découpage assisté = `cutSheet`/`applyCut` (raccourci en mesures régulières) ou assistant pas-à-pas `startCutWizard` (V4-1, voir « État & feuille de route »). Suggestion « à travailler aujourd'hui » = section non `ok` la moins récemment travaillée (`pickTodaySection`, dérivé de `sessions[].entries[].sections`). Rappel en séance = ligne « Pas au point : … » (`sectionsReminderLine`). Carnet de fin de séance = bloc replié « Sections travaillées » (chips + avancer d'un cran + bpm optionnel). **Difficulté ressentie (V4-1)** : `sec.diff` ∈ 1–4 (Facile/Moyen/Difficile/Très difficile, `DIFF_LABELS`/`secDiffLabel`), facultative, purement indicative en V4-1 (n'influence ni tri ni suggestions — c'est le périmètre de V4-2).
- `sessions[]` : `{id,date,mode(chrono|minuteur|guided|concert|away),goal,feeling(pp|p|mf|f|ff),blocks[{piece|'__improv__'|'',sec}],entries[{piece,worked,next}],ts,concert?,awayKind?,section?}`
  — `interval` (bool) : champ **hérité et mort** depuis la Bêta 5.1 (retrait du fractionné 25/5,
  V5-1). Il subsiste sur d'anciennes séances mais n'est plus écrit ni lu nulle part (aucune
  migration). `mode:'away'` (V4-4, mode vacances) : séance « loin du clavier »
  (`awayKind` ∈ `ecoute|lecture|mental`, `section` = id de section optionnel), journalisée via
  `blocks` comme les autres pour rester compatible avec `sessionSeconds`/le Carnet, mais **comptée
  à part** — `playSessions()` (`js/state.js`) exclut ces séances de tous les agrégats de jeu
  (`secondsOnDay`/`totalSeconds`/`pieceSeconds`/`practiceDays`/`pieceSessionCount` et, en aval,
  série, notes, records, achievements, stats Répertoire, rapports hebdo/mensuel) ; `awaySessions()`
  les isole. Visibles au Carnet avec un badge dédié (`awayTitle`/`awayDetailSheet`,
  `js/session.js`/`js/carnet.js`), hors du sous-total temps/jours de la semaine.
- `journal{date:{mood,energy}}` — capturé en **fin de séance** (`carnetSheet`, bloc repliable « facultatif » sous le ressenti), pas d'écran dédié. `opusCache{composer:[works]}`.
  (`wishlist[]` **fusionnée** dans `pieces` via `status:'wishlist'` — migration auto dans `migrate()`, tableau conservé vide. Accessible uniquement via le filtre « Apprendre » du Répertoire.)
- `challenges{week,month,log[]}`, `settings{userName,tolerance,dailyGoal,weeklyTime,weeklyDays,monthly,revisionDays,estimates,notif{…,monthly},theme,nas{},planPrefs{dur,n,intent}}`. `weeklyTime`/`monthly` peuvent être `null` (« non défini » → alerte accueil). `planPrefs` (V4-3) mémorise les derniers réglages de la feuille de composition du plan guidé. `userName` (V5-3, défaut `null`) = prénom du salut d'accueil, éditable dans Réglages → Profil (jamais de prénom en dur). `nas` (`{enabled,ip,last}`) est un **champ mort** depuis V5-3 : conservé pour la compat des exports, **plus aucune UI** (bloc « Sauvegarde NAS » retiré).
- `onboarded` (bool, racine de `S`, V5-3) : marqueur de premier lancement. `false` par défaut ; la feuille de bienvenue (`maybeWelcome`, `js/boot.js`) ne s'ouvre que si `!onboarded` **et** aucune pièce ni séance, puis le passe à `true` (jamais revue ensuite). Migration : `true` d'office dès qu'il existe des données, pour ne pas l'imposer à l'installation actuelle. `doReset` (`js/settings.js`) le remet à `false` → re-bienvenue.
- `vacation{on,from,until,resumedAt}` (V4-4, mode vacances) : `from`/`until` (dates, `until`
  facultative) délimitent la période gelée — conservées après la reprise (`on:false`) pour que
  `isVacationDay(k)` reste vraie rétroactivement sur cette période (gel de série historique,
  `computeStreak`/`bestStreak`/`bestStreakInYear`, `js/state.js`). `resumedAt` (date) déclenche
  l'objectif adouci ~7 jours (`todayGoal()`/`softenedGoalActive()`, facteur 0.6 arrondi au multiple
  de 5). Pendant la pause (`vacationActive()`) : `needsRevision`/`revisionList` vides, alertes
  d'accueil neutralisées (`homeAlertsHtml`), notifications locales coupées (`localNotify`), anneau
  d'objectif en mode « Repos ». Cycle de vie dans `js/settings.js` : `vacationSheet`/
  `activateVacation` (activation depuis Réglages → Vacances ; le lien discret d'accueil a été retiré
  en V5-4, règle « jamais deux chemins »),
  `stopVacation`/`resumeSheet` (reprise manuelle ou automatique au boot si `until` est dépassée,
  voir `js/boot.js`) — résumé de la pause + jusqu'à 3 pièces à réviser en priorité
  (`revisionList().slice(0,3)`, bouton vers `startRevision()`) puis `applyResumeSpread` décale
  `revInterval` des pièces maîtrisées de la durée de la pause (évite un mur de révisions au
  retour). Bannière d'état sur l'accueil (`vacationBannerHtml`, `js/home.js`) avec accès à la
  feuille « Loin du clavier » (`awaySheet`, `js/session.js`) — voir `sessions[]` ci-dessous pour le
  mode `'away'`.
- Divers : `lastReportSeen`, `lastMonthSeen`, `lastBackup`, `opusSyncedAt`.
- **Enregistrements audio (V3 étape 4)** : `p.recordings?[] = {id,date,dur(sec),section?,bpm?(dernier bpm connu de la section au moment de l'enregistrement),feel?(pp–ff),size(octets),mime}`, **facultatif**. Le blob audio n'est **jamais** dans `S`/localStorage : il vit à part dans IndexedDB, store `recordings`, clé = `id` (voir « Architecture »). `deleteRecording` supprime la métadonnée **et** le blob.

## Design tokens (dans `index.html :root`)
Overhaul « Récital » (Bêta 3.13–3.19, cycle terminé — voir `ROADMAP-RECITAL.md`) :
fond `--bg:#131118` (noir violacé profond) · `--bg-deep:#0C0B10` (mode scène de la séance) ·
cartes en dégradé `--surface-g:linear-gradient(180deg,#232030,#1C1926)` + liseré lumineux
(`--hairline`/`--hairline-hi`, border-top plus clair) · `--surface:#201D2A` (aplat, usages coûteux
en dégradé, ex. listes longues Carnet/Répertoire) · `--surface2:#2B2839` · bordure `--border:#515060`
· texte2 `--t2:#9A94AB` · texte clair `--tc:#C9C4D6` · texte principal `--tp:#F0EDF7` ·
**accent améthyste `--acc:#A99EF5`** (`--acc-deep:#9A8FF0`) · **or (accomplissement) `--gold:#E4C58A`**
· halos `--glow-acc`/`--glow-gold` (réservés aux boutons primaires/gold) · motion `--dur1/2/3` +
`--easeout`. Grain SVG discret (≤3 % opacité) sur le fond. Contraste AA vérifié par calcul sur tous
les fonds (`--t2` ≥ 4,91:1) — aucun ajustement de token nécessaire.
Polices : titres **Playfair Display**, interface **DM Sans**, chiffres **EB Garamond**
(variante italique `.num.it` pour les valeurs musicales). Minuscules de phrase, sauf `.eyebrow`
(petites capitales espacées, exception assumée pour les surtitres). Séparateur : `.filet`
(hairline + losange or centré, ornemental). États vides : `emptyState(text, icon, cls?)` (`js/ui.js`)
— 3 illustrations SVG au trait réutilisables (`staff`/`note`/`stand`, 1,5px, or/améthyste ~40 %),
remplace les `.empty` texte-seul (pas les micro-hints inline transitoires, qui restent sobres).
Accessibilité : `:focus-visible` global (liseré améthyste) sur boutons/onglets/chips/liens ;
`prefers-reduced-motion` coupe stagger/countUp/halo/dessin d'anneau (câblé depuis R2–R3).

### Discipline chromatique (règle d'or, tout le reste de l'app)
Améthyste = **interaction** uniquement (CTA, sélection, focus, progression en cours) · or =
**accomplissement** uniquement (rangs, records, maîtrise, célébrations) · le reste en neutres.
Exception assumée et pérenne : `PHASE_COL` (`js/state.js`) — palette catégorielle
déchiffrage/consolidation/polissage antérieure au cycle Récital, utilisée pour coder un statut
(phase d'une pièce, carte de couverture, sections), pas une accroche décorative ; de même les
niveaux de cartes compositeurs (Bronze/Argent/Or) ont leurs propres teintes de médaille.

## Gamification (repères)
- **Grand Voyage** : `STONES[]` = 18 rangs honorifiques (Apprenti → Maestro Assoluto) + couleur, seuils 10 h → 10 000 h. Icônes notes `glyphFor(i)` (♩♪♫♬𝄞). Palier via `currentStone()`.
- **Notes ♪** = prestige (pas de boutique). `baseNotes()` + succès = `notesTotal()`.
- **Succès** : `achievements()` — **~98 succès sur 16 familles** (V5-2), chacun avec `tier`
  (1 Facile / 2 Moyen / 3 Difficile, libellés `ACH_TIERS`) et une courte `desc` toujours affichée.
  Les 25 ids historiques sont conservés (pas de re-verrouillage). Les récompenses ♪ n'entrent
  **pas** dans les seuils « Notes » (`n5`/`n20`/… lisent `baseNotes()`, pas le total des succès).
  Rendu = `succesGrid()`/`succesCount()`. **Défis** hebdo/mensuel : `WEEK_POOL/MONTH_POOL`,
  `checkChallenges()`, cartes via `defisCards()`.
- **Cartes compositeurs** : `renderCartes()` (Bronze/Argent/Or 2/5/10). **Jardin retiré** (V5-2).
- Tout vit dans l'écran **Parcours** (`renderParcours`, `js/parcours.js`) : un seul écran défilant,
  sans sous-onglets — rang (`rankCardHtml`) + défis + activité visibles, puis dépliants
  (`parcFold`/`toggleParc`) Succès / Répertoire & aperçus / Cartes / Records & rétrospective.

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
  installée ne voit pas la mise à jour. Depuis la Bêta 3.16, `js/boot.js` vérifie une nouvelle
  version à chaque retour au premier plan (`reg.update()`) et recharge automatiquement dès que le
  nouveau service worker prend la main (`controllerchange`) — un simple retour à l'app suffit
  normalement ; en cas de blocage, GitHub Pages/Fastly cache les fichiers ~10 min (`Cache-Control:
  max-age=600`), donc attendre un peu avant de soupçonner autre chose côté iOS.

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
     localStorage (miroir conservé le temps du rodage, retiré depuis en Bêta 4.5), export/import JSON adapté (`saveNow()` avant le
     toast), store `recordings` créé vide (prêt pour l'étape 4). `test.mjs` adapté (`fake-indexeddb`,
     `window.__ready`/`__flush`). Nommage de version : **Bêta 3.N**.
  4. ✅ **Enregistrement audio** (dépendait de 3) : bouton ● en séance (`toggleRecording`, masqué si
     l'appareil ne supporte pas `MediaRecorder`/`getUserMedia`), blob dans IndexedDB (store
     `recordings`, jamais dans `S`), rattaché à la pièce (et section si étape 2 faite) avec date/durée,
     réécoute paresseuse + suppression + taille affichée dans `pieceDetail`, auto-éval pp–ff à la fin
     de l'enregistrement. **Validé sur iPhone réel (PWA installée, 2026-07-16)** : permission micro,
     format produit = **`audio/mp4`** (attendu), réécoute immédiate et **après fermeture/réouverture**
     (blob IndexedDB persistant), taille affichée et suppression (métadonnée + blob) — tout OK.
     **Bug trouvé + corrigé (Bêta 3.12)** : écran verrouillé pendant l'enregistrement → iOS suspend la
     captation micro mais l'app croyait enregistrer encore (chrono qui défile, durée finale mensongère).
     Correctif : `visibilitychange→hidden` **interrompt** l'enregistrement (`interruptRecording`, fige
     l'instant d'interruption pour une durée honnête) ; finalisation unique et idempotente
     (`finalizeRecording`, appelée par `onstop` ou en secours au retour au premier plan si `onstop` n'a
     pas pu se déclencher sous suspension iOS) ; feuille de fin affiche une mention si coupé par le
     verrouillage ; blob vide → abandon propre avec toast. **Le correctif reste à revérifier sur
     l'appareil après déploiement** (le comportement iOS en arrière-plan n'est pas reproductible hors
     device réel).
  5. ✅ **Bilans & insights** (Stats, section « Aperçus ») : croisements sobres, chacun affiché
     seulement si le seuil de confiance est atteint (sinon rien plutôt qu'une phrase creuse) —
     ressenti moyen par moment de la journée (`momentInsight`, ≥3 séances par créneau, écart ≥0.6 sur
     l'échelle pp–ff), stagnation (`stagnantPieces`/`stagnationInsight`, mesures « au point » figées
     depuis ≥3 semaines malgré des séances récentes). _(Le croisement fractionné vs continu
     `fractionedInsight` a été retiré en Bêta 5.1 avec le fractionné 25/5.)_
     **Rétrospective annuelle** (`yearRetroSheet`, chips par année
     sous « Rétrospective ») : temps joué, séances, plus longue série de l'année (`bestStreakInYear`),
     compositeur dominant, pièce de l'année. Notifications locales améliorées (`localNotify` : icône,
     `tag` anti-doublon, clic → focus fenêtre) — **push iOS réel toujours écarté**, nécessite un
     serveur VAPID (backend + coût d'hébergement/maintenance) ; à retrancher séparément si voulu un
     jour, sinon on reste sur les notifications locales existantes.

  **Cycle V3 : partie fonctionnelle terminée** (5/5 étapes ✅, Bêta 3.6). Il reste une **phase
  d'optimisation UI/UX** (cf. « Cycle V3 finitions (UI/UX) » ci-dessous) avant de considérer V3 pleinement close. À planifier avant de passer à V4 ci-dessous.

- **Cycle V3 finitions (UI/UX)** — Audit complet (Bêta 3.6) a défini 5 lots ordonnés, chacun = une release Bêta 3.N :
  - **Lot A (Bêta 3.7)** ✅ : wake lock en séance (`acquireWakeLock`/`releaseWakeLock`, ré-acquis sur `visibilitychange→visible` si timer actif), édition de séance non destructive (`isRichSession` : séance multi-blocs ou avec `entries` → seules date/durée éditables, durée redistribuée au prorata des blocs, récap lecture seule ; création « séance oubliée » inchangée), morceau présélectionné au démarrage (`startSheet` → `recentPieces(1)`), micro-fixes (« 1 jour de série » singulier, emojis 🖐/🎉 retirés, placeholder recherche Répertoire raccourci). Doublon ressenti Carnet vérifié : pas de duplication réelle (code + libellé une seule fois), aucun changement nécessaire.
  - **Lot B (Bêta 3.8)** ✅ : accueil réordonné (anneau compact 120 px en carte horizontale, ordre imposé
    en-tête→rang→salutation→série/notes→objectif→CTA→reprendre→plan/simulation→alertes→à faire→semaine→
    à entretenir, citation en pied de page). Tokens `--danger`/`--ok`/`--warn` (`index.html :root`,
    `--ok`/`--warn` alias de `--acc`/`--gold`, `--danger-border` via `color-mix`) ; `piecePhase()` et
    `SEC_STATUS` unifiés sur une échelle chromatique partagée (`PHASE_COL`). `confirmSheet(message,
    label, onConfirm)` (feuille sobre + bouton `.btn.danger` + Annuler) remplace les 6 `confirm()`
    destructifs (deleteSession, deleteSection, deleteRecording, deleteWish, stopSession, doImport) ; le
    7e `confirm()` (doublon détecté à la création d'une pièce) reste natif, hors périmètre. `doImport`
    garde son flux async correct (confirmation après lecture du fichier). `stopSession` sur séance très
    courte n'arrête plus le timer avant confirmation (évite un état de timer mort si la feuille est
    juste rejetée). Cibles tactiles ≥ 44 px via padding + marge négative (zone tactile étendue, taille
    visuelle inchangée) : carets compositeurs (`toggleGrp`), `.sec-car`, bouton « Suppr. » enregistrement
    (wrapper `<span>` dédié). Séance : étiquettes Pause/Fin/Rec (11 px, muted) sous les boutons ronds,
    durée d'enregistrement en cours affichée à la place du libellé « Rec » (`paintSession`,
    `_rec.startTs`) ; `toast(message, {danger:true})` pour les messages d'erreur (bordure `--danger`).
  - **Lot C (Bêta 3.9)** ✅ : Carnet (`renderCarnetBody` regroupé par semaine via `weekKey`, sous-total
    temps + jours par groupe, chips de filtre par morceau `carnetPieces`/`setCarnetFilter`, aperçu coupé
    en fin de mot `truncWord`, pagination `carnetShown`/`moreCarnet` au-delà de 60) ; Stats (`renderStats`
    découpé en 3 sous-onglets `statsTab` — Activité `renderStatsActivite`, Répertoire `renderStatsRep`
    avec Aperçus déplacé et masqué si vide, Records `renderStatsRecords` — section Historique et
    fonction `history()` supprimées) ; Répertoire (bouton unique `addChoiceSheet()` aiguillant vers
    `pieceSheet(null)`/`workSheet()`/`wishSheet()`, ligne « Enrichir la base d'œuvres » déplacée dans
    Réglages → Données via `syncOpus(true)`) ; Voyage (`renderVoyageBody` sans `scrollIntoView`, carte du
    rang en tête + liste ±3 rangs autour du rang courant, `toggleVoyageRanks()` pour déplier les 18).
  - **Lot D (Bêta 3.10)** ✅ : Jardin v2 (`renderJardin` réécrit — estampe au trait, silhouette or sur ciel
    améthyste dégradé, branches générées récursivement (`grow()`, 3 niveaux), feuillage en nuée de traits
    or/améthyste/lavande sur les extrémités de branches, fleurs = points lumineux à halo (dégradé `gloB`)
    posés en bout de branche pour les morceaux maîtrisés, collines + brume + horizon en aplats ; même
    modèle de données qu'avant — heures→croissance via `rankIdx`/`growth`, série→nombre de traits,
    maîtrises→fleurs ; croissance animée à l'ouverture via `(window.requestAnimationFrame||window.setTimeout)`,
    transform-origin en `%` sur les groupes `.jb-tree/.jb-leaf/.jb-flo`) ; Cartes (`cardLevel` recalibré
    Bronze 2/Argent 5/Or 10, `cardNext()` calcule la barre + le libellé vers le palier suivant,
    `composerSeconds()` ajoute le temps joué par compositeur sur la carte, en plus de l'époque déjà
    affichée) ; Célébrations (`celebrate(kind,title,sub)` — `kind` ∈ `rang`/`piece`/`defi`/`concert`,
    table `CELEB_KIND` pour glyphe/couleur/sur-titre, écrin unique sans confettis ni fermeture
    automatique, fermeture par bouton ou tap sur le fond ; `checkChallenges()` migré du `toast()` vers
    `celebrate('defi',…)` pour unifier les 4 occasions). CSS : keyframe `conffall` retirée (mort avec les
    confettis).
  - **Lot E** : dettes V3 existantes. ✅ **Découpage `app.js`** (Bêta 3.11) : monolithe scindé en 14
    modules `<script>` classiques dans `js/` (voir « Fichiers » — découpe byte-identique vérifiée par
    `diff`, `node --check` par fichier, `npm test` et chargement réel navigateur). Retrait de
    `LS_MIRROR` fait au Lot V4-5 (voir cycle V4 ci-dessous). **Reste** : revérifier sur iPhone le
    correctif écran-verrouillé de la Bêta 3.12 (audio validé par ailleurs).

- **Cycle V3 — Overhaul graphique « Récital » (validé 2026-07-16) — ✅ TERMINÉ (Bêta 3.19)** :
  direction « programme de concert imprimé × lumière de scène » — continuité améthyste/or + typos
  actuelles, **sombre seul** (thème clair reporté V4), motion signature riche
  (`prefers-reduced-motion` respecté). Discipline chromatique : voir section « Design tokens ».
  6 lots R1–R6 = Bêta 3.13 → 3.19, **détail + prompts dans `ROADMAP-RECITAL.md`** (R1 fondations
  tokens/composants ; R2 dock flottant + accueil ; R3 séance « mode scène » ; R4 carnet/répertoire/
  fiche ; R5 voyage/stats/réglages/célébrations ; R6 polish transversal + états vides illustrés +
  accessibilité + QA — a aussi corrigé un bug de collision de classe CSS sur la pastille de rang de
  l'accueil, voir `ROADMAP-RECITAL.md`). Les styles inline des `renderX()` ont migré vers des
  classes lot par lot ; ce qui reste est légitimement dynamique (couleurs/largeurs calculées).

- **Cycle V4 « Compagnon » (validé 2026-07-20) — ✅ TERMINÉ (Bêta 4.5)** : périmètre « pratique
  pure » (aucun chantier technique lourd). 5 lots = Bêta 4.1 → 4.5, **détail + prompts dans
  `ROADMAP-V4.md`** : V4-1 difficulté par section (`sec.diff` 1–4, facultatif) + assistant de
  découpage pas-à-pas ; V4-2 exploitation de la difficulté (suggestions/tri/estimation/consignes,
  travail « du plus dur au plus facile ») ; V4-3 plan guidé v2 (générateur durée 30–90 min +
  nb de pièces + intention, timeline de blocs en séance) ; V4-4 mode vacances (série gelée,
  séances « loin du clavier » `mode:'away'` comptées à part, plan de reprise) ; V4-5 polish +
  QA + dettes (retrait `LS_MIRROR`, checklist iPhone). UI : tokens et discipline chromatique
  Récital inchangés ; 3 composants nouveaux seulement (stepper, timeline de séance, bannière
  d'état). Maquette validée avant de coder pour V4-1 et V4-3.
  - **V4-1 (Bêta 4.1)** ✅ : `sec.diff` (1–4, facultatif) + `DIFF_LABELS`/`secDiffLabel` (`js/state.js`).
    Assistant de découpage pas-à-pas (`startCutWizard`, `js/piece-detail.js`) — remplace l'entrée
    « à la main » de `cutSheet` (les chips 8/16/32 mes. restent un raccourci) : étape mesures
    (si `p.bars` absent), étapes section par section (nom, mesures pré-remplies, chips de
    difficulté), récapitulatif (`renderMap`/`coverageGaps` sur le brouillon) qui écrit
    `p.bars`+`p.sections` d'un coup. Chips de difficulté (`.diff-chip`, 4 niveaux d'intensité
    neutre croissante + anneau améthyste de sélection, aucune couleur catégorielle) éditables
    aussi depuis `renderSecBody` (`setSecDiff`, toast sobre si la difficulté est abaissée).
    Marqueur discret (4 traits, `renderDiffMark`) sur la ligne de section repliée et double-hairline
    (`.map-hard`) sur les segments difficiles/très difficiles de la carte de couverture — jamais
    d'aplat coloré, le canal couleur reste au statut (`SEC_STATUS`).
  - **V4-2 (Bêta 4.2)** ✅ : exploitation de `sec.diff` (V4-1), aucun nouvel écran. `pickTodaySection`
    départage à fraîcheur égale par la difficulté (la plus difficile d'abord, diff absente = neutre,
    en dernier) ; sa difficulté s'affiche dans la carte « À travailler aujourd'hui » de `pieceDetail`.
    `estimateText` (temps restant estimé) pondère les mesures non « ok » par `DIFF_WEIGHT` (0.7 / 1 /
    1.5 / 2, `js/state.js`) au lieu du pourcentage brut — identique à l'ancienne formule si aucune
    diff n'est renseignée. `sectionsReminderLine` (rappel en séance) cite la section non « ok » la
    plus difficile en premier, avec son libellé entre parenthèses. `changConsigne` (plan guidé)
    adapte la consigne à la difficulté de la section du jour (très difficile → très lent/mains
    séparées/boucles courtes ; facile → consolidation/filage) quand la pièce est sectionnée, sinon
    comportement inchangé (basé sur l'avancement global).
  - **V4-3 (Bêta 4.3)** ✅ : plan guidé v2, `js/plan.js`. Feuille de composition (`planSheet`)
    remplace l'ancien plan fixe sur l'objectif du jour : durée (chips 30/45/60/75/90 min), nombre
    de pièces (stepper 1–4, défaut suggéré par la durée via `suggestPlanN`), intention (seg
    Apprendre/Consolider/Entretenir/Équilibré) ; aperçu régénéré en direct (`regenPlanPreview`),
    réglages mémorisés dans `S.settings.planPrefs`. `generatePlan(params)` : échauffement (~10 %,
    plafonné 8 min) → un bloc par pièce choisie (`pickPlanPieces`, sélection selon l'intention ;
    pour Entretenir les *n* pièces sont directement les plus en retard de `revisionList()`, pas de
    bloc « Entretien » séparé dans ce cas) → bloc Entretien unique si intention ≠ Apprendre/
    Entretenir et qu'une pièce due n'est pas déjà choisie → filage de clôture. Pièce sectionnée :
    un bloc par section non « ok », triées difficulté décroissante (`planPieceBlocks`), durée
    répartie au prorata de `DIFF_WEIGHT` (`distribute`, arrondi proportionnel + plancher) ; pièce
    non sectionnée : un bloc unique (`changConsigne`). En séance (`js/session.js`) : timeline
    discrète sous le chrono (`renderTimeline`, segments proportionnels aux durées — fait/courant/
    à venir), `prefers-reduced-motion` coupe la transition. Fin de bloc **non autoritaire** :
    `timer.blockPending` fige l'avance auto (le temps continue de courir), un encart
    (`renderBlockEnd`) propose Prolonger (+5 min sur le bloc, `extendBlock`) ou Passer/Terminer
    (`nextPlanBlock`, ce dernier appelle `stopSession` sur le dernier bloc). `carnetSheet` pré-coche
    les sections dont le bloc de plan a été atteint (`planSectionsReached`, jusqu'à `planIdx`
    inclus) dans le bloc « Sections travaillées », dépliable ouvert d'office si des sections sont
    pré-cochées. `startRevision` (bouton « Réviser » de l'accueil) inchangé, partage juste
    `startPlanSession` avec le nouveau flux.
  - **V4-4 (Bêta 4.4)** ✅ : mode vacances, `S.vacation` (voir « Modèle de données »). Bannière
    d'état en tête d'accueil (`vacationBannerHtml`, `js/home.js`) pendant la pause — série gelée
    (`isVacationDay`), anneau d'objectif en mode « Repos », alertes d'accueil neutralisées, révision
    et notifications locales suspendues. Feuille « Loin du clavier » (`awaySheet`, `js/session.js`)
    accessible depuis la bannière : 3 formes (écoute active/lecture de partition/travail mental),
    pièce et section optionnelles, journalisées `mode:'away'` — comptées à part partout
    (`playSessions()`). Activation/reprise depuis Réglages (groupe « Vacances »,
    `js/settings.js` ; lien d'accueil retiré en V5-4) ; reprise manuelle ou automatique au boot
    si la date de retour est dépassée (`js/boot.js`) ouvre `resumeSheet` (résumé de la pause,
    jusqu'à 3 révisions prioritaires, objectif adouci 7 jours, échéances de révision décalées de la
    durée de la pause). Rétrospective annuelle : ligne « + Xh loin du clavier » séparée du temps
    joué quand des séances `away` existent sur l'année (`js/stats.js`).
  - **V4-5 (Bêta 4.5)** ✅ : polish transversal + QA + dettes, aucune fonctionnalité nouvelle.
    Bug corrigé : collision de classe CSS — l'indicateur d'étapes de l'assistant de découpage
    (V4-1) réutilisait le nom `.stepper` déjà pris par le composant numérique existant (objectif
    du jour, durée de séance/minuteur, nombre de pièces du plan, durée « loin du clavier ») ;
    la règle CSS du wizard, chargée après, écrasait silencieusement `display`/`justify-content`
    et ajoutait une hairline parasite sur tous les steppers numériques. Renommé en `.cutw-steps`/
    `.cutw-step*` (`js/piece-detail.js`, `index.html`), aucun changement fonctionnel. Reste du
    cycle passé en revue (chips de difficulté, timeline de séance, bannière/reprise vacances) :
    tokens Récital et discipline chromatique respectés, cibles tactiles et `:focus-visible` déjà
    couverts par les classes partagées (`.chip`, `button`), `prefers-reduced-motion` déjà câblé
    sur la timeline — rien d'autre à corriger. Textes du cycle relus (sobres, cohérents). Retrait
    du miroir `localStorage` continu (`LS_MIRROR`, voir « Architecture ») ; audit `style="..."`
    et classes CSS mortes du cycle : rien de significatif à résorber (les rares `style=` restants
    sont des largeurs/couleurs calculées, cohérents avec le reste de l'app).
  - **Patch (Bêta 4.6)** ✅ : conformité Chang des consignes du plan guidé + micro-optimisation.
    Consignes `changConsigne`/`sectionConsigne` (`js/plan.js`) : la consigne « mains ensemble,
    monte le tempo par petits paliers » (montée graduelle du tempo) était **l'exact anti-pattern
    que Chang déconseille** (« the most frequent abuse of the metronome is to use it to ramp up
    speed ») → remplacée par « mains ensemble par courts segments, vise directement le tempo cible »
    (acquisition de vitesse par courts segments HS, pas par paliers) ; consigne « difficile »
    précisée en « mains séparées, courtes boucles, du lent au tempo cible » (cyclage lent↔cible,
    évite le piège du *slow-play only* que Chang signale aussi). Reste des consignes déjà conforme
    (difficile d'abord, mains séparées, continuité, filage « comme en concert », mémoire) ; le refus
    du métronome dans l'app est cohérent avec Chang. Optimisation : `secondsByDay()` (`js/state.js`),
    agrégat jours→secondes en **un seul balayage** des séances ; `weekSeconds`/`weekDays`/
    `lastWeekReport` ne refiltrent plus toutes les séances 7× (14 balayages complets sur l'accueil
    → 2). Aucun changement de comportement (mêmes valeurs), couvert par `npm test`.

- **Cycle V5 « Épure » (validé 2026-07-21) — ✅ TERMINÉ (Bêta 5.4)** : rendre l'app la plus
  simple et intuitive possible, principe « l'app propose, tu valides » (= moins de décisions), et
  donnable à un ami telle quelle. 4 lots = Bêta 5.1 → 5.4, **détail + prompts dans
  `ROADMAP-V5.md`** :
  - **V5-1 (Bêta 5.1)** ✅ : démarrage unifié. Un seul CTA **« Jouer »** sur l'accueil
    (`playSheet`, `js/plan.js`) + sous-titre résumant le programme composé (`planSummaryLine`).
    La feuille « Jouer » présente le plan déjà composé via `generatePlan(planPrefs)` (consigne
    sur chaque bloc), « Commencer » → `startPlanSession`, dépliant « Ajuster » (durée/nb/
    intention, aperçu live via `regenPlanPreview`, mémorisé dans `planPrefs`), et « Autrement… »
    → feuille secondaire `altSheet` (séance libre / concert ; « séance oubliée » retirée d'ici en
    V5-4, cf. ci-dessous). `startSheet`
    allégé (« Séance libre »), sans fractionné ni bouton « séance oubliée ». Retirés de
    l'accueil : grille Plan/Simulation, chips « Reprendre », section « À entretenir »
    (`startRevision` conservé pour la reprise vacances). **Fractionné 25/5 retiré partout**
    (`toggleInterval`, `timer.interval`, phases work/break, `fractionedInsight`) ; champ
    `interval` des anciennes séances laissé mort, sans migration. Répertoire vide ou vacances →
    `playSheet` ouvre directement `altSheet`. `planSheet` supprimé.
  - **V5-2 (Bêta 5.2)** ✅ : navigation aplatie. Tab bar à **4 onglets** (Accueil · Carnet ·
  Répertoire · **Parcours**). Écran **Parcours** = un seul écran défilant sans sous-onglets
  (`renderParcours`, `js/parcours.js` = fusion de `voyage.js` + `stats.js`) : héros → rang
  (dépliant ±3 / 18 rangs) → **Défis en cours** → **Activité** visibles d'emblée, puis quatre
  dépliants sobres repliés (`parcFold`/`toggleParc`) : Succès / Répertoire & aperçus / Cartes /
  Records & rétrospective. Alias `go('voyage')`/`go('stats')` → `'parcours'`. **Jardin retiré**
  (`renderJardin` + SVG + `hashStr` + CSS `.voy-jardin-*`, aucune donnée : l'arbre était dérivé).
  Trois listes miroir à jour (`index.html`, `sw.js` → 13 js, `test.mjs`). Étendu au passage :
  catalogue de succès **25 → 98** (16 familles, `tier` Facile/Moyen/Difficile + `desc` permanente,
  ids historiques conservés) — voir « Gamification ».
  - **V5-3 (Bêta 5.3)** ✅ : réglages & partage, app donnable à un ami telle quelle.
  Profil `settings.userName` (défaut `null`, migré) → salut d'accueil `userName ? 'Bonjour '
  +nom : 'Bonjour'` (`js/home.js`, plus de « Bonjour Florian » en dur) ; groupe **Profil** en
  tête des Réglages (`editName`/`saveName`, vide autorisé). Premier lancement `maybeWelcome`/
  `welcomeStep`/`finishWelcome` (`js/boot.js`) : feuille de bienvenue en 3 écrans (présentation +
  données locales / prénom + objectif / premier morceau ou explorer), **seulement sur état
  vierge** (aucune pièce ni séance), marqueur `S.onboarded` (jamais revue ensuite ; migration
  `true` si données présentes). Réglages nettoyés : bloc « Sauvegarde NAS » retiré (`settings.nas`
  reste en base, plus d'UI, `toggleNas` supprimé) ; groupe Données enrichi — `shareApp`
  (`navigator.share` de `location.origin+pathname`, repli presse-papier, aucune donnée perso),
  `aboutSheet` (données 100 % locales + conseil d'export + version), `resetSheet`/`doReset`
  (feuille en deux temps : export d'abord, puis danger → `S=defaults()` + `idbClearRecordings()`
  + `saveNow()` → accueil vierge → re-bienvenue).
  - **V5-4 (Bêta 5.4)** ✅ : élagage résiduel + polish + QA, aucune fonctionnalité nouvelle.
  Code mort restant du cycle : seule la règle CSS `.sess-halo.brk` (modificateur de la pause du
  fractionné, plus jamais appliqué) subsistait — retirée ; champ `interval` des anciennes séances
  confirmé sans lecture ni écriture nulle part. **Règle « jamais deux chemins visibles vers la même
  action »** appliquée — trois redondances retirées après validation : (1) « Séance oubliée » n'est
  plus accessible que depuis le Carnet (`aposterioriSheet`, retiré de `altSheet`) ; (2) l'objectif
  du jour ne s'édite plus que depuis Réglages (bouton « Modifier » de l'anneau d'accueil supprimé,
  avec `goalSheet`/`gStep`/`saveGoal`) ; (3) le mode vacances ne s'active plus que depuis Réglages
  (lien d'accueil supprimé ; `vacationSheet` conservé). CSS orphelin nettoyé au passage. Réglages et
  textes du cycle relus (ordre des groupes, libellés, minuscules de phrase) : rien à corriger.

- **Reporté en V6+** : carnet de fin de séance allégé (deux temps) ; refonte complète de
  l'accueil ; thème clair « Nacre » ; **sauvegarde auto vers NAS Synology** (on reste
  sur GitHub Pages quelques mois) ; synchro multi-appareils ; éventuelle migration React+TS+Vite
  ou app SwiftUI native ; push iOS réel (serveur VAPID).

## Stratégie de modèles (économie de crédit)
- **Sonnet 5 par défaut** pour coder au quotidien.
- **Opus 4.8** seulement pour l'architecture / débogage difficile / gros plans (ex. IndexedDB, synchro).
- **Haiku 4.5** pour le trivial (libellés, CSS, commits).
- Planifier en Opus, exécuter en Sonnet. Changer avec `/model`.
- Contexte minimal : laisser Claude Code lire **seulement** les fichiers utiles ; ne pas coller tout `app.js`.
- Après un changement : mettre **ce fichier à jour** s'il devient obsolète.
