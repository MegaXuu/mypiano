# Cycle V6 « Ad libitum » — feuille de route

> Validé en discussion le 2026-10-05. **Codé le 2026-10-05 (Bêta 6.0, branche `v6`)**, en attente de mise en ligne.
> Remplace le brouillon `ROADMAP-V6.html` (« Au pupitre »,
> 5 sept.), qui affinait l'app existante : ce cycle prend la direction inverse.

## Constat

L'app avait fini par se comporter comme un professeur exigeant : elle choisissait les morceaux,
imposait un découpage en sections et demandait des saisies. Résultat : je ne l'utilisais plus.

## Intention

**Un chrono avec un objectif, et des idées de méthodes de travail quand j'en veux. C'est tout.**
Ad libitum : je joue ce que je veux, l'app compte le temps et me souffle des pistes, sans jamais
rien imposer.

## Décisions

| Sujet | Décision |
|---|---|
| Morceaux | **Aucun.** Ni répertoire, ni fiche, ni sections, ni choix de pièce en séance. |
| Objectif | **Quotidien en minutes** (anneau), avec la **semaine** en dessous (7 barres). |
| Méthodes | Je dis, si je veux, **ce que je fais** (une « situation ») → l'app propose des méthodes adaptées. Jamais obligatoire. |
| Fin de séance | Écran court : ressenti pp–ff + note libre, **tout facultatif**, un bouton « Enregistrer ». |
| Gamification | **Partielle** : série, rangs (au temps), succès réduits, records. Retirés : notes ♪, défis, cartes compositeurs. |
| Audio | **Conservé** : bouton ● en séance, réécoute depuis le Carnet. |
| Code | Réécriture légère dans le même dépôt, **même URL** (les données restent). |

## L'app V6

**Onglets : Accueil · Carnet · Parcours** (Réglages via l'icône de l'accueil).

1. **Accueil** : salutation, anneau de l'objectif du jour, gros bouton **« Jouer »**, série,
   semaine en 7 barres et une méthode suggérée en pied de page.
2. **Séance** (plein écran, mode scène) :
   - un chrono qui monte et un anneau qui se remplit vers l'objectif restant du jour, avec un
     signe visuel sobre quand l'objectif est atteint (on continue si on veut) ;
   - les boutons Pause, ● Enregistrer et Terminer ;
   - une rangée de chips **« Aujourd'hui je… »** (facultative) et une **carte méthode** en
     dessous ; un tap sur la carte passe à la méthode suivante ;
   - l'écran reste allumé (wake lock), et le chrono survit à un rechargement ou à un passage en
     arrière-plan, puisque le temps est calculé à partir d'horodatages.
3. **Fin de séance** : durée (ajustable), ressenti pp–ff, note, puis « Enregistrer ».
   Les séances trop courtes déclenchent une confirmation.
4. **Carnet** : historique groupé par semaine (temps et nombre de jours), détail d'une séance
   (note, ressenti, situation, enregistrements à réécouter), modification et suppression, et
   ajout d'une « séance oubliée ». Les anciennes séances affichent discrètement les noms des
   morceaux d'alors.
5. **Parcours** : rang actuel et progression vers le suivant, série en cours et meilleure série,
   calendrier des jours joués sur environ 16 semaines, records (plus longue séance, meilleure
   semaine, total, cette année), et ~30 succès sur le temps et la régularité.
6. **Réglages** :
   - prénom, objectif quotidien et tolérance de série (0–2 jours) ;
   - export et import JSON, partager l'app, à propos, réinitialiser.

## Catalogue de méthodes (à relire)

Chaque méthode tient en un titre et une ou deux lignes. Les principes viennent largement de Chang
(*Fundamentals of Piano Practice*), reformulés.

**Déchiffrer**
- *Lire avant de jouer* : tonalité, mesure, structure et répétitions, sans toucher le clavier.
- *Mains séparées* : chaque main seule jusqu'à ce que les notes soient sûres, puis assembler.
- *Petits segments* : une ou deux mesures ; on n'enchaîne que ce qui est sûr.
- *Doigté fixé* : choisir un doigté dès le départ et s'y tenir.
- *Le plus dur d'abord* : commencer par le passage qui fait peur, pas par le début.

**Passage difficile**
- *Isoler et boucler* : réduire à quelques notes et jouer en boucle continue.
- *Soigner la jonction* : travailler le raccord entre deux segments, en chevauchant d'une note.
- *Accords parallèles* : plaquer chaque groupe de notes en bloc pour apprendre la position.
- *Rythmes variés* : pointé, puis inversé, pour égaliser les doigts.
- *Lent ↔ tempo* : alterner lent et tempo cible, sans s'installer dans le lent.

**Vitesse & aisance**
- *Directement au tempo* : viser le tempo cible sur 2 à 4 notes, plutôt que monter par paliers.
- *Relâchement* : vérifier épaules, poignets et avant-bras, car la vitesse vient d'une main détendue.
- *Au-delà puis en deçà* : passer brièvement au-dessus du tempo pour que le tempo paraisse facile.
- *Mains ensemble par courts segments* : assembler seulement quand chaque main est sûre.
- *Finir lent* : terminer par un passage lent et propre.

**Mémoriser**
- *Mémoriser en apprenant* : chaque segment pendant qu'on l'apprend, pas après.
- *Jouer en pensée* : rejouer le passage loin du clavier, note à note.
- *Plusieurs points d'entrée* : savoir repartir du début de chaque section.
- *Mains séparées de mémoire* : chaque main seule, sans la partition.
- *Comprendre l'harmonie* : nommer les accords et la forme, car la mémoire analytique résiste au trac.

**Musicalité**
- *Chanter la ligne* : fredonner la mélodie avant de la jouer.
- *S'écouter* : un court enregistrement, écouté une fois sans jouer.
- *Nuances exagérées* : exagérer pour sentir l'amplitude, puis doser.
- *Phrasé* : où respire la phrase ? Marquer le sommet et la fin.
- *Une référence* : écouter une interprétation, puis jouer sans l'imiter.

**Préparer un concert**
- *Filage sans arrêt* : du début à la fin, quoi qu'il arrive.
- *À froid* : jouer sans échauffement, comme sur scène.
- *Repartir* : s'entraîner à continuer après une erreur.
- *Pour quelqu'un* : un auditeur, ou un enregistrement, change tout.
- *La veille, lentement* : un filage lent et attentif plutôt qu'un dernier rush.

## Données

- **Rien n'est effacé.** `pieces`, `journal`, `challenges`, `vacation`… restent dans IndexedDB et
  dans l'export, mais le code ne les lit plus. On peut donc toujours revenir en arrière.
- Séance V6 : `{id,date,mode:'chrono',blocks:[{piece:'',sec}],feeling?,note?,focus?,ts}`.
  On garde `blocks` pour que les totaux restent compatibles avec l'historique. `focus` est la
  situation choisie.
- Les séances `mode:'away'` (vacances) restent exclues du temps joué et visibles au Carnet.
- Enregistrements : les métadonnées passent de `p.recordings[]` à `S.recordings[]`
  (`{id,date,sessionId?,dur,feel?,size,mime,label?}`), et `label` reprend l'ancien titre de
  morceau. Les blobs restent dans le store `recordings`.
- Les rangs, la série et les records sont calculés sur **tout** l'historique : le niveau acquis
  ne bouge pas.

## Supprimé

- Répertoire, fiche morceau, sections et mesures, difficulté, phases et avancement.
- Plan guidé et feuille « Jouer », révision adaptative, simulation de concert.
- Rapports hebdo et mensuels, mode vacances, base Open Opus (`opus.js`).
- Notes ♪, défis, cartes compositeurs, aperçus et insights.
- Notifications locales : sur iOS, elles ne se déclenchent pas quand l'app est fermée.

## Code

On passe de 13 modules (~3 000 lignes) à environ **9 modules** (~1 200 lignes visées) :
`state.js` → `ui.js` → `methods.js` → `home.js` → `session.js` → `carnet.js` → `parcours.js` →
`settings.js` → `boot.js`. On garde les conventions : JS pur sans build, scripts classiques à
portée globale, `state.js` en premier et `boot.js` en dernier. `index.html` est réécrit avec les
tokens Récital et les seuls composants encore utiles.

## Lots — ✅ tous faits

Travail sur une branche `v6`, une seule mise en ligne **Bêta 6.0** à la fin, après ton feu vert.

1. **Socle** : modèle de données, migration non destructive, `ui`/`boot`, `index.html` allégé,
   `sw.js` et `test.mjs` réécrits.
2. **Accueil + séance** : chrono, anneau, pause, fin de séance, wake lock, reprise après
   rechargement, audio.
3. **Méthodes** : catalogue, situations, carte en séance et suggestion d'accueil.
4. **Carnet** : historique, détail, édition, séance oubliée, enregistrements.
5. **Parcours + réglages**.
6. **QA** :
   - `npm test`, puis vérification dans le navigateur (desktop et mobile) avec tes vraies
     données de démo ;
   - réécriture de `CLAUDE.md` ;
   - déploiement après validation.

## Réalisé (Bêta 6.0)
- 9 modules, ~1 120 lignes au lieu de 13 modules et ~3 050 lignes.
- Écarts par rapport au plan :
  - notifications locales retirées ;
  - un rappel discret d'export JSON apparaît sur l'accueil quand la dernière sauvegarde a plus
    de 30 jours (au-delà de 5 séances) ;
  - une pause vacances encore active à la migration est close à la date du jour.
- Bugs trouvés pendant la QA navigateur et corrigés :
  - `countUp` pouvait afficher une valeur négative à la première frame (bug antérieur à la V6) ;
  - la classe `.empty` (états vides) entrait en collision avec les barres de la semaine ;
  - `.btn.sm` écrasait la largeur de `.btn-full`.
- À vérifier sur iPhone après déploiement :
  - reprise du chrono après que iOS a tué la PWA ;
  - wake lock ;
  - enregistrement avec écran verrouillé ;
  - migration des vraies données (rang, série, enregistrements).
