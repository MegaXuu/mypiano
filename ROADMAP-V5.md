# Cycle V5 « Épure » — feuille de route (validée le 2026-07-21)

> **Direction** : rendre l'app la plus **simple et intuitive** possible. Après quatre cycles
> d'ajouts, la V5 ne construit presque rien : elle **retire des décisions**. Le principe
> directeur, validé : **« l'app propose, tu valides »** — au moment de jouer, une seule
> proposition déjà composée, pas six portes d'entrée ; dans la navigation, un concept = un
> endroit, sans sous-onglets.
>
> **Décisions cadrées (2026-07-21)** :
> - Priorités du cycle = **démarrage de séance** + **navigation/sous-onglets**.
>   Le carnet de fin de séance et la refonte complète de l'accueil sont **hors périmètre**
>   (candidats V6) — l'accueil n'est touché que là où le nouveau démarrage l'exige.
> - « Simple » = **moins de décisions** (pas d'abord moins de densité ni moins de concepts).
> - Tap sur « Jouer » → **feuille de confirmation** : le programme du jour est présenté déjà
>   composé, ajustable, un tap pour commencer. (Pas de démarrage muet.)
> - Tab bar cible : **4 onglets** — Accueil · Carnet · Répertoire · **Parcours** (fusion
>   Voyage + Stats en un seul écran défilant).
> - Élagage au cas par cas, tranché : **Jardin retiré complètement** (l'arbre est entièrement
>   dérivé des heures/série/maîtrises, aucune donnée perdue) ; **fractionné 25/5 retiré
>   complètement** (le champ `interval` des anciennes séances reste dans les données, ignoré).
>   Tout le reste est conservé (défis, cartes compositeurs, simulation concert, mode vacances).
> - Ajout du 2026-07-21 (même session) : lot **Réglages & partage** — l'app doit pouvoir être
>   **donnée à un ami** telle quelle : prénom paramétrable (fini le « Bonjour Florian » en dur),
>   premier lancement accueillant sur état vierge, réglages nettoyés (retrait du toggle NAS
>   mort), partage de l'URL, « À propos » expliquant les données 100 % locales, réinitialisation.
>   Les données étant liées à l'appareil, aucune séparation à construire : la même URL sert tout
>   le monde, chacun son stockage.
>
> **Règle constante du cycle** : jamais deux chemins visibles vers la même action ; chaque
> écran répond à une question unique ; défauts intelligents partout. On ne casse rien de ce
> qui est conservé : une séance libre au chrono reste possible en deux taps.
>
> **UI** : aucun nouveau langage graphique — tokens et discipline chromatique Récital
> inchangés. Aucun composant nouveau attendu (le cycle réutilise feuilles, chips, seg,
> timeline) ; s'il en faut un, c'est un signal que le lot se complique trop.
>
> **Méthode** : un lot = une session Claude Code, coller le prompt tel quel. Modèle conseillé :
> **Sonnet 5** partout ; V5-1 peut se planifier en Opus si la session patine.
> Les lots V5-1 et V5-2 commencent par une **maquette à faire valider avant de coder**.
> Cocher le lot ici une fois livré. Versionnage : **Bêta 5.N** / `CACHE` = `piano-b5-N`.

| Lot | Release | Contenu |
|------|---------|---------|
| ☑ V5-1 | Bêta 5.1 | Programme du jour : un seul « Jouer », feuille de confirmation, retrait du fractionné |
| ☐ V5-2 | Bêta 5.2 | Navigation : 4 onglets, écran « Parcours » (fusion Voyage+Stats), retrait du Jardin |
| ☐ V5-3 | Bêta 5.3 | Réglages & partage : profil, premier lancement, à propos, réinitialisation, retrait NAS |
| ☐ V5-4 | Bêta 5.4 | Élagage résiduel, polish transversal, QA, checklist iPhone |

---

## Lot V5-1 — Programme du jour (Bêta 5.1) ✅

**But** : le cœur du cycle. Le moment le plus important de l'app — s'asseoir au piano —
devient le plus simple : une proposition déjà composée, un tap pour l'accepter.

**Livré (Bêta 5.1)** : CTA unique **« Jouer »** sur l'accueil (sous-titre = résumé du
programme composé, `planSummaryLine`). Feuille **« Jouer »** (`playSheet`, `js/plan.js`) :
programme déjà composé via `generatePlan(planPrefs)`, aperçu des blocs (consigne sur
**chaque** bloc), CTA « Commencer » → `startPlanSession`, dépliant « Ajuster » (durée /
nb de pièces / intention, aperçu + sous-titre régénérés en direct par `regenPlanPreview`),
lien « Autrement… » → feuille secondaire (`altSheet`) = séance libre / concert / séance
oubliée, une ligne chacune. `startSheet` allégé (retrait du toggle fractionné et du bouton
« séance oubliée », renommé « Séance libre »). **Retirés de l'accueil** : grille Plan/
Simulation, chips « Reprendre », section « À entretenir » (les révisions passent par le
programme ; `startRevision` reste pour la reprise vacances). **Fractionné 25/5 retiré**
partout (`toggleInterval`, `timer.interval`, phases work/break de `tick`/`paintSession`,
`fractionedInsight`) ; le champ `interval` des anciennes séances reste en base, ignoré.
Cas limites : répertoire vide ou vacances → `playSheet` ouvre directement `altSheet`
(pas de programme creux). `planSheet`/`launchPlan` : `planSheet` supprimé, `launchPlan`
réutilisé par « Commencer ».

**Prompt (archive) :**

```
Lot V5-1 du cycle « Épure » (direction validée, voir ROADMAP-V5.md) — Bêta 5.1.
Programme du jour : unifier les six chemins de démarrage en un seul geste.
COMMENCE PAR UNE MAQUETTE : décris précisément (contenu de la feuille, états, ce qui
disparaît de l'accueil, pas de code) et attends ma validation avant de coder. Questions
à trancher dans la maquette : sort des chips « Reprendre » et de la section « À entretenir »
de l'accueil (doublons probables du programme — proposer de les retirer ou les fondre).

1) Feuille « Jouer » (remplace le rôle central de startSheet ET l'entrée planSheet
   depuis l'accueil) :
   - À l'ouverture, le programme du jour est DÉJÀ composé et affiché : réutilise
     generatePlan() avec S.settings.planPrefs comme derniers réglages connus ; les
     révisions dues (revisionList) s'y intègrent comme aujourd'hui via le bloc entretien.
     Aperçu = liste des blocs (pièce/section, durée, consigne du premier bloc).
   - CTA primaire unique « Commencer » → startPlanSession(plan) tel quel.
   - Dépliant « Ajuster » (replié par défaut) : les 3 réglages de l'actuel planSheet
     (durée / nombre de pièces / intention), aperçu régénéré en direct (regenPlanPreview),
     réglages mémorisés dans planPrefs comme aujourd'hui.
   - Lien sobre « Autrement… » en bas → feuille secondaire : séance libre (chrono ou
     minuteur + choix du morceau — l'actuel startSheet allégé), simulation concert
     (concertSheet), séance oubliée (aposterioriSheet). Une entrée = une ligne, pas de
     formulaire mélangé.
2) Accueil (js/home.js), changements MINIMAUX liés au démarrage :
   - Le CTA « Démarrer une séance » devient « Jouer » et ouvre la feuille ci-dessus ;
     sous-titre discret résumant le programme composé (ex. « Nocturne — développement ·
     45 min ») pour que la proposition soit visible avant même le tap.
   - Retirer la grille Plan guidé / Simulation (absorbée par la feuille) et le bouton
     « Réviser » de l'en-tête « À entretenir » (les révisions passent par le programme).
     startRevision() RESTE en fonction (la feuille de reprise vacances l'utilise).
   - Ne touche à rien d'autre sur l'accueil (anneau, alertes, semaine, citation…).
3) Retrait complet du fractionné 25/5 : toggle du démarrage, timer.interval et ses
   phases work/break dans tick(), affichage associé en séance, et fractionedInsight()
   dans les Aperçus des Stats. Les anciennes séances gardent leur champ interval dans
   les données (ignoré partout, aucune migration). CLAUDE.md à mettre à jour en
   conséquence (sessions[], étape 5 V3).
4) Cas limites : répertoire vide ou aucune pièce active → la feuille « Jouer » propose
   la séance libre/improvisation directement, sans plan creux ; mode vacances actif →
   comportement actuel conservé (bannière, pas de programme).
5) Vérifie au dev server (config « app ») : programme composé avec révisions dues,
   sans révisions, ajustement des réglages, séance libre via « Autrement… », concert,
   séance oubliée, répertoire vide ; npm test doit passer (adapter les appels de test
   si startSheet change de signature).

Contraintes : diffs ciblés ; node --check sur chaque js modifié ; npm test doit passer ;
incrémente CACHE (sw.js) en piano-b5-1 ET APP_VERSION (js/state.js) en 'Bêta 5.1' ;
pas d'emoji ; français sobre. Coche V5-1 dans ROADMAP-V5.md, mets à jour CLAUDE.md
(démarrage unifié, retrait fractionné). Termine par un commit (message français, style
des commits existants).
```

---

## Lot V5-2 — Navigation : 4 onglets, écran « Parcours » (Bêta 5.2)

**But** : un concept = un endroit. Plus aucun sous-onglet dans l'app ; la gamification et
les statistiques racontent une seule histoire, celle du chemin parcouru.

**Prompt à coller :**

```
Lot V5-2 du cycle « Épure » (voir ROADMAP-V5.md, V5-1 livré) — Bêta 5.2.
Navigation aplatie : tab bar à 4 onglets, fusion Voyage+Stats en « Parcours »,
retrait complet du Jardin.
COMMENCE PAR UNE MAQUETTE : ordre et hiérarchie des sections de Parcours (qu'est-ce qui
est visible d'emblée, qu'est-ce qui est replié), et attends ma validation avant de coder.

1) Tab bar (index.html) : Accueil · Carnet · Répertoire · Parcours. go() et les écrans
   suivent (écran #s-parcours remplace #s-voyage et #s-stats ; conserver des alias
   go('voyage')/go('stats') → 'parcours' si des liens internes y pointent).
2) Écran Parcours = UN SEUL écran défilant, sans sous-onglets ni onglets internes.
   Ordre proposé (à confirmer en maquette) : carte du rang courant (avec le dépliant
   ±3 rangs / 18 rangs existant) → défis en cours (hebdo/mensuel) → activité (l'actuel
   renderStatsActivite) → répertoire & aperçus (renderStatsRep) → cartes compositeurs →
   records & rétrospective (renderStatsRecords). Les sections lourdes sont repliées par
   défaut (dépliants sobres), pour éviter l'écran-fleuve : visible d'emblée = rang,
   défis, activité de la semaine.
3) Retrait complet du Jardin : renderJardin() et tout son code SVG (js/gamification.js),
   le sous-onglet, les classes CSS .jb-* (index.html). Aucune migration : l'arbre était
   entièrement dérivé, aucune donnée utilisateur n'est stockée pour lui.
4) Fichiers : fusionner js/voyage.js et js/stats.js en js/parcours.js (l'ordre entre
   state.js et boot.js est libre). METS À JOUR LES TROIS LISTES EN MIROIR : index.html
   (balises script), sw.js (ASSETS, qui passe à 13 fichiers js), test.mjs (FILES).
5) Points d'entrée à revérifier : alertes de l'accueil (reportSheet, monthReportSheet),
   rétrospective annuelle (yearRetroSheet), célébrations de rang/défi, liens éventuels
   vers go('stats')/go('voyage') dans les autres modules (grep).
6) Vérifie au dev server : navigation complète sur les 4 onglets, chaque section de
   Parcours (dépliants compris), rapport hebdo/mensuel depuis l'accueil, rétrospective ;
   npm test doit passer (FILES adapté).

Contraintes : diffs ciblés ; node --check ; npm test doit passer ; incrémente CACHE (sw.js)
en piano-b5-2 ET APP_VERSION (js/state.js) en 'Bêta 5.2' ; pas d'emoji ; français sobre.
Coche V5-2 dans ROADMAP-V5.md, mets à jour CLAUDE.md (fichiers, navigation, retrait
Jardin). Termine par un commit (message français).
```

---

## Lot V5-3 — Réglages & partage (Bêta 5.3)

**But** : l'app devient donnable à un ami telle quelle — on se présente au premier
lancement, rien dans l'interface ne suppose Florian, et les Réglages expliquent où
vivent les données.

**Prompt à coller :**

```
Lot V5-3 du cycle « Épure » (voir ROADMAP-V5.md, V5-1 et V5-2 livrés) — Bêta 5.3.
Réglages & partage : profil, premier lancement, nettoyage des Réglages, à propos,
réinitialisation. L'app doit pouvoir être installée par quelqu'un d'autre depuis la même
URL GitHub Pages sans qu'aucun texte ni réglage ne suppose Florian (les données sont déjà
isolées par appareil, rien à cloisonner).

1) Profil (js/state.js + js/settings.js + js/home.js) :
   - S.settings.userName (string, défaut null, migration dans migrate()).
   - Accueil : « Bonjour Florian » codé en dur (js/home.js) devient
     userName ? `Bonjour ${esc(userName)}` : 'Bonjour' — jamais de prénom inventé.
   - Réglages : nouveau groupe « Profil » EN TÊTE de l'écran, ligne « Prénom » (feuille
     d'édition texte simple, vide autorisé). C'est là que Florian saisira le sien une fois.
2) Premier lancement (js/boot.js) — UNIQUEMENT sur état vierge (aucune pièce ET aucune
   séance) et jamais revu ensuite (marqueur S.onboarded, migration : true si des données
   existent déjà, pour ne jamais l'imposer à l'installation actuelle) :
   - Feuille de bienvenue sobre, 3 écrans max dans la même feuille (pas de carrousel
     complexe) : (a) bienvenue + une phrase sur ce qu'est l'app et où vivent les données
     (100 % sur cet appareil) ; (b) prénom (facultatif) + objectif du jour (stepper,
     défaut 20 min) ; (c) invitation à ajouter un premier morceau (bouton vers
     addChoiceSheet) ou « Explorer d'abord ».
   - Ton : sobre, aucune gamification vantée, pas de demande de notifications ici.
3) Nettoyage des Réglages (js/settings.js) :
   - RETIRER le bloc « Sauvegarde NAS » (toggle mort, stub « étape B » jamais construit,
     chantier reporté V6+). Le champ settings.nas reste dans defaults()/migrate() pour
     compatibilité des exports, plus aucune UI.
   - Nouvelle ligne « Partager l'app » (groupe Données) : navigator.share avec l'URL de
     l'app (location.origin+location.pathname) si disponible, sinon copie dans le
     presse-papier + toast. Aucune donnée personnelle dans l'URL.
   - Nouvelle ligne « À propos » : feuille courte — ce qu'est l'app, données 100 % locales
     (jamais de serveur), conseil d'export JSON régulier et avant tout changement
     d'appareil/d'URL, version affichée.
   - Nouvelle ligne « Réinitialiser l'app » (en bas du groupe Données, ton neutre) :
     confirmSheet en DEUX temps — la feuille propose d'abord « Exporter avant » (bouton
     exportJSON) puis le bouton danger efface S (retour aux defaults), vide le store
     recordings, saveNow(), retour à l'accueil vierge (qui déclenchera la bienvenue).
4) Portabilité des textes : grep du code à la recherche de tout autre texte qui suppose
   Florian ou son installation (prénom, matériel, NAS…) — signale-moi ce que tu trouves
   au-delà du salut de l'accueil avant de le changer.
5) Vérifie au dev server : premier lancement sur état vierge (bienvenue → prénom →
   objectif → premier morceau), salut avec et sans prénom, partage (repli presse-papier),
   à propos, réinitialisation complète (recordings compris) puis re-bienvenue ;
   état existant : PAS de feuille de bienvenue après migration ; npm test doit passer.

Contraintes : diffs ciblés ; node --check ; npm test doit passer ; incrémente CACHE (sw.js)
en piano-b5-3 ET APP_VERSION (js/state.js) en 'Bêta 5.3' ; pas d'emoji ; français sobre.
Coche V5-3 dans ROADMAP-V5.md, mets à jour CLAUDE.md (userName, onboarded, retrait UI NAS,
modèle de données). Termine par un commit (message français).
```

---

## Lot V5-4 — Élagage résiduel, polish & QA (Bêta 5.4)

**But** : la passe qui fait tenir l'ensemble — traquer ce que les lots précédents ont
laissé mort, vérifier la règle « jamais deux chemins », valider sur iPhone.

**Prompt à coller :**

```
Lot V5-4, dernier lot du cycle « Épure » (voir ROADMAP-V5.md, V5-1 à V5-3 livrés) — Bêta 5.4.
Élagage résiduel + polish + QA. Aucune fonctionnalité nouvelle.

1) Code mort : grep sur les résidus du fractionné (interval, work/brk, fractionedInsight)
   et du Jardin (jb-, renderJardin, grow) — code JS et classes CSS d'index.html ; retire
   ce qui reste. Vérifie que le champ interval des anciennes séances ne fait plus rien
   nulle part (lecture comprise).
2) Règle « jamais deux chemins visibles vers la même action » : passe en revue les points
   d'entrée restants (accueil, fiches, réglages) et signale-moi toute redondance résiduelle
   AVANT de la retirer (liste courte, on tranche ensemble).
3) Réglages : relecture d'ensemble après la réorganisation du lot V5-3 (ordre des groupes,
   libellés, cohérence avec la navigation sans sous-onglets Stats) ;
   rien à retirer sans me le proposer d'abord.
4) Textes : relecture des libellés nés du cycle (feuille Jouer, Autrement…, Parcours,
   bienvenue, à propos) — français sobre, minuscules de phrase, cohérence avec l'existant.
5) Mets à jour CLAUDE.md : cycle V5 marqué terminé, sections Fichiers / navigation /
   modèle de données / État & feuille de route à jour ; coche V5-4 dans ROADMAP-V5.md.
6) Donne-moi en fin de session une checklist de validation sur iPhone réel (7 points max) :
   feuille Jouer au doigt (programme, ajuster, autrement), séance complète depuis le
   programme, navigation 4 onglets + dépliants Parcours, rapport hebdo depuis l'accueil,
   premier lancement + réinitialisation (idéalement via un second appareil ou un autre
   navigateur, pour vivre ce que vivra l'ami), et la vérification héritée de V3 —
   correctif écran-verrouillé pendant un enregistrement (Bêta 3.12), toujours pas
   revalidé sur appareil.

Contraintes : diffs ciblés ; node --check ; npm test doit passer ; incrémente CACHE (sw.js)
en piano-b5-4 ET APP_VERSION (js/state.js) en 'Bêta 5.4' ; pas d'emoji ; français sobre.
Termine par un commit (message français).
```

---

## Hors périmètre de ce cycle (candidats V6+)

- **Carnet de fin de séance allégé** (deux temps : l'essentiel à chaud, le détail après
  coup) — écarté des priorités V5, premier candidat V6.
- **Refonte complète de l'accueil** (au-delà des retraits du lot V5-1).
- Thème clair « Nacre ».
- Sauvegarde auto NAS Synology ; synchro multi-appareils.
- Éventuelle migration React+TS+Vite ou app SwiftUI native.
- Push iOS réel (nécessite un serveur VAPID) — on reste sur les notifications locales.
