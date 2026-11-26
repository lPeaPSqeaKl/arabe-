/* ====================================================================
 * 04f - Les ambiances (palettes) de l'atelier. Une seule source pour :
 *  - les couleurs de l'écran (tools/palettes.js en fait css/palettes.gen.css),
 *  - l'image d'un verset et l'impression d'une sourate, qui suivent l'ambiance choisie.
 * bg fond · bg2 fond plus profond (bords) · ink texte · soft texte doux · gold ornements · accent boutons
 * ==================================================================== */
const PALETTES = {
  nuit: { name: 'Nuit (noir doux)', dark: 1, bg: '#121212', bg2: '#1c1c1c', ink: '#e6e1d7', soft: '#a39d92', gold: '#c9a45c' },
  sepia: { name: 'Sépia (papier chaud)', bg: '#f4ecd8', bg2: '#e9dcbd', ink: '#3b3024', soft: '#6d5f4b', gold: '#a8823e' },
  clair: { name: 'Clair (blanc)', bg: '#ffffff', bg2: '#ffffff', ink: '#1f1f22', soft: '#5f6067', gold: '#9a7735' },
  parchemin: { name: 'Manuscrit enluminé', bg: '#f1e3bf', bg2: '#e2cc97', ink: '#3a2a16', soft: '#6e5432', gold: '#a8782c', accent: '#8a5a1c', deco: 1 },
  sable: { name: 'Désert (sable et terre cuite)', bg: '#f3e7d3', bg2: '#e6d2b2', ink: '#3d2a1e', soft: '#7a5a44', gold: '#b4593a', accent: '#b4593a', deco: 1 },
  iznik: { name: 'Faïence d\'Iznik (blanc et bleu)', bg: '#f3f7f8', bg2: '#dde9ee', ink: '#14283b', soft: '#4a6274', gold: '#1f5f8b', accent: '#1f5f8b', deco: 1 },
  jardin: { name: 'Jardin (olive)', bg: '#eef0e2', bg2: '#dde2c6', ink: '#283020', soft: '#5d6650', gold: '#8a7a35', accent: '#5c6b3a', deco: 1 },
  rose: { name: 'Rose de Damas', bg: '#f8eeec', bg2: '#ecd6d3', ink: '#3a2226', soft: '#7a585d', gold: '#a24b5a', accent: '#a24b5a', deco: 1 },
  emeraude: { name: 'Émeraude et or', dark: 1, bg: '#0f2e28', bg2: '#0a221d', ink: '#f1ead6', soft: '#bccbbd', gold: '#d4b46a', accent: '#2f8f72', deco: 1 },
  andalousie: { name: 'Nuit d\'Andalousie (bleu et or)', dark: 1, bg: '#131a2c', bg2: '#0d1322', ink: '#ece5d3', soft: '#a9b0c2', gold: '#d0aa5e', accent: '#4f6fb5', deco: 1 },
  velours: { name: 'Velours (bordeaux et or)', dark: 1, bg: '#2a1418', bg2: '#1e0e11', ink: '#f2e6dc', soft: '#c9aeb0', gold: '#d6b06a', accent: '#9c3a4a', deco: 1 },
};
/* la palette pour une image ou une impression : celle de l'ambiance choisie (blanc si « comme Obsidian ») */
function paletteOf(S) { const a = ambianceOf(S); return PALETTES[a] ? a : 'clair'; }
