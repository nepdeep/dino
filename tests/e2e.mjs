// End-to-end play-through of Dino Picnic Island, once with a mouse and once with
// touch input (CDP touch events -> real Pointer Events with pointerType "touch").
//
//   npm test                         (builds, then runs this file)
//   SHOTS=./shots node tests/e2e.mjs  (also saves screenshots)
//
// Needs a Chromium; set CHROME_PATH or run `npx playwright-core install chromium`.
import { launch } from './browser.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const URL = pathToFileURL(path.resolve('dist/index.html')).href + '?fast=1';
const SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${msg}`);
  if (!cond) failures++;
};

const info = (p) => p.evaluate(() => window.dinoGame.info());
const until = (p, fn, arg, timeout = 120000) => p.waitForFunction(fn, arg, { timeout, polling: 100 }).catch(async (e) => {
  console.log('    state at timeout:', JSON.stringify(await info(p).catch(() => null)));
  throw e;
});
// wait until a picture button has finished its pop-in animation, then tap its centre
async function tapButton(p, input, sel) {
  await p.waitForFunction((q) => {
    const el = document.querySelector(q);
    return !el.hidden && el.getBoundingClientRect().width >= el.offsetWidth * 0.98;
  }, sel, { timeout: 30000, polling: 100 });
  await p.waitForTimeout(300);
  const b = await p.locator(sel).boundingBox();
  await input.tap(b.x + b.width / 2, b.y + b.height / 2);
}
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name + '.png') }); };

function inputFor(p, mode) {
  if (mode === 'mouse') {
    return {
      async tap(x, y) { await p.mouse.click(x, y); },
      async drag(a, b, { midShot } = {}) {
        await p.mouse.move(a.x, a.y);
        await p.mouse.down();
        for (let i = 1; i <= 14; i++) {
          await p.mouse.move(a.x + (b.x - a.x) * i / 14, a.y + (b.y - a.y) * i / 14);
          if (i === 11 && midShot) await shot(p, midShot);
        }
        await p.mouse.up();
      },
    };
  }
  let cdp;
  const touch = async (type, pts) => {
    cdp = cdp || await p.context().newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 1, radiusX: 12, radiusY: 12, force: 1 })) });
  };
  return {
    async tap(x, y) { await p.touchscreen.tap(x, y); },
    async drag(a, b, { midShot } = {}) {
      await touch('touchStart', [[a.x, a.y]]);
      for (let i = 1; i <= 14; i++) {
        await touch('touchMove', [[a.x + (b.x - a.x) * i / 14, a.y + (b.y - a.y) * i / 14]]);
        if (i === 11 && midShot) await shot(p, midShot);
      }
      await touch('touchEnd', []);
    },
  };
}

async function playThrough(browser, mode, viewport) {
  console.log(`\n== ${mode} @ ${viewport.width}x${viewport.height}`);
  const context = await browser.newContext({ viewport, hasTouch: mode === 'touch', isMobile: mode === 'touch' });
  const p = await context.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await p.goto(URL);
  await p.waitForFunction(() => !!window.dinoGame);
  await shot(p, `${mode}-0-start`);
  const input = inputFor(p, mode);
  // In touch mode the snack floats a little above the finger, so aim the finger slightly lower.
  const aim = (d) => ({ x: d.x, y: d.y + (mode === 'touch' ? 55 : 0) });

  const playBox = await p.locator('#play').boundingBox();
  await input.tap(playBox.x + playBox.width / 2, playBox.y + playBox.height / 2);
  await until(p, () => { const i = window.dinoGame.info(); return i.active >= 0 && i.fruits.length === 5 && i.fruits.every((f) => f.state === 'home'); });
  let s = await info(p);
  ok(s.phase === 'feed', 'start button begins the feeding phase');
  await until(p, () => window.dinoGame.info().hint === 'drag', null, 15000).catch(() => {});
  ok((await info(p)).hint === 'drag', 'visual drag tutorial is showing on the first dinosaur');
  ok(new Set(s.fruits.map((f) => f.kind)).size === 5, 'basket holds 5 different snacks');
  await shot(p, `${mode}-1-feed`);

  // --- an unexpected snack: funny reaction, snack returns, no penalty
  const wrong = s.fruits.find((f) => f.kind !== s.want);
  await input.drag(wrong, aim(s.dinos[s.active]));
  await until(p, (a) => window.dinoGame.info().dinos[a].action === 'yuck', s.active);
  await shot(p, `${mode}-2-yuck`);
  await until(p, (k) => window.dinoGame.info().fruits.find((f) => f.kind === k).state === 'home', wrong.kind);
  s = await info(p);
  ok(s.fedCount === 0 && s.fruits.length === 5 && s.phase === 'feed', `wrong snack (${wrong.kind}) bounced back to the basket, nothing lost`);

  // --- feed all three, mixing drag and tap-then-tap
  const styles = mode === 'mouse' ? ['drag', 'tap', 'drag'] : ['tap', 'drag', 'tap'];
  for (let n = 0; n < 3; n++) {
    await until(p, () => { const i = window.dinoGame.info(); return i.active >= 0 && i.fruits.every((f) => f.state === 'home'); });
    s = await info(p);
    const fruit = s.fruits.find((f) => f.kind === s.want);
    const dino = s.dinos[s.active];
    if (styles[n] === 'drag') {
      await input.drag(fruit, aim(dino), { midShot: n === 0 ? `${mode}-3-dragging` : null });
    } else {
      await input.tap(fruit.x, fruit.y);
      await until(p, (k) => window.dinoGame.info().selected === k, fruit.kind, 10000);
      ok(true, `tap selects the ${fruit.kind}`);
      await input.tap(dino.x, dino.y);
    }
    await until(p, (a) => window.dinoGame.info().dinos[a].action === 'burp', s.active);
    if (n === 0) await shot(p, `${mode}-4-burp`);
    await until(p, (c) => window.dinoGame.info().fedCount === c, n + 1);
    ok(true, `dino ${s.active} fed ${fruit.kind} by ${styles[n]}`);
  }

  // --- decorate
  await until(p, () => { const i = window.dinoGame.info(); return i.phase === 'decorate' && i.tray.length === 3 && i.tray.every((t) => t.pop > 0.99); });
  ok(true, 'all dinosaurs fed -> decorating phase with flower, cushion and party hat');
  const kinds = ['flower', 'cushion', 'hat', 'hat', 'hat', 'cushion', 'flower'];
  for (let n = 0; n < kinds.length; n++) {
    const it = (await info(p)).tray.find((t) => t.kind === kinds[n]);
    await input.tap(it.x, it.y);
    await until(p, (c) => window.dinoGame.info().decorCount === c, n + 1, 20000);
  }
  await until(p, () => window.dinoGame.info().dinos.every((d) => d.hat), null, 30000).catch(() => {});
  s = await info(p);
  ok(s.decor.flower === 2 && s.decor.cushion === 2 && s.decor.hat === 3, `decorations placed ${JSON.stringify(s.decor)}`);
  ok(s.dinos.every((d) => d.hat), 'every dinosaur got a party hat');
  ok(s.buttons.dance, 'picture-only dance button appeared');

  // --- optional discoveries
  let before = (await info(p)).particles;
  await input.tap(s.tree.x, s.tree.y);
  await p.waitForTimeout(400);
  ok((await info(p)).particles >= before + 10, 'tapping a palm tree drops petals');
  before = (await info(p)).particles;
  await input.tap(s.pond.x, s.pond.y);
  await p.waitForTimeout(400);
  ok((await info(p)).particles > before, 'tapping the pond makes a fish jump with a splash');
  await shot(p, `${mode}-5-decorated`);

  // --- dance party
  await tapButton(p, input, '#dance');
  await until(p, () => window.dinoGame.info().phase === 'dance', null, 10000);
  ok(true, 'dance started');
  await p.waitForTimeout(2500);
  await shot(p, `${mode}-6-dance`);
  await until(p, () => window.dinoGame.info().buttons.replay);
  ok(true, 'dance ended and picture replay button appeared');
  await shot(p, `${mode}-7-end`);

  // --- replay changes snacks + accessories
  const prev = await info(p);
  await tapButton(p, input, '#replay');
  await until(p, () => { const i = window.dinoGame.info(); return i.phase === 'feed' && i.round === 1 && i.active >= 0; });
  s = await info(p);
  ok(s.wants.filter((w) => prev.wants.includes(w)).length <= 1, `new snack wishes ${prev.wants} -> ${s.wants}`);
  ok(s.dinos.every((d, i) => d.accs.every((a) => !prev.dinos[i].accs.includes(a))), 'every dinosaur wears new accessories');
  ok(s.decorCount >= 0 && s.dinos.every((d) => !d.hat && !d.fed), 'blanket and hats cleared for the new round');
  await p.waitForTimeout(1200);
  await shot(p, `${mode}-8-replay`);

  // --- mute
  const mb = await p.locator('#mute').boundingBox();
  await input.tap(mb.x + mb.width / 2, mb.y + mb.height / 2);
  ok(await p.locator('#icon-muted').isVisible(), 'mute button toggles to the muted picture');
  await input.tap(mb.x + mb.width / 2, mb.y + mb.height / 2);
  ok(await p.locator('#icon-sound').isVisible(), 'and back to sound on');

  ok(errors.length === 0, `no page errors or warnings${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await context.close();
}

const browser = await launch();
try {
  const modes = (process.env.MODES || 'mouse,touch').split(',');
  if (modes.includes('mouse')) await playThrough(browser, 'mouse', { width: 1280, height: 800 });
  if (modes.includes('touch')) await playThrough(browser, 'touch', { width: 390, height: 844 });
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
