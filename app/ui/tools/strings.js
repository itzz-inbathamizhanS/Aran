/* Loads the console scripts without a browser and lists every heading string the
   language switch translates: menu group names and labels, page eyebrows, titles and ledes, tour chapter
   names, titles and taglines. Used by check-i18n.js. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const UI = path.join(__dirname, '..');
function load() {
  const el = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : el()), apply: () => el(), set: () => true });
  const ctx = { console, setTimeout, clearTimeout, setInterval, clearInterval, matchMedia: () => ({ matches: false }), localStorage: { getItem: () => null, setItem() {} }, location: { hash: '', search: '' }, navigator: {}, gsap: el(), ScrollTrigger: el() };
  ctx.window = ctx; ctx.document = el(); ctx.URLSearchParams = URLSearchParams; ctx.TextEncoder = TextEncoder;
  vm.createContext(ctx);
  for (const f of ['js/data.js', 'js/ui.js', 'js/i18n.js', 'js/tour.js', 'js/pages.js', 'js/standout.js', 'kit/sitemap.js']) vm.runInContext(fs.readFileSync(path.join(UI, f), 'utf8'), ctx, { filename: f });
  return ctx.ARAN;
}
function strings(A) {
  const out = new Set();
  /* the menu: group names and page labels from the one site map (kit/sitemap.js) */
  A.site.groups().forEach((g) => { out.add(g.label); g.pages.forEach((p) => out.add(p.label)); });
  Object.values(A.pages).forEach((p) => ['eyebrow', 'title', 'lede'].forEach((k) => p[k] && out.add(p[k])));
  A.tour.chapters.forEach((c) => ['name', 'title', 'tag'].forEach((k) => c[k] && out.add(c[k])));
  (A.I18N_EXTRA || []).forEach((s) => out.add(s));
  return [...out];
}
module.exports = { load, strings };
if (require.main === module) { const A = load(); console.log(JSON.stringify(strings(A), null, 1)); }
