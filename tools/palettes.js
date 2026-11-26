/* Fait css/palettes.gen.css à partir de src/04f-palettes.js (ambiances ajoutées en 2.37) */
const fs = require('fs'); const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', '04f-palettes.js'), 'utf8');
const P = new Function(src + ';return PALETTES')();
const mix = (a, b, t) => { const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
let css = '/* généré par tools/palettes.js — ne pas modifier à la main */\n';
for (const [id, c] of Object.entries(P)) {
  if (!c.deco) continue; // nuit, sépia, clair : déjà dans style.css
  const sel = '.aa-root.aa-amb-' + id;
  const alt = mix(c.bg, c.bg2, 0.35), sec = mix(c.bg, c.bg2, 0.55), bord = mix(c.bg, c.soft, 0.28), line = mix(c.bg, c.soft, 0.2);
  css += sel + ' {\n  --background-primary: ' + c.bg + '; --background-primary-alt: ' + alt + '; --background-secondary: ' + sec + '; --background-secondary-alt: ' + c.bg2 + ';\n' +
    '  --background-modifier-border: ' + bord + '; --background-modifier-hover: ' + (c.dark ? 'rgba(255,255,255,.06)' : 'rgba(60,40,20,.07)') + '; --aa-line: ' + line + '; --aa-soft: ' + mix(c.bg, c.bg2, 0.45) + ';\n' +
    '  --text-normal: ' + c.ink + '; --text-muted: ' + c.soft + '; --text-faint: ' + mix(c.soft, c.bg, 0.4) + '; --interactive-normal: ' + mix(c.bg, c.dark ? '#ffffff' : '#ffffff', c.dark ? 0.06 : 0.5) + '; --aa-paper-bg: ' + c.bg + ';\n' +
    '  --interactive-accent: ' + c.accent + '; --interactive-accent-hover: ' + mix(c.accent, c.dark ? '#ffffff' : '#000000', 0.12) + '; --text-accent: ' + (c.dark ? mix(c.accent, '#ffffff', 0.35) : c.accent) + '; --aa-gold: ' + c.gold + ';\n' +
    (c.dark ? '  --aa-nom: #8fa9db; --aa-acc: #7dbf98; --aa-gen: #d9a477; --aa-verb: #dc928b; --aa-part: #9ba2ac; --aa-pron: #b49bdc; color-scheme: dark;\n' : '  --aa-nom: #3d64a8; --aa-acc: #2e8358; --aa-gen: #b06a2c; --aa-verb: #ad4a43; --aa-part: #776a58; --aa-pron: #7a59b0; color-scheme: light;\n') +
    '  background: radial-gradient(ellipse at 50% -10%, ' + mix(c.bg, c.gold, 0.08) + ', ' + c.bg + ' 55%) fixed, ' + c.bg + ' !important; color: var(--text-normal);\n}\n';
  // ornements : un liseré doré sous la barre des onglets et autour des cartes principales
  css += sel + ' .aa-tabs { border-bottom: 2px solid ' + c.gold + '; box-shadow: 0 3px 0 -1px ' + mix(c.bg, c.gold, 0.35) + '; }\n';
  css += sel + ' .aa-today, ' + sel + ' .aa-vod, ' + sel + ' .aa-home-block, ' + sel + ' .aa-lesson-card, ' + sel + ' .aa-home-card { border-color: ' + mix(c.bg, c.gold, 0.45) + '; }\n';
  css += sel + ' .mod-cta { background: ' + c.accent + ' !important; color: #fff !important; }\n';
}
css += '.aa-root[class*="aa-amb-"] .aa-sh-name { background: transparent; }\n';
fs.writeFileSync(path.join(__dirname, '..', 'css', 'palettes.gen.css'), css);
console.log('palettes :', Object.keys(P).filter(k => P[k].deco).length, 'ambiances décoratives');
