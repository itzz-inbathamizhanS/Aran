// usage: node snap.js out_prefix t1 t2 ...  (times in seconds, or scene:cue:frac)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [prefix, ...TS] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, 'player/player.html'));
  await p.waitForFunction(() => window.READY === true, null, { timeout: 30000 }).catch(e => errs.push('not ready ' + e));
  for (const ts of TS) {
    let t = ts;
    if (ts.includes(':')) {
      const [id, k, f] = ts.split(':');
      t = await p.evaluate(([id, k, f]) => { const s = TIMING.scenes.find(s => s.id === id); const c = s.cues[Math.min(+k, s.cues.length - 1)]; return +k >= s.cues.length ? s.end - 0.6 : c.t + (+f || 0) * c.d; }, [id, k, f]);
    }
    await p.evaluate(t => seek(+t), t);
    await p.screenshot({ path: `${prefix}_${ts.replace(/:/g, '-')}.png` });
  }
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await b.close();
})();
