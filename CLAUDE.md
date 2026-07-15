# CLAUDE.md — Application piano (mémoire de projet)

> Lu automatiquement par Claude Code à chaque session. Garder ce fichier **court et à jour**.
> But : que tu n'aies jamais à ré-expliquer le projet (économie de tokens).

## Le projet en une phrase
App mobile **personnelle** de pratique du piano : chronométrer et suivre ses séances, tenir un
carnet de travail, et se motiver par la gamification. Cible : iPhone (PWA installée), **100 % hors-ligne**.

## Nature technique
- **PWA en JavaScript pur** (pas de framework, **pas d'étape de build**). Fichiers statiques.
- Stockage **local** : `localStorage`, clé `pianoV2`, via `load()` / `save()`.
- Langue de l'interface : **français**. Ton sobre, haut de gamme.

## Fichiers
- `index.html` — squelette + **tous les styles CSS** (`<style>`) + conteneurs d'écrans (`#s-*`) + tab bar + fonts Google.
- `app.js` — **toute la logique et le rendu** (~2000 lignes, un seul fichier pour l'instant).
- `opus.js` — base de compositeurs (7 favoris avec id, ~100 en tout) + helpers API Open Opus.
- `sw.js` — service worker (cache hors-ligne). **Incrémenter `CACHE` à chaque release** (`piano-v2-N`).
- `manifest.webmanifest`, `icon-180/192/512.png`.

## Lancer / tester
- Ouvrir `index.html` dans un navigateur. Les fonctions PWA (service worker, install, stockage
  persistant) exigent du **HTTPS** (ou `localhost`) — une IP `http://` ne suffit pas.
- **Vérif syntaxe** : `node --check app.js`.
- **Test fumée** (recommandé après chaque changement) : charger `index.html` sous `jsdom` en inlinant
  `opus.js` + `app.js`, exécuter les fonctions clés (`go`, `startSheet`/`beginSession`/`commitSession`,
  `renderRep`, etc.) et vérifier `aucune erreur runtime`. (Pattern déjà utilisé pendant le dev.)
- **À chaque release** : incrémenter `CACHE` dans `sw.js`, sinon l'app installée garde l'ancienne version.

## Architecture (conventions)
- État global unique `S` (objet) → `localStorage`. `save()` après chaque mutation.
- Chaque écran a une fonction `renderX()` qui construit `innerHTML` de `#s-x`.
- Navigation : `go(name)` — écrans : `home, session, carnet, rep, voyage, stats, settings`.
  `FULL={session,settings}` masquent la tab bar.
- Feuilles (modales bas d'écran) : `openSheet(html)` / `closeSheet()`.
- Toujours échapper le texte utilisateur avec `esc()`.
- **Éditer de façon ciblée** (petits diffs), ne pas réécrire des fichiers entiers.

## Modèle de données (S)
- `pieces[]` : `{id,title,composer,epoch,opus,genre,key,diff(Henle 1–9),status(active|mastered|archived|abandoned),bpm,progress(0–100),tags[],notes[{id,date,section,text}],todo,createdAt,masteredAt,isEnsemble?,parentId?}`
- `sessions[]` : `{id,date,mode(chrono|minuteur|guided|concert),goal,feeling(pp|p|mf|f|ff),blocks[{piece|'__improv__',sec}],entries[{piece,worked,next}],ts,concert?}`
- `wishlist[]`, `journal{date:{mood,energy}}`, `opusCache{composer:[works]}`
- `challenges{week,month,log[]}`, `settings{tolerance,dailyGoal,weeklyTime,weeklyDays,monthly,revisionDays,estimates,notif{},theme,nas{}}`
- Divers : `lastReportSeen`, `lastBackup`, `opusSyncedAt`.

## Design tokens (dans `index.html :root`)
Fond `#191A1B` · surface `#242833` · surface haute `#2E3242` · bordure `#515060` · texte2 `#8B8798`
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
- **Incrémenter `CACHE` (sw.js) à chaque release.**
- Les données sont **liées à l'origine (l'URL)** : changer d'hébergement = stockage vide → **exporter le JSON avant, réimporter après**.
- Difficulté = **Henle 1–9**. Ressenti/humeur/énergie = **nuances pp–ff**. **Pas de boutique**.
- Pas d'emoji dans l'UI (sauf rares exceptions déjà en place). Français partout.

## État & feuille de route
- **Fait** : v3 complète (séances, carnet par morceau, répertoire trié/filtré/tags, base compositeurs,
  Voyage/Notes/succès/défis, Jardin, cartes, intervalles, plan guidé, simulation concert, rapport hebdo,
  révision, avancement/maturité, filet de sauvegarde JSON).
- **À faire (ordre conseillé)** : (1) mettre sous **Git** ; (2) sauvegarde **auto vers NAS Synology** +
  passage à **IndexedDB** ; (3) synchro **iPhone/iPad** ; (4) finitions (onboarding, frise de maturité
  visuelle, accessibilité) ; (5) éventuellement **migration React+TS+Vite** ou app **SwiftUI** native.

## Stratégie de modèles (économie de crédit)
- **Sonnet 5 par défaut** pour coder au quotidien.
- **Opus 4.8** seulement pour l'architecture / débogage difficile / gros plans (ex. IndexedDB, synchro).
- **Haiku 4.5** pour le trivial (libellés, CSS, commits).
- Planifier en Opus, exécuter en Sonnet. Changer avec `/model`.
- Contexte minimal : laisser Claude Code lire **seulement** les fichiers utiles ; ne pas coller tout `app.js`.
- Après un changement : mettre **ce fichier à jour** s'il devient obsolète.
