/* ==========================================================================
   methods.js — CATALOGUE DE MÉTHODES DE TRAVAIL (V6).
   Des idées, jamais des consignes. Regroupées par « situation » (ce que je
   suis en train de faire) ; la situation est facultative. Principes largement
   inspirés de Chang (Fundamentals of Piano Practice), reformulés.
   Données pures + une feuille « bibliothèque » consultable depuis l'accueil.
   ========================================================================== */
const SITUATIONS = [
  {k:'dechiffrer', label:'Déchiffrer'},
  {k:'difficile',  label:'Passage difficile'},
  {k:'vitesse',    label:'Vitesse & aisance'},
  {k:'memoire',    label:'Mémoriser'},
  {k:'musique',    label:'Musicalité'},
  {k:'concert',    label:'Préparer un concert'},
];
const METHODS = [
  {s:'dechiffrer',t:'Lire avant de jouer',d:'Tonalité, mesure, forme, passages qui se répètent : un tour de la partition sans toucher le clavier.'},
  {s:'dechiffrer',t:'Mains séparées',d:'Chaque main seule jusqu’à ce que les notes soient sûres. On assemble ensuite.'},
  {s:'dechiffrer',t:'Petits segments',d:'Une ou deux mesures à la fois. On n’enchaîne que ce qui est déjà sûr.'},
  {s:'dechiffrer',t:'Doigté fixé',d:'Choisis un doigté dès le départ et tiens-t’y : le changer plus tard coûte cher.'},
  {s:'dechiffrer',t:'Le plus dur d’abord',d:'Commence par le passage qui fait peur, pas par le début du morceau.'},

  {s:'difficile',t:'Isoler et boucler',d:'Réduis le passage à quelques notes et joue-les en boucle continue, sans t’arrêter entre les répétitions.'},
  {s:'difficile',t:'Soigner la jonction',d:'Travaille le raccord entre deux segments, en les faisant se chevaucher d’une note.'},
  {s:'difficile',t:'Accords parallèles',d:'Plaque chaque groupe de notes en un seul accord pour apprendre la position de la main, puis déroule.'},
  {s:'difficile',t:'Rythmes variés',d:'Joue le passage pointé, puis en rythme inversé : les doigts s’égalisent.'},
  {s:'difficile',t:'Lent ↔ tempo',d:'Alterne lent et tempo cible. Ne t’installe pas dans le lent : il cache les vrais problèmes.'},

  {s:'vitesse',t:'Directement au tempo',d:'Vise le tempo cible sur deux à quatre notes, plutôt que de monter par petits paliers.'},
  {s:'vitesse',t:'Relâchement',d:'Vérifie épaules, poignets, avant-bras. La vitesse vient d’une main détendue, pas d’un effort.'},
  {s:'vitesse',t:'Au-delà puis en deçà',d:'Passe brièvement au-dessus du tempo : en revenant, le tempo paraît confortable.'},
  {s:'vitesse',t:'Mains ensemble, courts segments',d:'Assemble les mains seulement quand chacune est sûre seule, et par petits morceaux.'},
  {s:'vitesse',t:'Finir lent',d:'Termine par un passage lent et propre, pour ne pas ancrer les approximations du rapide.'},

  {s:'memoire',t:'Mémoriser en apprenant',d:'Retiens chaque segment pendant que tu l’apprends, pas une fois le morceau terminé.'},
  {s:'memoire',t:'Jouer en pensée',d:'Loin du clavier, rejoue le passage dans ta tête, note à note, mains comprises.'},
  {s:'memoire',t:'Plusieurs points d’entrée',d:'Sache repartir du début de chaque section, pas seulement du début du morceau.'},
  {s:'memoire',t:'Mains séparées de mémoire',d:'Chaque main seule, sans la partition. Ce qui tient seul tiendra ensemble.'},
  {s:'memoire',t:'Comprendre l’harmonie',d:'Nomme les accords et la forme : la mémoire analytique résiste au trac mieux que celle des doigts.'},

  {s:'musique',t:'Chanter la ligne',d:'Fredonne la mélodie avant de la jouer : le phrasé vient de la voix.'},
  {s:'musique',t:'S’écouter',d:'Un court enregistrement, écouté une fois sans jouer. On entend ce qu’on ne remarque pas en jouant.'},
  {s:'musique',t:'Nuances exagérées',d:'Exagère les contrastes pour sentir l’amplitude possible, puis dose.'},
  {s:'musique',t:'Phrasé',d:'Où respire la phrase ? Repère son sommet et sa fin, et joue vers eux.'},
  {s:'musique',t:'Une référence',d:'Écoute une interprétation que tu aimes, puis joue sans chercher à l’imiter.'},

  {s:'concert',t:'Filage sans arrêt',d:'Du début à la fin, quoi qu’il arrive. On ne revient pas en arrière.'},
  {s:'concert',t:'À froid',d:'Joue le morceau sans échauffement, comme en arrivant sur scène.'},
  {s:'concert',t:'Repartir',d:'Entraîne-toi à continuer après une erreur, en retombant sur le prochain temps fort.'},
  {s:'concert',t:'Pour quelqu’un',d:'Un auditeur, ou simplement un enregistrement, change tout. Autant s’y habituer.'},
  {s:'concert',t:'La veille, lentement',d:'Un filage lent et attentif plutôt qu’un dernier passage à toute vitesse.'},
];
function situationLabel(k){const s=SITUATIONS.find(x=>x.k===k);return s?s.label:'';}
function methodsFor(k){return k?METHODS.filter(m=>m.s===k):METHODS.slice();}
// Suggestion du jour (accueil) : stable sur la journée, change chaque jour.
function methodOfDay(){const k=dkey();let h=0;for(const c of k)h=(h*31+c.charCodeAt(0))>>>0;return METHODS[h%METHODS.length];}

/* ---------- Bibliothèque (feuille) ---------- */
function methodsSheet(focus){
  const list=focus?SITUATIONS.filter(s=>s.k===focus):SITUATIONS;
  openSheet(`<h3>Méthodes de travail</h3>
    <p class="muted sheet-sub">Des idées à piocher, jamais des consignes.</p>
    <div class="chips mb10">
      <button class="chip ${focus?'':'on'}" onclick="methodsSheet()">Toutes</button>
      ${SITUATIONS.map(s=>`<button class="chip ${focus===s.k?'on':''}" onclick="methodsSheet('${s.k}')">${s.label}</button>`).join('')}
    </div>
    ${list.map(s=>`<div class="eyebrow lib-head">${s.label}</div>
      ${methodsFor(s.k).map(m=>`<div class="lib-item"><div class="lib-title">${esc(m.t)}</div><div class="muted lib-text">${esc(m.d)}</div></div>`).join('')}`).join('')}
    <button class="btn ghost sm btn-full mt18" onclick="closeSheet()">Fermer</button>`);
}
