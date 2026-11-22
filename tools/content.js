/* Transforme les fichiers texte de content/ en un fichier JS (src/09-content.gen.js).
 * Le contenu (explications) reste séparé du code : on corrige un .md sans toucher au reste.
 * Un dossier par langue : content/fr/, et plus tard content/ru/ (même noms de fichiers).
 *   content/<langue>/regles/<id>.md  → RULE_DOCS[langue][id]
 *   content/<langue>/<nom>.json      → CONTENT[langue][nom]
 * Ce qui manque dans une langue est pris en français. */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'content');
const docs = {}, content = {};
for (const lang of fs.readdirSync(base).filter(d => fs.statSync(path.join(base, d)).isDirectory()).sort()) {
  const ld = path.join(base, lang);
  const rd = path.join(ld, 'regles');
  if (fs.existsSync(rd)) {
    docs[lang] = {};
    for (const f of fs.readdirSync(rd).filter(f => f.endsWith('.md')).sort())
      docs[lang][f.replace(/\.md$/, '')] = fs.readFileSync(path.join(rd, f), 'utf8').replace(/\r\n/g, '\n').trim();
  }
  for (const f of fs.readdirSync(ld).filter(f => f.endsWith('.json')).sort()) {
    content[lang] = content[lang] || {};
    try { content[lang][f.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(ld, f), 'utf8')); }
    catch (e) { console.error('JSON invalide : ' + lang + '/' + f + ' : ' + e.message); process.exit(1); }
  }
}
fs.writeFileSync(path.join(root, 'src', '09-content.gen.js'),
  '/* Généré par tools/content.js depuis content/ : ne pas modifier ici */\nconst RULE_DOCS = ' + JSON.stringify(docs) + ';\nconst CONTENT = ' + JSON.stringify(content) + ';\n');
for (const l of Object.keys(docs)) console.log(l + ' : ' + Object.keys(docs[l]).length + ' règles détaillées, contenus : ' + Object.keys(content[l] || {}).join(', '));
