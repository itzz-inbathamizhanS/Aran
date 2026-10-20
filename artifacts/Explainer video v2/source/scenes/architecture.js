// Where Aran sits: sources on the left, sinks on the right, Aran on the choke point in the middle, vault and erasure record below.
scene('architecture', X => {
  const SY = [250, 420, 590, 760];
  const AY = 470;                                  // the message line through Aran
  const ST = ['normalise', 'detect', 'decide', 'protect', 'record'];
  const SC = ['tidy the message into one standard form', 'find numbers like Aadhaar, PAN and cards', 'choose: let through, mask or swap', 'swap the real number for a token', 'write down what was done'];
  const sx = i => 684 + i * 138;
  X.cam([{ x: 960, y: 470, s: 1.35 }, { k: 1, x: 780, y: 520, s: 1.08, len: 1.6 }, { k: 2, x: 1140, y: 520, s: 1.08 },
    { k: 3, x: 960, y: 510, s: 1.0 }, { k: 4, x: 960, y: 470, s: 1.42 }, { k: 5, x: 960, y: 620, s: 1.2 },
    { k: 6, x: 1060, y: 640, s: 1.3 }, { k: 7, x: 900, y: 540, s: 0.9, len: 1.8 }, { k: 8, f: 0.3, x: 900, y: 520, s: 1.6, len: 1.6 }]);

  // ---------- cue 0: a bank, and a question ----------
  const intro = X.g();
  const bk = X.icon('bank', 960, 450, 1.7, { parent: intro });
  X.text(960, 590, 'Inside a bank: where does Aran sit?', { parent: intro, size: 32, anchor: 'middle', serif: true, w: 600 });
  X.show(intro, 0, { type: 'pop', out: 1, outLen: 0.5 });
  X.bob(bk.mid, { amp: 6, per: 2.2 });

  // ---------- sources and sinks ----------
  const srcs = [['phone', 'Mobile app'], ['server', 'Core banking'], ['db', 'Loan system'], ['log', 'Log files']];
  const snks = [['cloud', 'Log platform'], ['laptop', 'CRM'], ['building', 'Vendors'], ['chat', 'AI companies']];
  const head = (x, str, k) => { const t = X.text(x, 186, str, { size: 26, anchor: 'middle', fill: C.ink2, w: 700, ls: 2 }); X.show(t, k, { type: 'down' }); };
  head(200, 'SOURCES', 1); head(1720, 'SINKS', 2);
  srcs.forEach(([ic, lab], i) => {
    const g = X.g();
    const icn = X.icon(ic, 200, SY[i] - 10, 0.55, { parent: g, color: C.ink });
    X.text(200, SY[i] + 60, lab, { parent: g, size: 24, anchor: 'middle', w: 600 });
    X.show(g, 1, { f: 0.25 + i * 0.12, type: 'left' });
    X.pulse(icn.mid, 200, SY[i] - 10, [1], { f: 0.35 + i * 0.12, amt: 0.15 });
  });
  snks.forEach(([ic, lab], i) => {
    const g = X.g();
    const icn = X.icon(ic, 1720, SY[i] - 10, 0.55, { parent: g, color: C.ink });
    X.text(1720, SY[i] + 60, lab, { parent: g, size: 24, anchor: 'middle', w: 600 });
    X.show(g, 2, { f: 0.25 + i * 0.12, type: 'right' });
    X.pulse(icn.mid, 1720, SY[i] - 10, [2], { f: 0.35 + i * 0.12, amt: 0.15 });
  });
  X.term(1, 'Source', 'A system where data comes from,\nlike the app where Ravi types his details.', { until: 2 });
  X.term(2, 'Sink', 'A place where data ends up,\nlike a vendor or a log platform.', { until: 3 });

  // before Aran: data flows straight from sources to sinks
  const cols = [C.blue, C.ochre, C.plum, C.ink2];
  SY.forEach((y, i) => {
    const sp = X.spline([[262, y - 10], [960, lerp(y, SY[(i + 1) % 4], 0.5) - 10], [1658, SY[(i + 1) % 4] - 10]]);
    const p = X.path(sp.d, { color: C.line, sw: 3, dash: '3 10' });
    X.show(p, 2, { f: 0.5, type: 'fade', out: 3, outLen: 0.6 });
    X.stream(sp, { n: 4, speed: 0.2, r: 7, color: cols[i], k0: 2, f0: 0.55, k1: 3, f1: 0.15 });
  });

  // ---------- Aran in the middle ----------
  const aran = X.g();
  X.rect(600, 330, 720, 280, { parent: aran, fill: C.tealL, stroke: C.teal, r: 22, shadow: true, sw: 3 });
  X.text(960, 312, 'Aran', { parent: aran, size: 38, anchor: 'middle', serif: true, w: 600, fill: C.teal });
  const inner = X.g(aran);
  const stage = ST.map((n, i) => {
    const g = E('g', null, inner);
    const r = E('rect', { x: sx(i) - 62, y: 420, width: 124, height: 96, rx: 12, fill: C.card, stroke: C.teal, 'stroke-width': 2.5 }, g);
    const num = E('text', { x: sx(i), y: 456, 'font-size': 24, 'font-weight': 700, fill: C.teal, 'text-anchor': 'middle', 'font-family': F.sans }, g); num.textContent = i + 1;
    const lt = E('text', { x: sx(i), y: 494, 'font-size': 22, 'font-weight': 600, fill: C.ink, 'text-anchor': 'middle', 'font-family': F.sans }, g); lt.textContent = n;
    return { g, r, num };
  });
  X.show(aran, 3, { f: 0.1, type: 'pop', len: 0.8 });
  X.term(3, 'Choke point', 'A narrow spot every message must pass,\nlike the one gate into a stadium.', { until: 4 });

  // paths through Aran
  const inP = [], outP = [];
  SY.forEach((y, i) => {
    const a = X.spline([[262, y - 10], [440, lerp(y - 10, AY, 0.7)], [600, AY]]);
    const b = X.spline([[1320, AY], [1480, lerp(AY, y - 10, 0.7)], [1658, y - 10]]);
    inP.push(a); outP.push(b);
    const pa = X.path(a.d, { color: C.teal, sw: 3 }), pb = X.path(b.d, { color: C.teal, sw: 3 });
    X.show(pa, 3, { f: 0.3 + i * 0.05, type: 'draw', len: 0.8 });
    X.show(pb, 3, { f: 0.5 + i * 0.05, type: 'draw', len: 0.8 });
    X.stream(a, { n: 3, speed: 0.3, r: 7, color: cols[i], k0: 3, f0: 0.7 });
    X.stream(b, { n: 3, speed: 0.3, r: 7, color: C.teal, k0: 3, f0: 0.8 });
  });
  // funnel marks at the choke point
  const funnel = X.path('M560,400 L600,450 M560,540 L600,490', { color: C.teal, sw: 5 });
  X.show(funnel, 3, { f: 0.6, type: 'draw' });

  // ---------- the message passing the five stages ----------
  const msg = X.g();
  const env = X.g(msg); X.icon('envelope', 0, 0, 0.42, { parent: env });
  const chipBox = E('rect', { x: -96, y: -104, width: 192, height: 40, rx: 20, fill: C.card, stroke: C.ink2, 'stroke-width': 2 }, msg);
  const chipT = E('text', { x: 0, y: -76, 'font-size': 22, 'font-weight': 600, fill: C.ink, 'text-anchor': 'middle', 'font-family': F.mono }, msg);
  const capG = X.g();
  const cap = X.text(960, 580, '', { parent: capG, size: 26, anchor: 'middle', w: 600, fill: C.teal });
  const path4 = X.spline([[200, SY[0] - 10], [440, 420], [600, AY], [960, AY], [1320, AY], [1500, 520], [1720, SY[2] - 10]]);
  X.each(t => {
    const s4 = X.at(4, 0.04), e4 = X.at(4, 0.97);
    const on = t >= s4 && t <= e4 + 0.6;
    msg.style.display = on ? '' : 'none';
    // position: 0..0.16 to Aran, 0.16..0.84 inside, rest to the vendor
    const p = clamp((t - s4) / (e4 - s4));
    const q = p < 0.12 ? lerp(0, 0.27, ease(p / 0.12)) : p < 0.9 ? lerp(0.27, 0.66, (p - 0.12) / 0.78) : lerp(0.66, 1, ease((p - 0.9) / 0.1));
    const [x, y] = path4.at(q);
    msg.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    msg.style.opacity = t > e4 ? clamp(1 - (t - e4) / 0.6) : 1;
    const prot = x > sx(3) + 10;
    chipT.textContent = prot ? '0982 6158 6412' : (x > sx(0) + 10 ? '2345 6789 0124' : '2345 67 89 0124');
    chipBox.setAttribute('stroke', prot ? C.teal : (x > sx(1) ? C.red : C.ink2));
    // which stage is lit
    let cur = -1;
    if (t >= s4 && t <= e4) ST.forEach((_, i) => { if (Math.abs(x - sx(i)) < 69) cur = i; });
    const after = t > e4 + 0.6;
    stage.forEach((s, i) => {
      let lit = i === cur;
      if (after && !(t > X.at(8))) lit = Math.floor(t * 2.5) % 5 === i;
      if (t > X.at(8)) lit = i === 1;
      s.r.setAttribute('fill', lit ? C.ochreL : C.card);
      s.r.setAttribute('stroke', lit ? C.ochre : C.teal);
    });
    cap.set(cur >= 0 ? `${cur + 1}. ${ST[cur]}: ${SC[cur]}` : '');
    capG.style.display = cur >= 0 ? '' : 'none';
  });
  X.term(4, 'Normalise', 'Tidy a message into one standard form,\nso tricks like spaced-out digits are seen.', { until: 5 });

  // ---------- vault with keys, erasure record ----------
  const vault = X.g();
  X.rect(620, 660, 360, 220, { parent: vault, fill: C.sand, stroke: C.ink, r: 16, sw: 4, shadow: true });
  X.text(650, 700, 'Vault', { parent: vault, size: 30, serif: true, w: 600 });
  const dial = X.g(vault);
  E('circle', { cx: 920, cy: 704, r: 24, fill: C.card, stroke: C.ink, 'stroke-width': 4 }, dial);
  E('line', { x1: 920, y1: 704, x2: 920, y2: 684, stroke: C.ink, 'stroke-width': 4, 'stroke-linecap': 'round' }, dial);
  X.spin(dial, 920, 704, { speed: 40 });
  [['Ravi · loans', C.ochreL], ['Ravi · marketing', C.blueL], ['Asha · loans', C.plumL]].forEach(([lab, col], j) => {
    const kg = X.g(vault);
    const ki = X.icon('key', 676, 752 + j * 42, 0.36, { parent: kg, fill: col });
    X.text(714, 760 + j * 42, lab, { parent: kg, size: 22, w: 600 });
    X.show(kg, 5, { f: 0.5 + j * 0.12, type: 'left' });
  });
  X.show(vault, 5, { type: 'up' });
  const vl = X.path(`M800,610 L800,660`, { color: C.ink2, sw: 4, dash: '6 8' });
  X.show(vl, 5, { f: 0.2, type: 'fade' });
  X.term(5, 'Vault', 'A locked, guarded store for secret keys.\nOne key per customer, per purpose.', { until: 6 });

  const rec = X.g();
  E('path', { d: 'M1040,660 L1300,660 L1300,860 L1278,878 L1256,860 L1234,878 L1212,860 L1190,878 L1168,860 L1146,878 L1124,860 L1102,878 L1080,860 L1058,878 L1040,860 Z', fill: C.card, stroke: C.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' }, rec);
  X.text(1170, 700, 'Erasure record', { parent: rec, size: 26, anchor: 'middle', serif: true, w: 600 });
  // small tree of hashes
  const tr = E('g', null, rec);
  E('path', { d: 'M1170,736 L1120,782 M1170,736 L1220,782 M1120,782 L1096,824 M1120,782 L1144,824 M1220,782 L1196,824 M1220,782 L1244,824', fill: 'none', stroke: C.ink2, 'stroke-width': 3 }, tr);
  const nodes = [[1170, 736], [1120, 782], [1220, 782], [1096, 824], [1144, 824], [1196, 824], [1244, 824]].map(([x, y]) => E('circle', { cx: x, cy: y, r: 10, fill: C.greenL, stroke: C.green, 'stroke-width': 3 }, tr));
  X.show(rec, 6, { type: 'up' });
  const rl = X.path(`M1170,610 L1170,660`, { color: C.ink2, sw: 4, dash: '6 8' });
  X.show(rl, 6, { f: 0.2, type: 'fade' });
  const seal = X.g();
  const sc = X.mark(1290, 676, true, { s: 22, parent: seal });
  X.show(X.wrap(seal), 6, { f: 0.6, type: 'pop' });
  X.each(t => {
    const u = Math.floor(t * 3) % nodes.length;
    nodes.forEach((n, i) => n.setAttribute('fill', t > X.at(6, 0.3) && i === nodes.length - 1 - u ? C.green : C.greenL));
  });
  X.term(6, 'Erasure record', 'A list of every erasure that cannot be secretly\nchanged, so the bank can prove what it deleted.', { until: 7 });

  // ---------- customers never see Aran; IT team installs it ----------
  const ravi = X.person(-30, 640, { shirt: C.blue, skin: C.skin[1], name: 'Ravi', s: 0.8 });
  X.show(ravi, 7, { type: 'right' });
  X.talk(ravi, [], { base: 'happy' });
  const rph = X.icon('phone', 30, 520, 0.4);
  X.show(rph, 7, { f: 0.1, type: 'pop' });
  X.each(() => X.arms(ravi, 8, 60));
  const seeOnly = X.text(-30, 405, 'sees only the app', { size: 24, anchor: 'middle', fill: C.ink2, w: 600 });
  X.show(seeOnly, 7, { f: 0.15, type: 'up' });
  const it = X.person(1470, 880, { shirt: C.green, skin: C.skin[0], name: 'bank IT team', s: 0.75 });
  X.show(it, 7, { f: 0.35, type: 'left' });
  X.point(it, 7, 135, { f: 0.5 });
  const wr = X.icon('gear', 1420, 660, 0.45, { color: C.ink });
  X.show(wr, 7, { f: 0.5, type: 'pop' });
  X.spin(wr.mid, 1420, 660, { speed: 90 });
  const fw = X.chip(960, 635, 'installed like any firewall', { size: 22, color: C.teal, fill: C.card });
  X.show(fw, 7, { f: 0.6, type: 'up', out: 8 });
  X.term(7, 'Firewall', 'A guard program at the edge of a network\nthat checks everything passing through.', { until: 8 });

  // ---------- next: the check digit inside "detect" ----------
  const nx = X.g();
  X.rect(612, 548, 420, 52, { parent: nx, fill: C.card, stroke: C.ochre, r: 12 });
  const row = X.digits(822, 556, '234567890124', { parent: nx, groups: [4, 4, 4], cw: 26, ch: 36, size: 22, gap: 3, groupGap: 10 });
  row.paint(11, C.ochreL, C.ochre, C.ochre);
  X.show(nx, 8, { f: 0.5, type: 'pop' });
  const arrowDown = X.arrow(822, 510, 822, 546, { color: C.ochre, sw: 4, head: 12 });
  X.show(arrowDown, 8, { f: 0.55, type: 'draw' });
  const nl = X.text(1050, 584, 'the check digit', { size: 24, w: 700, fill: C.ochre });
  X.show(nl, 8, { f: 0.75, type: 'up' });

  X.recap(9, ['Sources on the left, sinks on the right', 'Aran sits on the choke points in the middle', 'Five steps: normalise, detect, decide, protect, record', 'The vault holds the keys underneath']);
});
