/* Checks the language switch (js/i18n.js):
   1. English is complete: in English mode every heading shows its own source text.
   2. Tamil and Hindi: lists any heading with no translation (it falls back to English).
   3. Lists translations whose English text no longer exists in the pages (stale).
   Run: node app/ui/tools/check-i18n.js   (exit code 1 if anything is missing) */
const { load, strings } = require('./strings');
const A = load(), all = strings(A);
let bad = 0;
const enBroken = all.filter((s) => A.t(s) !== s);
console.log(`English: ${all.length - enBroken.length}/${all.length} headings show their English text${enBroken.length ? ' — BROKEN: ' + enBroken.join(' | ') : ' ✓'}`);
bad += enBroken.length;
for (const [code, name] of Object.entries(A.LANGS)) {
  if (code === 'en') continue;
  const dict = A.I18N[code] || {}, missing = all.filter((s) => !dict[s]), stale = Object.keys(dict).filter((k) => !all.includes(k));
  console.log(`${name} (${code}): ${all.length - missing.length}/${all.length} translated${missing.length ? '' : ' ✓'}${stale.length ? `, ${stale.length} stale` : ''}`);
  missing.forEach((s) => console.log('  missing: ' + s));
  stale.forEach((s) => console.log('  stale:   ' + s));
  bad += missing.length;
}
process.exit(bad ? 1 : 0);
