// node render.js <startFrame> <endFrame> <fps> <out.mp4>
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const [a, b, fps, out] = process.argv.slice(2); const A = +a, B = +b, F = +fps;
  const br = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-gpu', '--force-device-scale-factor=1'] });
  const page = await br.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, 'player/player.html'));
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  const cdp = await page.context().newCDPSession(page);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(F), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(F), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = A; f < B; f++) {
    await page.evaluate(t => seek(t), f / F);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
    const buf = Buffer.from(data, 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - A) % 600 === 0) console.error(`[${out}] ${f - A}/${B - A} ${((f - A) / ((Date.now() - t0) / 1000 + 1e-9)).toFixed(1)} fps`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.error(`[${out}] done ${B - A} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`, errs.join(' | '));
  await br.close();
})();
