/* Sépare css/fonts.css : Amiri Quran reste dans styles.css (police par défaut),
 * chaque autre police va dans data/fonts/<id>.css et n'est chargée que si on l'utilise. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const IDS = { 'Atelier Amiri Quran': 'base', 'Atelier Scheherazade': 'scheherazade', 'Atelier Noto Naskh': 'naskh', 'Atelier Amiri': 'amiri-classic', 'Atelier Lateef': 'lateef', 'Atelier Aref Ruqaa': 'ruqaa', 'Bouazzi Maghribi': 'maghribi', 'Atelier Reem Kufi': 'kufi', 'Atelier Kufam': 'kufam', 'Atelier Harmattan': 'harmattan', 'Atelier Mirza': 'mirza', 'Atelier Noto Nastaliq': 'nastaliq', 'Atelier Gulzar': 'gulzar', 'Atelier Katibeh': 'katibeh', 'Atelier Rakkas': 'rakkas', 'Atelier Lalezar': 'lalezar' };
const src = fs.readFileSync(path.join(root, 'css/fonts.css'), 'utf8');
const parts = src.split(/(?=@font-face)/);
let base = parts[0];
const out = path.join(root, 'data/fonts'); fs.mkdirSync(out, { recursive: true });
for (const p of parts.slice(1)) {
  const fam = (p.match(/font-family: '([^']+)'/) || [])[1];
  const id = IDS[fam]; if (!id) throw new Error('police inconnue : ' + fam);
  if (id === 'base') base += p; else fs.writeFileSync(path.join(out, id + '.css'), p.trim() + '\n');
}
fs.writeFileSync(path.join(root, 'css/fonts-base.gen.css'), base);
