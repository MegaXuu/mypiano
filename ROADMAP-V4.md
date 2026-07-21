# Cycle V4 « Compagnon » — feuille de route (validée le 2026-07-20)

> **Direction** : faire passer l'app de « suivi de pratique » à **compagnon qui prescrit** —
> elle sait déjà *ce que* l'on travaille (sections, mesures, tempo) ; elle saura désormais
> *dans quel ordre* (difficulté ressentie par section), *comment structurer une séance*
> (plan guidé générateur) et *quoi faire quand la vie s'interpose* (mode vacances).
>
> **Décisions cadrées (2026-07-20)** :
> - Périmètre = **pratique pure**. Ni thème clair, ni sauvegarde NAS/synchro, ni refonte
>   technique (tout cela reste reporté, voir « Hors périmètre » en bas).
> - Difficulté par section = **4 niveaux** (Facile / Moyen / Difficile / Très difficile),
>   échelle paire volontaire pour éviter le refuge au milieu. Toujours **facultative**.
> - Plan guidé = **générateur paramétré** : durée (30–90 min) + nombre de pièces + intention.
> - Mode vacances = **3 volets** : protection série/stats + pratique sans piano + plan de reprise.
> - Tranché sauf contre-ordre : le travail par section se fait **du plus dur au plus facile**
>   (en début de travail de chaque pièce, l'esprit frais) ; les séances « sans piano » sont
>   comptées **à part** (elles ne nourrissent ni la série de jeu, ni le temps joué, ni les records).
>
> **Règle constante du cycle** : tout reste facultatif. Une pièce sans sections, une séance
> libre au chrono, un utilisateur qui ignore le plan guidé — tout continue de marcher comme avant.
>
> **UI** : aucun nouveau langage graphique — tokens et discipline chromatique du cycle Récital
> inchangés (améthyste = interaction · or = accomplissement · neutres partout ailleurs).
> Trois composants nouveaux seulement : **stepper** (assistant pas-à-pas en feuille, V4-1),
> **timeline de séance** (blocs du plan guidé, V4-3), **bannière d'état** (vacances, V4-4).
> La difficulté par section ne doit PAS voler le canal couleur de `PHASE_COL` (qui code le
> *statut* des sections) : elle s'exprime en intensité de neutres / marqueur discret.
>
> **Méthode** : un lot = une session Claude Code, coller le prompt tel quel. Modèle conseillé :
> **Sonnet 5** partout ; V4-3 (le gros lot) peut se planifier en Opus si la session patine.
> Les lots V4-1 et V4-3 commencent par une **maquette à faire valider avant de coder**
> (comme les étapes 2–3 du cycle V3). Cocher le lot ici une fois livré.
> Versionnage : **Bêta 4.N** / `CACHE` = `piano-b4-N`.

| Lot | Release | Contenu |
|------|---------|---------|
| ✅ V4-1 | Bêta 4.1 | Sections v2 : difficulté ressentie (4 niveaux) + assistant de découpage pas-à-pas |
| ✅ V4-2 | Bêta 4.2 | Exploitation de la difficulté partout (suggestions, tri, estimation, consignes) |
| ✅ V4-3 | Bêta 4.3 | Plan guidé v2 : générateur paramétré + timeline de séance |
| ☐ V4-4 | Bêta 4.4 | Mode vacances : protection, pratique sans piano, plan de reprise |
| ☐ V4-5 | Bêta 4.5 | Polish transversal, QA, dettes (retrait `LS_MIRROR`, checklist iPhone) |

---

## Lot V4-1 — Sections v2 : difficulté + assistant de découpage (Bêta 4.1)

**But** : la fondation de données du cycle. Tout le reste s'appuie dessus.

**Prompt à coller :**

```
Lot V4-1 du cycle « Compagnon » (direction validée, voir ROADMAP-V4.md) — Bêta 4.1.
Sections v2 : difficulté ressentie par section + assistant de découpage pas-à-pas.
COMMENCE PAR UNE MAQUETTE : décris précisément (écrans/étapes/composants, pas de code)
l'assistant et les chips de difficulté, et attends ma validation avant de coder.

1) Modèle de données (js/state.js) :
   - Nouveau champ sec.diff ∈ 1..4, FACULTATIF (absent = comportement actuel inchangé).
     Libellés : 1 Facile / 2 Moyen / 3 Difficile / 4 Très difficile. Helper DIFF_LABELS
     + secDiffLabel(sec). Aucune migration nécessaire (champ absent = non renseigné).
2) Assistant de découpage pas-à-pas (remplace l'entrée « à la main » de cutSheet ;
   le découpage régulier reste un raccourci, les difficultés s'y attribuent ensuite
   depuis la fiche) :
   - Étape 0 (seulement si p.bars absent) : nombre de mesures de la pièce.
   - Étapes suivantes, une section à la fois : nom, mesure de début PRÉ-REMPLIE
     (= fin de la précédente + 1, modifiable), mesure de fin, difficulté en 4 chips.
     Bouton « Ajouter une section » ou « Terminer ».
   - Étape finale : récapitulatif avec carte de couverture (renderMap), trous signalés
     (coverageGaps), validation globale qui écrit p.bars + p.sections d'un coup.
   - Le stepper vit dans une feuille (openSheet) : indicateur d'étape sobre (points + filet),
     boutons Précédent/Suivant, geste de fermeture conservé, aucune perte de saisie
     en revenant en arrière.
3) Édition : la difficulté est révisable depuis la fiche (pieceDetail, ligne de section
   et feuille d'édition de section) — une section « très difficile » qui devient « moyenne »
   est un signal de progrès : toast sobre de reconnaissance quand on l'abaisse (pas de
   célébration lourde).
4) UI : chips de difficulté en INTENSITÉ croissante de neutres (fond/liseré de plus en plus
   affirmé, texte --t2 → --tp), AUCUNE nouvelle couleur catégorielle (PHASE_COL code déjà
   le statut). Sur la carte de couverture et les lignes de section, la difficulté = marqueur
   discret (petit repère typographique ou double-hairline), jamais un aplat coloré.
5) Vérifie au dev server (config « app ») : découpage complet d'une pièce vierge via
   l'assistant, pièce déjà sectionnée (édition de diff), pièce sans section (rien ne change) ;
   npm test doit passer.

Contraintes : diffs ciblés ; node --check sur chaque js modifié ; npm test doit passer ;
incrémente CACHE (sw.js) en piano-b4-1 ET APP_VERSION (js/state.js) en 'Bêta 4.1' ;
pas d'emoji ; français sobre. Coche V4-1 dans ROADMAP-V4.md, mets à jour le « Modèle de
données » de CLAUDE.md (sec.diff, assistant). Termine par un commit (message français,
style des commits existants).
```

---

## Lot V4-2 — Exploitation de la difficulté partout (Bêta 4.2)

**But** : petit lot volontairement — la difficulté saisie en V4-1 irrigue les suggestions,
le tri, l'estimation et les consignes. Livrer vite après le 4.1.

**Prompt à coller :**

```
Lot V4-2 du cycle « Compagnon » (voir ROADMAP-V4.md, V4-1 livré) — Bêta 4.2.
Exploitation de la difficulté par section (sec.diff, 1..4) dans les suggestions et affichages.
Aucun nouvel écran : enrichissement de l'existant. Les pièces/sections SANS diff gardent
exactement le comportement actuel (diff absente = poids neutre, jamais pénalisée).

1) pickTodaySection (js/state.js ou module concerné) : pondération — à fraîcheur comparable,
   la section la plus difficile passe en tête (« le plus dur d'abord, l'esprit frais »).
   La fraîcheur (moins récemment travaillée) reste le critère premier ; la difficulté départage.
2) Fiche morceau (pieceDetail) : ordre d'affichage des sections inchangé (ordre des mesures),
   mais la section suggérée du jour est mise en avant avec sa difficulté ; l'estimation de
   travail restant (si settings.estimates) devient pondérée par la difficulté des sections
   non « ok » (barème simple, ex. 0.7 / 1 / 1.5 / 2 — documente-le en commentaire).
3) Rappel en séance (sectionsReminderLine) : cite en premier la section non « ok » la plus
   difficile, ex. « Pas au point : développement (très difficile), coda ».
4) Consignes du plan guidé (changConsigne, js/plan.js) : si une section difficile/très
   difficile est visée, consigne adaptée (très lent, mains séparées, boucles courtes) ;
   sections faciles → consigne de consolidation/filage. Le plan guidé lui-même n'est PAS
   refondu ici (c'est V4-3) : seule la consigne s'affine.
5) Vérifie au dev server : une pièce avec diffs variées (suggestion + estimation + rappel),
   une pièce sans diff (rien ne change) ; npm test doit passer.

Contraintes : diffs ciblés ; node --check ; npm test doit passer ; incrémente CACHE (sw.js)
en piano-b4-2 ET APP_VERSION (js/state.js) en 'Bêta 4.2' ; pas d'emoji ; français sobre.
Coche V4-2 dans ROADMAP-V4.md. Termine par un commit (message français).
```

---

## Lot V4-3 — Plan guidé v2 : générateur paramétré (Bêta 4.3)

**But** : le gros lot du cycle. Des séances préparées de 30 min à 1 h 30, composées selon
durée + nombre de pièces + intention, avec une timeline de blocs vécue en mode scène.

**Prompt à coller :**

```
Lot V4-3 du cycle « Compagnon » (voir ROADMAP-V4.md, V4-1 et V4-2 livrés) — Bêta 4.3.
Plan guidé v2 : générateur paramétré + timeline de séance. C'est le gros lot du cycle.
COMMENCE PAR UNE MAQUETTE : décris la feuille de composition, la structure des plans générés
(sur 2–3 exemples concrets : 30 min / 1 pièce, 60 min / 2 pièces, 90 min / 3 pièces) et la
timeline en séance, et attends ma validation avant de coder.

1) Feuille de composition (remplace planSheet actuel) — 3 réglages :
   - Durée : chips 30 / 45 / 60 / 75 / 90 min.
   - Nombre de pièces : 1 à 4, avec défaut suggéré selon la durée (30→1, 45–60→2, 75–90→3).
   - Intention : seg Apprendre / Consolider / Entretenir / Équilibré.
   Les derniers réglages sont mémorisés (S.settings.planPrefs = {dur,n,intent}, migration
   dans migrate()). Aperçu du plan généré DANS la feuille avant de lancer, avec possibilité
   de régénérer après changement d'un réglage.
2) generatePlan(params) réécrit :
   - Échauffement court (~10 %, plafonné) → travail par pièce → entretien (revisionList, si
     dû et intention ≠ Apprendre) → filage plaisir en clôture (une pièce au choix du plan).
   - Choix des pièces selon l'intention : Apprendre = les moins avancées ; Consolider = celles
     en consolidation/polissage ; Entretenir = revisionList d'abord ; Équilibré = mélange.
   - DANS chaque pièce sectionnée : blocs PAR SECTION, triés du plus difficile au plus facile
     (sec.diff de V4-1, sections non « ok » d'abord), consignes de V4-2. Pièce sans sections :
     un bloc unique, comme aujourd'hui.
   - Les durées de bloc se répartissent selon l'intention et la difficulté (une section
     « très difficile » reçoit plus de temps qu'une « facile »).
3) En séance (mode scène, js/session.js) — réutilise timer.plan/planIdx, AUCUN changement
   au chrono/wake lock/audio :
   - Timeline des blocs : bande horizontale discrète sous le chrono — bloc courant en
     améthyste, faits en neutre plein, à venir en hairline ; nom du bloc + consigne courante.
   - Fin de bloc : signal doux (transition visuelle, pas d'alarme), l'app PROPOSE de passer
     au bloc suivant — jamais de coupure autoritaire. Boutons « Prolonger » (+5 min, décalés
     sur la suite) et « Passer ».
   - prefers-reduced-motion respecté sur toute la motion de timeline.
4) Carnet de fin de séance (carnetSheet) : les sections effectivement travaillées du plan
   sont PRÉ-COCHÉES dans le bloc « Sections travaillées » (l'utilisateur peut décocher).
5) startRevision (bouton « Réviser » de l'accueil) reste un raccourci indépendant, inchangé.
6) Vérifie au dev server : générer et vivre un plan 30 min / 1 pièce et un 60 min / 2 pièces
   (dont une sectionnée avec diffs), prolonger un bloc, passer un bloc, carnet pré-rempli ;
   npm test doit passer.

Contraintes : diffs ciblés ; node --check ; npm test doit passer ; incrémente CACHE (sw.js)
en piano-b4-3 ET APP_VERSION (js/state.js) en 'Bêta 4.3' ; pas d'emoji ; français sobre.
Coche V4-3 dans ROADMAP-V4.md, mets à jour CLAUDE.md (plan guidé v2, S.settings.planPrefs).
Termine par un commit (message français).
```

---

## Lot V4-4 — Mode vacances (Bêta 4.4)

**But** : l'app sait accompagner l'absence — protéger, occuper loin du clavier, et organiser
le retour. Aucune culpabilisation à l'écran, jamais.

**Prompt à coller :**

```
Lot V4-4 du cycle « Compagnon » (voir ROADMAP-V4.md, V4-1 à V4-3 livrés) — Bêta 4.4.
Mode vacances, 3 volets : protection série/stats, pratique sans piano, plan de reprise.
Ton général : bienveillant et sobre — une pause est un choix, pas une faute (aucun rouge,
aucun langage culpabilisant).

1) Modèle (js/state.js) : S.vacation = {on:false, from:null, until:null} (migration dans
   migrate()). Activation depuis Réglages (groupe dédié) + raccourci discret sur l'accueil ;
   date de retour OPTIONNELLE (si renseignée, le mode se désactive automatiquement au
   premier lancement après cette date, en ouvrant la feuille de reprise du volet 3).
2) Volet protection, pendant la pause :
   - Série GELÉE : les jours de vacances ne cassent pas la série (adapte le calcul de série,
     js/gamification.js ou state.js) ; l'affichage indique « en pause », jamais « perdue ».
   - Objectifs hebdo/mensuels et alertes de l'accueil neutralisés ; les semaines chevauchant
     la pause sont exclues des moyennes/aperçus (Stats) ; rappels de révision suspendus
     (needsRevision/revisionList vides pendant la pause) ; notifications locales coupées.
   - UI accueil : bannière d'état en tête (teinte neutre --surface2, hairline, petite
     illustration au trait dans la famille emptyState, texte du type « En pause jusqu'au
     12 août ») ; anneau d'objectif en mode repos (piste seule, pas de progression attendue).
3) Volet pratique sans piano : depuis la bannière, menu « Loin du clavier » — 3 formes :
   écoute active (d'une œuvre du répertoire), lecture de partition, travail mental d'une
   section. Sélection pièce/section optionnelle + durée. Journalisées comme sessions
   mode:'away' avec awayKind ∈ ecoute|lecture|mental, visibles au Carnet avec un badge
   dédié, mais COMPTÉES À PART : ni série de jeu, ni temps joué, ni records, ni objectifs
   (décision cadrée du cycle). Une ligne de total « loin du clavier » peut apparaître dans
   la rétrospective/le rapport, séparée du temps de jeu.
4) Volet reprise, à la désactivation (manuelle ou date atteinte) :
   - Feuille de reprise : résumé sobre de la pause (durée, éventuelles séances loin du
     clavier), puis séance de reprise proposée = révisions les plus en retard, ÉTALÉES
     (plafond ~3 pièces/jour les premiers jours — pas de mur de révisions au retour ;
     décale ou étale les échéances revInterval de la durée de la pause).
   - Objectif quotidien adouci pendant ~7 jours (facteur ~0.6, arrondi propre), retour
     progressif à la normale, mention discrète sur l'accueil.
5) Vérifie au dev server : activer la pause (bannière, anneau, alertes éteintes), une séance
   « loin du clavier » (badge Carnet, stats de jeu intactes), désactiver (feuille de reprise,
   objectif adouci) ; simule un changement de date si besoin ; npm test doit passer.

Contraintes : diffs ciblés ; node --check ; npm test doit passer ; incrémente CACHE (sw.js)
en piano-b4-4 ET APP_VERSION (js/state.js) en 'Bêta 4.4' ; pas d'emoji ; français sobre.
Coche V4-4 dans ROADMAP-V4.md, mets à jour CLAUDE.md (S.vacation, mode 'away').
Termine par un commit (message français).
```

---

## Lot V4-5 — Polish final, QA & dettes (Bêta 4.5)

**But** : la passe transversale qui fait tenir l'ensemble, l'apurement des dettes V3,
puis validation iPhone.

**Prompt à coller :**

```
Lot V4-5, dernier lot du cycle « Compagnon » (voir ROADMAP-V4.md, V4-1 à V4-4 livrés) — Bêta 4.5.
Polish transversal + QA + dettes. Aucune fonctionnalité nouvelle.

1) Passe de cohérence sur les composants nés du cycle : stepper (V4-1), chips de difficulté,
   timeline de séance (V4-3), bannière vacances et feuille de reprise (V4-4) — tokens Récital,
   discipline chromatique (améthyste = interaction, or = accomplissement), cibles tactiles
   ≥ 44 px, :focus-visible, prefers-reduced-motion sur toute motion nouvelle.
2) Textes : relecture de tous les libellés nouveaux (français sobre, minuscules de phrase,
   pas de culpabilisation dans le mode vacances, échelles cohérentes avec l'existant).
3) Dette LS_MIRROR (js/state.js) : retire le miroir localStorage CONTINU (écriture à chaque
   save()) — le rodage IndexedDB a duré depuis la Bêta 3.4. CONSERVE : la migration one-shot
   au boot (localStorage → IndexedDB si IndexedDB vide) et le repli complet sur localStorage
   quand IndexedDB est indisponible (mode privé, quota). Adapte test.mjs si le test de
   migration s'appuie sur le miroir. Mets à jour CLAUDE.md (architecture).
4) Dette style : grep -c 'style="' js/*.js — résorbe ce que le cycle a introduit de
   significatif ; supprime les classes CSS mortes éventuelles d'index.html.
5) Mets à jour CLAUDE.md : cycle V4 marqué terminé, modèle de données à jour (sec.diff,
   planPrefs, vacation, mode 'away'), coche V4-5 dans ROADMAP-V4.md.
6) Donne-moi en fin de session une checklist de validation sur iPhone réel (6 points max) :
   assistant de découpage au doigt, timeline en séance réelle, bannière + reprise vacances,
   série gelée après un jour de pause, ET les deux vérifications héritées de V3 — correctif
   écran-verrouillé pendant un enregistrement (Bêta 3.12) et migration/persistance saine
   après retrait du miroir.

Contraintes : diffs ciblés ; node --check ; npm test doit passer ; incrémente CACHE (sw.js)
en piano-b4-5 ET APP_VERSION (js/state.js) en 'Bêta 4.5' ; pas d'emoji ; français sobre.
Termine par un commit (message français).
```

---

## Hors périmètre de ce cycle (reporté V5+)

- Thème clair « Nacre ».
- Sauvegarde auto NAS Synology ; synchro multi-appareils.
- Éventuelle migration React+TS+Vite ou app SwiftUI native.
- Push iOS réel (nécessite un serveur VAPID) — on reste sur les notifications locales.
