/* ====================================================================
 * 04e - Polices à la demande : seule Amiri Quran est dans styles.css.
 * Les autres sont dans data/fonts/<id>.css, chargées seulement si on les utilise
 * (téléchargées une fois depuis GitHub si le fichier manque, puis hors ligne).
 * ==================================================================== */
const FONT_LOADED = new Map();
let FONT_ENV = null;
function fontEnv(app, dir) { FONT_ENV = { app, dir }; }
function ensureFont(id) {
  if (!id || id === 'amiri' || id === 'device' || !FONT_ENV) return Promise.resolve();
  if (FONT_LOADED.has(id)) return FONT_LOADED.get(id);
  const p = (async () => {
    const ad = FONT_ENV.app.vault.adapter; const dir = FONT_ENV.dir + '/data/fonts'; const f = dir + '/' + id + '.css';
    let css = null;
    try { css = await ad.read(f); } catch (e) { /* absent : on le télécharge */ }
    if (!css) {
      const r = await requestUrl({ url: DATA_URL + 'fonts/' + id + '.css' });
      css = r.text;
      try { if (!(await ad.exists(dir))) await ad.mkdir(dir); await ad.write(f, css); } catch (e) { /* tant pis : pas de copie locale */ }
    }
    const st = document.createElement('style'); st.className = 'aa-font-style'; st.dataset.font = id; st.textContent = css;
    document.head.appendChild(st);
  })();
  p.catch(() => FONT_LOADED.delete(id));
  FONT_LOADED.set(id, p);
  return p;
}
function unloadFonts() { document.querySelectorAll('style.aa-font-style').forEach(s => s.remove()); FONT_LOADED.clear(); }
