# Overhaul graphique « Récital » — feuille de route (validée le 2026-07-16)

> **Direction** : un beau programme de concert imprimé, lu dans une salle tamisée.
> Deux matières : le **papier d'édition** (Playfair, filets, ornements, petites capitales,
> chiffres EB Garamond italiques) et la **lumière de scène** (noir violacé profond, surfaces
> en dégradé avec liseré lumineux, halos réservés aux éléments-clés, grain discret).
>
> **Décisions cadrées** : continuité améthyste/or + typos actuelles · thème sombre seul
> (clair reporté V4) · motion signature riche (avec `prefers-reduced-motion`) · 6 lots
> progressifs, un par release.
>
> **Discipline chromatique (règle d'or du cycle)** : améthyste = interaction uniquement ·
> or = accomplissement uniquement (rangs, records, maîtrise, célébrations) · le reste en neutres.
>
> **Méthode** : un lot = une session Claude Code, coller le prompt tel quel. Modèle conseillé :
> **Sonnet 5** partout (R1 peut se planifier en Opus si la session patine). Cocher le lot ici
> une fois livré. Les styles inline des `renderX()` (488 au départ) migrent vers des classes
> **dans le lot de leur écran**, pas en R1.

| Lot | Release | Contenu |
|-----|---------|---------|
| ✅ R1 | Bêta 3.13 | Fondations : tokens, grain, composants de base |
| ✅ R2 | Bêta 3.14 | Dock flottant, transitions orchestrées, accueil « programme » |
| ✅ R3 | Bêta 3.15 | Séance « mode scène » + feuilles de séance |
| ☐ R4 | Bêta 3.16 | Carnet, Répertoire, fiche morceau |
| ☐ R5 | Bêta 3.17 | Voyage, Stats, Réglages, célébrations |
| ☐ R6 | Bêta 3.18 | Polish transversal, états vides illustrés, accessibilité, QA |

---

## Lot R1 — Fondations (Bêta 3.13)

**But** : poser tout le vocabulaire visuel (tokens + composants). Aucun écran refondu ici.

**Prompt à coller :**

```
Lot R1 de l'overhaul graphique « Récital » (direction validée, voir ROADMAP-RECITAL.md) — Bêta 3.13.
Fondations : nouveaux design tokens + refonte des composants CSS de base dans le <style> d'index.html.
Ne refais AUCUN écran dans ce lot (les renderX() restent intacts) : tu poses le vocabulaire,
les écrans migreront lot par lot (R2 à R5).

1) Tokens (:root) — remplace/complète :
   - Fonds : --bg:#131118 (noir violacé profond ; répercute-le sur <meta name="theme-color">) ;
     --bg-deep:#0C0B10 (réservé au futur « mode scène » de la séance, lot R3).
   - Surfaces : les cartes passent d'un aplat à un dégradé + liseré lumineux en haut.
     --surface-g:linear-gradient(180deg,#232030,#1C1926) ; --surface2:#2B2839 ;
     liseré = border:1px solid rgba(255,255,255,.06) + border-top-color:rgba(255,255,255,.12).
     Garde --surface (aplat #201D2A) pour les usages où un dégradé serait coûteux ou moche.
   - Textes : --tp:#F0EDF7 ; --tc:#C9C4D6 ; --t2:#9A94AB (vérifie le contraste AA sur --bg et surfaces).
   - Accents : --acc:#A99EF5 ; --acc-deep:#9A8FF0 ; --gold:#E4C58A ; --danger:#F0857A ;
     conserve --ok/--warn/--danger-border.
   - Halos : --glow-acc:0 8px 28px rgba(158,147,242,.32) ; --glow-gold:0 8px 28px rgba(228,197,138,.22).
   - Motion : --dur1:150ms ; --dur2:250ms ; --dur3:400ms ; --easeout:cubic-bezier(.22,1,.36,1).
2) Grain : grain très discret sur le fond (SVG feTurbulence en data-URI, background-image répété
   sur body, opacité ≤3%). AUCUN élément fixed supplémentaire, aucun blur.
3) Composants de base (mêmes noms de classes qu'aujourd'hui, on ne casse aucun HTML généré) :
   - .card / .card.hi : dégradé + liseré ; .hi = élévation supérieure (fond un cran plus clair + ombre douce).
   - .btn.primary : dégradé vertical #B3A9F7→#9A8FF0, texte #17141F, box-shadow var(--glow-acc) ;
     .btn.gold équivalent en or ; .btn.ghost affiné (border hairline rgba(255,255,255,.12)).
   - .chip/.seg/.toggle/.tag/inputs : liserés hairline, états « on » plus francs, focus visibles.
   - .eyebrow : nouveau style surtitre = petites capitales espacées (text-transform:uppercase;
     letter-spacing:.16em; font-size:11px) — exception assumée à la règle « minuscules de phrase »,
     réservée aux surtitres.
   - Nouveau .filet : séparateur ornemental = hairline + petit losange or (5px, rotate 45°) au centre ;
     garde .divi pour les séparateurs simples.
   - .num : ajoute la variante .num.it (EB Garamond italique) pour les valeurs « musicales »
     (durées, bpm, mesures).
4) Discipline chromatique appliquée à ces composants : améthyste = interactif uniquement,
   or = accomplissement uniquement. Ne « corrige » pas encore les usages dans les renderX().
5) Vérifie visuellement chaque écran au dev server (.claude/launch.json, config « app ») :
   un léger décalage esthétique transitoire est acceptable, une régression de lisibilité non.

Contraintes : diffs ciblés ; node --check sur chaque js modifié ; npm test doit passer ;
incrémente CACHE (sw.js) en piano-b3-13 ET APP_VERSION (js/state.js) en 'Bêta 3.13' ;
pas d'emoji ; français sobre. Coche R1 dans ROADMAP-RECITAL.md, mets à jour la section
« Design tokens » de CLAUDE.md avec les nouvelles valeurs. Termine par un commit
(message français, style des commits existants).
```

---

## Lot R2 — Navigation & Accueil (Bêta 3.14)

**But** : le dock flottant, la motion d'entrée, et l'accueil « programme du jour ».

**Prompt à coller :**

```
Lot R2 de l'overhaul « Récital » (voir ROADMAP-RECITAL.md, R1 livré) — Bêta 3.14.
Navigation + accueil.

1) Dock flottant : la tab bar devient une pilule détachée du bord — left/right:16px ;
   bottom:calc(14px + env(safe-area-inset-bottom)) ; border-radius:999px ;
   fond rgba(32,29,43,.86) + backdrop-blur 18px + liseré hairline. Onglet actif :
   glyphe améthyste + point 4px dessous. Garde les 5 libellés si ça respire, sinon
   libellé sur l'actif seulement. Ajuste le padding-bottom de .app.
2) Transitions d'écran orchestrées : à l'activation d'un écran (go()), ses enfants directs
   entrent en décalé (translateY 8px + fade, délai croissant de 30–40ms, plafonné à ~8 éléments).
   Classe utilitaire + animation-delay ; désactivé si prefers-reduced-motion.
3) Util countUp(el) : les valeurs numériques comptent jusqu'à leur valeur à l'entrée
   (300–500ms, easing out, désactivé si reduced-motion). Applique-le aux métriques de l'accueil ;
   il resservira en R5 (Stats).
4) Accueil (renderHome) — l'ORDRE des sections du Lot B reste INCHANGÉ, seul le rendu change :
   - Eyebrow date en petites capitales : « JEUDI 16 JUILLET · PROGRAMME », rang honorifique en tag,
     titre Playfair « Bonjour Florian », puis .filet ornemental (losange or).
   - Chips : série en neutre ; notes ♪ en OR (fond rgba(228,197,138,.10), liseré rgba(228,197,138,.22)).
   - Carte objectif : anneau SVG redessiné — piste rgba(255,255,255,.07), progression en dégradé
     améthyste→or (linearGradient), stroke-linecap:round, drop-shadow améthyste léger ;
     centre = valeur en .num.it. Quand l'objectif du jour est ATTEINT, l'anneau passe entièrement
     OR avec drop-shadow or (l'or = accomplissement). L'anneau « se dessine » à l'entrée
     (transition sur stroke-dasharray, reduced-motion respecté).
   - CTA « Démarrer une séance » : .btn.primary (dégradé + glow, R1).
   - « Reprendre » : titre Playfair, chips hairline.
   - Citation de pied de page : EB Garamond italique centrée, tiret cadratin avant l'auteur.
5) Migre les styles inline de js/home.js vers des classes d'index.html : objectif zéro style=""
   significatif restant dans home.js.

Contraintes : diffs ciblés ; node --check sur chaque js modifié ; npm test doit passer ;
vérifie visuellement au dev server (config « app ») ; incrémente CACHE (sw.js) en piano-b3-14
ET APP_VERSION (js/state.js) en 'Bêta 3.14' ; pas d'emoji ; français sobre.
Coche R2 dans ROADMAP-RECITAL.md. Termine par un commit (message français).
```

---

## Lot R3 — Séance « mode scène » (Bêta 3.15)

**But** : l'écran émotionnel de l'app. Zéro changement de logique (chrono, audio, wake lock intouchés).

**Prompt à coller :**

```
Lot R3 de l'overhaul « Récital » (voir ROADMAP-RECITAL.md, R1–R2 livrés) — Bêta 3.15.
Séance « mode scène » + feuilles liées. AUCUN changement de logique : timer, wake lock,
toggleRecording/finishRecording/interruptRecording/finalizeRecording et paintSession
gardent exactement leur comportement ; seul le rendu change.

1) Écran séance (renderSession) :
   - Fond --bg-deep sur #s-session (pleine hauteur ; html/body restent sur --bg).
   - Halo : div absolue centrée derrière le chrono, radial-gradient améthyste
     (rgba(158,147,242,.14) → transparent 68%), ~300px. Respiration : animation
     scale(1→1.06) + opacity, 6s ease-in-out alternate infinite — pas de blur animé ;
     coupée si prefers-reduced-motion ou si le timer est en pause.
   - Chrono : EB Garamond italique 56–64px, text-shadow 0 0 36px rgba(158,147,242,.35).
     Dessous, eyebrow petites capitales : « CHRONO · OBJECTIF 30 MIN » (adapter selon
     mode minuteur / fractionné).
   - En-tête : pastille du morceau courant (point améthyste + titre) à gauche,
     accès « Carnet » discret à droite.
   - Rappel « à faire » / « Pas au point : … » : ligne italique avec filet or à gauche
     (border-left:2px solid rgba(228,197,138,.45)).
   - Contrôles 56px : Pause = disque --surface2 + liseré ; Fin = anneau hairline ;
     Rec = anneau rgba(240,133,122,.4) + point #F0857A avec glow. Étiquettes 11px muted
     dessous (la durée d'enregistrement en cours remplace « Rec », comme aujourd'hui) ;
     pendant la captation, liseré rouge qui respire doucement sur le bouton.
   - Répartition de la séance : filet fin + lignes sobres, durées en .num.it.
   - Pauses du mode fractionné : même mise en scène, halo plus doux.
2) Feuille « Nouvelle séance » (startSheet) : composants R1 (seg, chips, toggle), titre Playfair,
   CTA .btn.primary.
3) Carnet de fin de séance (carnetSheet) : titre Playfair, échelle pp–ff en boutons .num italiques,
   bloc humeur/énergie et bloc sections repliés inchangés fonctionnellement.
4) Migre les styles inline de js/session.js vers des classes.
5) Teste au dev server : démarrer/mettre en pause/finir une séance, ouvrir le carnet de fin ;
   npm test doit passer.

Contraintes : diffs ciblés ; node --check ; incrémente CACHE (sw.js) en piano-b3-15
ET APP_VERSION (js/state.js) en 'Bêta 3.15' ; pas d'emoji ; français sobre.
Coche R3 dans ROADMAP-RECITAL.md. Termine par un commit (message français).
```

---

## Lot R4 — Carnet, Répertoire, fiche morceau (Bêta 3.16)

**But** : le journal d'édition et les fiches d'œuvres avec monogrammes.

**Prompt à coller :**

```
Lot R4 de l'overhaul « Récital » (voir ROADMAP-RECITAL.md, R1–R3 livrés) — Bêta 3.16.
Carnet + Répertoire + fiche morceau. Aucune logique modifiée (filtres, pagination,
sections/mesures, enregistrements : comportements intouchés).

1) Carnet (renderCarnetBody) : chaque groupe-semaine devient un « mouvement » —
   en-tête eyebrow petites capitales (« SEMAINE DU 6 JUIL. ») + sous-totaux à droite
   en .num.it + filet. Les entrées passent de cartes pleines à des lignes séparées
   par hairline : titre, méta (date · durée · ressenti · mode), aperçu truncWord inchangé.
   Chips de filtre par morceau au style R1. Pagination inchangée.
2) Répertoire (renderRep) :
   - Monogramme compositeur : médaillon 40px — initiale en Playfair, fond --surface2,
     liseré hairline teinté de la couleur de phase de la pièce (PHASE_COL).
   - Items : monogramme + titre/méta + pastille de phase (point coloré + libellé 11px) + chevron.
     Groupes compositeurs et carets 44px conservés.
   - En-tête : titre Playfair + « + Ajouter » ; recherche et seg de statut au style R1.
3) Fiche morceau (pieceDetail) :
   - En-tête : titre Playfair + compositeur + tag de phase ; stats (temps joué / séances /
     dernière fois) en .num.it avec libellés eyebrow 11px.
   - Avancement : barre fine à extrémité lumineuse ; bouton « Maîtrisé ✓ » en .btn.gold
     (l'or = accomplissement).
   - Carte de couverture (renderMap) : segments arrondis 3px aux couleurs PHASE_COL,
     trous en hachures adoucies. Mini-courbe (renderHistCurve) : trait améthyste + dégradé
     vertical sous la courbe (SVG linearGradient vers transparent).
   - Sections (.sec) : liserés hairline, dot de statut, bpm en .num.it ;
     feuilles pieceSheet/cutSheet/notes cohérentes avec R1.
   - Enregistrements : lignes hairline, durée/taille en .num, bouton lecture rond 40px liseré.
4) Migre les styles inline de js/carnet.js, js/repertoire.js et js/piece-detail.js vers des classes.
5) Vérifie au dev server : filtres du Carnet, groupes du Répertoire, une fiche avec sections
   et une sans ; npm test doit passer.

Contraintes : diffs ciblés ; node --check ; incrémente CACHE (sw.js) en piano-b3-16
ET APP_VERSION (js/state.js) en 'Bêta 3.16' ; pas d'emoji ; français sobre.
Coche R4 dans ROADMAP-RECITAL.md. Termine par un commit (message français).
```

---

## Lot R5 — Voyage, Stats, Réglages, célébrations (Bêta 3.17)

**But** : l'écrin du prestige (l'or travaille enfin) et une data viz raffinée.

**Prompt à coller :**

```
Lot R5 de l'overhaul « Récital » (voir ROADMAP-RECITAL.md, R1–R4 livrés) — Bêta 3.17.
Voyage + Stats + Réglages + célébrations. Aucune logique modifiée.

1) Voyage (renderVoyageBody) :
   - Carte du rang courant = écrin : médaillon or (double cercle concentrique hairline or,
     glyphe glyphFor, halo var(--glow-gold) discret), nom du rang en Playfair,
     heures en .num.it ; barre vers le rang suivant fine, remplissage OR.
   - Liste des rangs = portée verticale : ligne hairline continue, points or (atteints),
     améthyste (en cours), neutres (à venir) ; toggleVoyageRanks conservé.
   - Jardin : NE TOUCHE PAS au SVG de l'arbre (refait au Lot D) ; raffine seulement l'écrin
     (cadre, « La graine » en Playfair or, sous-titre).
   - Défis : cartes hebdo/mensuel avec barre fine et échéance en eyebrow ; défi accompli =
     liseré or. Cartes compositeurs : monogramme Playfair + niveau Bronze/Argent/Or exprimé
     par le liseré/médaille, temps joué en .num.
2) Stats (renderStats, 3 sous-onglets conservés) :
   - « 7 derniers jours » : barres fines (~8px) arrondies, sommet plus lumineux (dégradé
     vertical), jour courant accentué ; countUp (R2) sur les métriques.
   - « 8 dernières semaines » : remplace les barres par une courbe lissée SVG (path Bézier,
     lissage type Catmull-Rom simplifié) avec dégradé sous la courbe et points aux valeurs.
   - Heatmap : échelle de 5 niveaux d'améthyste perceptibles (rgba .08 → plein), coins 3px.
   - Records : valeurs record en OR (.num.it). Aperçus : cartes éditoriales (filet + italique).
     Rétrospective (yearRetroSheet) au même langage.
3) Réglages (renderSettings) : groupes avec en-têtes eyebrow, lignes hairline, valeurs en .num ;
   pied de page version en EB Garamond italique centré.
4) Célébrations (celebrate) : écrin raffiné — médaillon central aux couleurs de CELEB_KIND,
   halo assorti, filets ornementaux, titre Playfair ; toujours pas de confettis,
   fermeture inchangée.
5) Migre les styles inline de js/voyage.js, js/stats.js, js/gamification.js, js/settings.js
   et js/plan.js vers des classes.
6) Vérifie au dev server les 4 sous-onglets du Voyage, les 3 des Stats, une célébration
   (déclenche-la manuellement en console) ; npm test doit passer.

Contraintes : diffs ciblés ; node --check ; incrémente CACHE (sw.js) en piano-b3-17
ET APP_VERSION (js/state.js) en 'Bêta 3.17' ; pas d'emoji ; français sobre.
Coche R5 dans ROADMAP-RECITAL.md. Termine par un commit (message français).
```

---

## Lot R6 — Polish final & QA (Bêta 3.18)

**But** : la passe transversale qui fait tenir l'ensemble, puis validation iPhone.

**Prompt à coller :**

```
Lot R6, dernier lot de l'overhaul « Récital » (voir ROADMAP-RECITAL.md, R1–R5 livrés) — Bêta 3.18.
Polish transversal + QA. Aucune logique modifiée.

1) Passe de cohérence : parcours chaque écran au dev server et corrige les divergences
   (typo/espacements/couleurs hors tokens, cartes sans liseré, accents hors discipline
   améthyste=interactif / or=accomplissement). N'oublie pas les surfaces secondaires :
   toasts, confirmSheet, workSheet, wishSheet, rapports hebdo/mensuel, plan guidé,
   simulation concert, feuilles d'auto-éval audio.
2) États vides : remplace les .empty texte-seul par 3–4 petites illustrations SVG au trait
   réutilisables (portée, note, pupitre — trait 1.5px, or/améthyste à ~40% d'opacité)
   + une phrase d'invitation.
3) Accessibilité : contraste AA pour --t2/--tc sur toutes les surfaces (ajuste les tokens
   si besoin) ; focus visibles sur les contrôles ; prefers-reduced-motion coupe bien stagger,
   countUp, respiration du chrono et dessin d'anneau.
4) Performance : backdrop-filter limité au dock et au fond des feuilles ; aucun filtre animé ;
   scroll fluide sur les longues listes (Carnet, Répertoire) — si un dégradé de carte coûte
   trop en répétition, remplace par l'aplat --surface dans les listes.
5) Dette : grep -c 'style="' js/*.js — résorbe ce qui reste de significatif ;
   supprime les classes CSS mortes d'index.html.
6) Mets à jour CLAUDE.md : section « Design tokens » à jour, discipline chromatique ajoutée
   aux conventions, cycle Récital marqué terminé (et coche R6 dans ROADMAP-RECITAL.md).
7) Donne-moi en fin de session une checklist de validation sur iPhone réel (5 points max :
   dock + safe-area, mode scène OLED, fluidité du stagger, feuilles, install PWA à jour).

Contraintes : diffs ciblés ; node --check ; npm test doit passer ; incrémente CACHE (sw.js)
en piano-b3-18 ET APP_VERSION (js/state.js) en 'Bêta 3.18' ; pas d'emoji ; français sobre.
Termine par un commit (message français).
```

---

## Hors périmètre de ce cycle

- Thème clair « Nacre » → V4.
- Dettes du Lot E toujours ouvertes (indépendantes) : revérifier sur iPhone le correctif
  écran-verrouillé de la Bêta 3.12 ; retrait de `LS_MIRROR`.
- Sauvegarde NAS, synchro multi-appareils, éventuelle migration framework → V4.
