/* Prépare data/index-N.json : l'index de toutes les formes du Coran (sinon le plugin
 * doit lire les 114 sourates à chaque ouverture du dictionnaire). Lancé par build.sh. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
const stub = { Plugin: class {}, ItemView: class {}, Notice: class {}, PluginSettingTab: class {}, Setting: class {}, MarkdownView: class {}, requestUrl: async () => { throw new Error('offline'); }, setIcon() {} };
global.document = { querySelectorAll: () => [], head: { appendChild() {} }, createElement: () => ({ dataset: {} }) };
global.window = global;
const mod = { exports: {} };
new Function('module', 'require', main + '\nmodule.exports.__get = () => ({ QuranData, INDEX_FILE });')(mod, () => stub);
const { QuranData, INDEX_FILE } = mod.exports.__get();
const app = { vault: { adapter: { read: async p => fs.readFileSync(path.join(root, p), 'utf8') } } };
(async () => {
  const d = new QuranData(app, '.');
  await d.scanForms();
  const pack = r => r[0] * 1e6 + r[1] * 1e3 + r[2];
  for (const [, m] of d.pos) for (const r of m) if (r[2] >= 1000 || r[1] >= 1000) throw new Error('trop grand');
  const idx = { v: 1, f: [], p: {}, r: {}, m: [] };
  for (const [k, m] of d.forms) idx.f.push([k, [...m.values()].map(e => [e.txt, e.n, pack(e.ref), e.lid])]);
  for (const [k, a] of d.pos) idx.p[k] = a.map(pack);
  for (const [k, a] of d.lemRefs) idx.r[k] = a.map(pack);
  for (const [k, m] of d.lemForms) idx.m.push([k, [...m.entries()]]);
  const out = path.join(root, 'data', INDEX_FILE);
  fs.writeFileSync(out, JSON.stringify(idx));
  console.log(INDEX_FILE, Math.round(fs.statSync(out).size / 1024) + ' Ko');
})().catch(e => { console.error(e); process.exit(1); });
