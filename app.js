/* PrésenceClass – Projet 5 : Gestion de présence en classe */
const $ = s => document.querySelector(s);
const STAT = ['Présent', 'Absent Justifié', 'Absent Non Justifié', 'Retard'];
const SHORT = ['Présent', 'Abs. justifié', 'Abs. non just.', 'Retard'];
const COL = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1'];
const NIV = ['L1', 'L2', 'L3', 'M1', 'M2'];
const ANN = [2024, 2025, 2026, 2027];
const PAGES = { dash: 'Tableau de bord', etu: 'Étudiants', cours: 'Cours', pres: 'Présences', fiche: "Fiche d'assiduité", rang: 'Classement' };
const ICON = { dash: '📊', etu: '🎓', cours: '📚', pres: '📝', fiche: '🧾', rang: '🏆' };
let S = { e: [], c: [], p: [] }, page = 'dash';

const opt = o => o.map(x => `<option>${x}</option>`).join('');
const fdate = d => new Date(d).toLocaleDateString('fr-FR');
const EMPTY = '<tr><td colspan="9" class="empty">Aucun résultat. Modifiez la recherche ou ajoutez un élément.</td></tr>';
const toast = m => { const d = document.createElement('div'); d.className = 'toast'; d.textContent = m; $('#toasts').append(d); setTimeout(() => d.remove(), 2800); };
const load = async () => { [S.e, S.c, S.p] = await Promise.all([DB.all('etudiants'), DB.all('cours'), DB.all('presences')]); };
const abs = id => S.p.filter(x => x.insc == id).reduce((a, x) => a + +x.heures, 0);
const obs = h => h == 0 ? ['ASSIDU', 'ok'] : h <= 10 ? ['SITUATION RÉGULIÈRE', 'warn'] : ['DÉFAILLANT', 'bad'];
const badge = h => { const [o, k] = obs(h); return `<span class="badge ${k}">${o}</span>`; };
const stBadge = s => `<span class="badge s${STAT.indexOf(s)}">${s}</span>`;
const cours = c => S.c.find(x => x.code == c)?.libelle || c;
const etu = i => S.e.find(x => x.id == i)?.nom || i;

/* ---------- Données de démonstration ---------- */
async function seed() {
  if ((await DB.all('etudiants')).length) return;
  const E = [['E0001', 'Rindra', 'F', 'L2', 2026], ['E0002', 'Faly', 'M', 'L2', 2026], ['E0003', 'Sitraka', 'M', 'L2', 2026], ['E0004', 'Miora', 'F', 'L1', 2026], ['E0005', 'Tahina', 'M', 'L3', 2026]];
  const C = [['C01', 'Architecture', 'M. Randria', 3, 30], ['C02', 'Base de Données', 'Mme Rakoto', 4, 40], ['C03', 'Algorithmique', 'M. Rabe', 4, 40]];
  for (const [id, nom, sexe, niveau, annee] of E) await DB.put('etudiants', { id, nom, sexe, niveau, annee });
  for (const [code, libelle, enseignant, coef, heures] of C) await DB.put('cours', { code, libelle, enseignant, coef, heures });
  const P = [['E0001', 'C01', '2026-10-14', 'Absent Justifié', 2], ['E0001', 'C02', '2026-10-15', 'Retard', 0], ['E0002', 'C01', '2026-10-14', 'Présent', 0], ['E0003', 'C02', '2026-10-15', 'Absent Non Justifié', 12], ['E0003', 'C03', '2026-10-16', 'Absent Justifié', 1], ['E0004', 'C03', '2026-10-16', 'Présent', 0], ['E0005', 'C01', '2026-10-14', 'Absent Non Justifié', 4]];
  let n = 0;
  for (const [insc, cours, dateSeance, statut, heures] of P) await DB.put('presences', { id: 'P' + (++n), insc, cours, dateSeance, statut, heures });
}

/* ---------- Fenêtre de formulaire ---------- */
function form(title, F, v, save) {
  const m = $('#modal');
  m.innerHTML = `<form class="card pop"><h3>${title}</h3>${F.map(f => `<label>${f.l}${f.o
    ? `<select name="${f.k}">${f.o.map(o => { const [a, b] = Array.isArray(o) ? o : [o, o]; return `<option value="${a}" ${v[f.k] == a ? 'selected' : ''}>${b}</option>`; }).join('')}</select>`
    : `<input name="${f.k}" type="${f.t || 'text'}" min="0" value="${v[f.k] ?? ''}" ${f.ro ? 'readonly' : ''} required>`}</label>`).join('')}
    <div class="row"><button type="button" class="btn ghost" id="x">Annuler</button><button class="btn">Enregistrer</button></div></form>`;
  m.classList.remove('hidden');
  $('#x').onclick = () => m.classList.add('hidden');
  m.onclick = e => { if (e.target === m) m.classList.add('hidden'); };
  m.querySelector('form').onsubmit = async ev => {
    ev.preventDefault();
    if (await save(Object.fromEntries(new FormData(ev.target))) === false) return;
    m.classList.add('hidden'); await load(); render();
  };
}

/* ---------- Listes avec recherche, filtres, ajout, modification, suppression ---------- */
const edit = (c, k) => {
  const r = k ? c.rows().find(x => x[c.key] == k) : {};
  form(k ? 'Modifier' : 'Ajouter', c.F().map(f => k && f.k == c.key ? { ...f, ro: 1 } : f), r, async d => {
    if (c.auto) d.id = k || 'P' + Date.now();
    else if (!k && c.rows().some(x => x[c.key] == d[c.key])) { toast(c.dup); return false; }
    await DB.put(c.store, d); toast('Enregistré ✔');
  });
};

function list(c) {
  let q = '', fl = {};
  $('#view').innerHTML = `<div class="bar2"><input id="q" class="search" placeholder="🔍 Rechercher…">
    ${(c.fil || []).map(f => `<select data-k="${f.k}"><option value="">${f.l} : tous</option>${opt(f.o)}</select>`).join('')}
    <span id="cnt" class="chip"></span><button class="btn" id="add">＋ Ajouter</button></div>
    <div class="card tw"><table><thead><tr>${c.cols.map(x => `<th>${x[0]}</th>`).join('')}<th></th></tr></thead><tbody id="tb"></tbody></table></div>`;
  const draw = () => {
    const R = c.rows().filter(r => JSON.stringify(Object.values(r)).toLowerCase().includes(q) && Object.entries(fl).every(([k, x]) => !x || r[k] == x));
    $('#cnt').textContent = 'Effectif : ' + R.length;
    $('#tb').innerHTML = R.map((r, i) => `<tr style="--i:${i}">${c.cols.map(x => `<td>${x[1](r)}</td>`).join('')}<td class="act"><button title="Modifier" data-e="${r[c.key]}">✏️</button><button title="Supprimer" data-d="${r[c.key]}">🗑️</button></td></tr>`).join('') || EMPTY;
    $('#tb').querySelectorAll('[data-e]').forEach(b => b.onclick = () => edit(c, b.dataset.e));
    $('#tb').querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
      if (!confirm('Supprimer cet élément ?')) return;
      const k = b.dataset.d;
      if (c.store == 'etudiants') for (const p of S.p.filter(x => x.insc == k)) await DB.del('presences', p.id);
      await DB.del(c.store, k); await load(); toast('Supprimé'); render();
    });
  };
  $('#q').oninput = e => { q = e.target.value.toLowerCase(); draw(); };
  document.querySelectorAll('.bar2 select').forEach(s => s.onchange = () => { fl[s.dataset.k] = s.value; draw(); });
  $('#add').onclick = () => edit(c);
  draw();
}

const CFG = {
  etu: {
    store: 'etudiants', key: 'id', dup: 'Étudiant déjà inscrit', rows: () => S.e,
    cols: [['N° Inscription', r => `<b>${r.id}</b>`], ['Nom', r => r.nom], ['Sexe', r => r.sexe], ['Niveau', r => r.niveau], ['Année', r => r.annee]],
    fil: [{ k: 'niveau', l: 'Niveau', o: NIV }, { k: 'annee', l: 'Année', o: ANN }],
    F: () => [{ k: 'id', l: 'N° Inscription' }, { k: 'nom', l: 'Nom' }, { k: 'sexe', l: 'Sexe', o: ['M', 'F'] }, { k: 'niveau', l: 'Niveau', o: NIV }, { k: 'annee', l: 'Année', o: ANN }]
  },
  cours: {
    store: 'cours', key: 'code', dup: 'Cours déjà existant', rows: () => S.c,
    cols: [['Code', r => `<b>${r.code}</b>`], ['Libellé', r => r.libelle], ['Enseignant', r => r.enseignant], ['Coef', r => r.coef], ['Heures prévues', r => r.heures]],
    F: () => [{ k: 'code', l: 'Code du cours' }, { k: 'libelle', l: 'Libellé' }, { k: 'enseignant', l: 'Enseignant' }, { k: 'coef', l: 'Coefficient', t: 'number' }, { k: 'heures', l: 'Heures prévues (semestre)', t: 'number' }]
  },
  pres: {
    store: 'presences', key: 'id', auto: 1,
    rows: () => S.p.map(p => ({ ...p, nom: etu(p.insc), lib: cours(p.cours) })),
    cols: [['Étudiant', r => `<b>${r.insc}</b> ${r.nom}`], ['Cours', r => r.lib], ['Date', r => fdate(r.dateSeance)], ['Statut', r => stBadge(r.statut)], ['Heures d\'absence', r => r.heures]],
    fil: [{ k: 'statut', l: 'Statut', o: STAT }],
    F: () => [{ k: 'insc', l: 'N° Inscription', o: S.e.map(e => [e.id, e.id + ' – ' + e.nom]) }, { k: 'cours', l: 'Cours', o: S.c.map(c => [c.code, c.libelle]) }, { k: 'dateSeance', l: 'Date de la séance', t: 'date' }, { k: 'statut', l: 'Statut', o: STAT }, { k: 'heures', l: "Heures d'absence", t: 'number' }]
  }
};

/* ---------- Pages ---------- */
function dash() {
  const n = STAT.map(s => S.p.filter(x => x.statut == s).length);
  const H = S.p.reduce((a, x) => a + +x.heures, 0);
  $('#view').innerHTML = `<div class="grid4">${[['🎓', 'Étudiants', S.e.length], ['📚', 'Cours', S.c.length], ['📝', 'Séances saisies', S.p.length], ['⏱️', "Heures d'absence", H]]
    .map((k, i) => `<div class="card kpi" style="--i:${i}"><span>${k[0]}</span><b>${k[2]}</b><small>${k[1]}</small></div>`).join('')}</div>
    <div class="grid2"><div class="card"><h3>Histogramme des statuts</h3><canvas id="c1"></canvas></div>
    <div class="card"><h3>Répartition en pourcentage</h3><canvas id="c2"></canvas>
    <div class="leg">${STAT.map((s, i) => `<span><i style="background:${COL[i]}"></i>${s} : ${Math.round(n[i] / (S.p.length || 1) * 100)} %</span>`).join('')}</div></div></div>
    <button class="btn" onclick="print()">📄 Exporter le rapport en PDF</button>`;
  const D = STAT.map((s, i) => ({ l: SHORT[i], v: n[i], c: COL[i] }));
  Charts.draw($('#c1'), D, 'bar'); Charts.draw($('#c2'), D, 'pie');
}

function fiche() {
  $('#view').innerHTML = `<div class="bar2"><select id="s">${S.e.map(e => `<option value="${e.id}">${e.id} – ${e.nom}</option>`).join('')}</select>
    <button class="btn" onclick="print()">📄 Exporter en PDF</button></div><div id="f" class="card paper"></div>`;
  const d = () => {
    const e = S.e.find(x => x.id == $('#s').value);
    if (!e) return $('#f').innerHTML = '<p class="empty">Ajoutez d\'abord un étudiant.</p>';
    const P = S.p.filter(x => x.insc == e.id), h = abs(e.id);
    const prev = S.c.reduce((a, x) => a + +x.heures, 0) || 1;
    const t = Math.max(0, Math.round((prev - h) / prev * 1000) / 10);
    $('#f').innerHTML = `<h3>FICHE INDIVIDUELLE D'ASSIDUITÉ</h3>
      <div class="meta"><span>N° inscription<b>${e.id}</b></span><span>Nom<b>${e.nom}</b></span><span>Niveau<b>${e.niveau}</b></span><span>Année<b>${e.annee}</b></span></div>
      <table><thead><tr><th>Cours</th><th>Date</th><th>Statut</th><th>Heures d'absence</th></tr></thead><tbody>
      ${P.map(x => `<tr><td>${cours(x.cours)}</td><td>${fdate(x.dateSeance)}</td><td>${stBadge(x.statut)}</td><td>${x.heures}</td></tr>`).join('') || EMPTY}</tbody></table>
      <div class="tot"><span>Total des absences : <b>${h} h</b></span><span>Taux d'assiduité : <b>${t} %</b></span>${badge(h)}</div>
      <div class="prog"><i style="width:${t}%"></i></div>`;
  };
  $('#s').onchange = d; d();
}

function rang() {
  $('#view').innerHTML = `<div class="bar2"><select id="n">${opt(NIV)}</select><select id="a">${opt(ANN)}</select>
    <button class="btn" onclick="print()">📄 Exporter en PDF</button></div>
    <div class="card tw"><table><thead><tr><th>Rang</th><th>N° Inscription</th><th>Nom</th><th>Heures d'absence</th><th>Observation</th></tr></thead><tbody id="tb"></tbody></table></div>`;
  $('#n').value = 'L2'; $('#a').value = 2026;
  const d = () => {
    const R = S.e.filter(e => e.niveau == $('#n').value && e.annee == $('#a').value).map(e => ({ ...e, h: abs(e.id) })).sort((a, b) => a.h - b.h);
    $('#tb').innerHTML = R.map((r, i) => `<tr style="--i:${i}"><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td>${r.id}</td><td>${r.nom}</td><td>${r.h} h</td><td>${badge(r.h)}</td></tr>`).join('') || EMPTY;
  };
  $('#n').onchange = $('#a').onchange = d; d();
}

/* ---------- Navigation, thème, démarrage ---------- */
function render() {
  $('#title').textContent = PAGES[page];
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.p == page));
  const v = $('#view'); v.classList.remove('in'); void v.offsetWidth; v.classList.add('in');
  ({ dash, etu: () => list(CFG.etu), cours: () => list(CFG.cours), pres: () => list(CFG.pres), fiche, rang })[page]();
}

function setTheme(t) {
  document.documentElement.dataset.t = t; localStorage.setItem('theme', t);
  $('#theme').textContent = t == 'dark' ? '☀️ Mode clair' : '🌙 Mode sombre';
}

(async () => {
  setTheme(localStorage.getItem('theme') || 'dark');
  $('#theme').onclick = () => { setTheme(document.documentElement.dataset.t == 'dark' ? 'light' : 'dark'); render(); };
  $('#nav').innerHTML = Object.keys(PAGES).map(k => `<button data-p="${k}">${ICON[k]} ${PAGES[k]}</button>`).join('');
  $('#nav').onclick = e => { const b = e.target.closest('button'); if (b) { page = b.dataset.p; render(); } };
  await DB.open(); await seed(); await load();
  setTimeout(() => { $('#splash').classList.add('out'); $('#app').classList.remove('hidden'); render(); }, 1900);
})();
