/* Instantané Open Opus (hors-ligne) + recherche en ligne.
   Compositeurs favoris pré-chargés ; le reste du catalogue est interrogeable en ligne. */
window.OPUS = (function () {
  const COMPOSERS = [
    { id: "152", name: "Chopin",       full: "Frédéric Chopin",         epoch: "Romantique" },
    { id: "145", name: "Beethoven",    full: "Ludwig van Beethoven",    epoch: "Classique" },
    { id: "196", name: "Mozart",       full: "W. A. Mozart",            epoch: "Classique" },
    { id: "183", name: "Schubert",     full: "Franz Schubert",          epoch: "Romantique" },
    { id: "129", name: "Schumann",     full: "Robert Schumann",         epoch: "Romantique" },
    { id: "79",  name: "Tchaïkovski",  full: "Piotr Ilitch Tchaïkovski",epoch: "Romantique" },
    { id: "188", name: "Rachmaninov",  full: "Sergueï Rachmaninov",     epoch: "Post-romantique" },
  ];
  const W = (title, opus, genre, key, diff) => ({ title, opus, genre, key, diff });
  const WORKS = {
    "Chopin": [
      W("Nocturne op. 9 no 2", "op. 9 no 2", "Nocturne", "Mi♭ majeur", 6),
      W("Nocturne op. 27 no 2", "op. 27 no 2", "Nocturne", "Ré♭ majeur", 7),
      W("Ballade no 1", "op. 23", "Ballade", "Sol mineur", 8),
      W("Étude « Tristesse »", "op. 10 no 3", "Étude", "Mi majeur", 7),
      W("Étude « Révolutionnaire »", "op. 10 no 12", "Étude", "Do mineur", 8),
      W("Étude « Vent d'hiver »", "op. 25 no 11", "Étude", "La mineur", 9),
      W("Valse « Minute »", "op. 64 no 1", "Valse", "Ré♭ majeur", 5),
      W("Valse op. 64 no 2", "op. 64 no 2", "Valse", "Do♯ mineur", 5),
      W("Fantaisie-Impromptu", "op. 66", "Impromptu", "Do♯ mineur", 8),
      W("Polonaise « Héroïque »", "op. 53", "Polonaise", "La♭ majeur", 8),
      W("Prélude op. 28 no 4", "op. 28 no 4", "Prélude", "Mi mineur", 3),
      W("Prélude « Goutte d'eau »", "op. 28 no 15", "Prélude", "Ré♭ majeur", 5),
      W("Scherzo no 2", "op. 31", "Scherzo", "Si♭ mineur", 9),
    ],
    "Beethoven": [
      W("Sonate « Clair de lune »", "op. 27 no 2", "Sonate", "Do♯ mineur", 6),
      W("Sonate « Pathétique »", "op. 13", "Sonate", "Do mineur", 7),
      W("Sonate « Waldstein »", "op. 53", "Sonate", "Do majeur", 8),
      W("Sonate « Appassionata »", "op. 57", "Sonate", "Fa mineur", 9),
      W("Sonate « La Tempête »", "op. 31 no 2", "Sonate", "Ré mineur", 7),
      W("Sonate no 32", "op. 111", "Sonate", "Do mineur", 9),
      W("Bagatelle « Für Elise »", "WoO 59", "Bagatelle", "La mineur", 3),
      W("Rondo a capriccio", "op. 129", "Rondo", "Sol majeur", 7),
    ],
    "Mozart": [
      W("Sonate « Alla turca »", "K. 331", "Sonate", "La majeur", 6),
      W("Sonate facile", "K. 545", "Sonate", "Do majeur", 4),
      W("Sonate K. 310", "K. 310", "Sonate", "La mineur", 7),
      W("Fantaisie K. 397", "K. 397", "Fantaisie", "Ré mineur", 5),
      W("Rondo K. 485", "K. 485", "Rondo", "Ré majeur", 5),
      W("Ah vous dirai-je maman", "K. 265", "Variations", "Do majeur", 5),
    ],
    "Schubert": [
      W("Impromptu op. 90 no 3", "op. 90 no 3", "Impromptu", "Sol♭ majeur", 7),
      W("Impromptu op. 90 no 4", "op. 90 no 4", "Impromptu", "La♭ majeur", 7),
      W("Moment musical no 3", "op. 94 no 3", "Moment musical", "Fa mineur", 4),
      W("Impromptu op. 142 no 2", "op. 142 no 2", "Impromptu", "La♭ majeur", 6),
      W("Sonate D. 960", "D. 960", "Sonate", "Si♭ majeur", 8),
    ],
    "Schumann": [
      W("Träumerei (Scènes d'enfants)", "op. 15 no 7", "Pièce", "Fa majeur", 4),
      W("Arabeske", "op. 18", "Arabesque", "Do majeur", 6),
      W("Fantasiestücke", "op. 12", "Cycle", "", 7),
      W("Carnaval", "op. 9", "Cycle", "", 8),
      W("Toccata", "op. 7", "Toccata", "Do majeur", 9),
    ],
    "Tchaïkovski": [
      W("Juin : Barcarolle (Les Saisons)", "op. 37a", "Pièce", "Sol mineur", 5),
      W("Novembre : Troïka (Les Saisons)", "op. 37a", "Pièce", "Mi majeur", 5),
      W("Album pour la jeunesse", "op. 39", "Cycle", "", 3),
      W("Dumka", "op. 59", "Pièce", "Do mineur", 7),
    ],
    "Rachmaninov": [
      W("Prélude « Cloches de Moscou »", "op. 3 no 2", "Prélude", "Do♯ mineur", 7),
      W("Prélude op. 23 no 5", "op. 23 no 5", "Prélude", "Sol mineur", 8),
      W("Prélude op. 32 no 12", "op. 32 no 12", "Prélude", "Sol♯ mineur", 7),
      W("Moment musical no 4", "op. 16 no 4", "Moment musical", "Mi mineur", 9),
      W("Étude-tableau op. 39 no 6", "op. 39 no 6", "Étude-tableau", "La mineur", 9),
    ],
  };

  // Base élargie de compositeurs (hors-ligne) — nom, époque (FR), naissance, décès.
  const C = (n, e, b, d) => ({ name: n, epoch: e, b, d });
  const ALL = [
    C("Monteverdi","Renaissance",1567,1643),C("Frescobaldi","Baroque",1583,1643),C("Purcell","Baroque",1659,1695),
    C("Corelli","Baroque",1653,1713),C("Pachelbel","Baroque",1653,1706),C("Buxtehude","Baroque",1637,1707),
    C("Vivaldi","Baroque",1678,1741),C("Albinoni","Baroque",1671,1751),C("Telemann","Baroque",1681,1767),
    C("Rameau","Baroque",1683,1764),C("Couperin","Baroque",1668,1733),C("Bach","Baroque",1685,1750),
    C("Handel","Baroque",1685,1759),C("Scarlatti","Baroque",1685,1757),C("C.P.E. Bach","Classique",1714,1788),
    C("Gluck","Classique",1714,1787),C("Haydn","Classique",1732,1809),C("J.C. Bach","Classique",1735,1782),
    C("Boccherini","Classique",1743,1805),C("Clementi","Classique",1752,1832),C("Mozart","Classique",1756,1791),
    C("Salieri","Classique",1750,1825),C("Cimarosa","Classique",1749,1801),C("Beethoven","Classique",1770,1827),
    C("Paganini","Romantique",1782,1840),C("Rossini","Romantique",1792,1868),C("Schubert","Romantique",1797,1828),
    C("Donizetti","Romantique",1797,1848),C("Bellini","Romantique",1801,1835),C("Berlioz","Romantique",1803,1869),
    C("Mendelssohn","Romantique",1809,1847),C("Chopin","Romantique",1810,1849),C("Schumann","Romantique",1810,1856),
    C("Liszt","Romantique",1811,1886),C("Verdi","Romantique",1813,1901),C("Wagner","Romantique",1813,1883),
    C("Alkan","Romantique",1813,1888),C("Offenbach","Romantique",1819,1880),C("Franck","Romantique",1822,1890),
    C("Smetana","Romantique",1824,1884),C("Bruckner","Romantique",1824,1896),C("Johann Strauss II","Romantique",1825,1899),
    C("Borodin","Romantique",1833,1887),C("Brahms","Romantique",1833,1897),C("Saint-Saëns","Romantique",1835,1921),
    C("Bizet","Romantique",1838,1875),C("Moussorgski","Romantique",1839,1881),C("Tchaïkovski","Romantique",1840,1893),
    C("Dvořák","Romantique",1841,1904),C("Grieg","Romantique",1843,1907),C("Rimski-Korsakov","Romantique",1844,1908),
    C("Fauré","Romantique",1845,1924),C("Janáček","Post-romantique",1854,1928),C("Elgar","Post-romantique",1857,1934),
    C("Puccini","Post-romantique",1858,1924),C("Albéniz","Romantique",1860,1909),C("Mahler","Post-romantique",1860,1911),
    C("Wolf","Post-romantique",1860,1903),C("Debussy","Post-romantique",1862,1918),C("Delius","Post-romantique",1862,1934),
    C("Richard Strauss","Post-romantique",1864,1949),C("Sibelius","Post-romantique",1865,1957),C("Nielsen","Post-romantique",1865,1931),
    C("Satie","XXe siècle",1866,1925),C("Granados","Romantique",1867,1916),C("Scriabine","Post-romantique",1872,1915),
    C("Rachmaninov","Post-romantique",1873,1943),C("Reger","Post-romantique",1873,1916),C("Holst","XXe siècle",1874,1934),
    C("Schoenberg","XXe siècle",1874,1951),C("Ives","XXe siècle",1874,1954),C("Ravel","Post-romantique",1875,1937),
    C("Falla","XXe siècle",1876,1946),C("Respighi","XXe siècle",1879,1936),C("Bartók","XXe siècle",1881,1945),
    C("Kodály","XXe siècle",1882,1967),C("Stravinsky","XXe siècle",1882,1971),C("Webern","XXe siècle",1883,1945),
    C("Berg","XXe siècle",1885,1935),C("Villa-Lobos","XXe siècle",1887,1959),C("Prokofiev","XXe siècle",1891,1953),
    C("Honegger","XXe siècle",1892,1955),C("Milhaud","XXe siècle",1892,1974),C("Hindemith","XXe siècle",1895,1963),
    C("Gershwin","XXe siècle",1898,1937),C("Poulenc","XXe siècle",1899,1963),C("Copland","XXe siècle",1900,1990),
    C("Rodrigo","XXe siècle",1901,1999),C("Chpostakovitch","XXe siècle",1906,1975),C("Messiaen","XXe siècle",1908,1992),
    C("Barber","XXe siècle",1910,1981),C("Cage","XXe siècle",1912,1992),C("Britten","XXe siècle",1913,1976),
    C("Bernstein","XXe siècle",1918,1990),C("Boulez","Contemporain",1925,2016),C("Stockhausen","Contemporain",1928,2007),
    C("Górecki","Contemporain",1933,2010),C("Penderecki","Contemporain",1933,2020),C("Schnittke","Contemporain",1934,1998),
    C("Pärt","Contemporain",1935,null),C("Reich","Contemporain",1936,null),C("Glass","Contemporain",1937,null),
    C("Adams","Contemporain",1947,null),C("Ludovico Einaudi","Contemporain",1955,null),
  ];

  const epochFr = (e) => ({
    "Medieval": "Médiéval", "Renaissance": "Renaissance", "Baroque": "Baroque",
    "Classical": "Classique", "Early Romantic": "Romantique", "Romantic": "Romantique",
    "Late Romantic": "Post-romantique", "20th Century": "XXe siècle",
    "Post-War": "Contemporain", "21st Century": "Contemporain",
  }[e] || e || "");

  // Recherche locale (instantané). Renvoie {composers:[], works:[]}
  function localSearch(q) {
    q = (q || "").trim().toLowerCase();
    if (!q) return { composers: [], works: [] };
    const composers = ALL.filter(c =>
      c.name.toLowerCase().includes(q)).slice(0, 8);
    const works = [];
    Object.keys(WORKS).forEach(cn => {
      WORKS[cn].forEach(w => {
        if (w.title.toLowerCase().includes(q) || cn.toLowerCase().includes(q) ||
            (w.opus || "").toLowerCase().includes(q)) {
          works.push(Object.assign({ composer: cn, epoch: composerByName(cn).epoch }, w));
        }
      });
    });
    return { composers, works: works.slice(0, 12) };
  }
  function worksOf(name) {
    return (WORKS[name] || []).map(w => Object.assign({ composer: name, epoch: composerByName(name).epoch }, w));
  }
  function composerByName(n) { const a = ALL.find(c => c.name === n) || {}; const f = COMPOSERS.find(c => c.name === n) || {}; return Object.assign({ epoch: "" }, a, f, { epoch: f.epoch || a.epoch }); }

  // Recherche en ligne (Open Opus). Repli silencieux sur le local si hors-ligne.
  async function onlineComposer(q) {
    try {
      const r = await fetch("https://api.openopus.org/composer/list/search/" + encodeURIComponent(q) + ".json");
      const d = await r.json();
      if (d && d.composers) return d.composers.map(c => ({ id: c.id, name: c.name, full: c.complete_name, epoch: epochFr(c.epoch), portrait: c.portrait, birth: c.birth, death: c.death }));
    } catch (e) {}
    return [];
  }
  async function onlineWorks(composerId, composerName, epoch) {
    try {
      const r = await fetch("https://api.openopus.org/work/list/composer/" + composerId + "/genre/Keyboard.json");
      const d = await r.json();
      if (d && d.works) return d.works.map(w => ({
        title: cleanTitle(w.title), opus: extractOpus(w.title), genre: w.genre || "", key: extractKey(w.title),
        diff: 0, composer: composerName, epoch: epoch, popular: w.popular === "1" }));
    } catch (e) {}
    return [];
  }
  function cleanTitle(t) { return t.replace(/,?\s*(op\.|K\.|D\.|WoO|BWV|Hess).*$/i, "").trim() || t; }
  function extractOpus(t) { const m = t.match(/(op\.\s*\d+[a-z]?(\s*no\.?\s*\d+)?|K\.\s*\d+|D\.\s*\d+|WoO\s*\d+|BWV\s*\d+)/i); return m ? m[0].replace(/no\./i, "no") : ""; }
  function extractKey(t) {
    const m = t.match(/in ([A-G])(\s*(flat|sharp))? (major|minor)/i);
    if (!m) return "";
    const note = { A: "La", B: "Si", C: "Do", D: "Ré", E: "Mi", F: "Fa", G: "Sol" }[m[1].toUpperCase()];
    const alt = m[3] ? (/flat/i.test(m[3]) ? "♭" : "♯") : "";
    const mode = /major/i.test(m[4]) ? "majeur" : "mineur";
    return note + alt + " " + mode;
  }

  return { COMPOSERS, ALL, WORKS, epochFr, localSearch, worksOf, composerByName, onlineComposer, onlineWorks };
})();
