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
- Versionnage affiché : **Bêta 3.N** (cycle V3) puis **Bêta 4.N** (`piano-b4-N`) dès le premier
  lot du cycle V4, synchronisé avec `CACHE` dans `sw.js`.

## Fichiers
- `index.html` — squelette + **tous les styles CSS** (`<style>`) + conteneurs d'écrans (`#s-*`) + tab bar + fonts Google.
- `js/` — **toute la logique et le rendu**, découpée en modules `<script>` **classiques** (pas d'ES
  modules, pas de build). L'ancien `app.js` monolithique (~2130 lignes) a été scindé par domaine
  (Lot E). **Ordre de chargement impératif** (déclaré dans `index.html`, miroir dans `sw.js` et
  `test.mjs`) : `opus.js` → `state.js` → `ui.js` → `home.js` → `session.js` → `carnet.js` →
  `repertoire.js` → `piece-detail.js` → `voyage.js` → `stats.js` → `settings.js` → `gamification.js`
  → `plan.js` → **`boot.js` (toujours en dernier)**.
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
    `voyage.js` = écran Voyage ; `stats.js` = Stats + aperçus + rétrospective ; `settings.js` =
    réglages + export/import ; `gamification.js` = notes/succès/défis + cartes/Jardin/célébrations +
    révision ; `plan.js` = plan guidé + concert + rapports + notifications ; `boot.js` = démarrage.
- `opus.js` — base de compositeurs (7 favoris avec id, ~100 en tout) + helpers API Open Opus. **Dans `js/`.**
- `sw.js` — service worker (cache hors-ligne), **à la racine** (portée = son emplacement). **Incrémenter
  `CACHE` à chaque release** (`piano-b3-N`) ; `ASSETS` liste les 14 fichiers `./js/*.js`.
- `manifest.webmanifest`, `icon-180/192/512.png`.

## Lancer / tester
- Ouvrir `index.html` dans un navigateur. Les fonctions PWA (service worker, install, stockage
  persistant, IndexedDB) exigent du **HTTPS** (ou `localhost`) — une IP `http://` ne suffit pas.
- **Vérif syntaxe** : `node --check js/<fichier>.js` (par fichier ; chaque module doit parser seul).
- **Test fumée** (recommandé après chaque changement) : `npm test` — charge `index.html` sous `jsdom`
  (avec `fake-indexeddb` injecté, `jsdom` n'a pas IndexedDB nativement) en inlinant les 14 fichiers
  `js/*.js` **concaténés dans l'ordre de chargement** (voir `FILES` dans `test.mjs`) en un seul
  `<script>`, attend la fin du boot asynchrone (`await window.__ready()`), exécute les fonctions clés
  (`go`, `startSheet`/`beginSession`/`commitSession`, `renderRep`, etc.), vérifie la migration
  localStorage → IndexedDB et `aucune erreur runtime`.
- **À chaque release** : incrémenter `CACHE` dans `sw.js` **et** `APP_VERSION` dans `js/state.js`
  (même numéro, ex. `piano-b3-11` / `'Bêta 3.11'`), sinon l'app installée garde l'ancienne version.

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
  - **Sections & mesures (V3 étape 2)** : `bars` (nb de mesures, facultatif) + `sections[] = {id,name,from,to,todo,status(new|wip|poli|ok),bpm:[{d,v}],diff?(1–4)}`, **entièrement facultatif** — une pièce sans section se comporte comme avant (avancement manuel ±10). Dès que `bars` et au moins une section existent, `hasDerivedProgress(p)` devient vrai et `pieceProgress(p)` **remplace** `p.progress` partout (phase, estimation, tri du plan guidé) : seules les mesures des sections `ok` comptent (`barsOk`, union par rang pour éviter les doubles comptages en cas de chevauchement — `sectionRankArr`). `hist[] = {d,m}` journalise les mesures au point (un point par jour joué ou modifié, `recordHist`) → mini-courbe (`renderHistCurve`, pas de courbe de tempo). Carte visuelle de couverture (`renderMap`/`mapSegments`, trous = `coverageGaps`). Tempo = **saisie manuelle uniquement**, stocké par section (`sec.bpm[]`), jamais de métronome. Découpage assisté = `cutSheet`/`applyCut` (raccourci en mesures régulières) ou assistant pas-à-pas `startCutWizard` (V4-1, voir « État & feuille de route »). Suggestion « à travailler aujourd'hui » = section non `ok` la moins récemment travaillée (`pickTodaySection`, dérivé de `sessions[].entries[].sections`). Rappel en séance = ligne « Pas au point : … » (`sectionsReminderLine`). Carnet de fin de séance = bloc replié « Sections travaillées » (chips + avancer d'un cran + bpm optionnel). **Difficulté ressentie (V4-1)** : `sec.diff` ∈ 1–4 (Facile/Moyen/Difficile/Très difficile, `DIFF_LABELS`/`secDiffLabel`), facultative, purement indicative en V4-1 (n'influence ni tri ni suggestions — c'est le périmètre de V4-2).
- `sessions[]` : `{id,date,mode(chrono|minuteur|guided|concert),goal,feeling(pp|p|mf|f|ff),blocks[{piece|'__improv__',sec}],entries[{piece,worked,next}],ts,concert?,interval?}`
  — `interval` (bool, facultatif) : vrai si la séance était en pratique fractionnée 25/5 ; sert à
  `fractionedInsight()` (étape 5). Absent sur les séances antérieures et les séances a posteriori
  (traité comme faux).
- `journal{date:{mood,energy}}` — capturé en **fin de séance** (`carnetSheet`, bloc repliable « facultatif » sous le ressenti), pas d'écran dédié. `opusCache{composer:[works]}`.
  (`wishlist[]` **fusionnée** dans `pieces` via `status:'wishlist'` — migration auto dans `migrate()`, tableau conservé vide. Accessible uniquement via le filtre « Apprendre » du Répertoire.)
- `challenges{week,month,log[]}`, `settings{tolerance,dailyGoal,weeklyTime,weeklyDays,monthly,revisionDays,estimates,notif{…,monthly},theme,nas{}}`. `weeklyTime`/`monthly` peuvent être `null` (« non défini » → alerte accueil).
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
     localStorage (miroir conservé, `LS_MIRROR`), export/import JSON adapté (`saveNow()` avant le
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
  5. ✅ **Bilans & insights** (Stats, section « Aperçus ») : trois croisements sobres, chacun affiché
     seulement si le seuil de confiance est atteint (sinon rien plutôt qu'une phrase creuse) —
     ressenti moyen par moment de la journée (`momentInsight`, ≥3 séances par créneau, écart ≥0.6 sur
     l'échelle pp–ff), stagnation (`stagnantPieces`/`stagnationInsight`, mesures « au point » figées
     depuis ≥3 semaines malgré des séances récentes), fractionné vs continu (`fractionedInsight`,
     ≥3 séances de chaque, écart ≥0.5). **Rétrospective annuelle** (`yearRetroSheet`, chips par année
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
    `diff`, `node --check` par fichier, `npm test` et chargement réel navigateur). **Restent** :
    revérifier sur iPhone le correctif écran-verrouillé de la Bêta 3.12 (audio validé par ailleurs),
    retrait `LS_MIRROR`.

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

- **Cycle V4 « Compagnon » (validé 2026-07-20) — EN COURS** : périmètre « pratique pure »
  (aucun chantier technique lourd). 5 lots = Bêta 4.1 → 4.5, **détail + prompts dans
  `ROADMAP-V4.md`** : V4-1 difficulté par section (`sec.diff` 1–4, facultatif) + assistant de
  découpage pas-à-pas ; V4-2 exploitation de la difficulté (suggestions/tri/estimation/consignes,
  travail « du plus dur au plus facile ») ; V4-3 plan guidé v2 (générateur durée 30–90 min +
  nb de pièces + intention, timeline de blocs en séance) ; V4-4 mode vacances (série gelée,
  séances « loin du clavier » `mode:'away'` comptées à part, plan de reprise) ; V4-5 polish +
  QA + dettes (retrait `LS_MIRROR`, checklist iPhone). UI : tokens et discipline chromatique
  Récital inchangés ; 3 composants nouveaux seulement (stepper, timeline de séance, bannière
  d'état). Maquette à valider avant de coder pour V4-1 et V4-3.
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

- **Reporté en V5+** : thème clair « Nacre » ; **sauvegarde auto vers NAS Synology** (on reste
  sur GitHub Pages quelques mois) ; synchro multi-appareils ; éventuelle migration React+TS+Vite
  ou app SwiftUI native ; push iOS réel (serveur VAPID).

## Stratégie de modèles (économie de crédit)
- **Sonnet 5 par défaut** pour coder au quotidien.
- **Opus 4.8** seulement pour l'architecture / débogage difficile / gros plans (ex. IndexedDB, synchro).
- **Haiku 4.5** pour le trivial (libellés, CSS, commits).
- Planifier en Opus, exécuter en Sonnet. Changer avec `/model`.
- Contexte minimal : laisser Claude Code lire **seulement** les fichiers utiles ; ne pas coller tout `app.js`.
- Après un changement : mettre **ce fichier à jour** s'il devient obsolète.
