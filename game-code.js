// Little Ember: the whole game runs in this one JavaScript event (GDevelop runs it every frame).
// Written during GDevelop BIG Game Jam #10 (theme "Keep It Alive") for MV2 of Munim, Inc.
// Made with AI agents (Anthropic Claude). Apache-2.0.
// 2026-11-07 (run 024920Z): the end screen no longer leaves snowflakes, clumps, gusts and twigs frozen in
// mid-air (they puff away when the night ends either way); the score label is right-aligned on its own text.
// 2026-11-07 (run 120730Z): the game rules now advance in fixed steps of at most 0.05 s, so a slow frame
// plays the same as several fast ones; window.__ember.speed is a test-only hook (the headless test browser
// draws about 3 frames a second, so tests run the night faster); players always play at speed 1.
const W = 1280, H = 720, FX = 640, FY = 556, NIGHT = 150;
let g = window.__ember;
if (!g) {
  g = window.__ember = {
    frames: 0, errors: [], state: 'title', t: 0, fire: 62, score: 0, best: 0, newBest: false, bonus: 0, endT: 0,
    pops: 0, clumpsBroken: 0, gustsBroken: 0, fed: 0, hits: 0, clicks: 0, botClicks: 0, starts: 0, wins: 0, losses: 0,
    bot: 0, botErr: 0, botT: 0, wasDown: false, tSnow: 0, tTwig: 0, tClump: 0, tGust: 0, tAmb: 0, music: '',
    rnd: 1, seed: 0, hint: '', hintT: 0, said: {}, shake: 0, blinkT: 2.5, growled: false, minFire: 100,
    lostAt: '', reqTwig: null, sounds: 0, flameW: 0, flameH: 0, init: false, twigN: 0, dawnV: 0,
    nSnow: 0, nTwig: 0, nClump: 0, nGust: 0, lastClick: null, speed: 1, subSteps: 0
  };
  try { g.best = parseInt(window.localStorage.getItem('littleEmberBest') || '0', 10) || 0; } catch (e) {}
}
g.frames++;
try {
  const objs = (n) => runtimeScene.getObjects(n) || [];
  const one = (n) => objs(n)[0];
  const center = (o, x, y) => { o.setPosition(x - o.getWidth() / 2, y - o.getHeight() / 2); };
  const cx = (o) => o.getX() + o.getWidth() / 2;
  const cy = (o) => o.getY() + o.getHeight() / 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = () => { g.rnd = (Math.imul(g.rnd, 1103515245) + 12345) & 0x7fffffff; return g.rnd / 0x7fffffff; };
  const snd = (f, v) => { try { gdjs.evtTools.sound.playSound(runtimeScene, f, false, v === undefined ? 60 : v, 1); g.sounds++; } catch (e) {} };
  const music = (f) => {
    if (g.music === f) return;
    g.music = f;
    try {
      if (f) gdjs.evtTools.sound.playMusicOnChannel(runtimeScene, f, 1, true, 40, 1);
      else gdjs.evtTools.sound.stopMusicOnChannel(runtimeScene, 1);
    } catch (e) { if (g.errors.length < 5) g.errors.push('music: ' + e); }
  };
  const spawn = (n, x, y, z) => {
    const o = runtimeScene.createObject(n);
    if (o) { o.__kind = n; center(o, x, y); if (z !== undefined) o.setZOrder(z); }
    return o;
  };
  const kill = (o) => { if (!o.__dead) { o.__dead = true; o.deleteFromScene(runtimeScene); } };
  const show = (n, on) => { for (const o of objs(n)) o.hide(!on); };
  // align: true = centred on x, 'r' = right edge at x, anything else = left edge at x
  const place = (n, s, x, y, align) => {
    const o = one(n);
    if (!o) return;
    if (o.__s !== s) { o.setText(s); o.__s = s; }
    o.setPosition(align === 'r' ? x - o.getWidth() : align ? x - o.getWidth() / 2 : x, y);
  };
  const DYN = ['Snow', 'Clump', 'Gust', 'Twig', 'Cone', 'Spark', 'Puff', 'Float'];
  // Frame time in seconds (GDevelop already caps it). g.speed > 1 only ever comes from the test harness.
  const dt = Math.min(0.1, runtimeScene.getTimeManager().getElapsedTime() / 1000) * (g.speed > 1 ? Math.min(g.speed, 10) : 1);
  const input = runtimeScene.getGame().getInputManager();
  const layer = runtimeScene.getLayer('');

  const puffs = (x, y, n, grey) => {
    for (let i = 0; i < n; i++) {
      const p = spawn('Puff', x, y, 11);
      if (!p) continue;
      const a = rand() * 6.283, s = 60 + rand() * 140;
      p.__vx = Math.cos(a) * s; p.__vy = Math.sin(a) * s - 40; p.__life = p.__max = 0.45 + rand() * 0.35;
      if (grey) { try { p.setColor('150;150;164'); } catch (e) {} }
    }
  };
  const sparks = (x, y, n, gentle) => {
    for (let i = 0; i < n; i++) {
      const p = spawn('Spark', x + (rand() - 0.5) * 30, y, 7);
      if (!p) continue;
      p.__vx = (rand() - 0.5) * (gentle ? 60 : 260);
      p.__vy = -(gentle ? 50 + rand() * 90 : 80 + rand() * 220);
      p.__life = p.__max = 0.8 + rand() * 0.9;
    }
  };
  const floatText = (s, x, y, col) => {
    const o = runtimeScene.createObject('Float');
    if (!o) return;
    o.__kind = 'Float'; o.setText(s);
    if (col) { try { o.setColor(col); } catch (e) {} }
    o.setZOrder(35); o.setPosition(x - o.getWidth() / 2, y); o.__life = o.__max = 1.0;
  };
  const say = (s, secs) => { g.hint = s; g.hintT = secs || 4; };
  const clock = () => {
    const mins = Math.floor(21 * 60 + clamp(g.t / NIGHT, 0, 1) * 9 * 60);
    const h24 = Math.floor(mins / 60) % 24, m = mins % 60, h12 = ((h24 + 11) % 12) + 1;
    return h12 + ':' + (m < 10 ? '0' : '') + m + (h24 >= 12 ? ' PM' : ' AM');
  };

  if (!g.init) {
    g.init = true;
    try { if (input.touchSimulateMouse) input.touchSimulateMouse(true); } catch (e) {}
    const f = one('FlameA');
    if (f) { g.flameW = f.getWidth(); g.flameH = f.getHeight(); }
    for (const n of ['Hint', 'Big', 'Sub', 'Start', 'Help', 'Clock', 'Score', 'Best', 'Credit', 'Warm']) {
      for (const o of objs(n)) {
        try { if (o.setOutlineEnabled) { o.setOutlineEnabled(true); o.setOutlineThickness(4); o.setOutlineColor('20;14;30'); } } catch (e) {}
      }
    }
    for (const o of objs('Eyes')) { o.__bx = o.getX(); o.__by = o.getY(); }
  }

  const clearDyn = () => { for (const n of DYN) for (const o of objs(n).slice()) kill(o); };
  const start = () => {
    clearDyn();
    Object.assign(g, { state: 'play', t: 0, fire: 70, score: 0, pops: 0, clumpsBroken: 0, gustsBroken: 0, fed: 0, hits: 0,
      minFire: 100, tSnow: 3.0, tTwig: 0.8, tClump: 0, tGust: 0, said: {}, growled: false, endT: 0, twigN: 0, botClicks: 0, bonus: 0, newBest: false });
    g.rnd = g.seed || ((Date.now() % 2147483) + 1);
    g.starts++;
    music('night.wav');
    say('Tap the falling twigs to feed Little Ember!', 6);
  };
  const finish = (won) => {
    g.state = won ? 'won' : 'lost';
    g.endT = 0;
    music('');
    // Nothing stays frozen on the end screen: every threat and every twig puffs away.
    for (const n of ['Snow', 'Clump', 'Gust']) for (const o of objs(n).slice()) { if (!o.__amb && !o.__dead) { puffs(cx(o), cy(o), 4, !won); kill(o); } }
    for (const n of ['Twig', 'Cone']) for (const o of objs(n).slice()) { if (!o.__dead) { puffs(cx(o), cy(o), 2, true); kill(o); } }
    if (won) {
      g.wins++;
      g.bonus = 500 + Math.round(g.fire * 10);
      g.score += g.bonus;
      snd('dawn.wav', 70);
      sparks(FX, FY - 60, 30);
    } else {
      g.losses++;
      g.lostAt = clock();
      snd('out.wav', 70);
      puffs(FX, FY - 40, 16, true);
    }
    g.newBest = g.score > g.best;
    if (g.newBest) { g.best = g.score; try { window.localStorage.setItem('littleEmberBest', String(g.best)); } catch (e) {} }
  };

  const R = { Snow: 44, Clump: 52, Twig: 48, Cone: 44 };
  const pick = (x, y) => {
    let best = null, bd = 1e9;
    for (const n of ['Gust', 'Clump', 'Snow', 'Twig', 'Cone']) {
      for (const o of objs(n)) {
        if (o.__dead || o.__flying || o.__amb) continue;
        let d;
        if (n === 'Gust') {
          const dx = Math.max(0, Math.abs(x - cx(o)) - o.getWidth() / 2 + 10), dy = Math.max(0, Math.abs(y - cy(o)) - o.getHeight() / 2);
          d = Math.hypot(dx, dy);
          if (d > 26) continue;
        } else {
          d = Math.hypot(x - cx(o), y - cy(o));
          if (d > R[n]) continue;
        }
        if (n === 'Twig' || n === 'Cone') d += 12;
        if (d < bd) { bd = d; best = o; }
      }
    }
    return best;
  };
  const act = (x, y) => {
    g.clicks++;
    const o = pick(x, y);
    if (!o) return '';
    const k = o.__kind, ox = cx(o), oy = cy(o);
    if (k === 'Snow') { puffs(ox, oy, 6); kill(o); snd('pop.wav', 45); g.pops++; g.score += 10; }
    else if (k === 'Clump') {
      o.__hp--;
      if (o.__hp > 0) { o.__vy = -150; o.__flash = 0.15; snd('thud.wav', 60); puffs(ox, oy, 3); }
      else { puffs(ox, oy, 12); kill(o); snd('pop.wav', 60); snd('thud.wav', 50); g.clumpsBroken++; g.score += 25; floatText('+25', ox, oy - 50, '220;235;255'); }
    } else if (k === 'Gust') {
      for (let i = -2; i <= 2; i++) puffs(ox + i * 30, oy, 2);
      kill(o); snd('pop.wav', 50); g.gustsBroken++; g.score += 30; floatText('+30', ox, oy - 50, '220;235;255');
    } else { o.__flying = true; o.__ft = 0; o.__sx = ox; o.__sy = oy; snd('throw.wav', 40); }
    return k;
  };

  // ---- input: one click / tap per press (a quick tap can press and release inside one frame) ----
  const down = input.isMouseButtonPressed(0);
  const rel = input.isMouseButtonReleased(0);
  let click = null;
  if (!g.wasDown && (down || rel)) {
    let mx = input.getCursorX(), my = input.getCursorY();
    try { const p = layer.convertCoords(mx, my); mx = p[0]; my = p[1]; } catch (e) {}
    click = [mx, my];
    g.lastClick = [Math.round(mx), Math.round(my)];
  }
  g.wasDown = down;

  if (g.reqTwig) {
    const o = spawn('Twig', g.reqTwig[0], g.reqTwig[1], 8);
    if (o) Object.assign(o, { __landed: true, __life: 30, __val: 14, __vx: 0, __vy: 0 });
    g.reqTwig = null;
  }

  // ---- one step of the game rules (dt is at most 0.05 s; the click, if any, goes to the first step) ----
  const tick = (dt, click) => {
  // ---- states ----
  if (g.state === 'title') {
    if (click) start();
  } else if (g.state === 'play') {
    if (click) act(click[0], click[1]);
    if (g.bot > 0) {
      g.botT += dt;
      if (g.botT >= g.bot / 1000) {
        g.botT = 0;
        let target = null, bd = 1e9;
        for (const n of ['Snow', 'Clump', 'Gust']) for (const o of objs(n)) {
          if (o.__dead) continue;
          const d = n === 'Gust' ? Math.abs(cx(o) - FX) : Math.hypot(cx(o) - FX, cy(o) - (FY - 50));
          if (d < bd) { bd = d; target = o; }
        }
        if ((!target || bd > 330) && g.fire < 92) {
          for (const n of ['Twig', 'Cone']) for (const o of objs(n)) if (!o.__dead && !o.__flying) { target = o; break; }
        }
        if (target) {
          const e = g.botErr || 0;
          g.botClicks++;
          act(cx(target) + (rand() - 0.5) * 2 * e, cy(target) + (rand() - 0.5) * 2 * e);
        }
      }
    }

    g.t += dt;
    const p = clamp(g.t / NIGHT, 0, 1);
    g.fire -= (1.5 + 1.3 * p) * dt;

    g.tTwig -= dt;
    if (g.tTwig <= 0) {
      g.tTwig = 2.3 + rand() * 0.7;
      g.twigN++;
      const cone = g.twigN % 5 === 0;
      let x = 140 + rand() * 1000;
      if (Math.abs(x - FX) < 120) x += x < FX ? -120 : 120;
      const o = spawn(cone ? 'Cone' : 'Twig', x, -30, 8);
      if (o) Object.assign(o, { __vx: (rand() - 0.5) * 50, __vy: 40, __spin: (rand() - 0.5) * 300, __gy: 598 + rand() * 50, __val: cone ? 22 : 14, __landed: false, __life: 6 });
    }
    if (g.t > 2.5) {
      g.tSnow -= dt;
      if (g.tSnow <= 0) {
        g.tSnow = Math.max(0.85, 1.8 - 1.2 * p) * (0.7 + rand() * 0.6);
        const o = spawn('Snow', 40 + rand() * 1200, -30, 9);
        if (o) Object.assign(o, { __sp: 52 + 70 * p + rand() * 22, __ph: rand() * 6, __spin: (rand() - 0.5) * 120 });
        if (!g.said.snow) { g.said.snow = 1; say('Tap the snowflakes before they reach the fire!', 5); }
      }
    }
    if (g.t > 45) {
      g.tClump -= dt;
      if (g.tClump <= 0) {
        g.tClump = Math.max(4, 7 - 3 * p) * (0.8 + rand() * 0.4);
        const o = spawn('Clump', 120 + rand() * 1040, -40, 9);
        if (o) Object.assign(o, { __sp: 38 + 30 * p, __hp: 2, __vy: 0, __flash: 0, __spin: (rand() - 0.5) * 90 });
        if (!g.said.clump) { g.said.clump = 1; say('A snow clump! Tap it twice.', 4); }
      }
    }
    if (g.t > 70) {
      music('storm.wav');
      g.tGust -= dt;
      if (g.tGust <= 0) {
        g.tGust = Math.max(5, 9 - (4 * (p - 0.47)) / 0.53) * (0.8 + rand() * 0.4);
        const side = rand() < 0.5 ? -1 : 1;
        const o = spawn('Gust', side < 0 ? -100 : W + 100, 430 + rand() * 110, 10);
        if (o) {
          Object.assign(o, { __vx: -side * (170 + 90 * p), __by: cy(o), __ph: rand() * 6 });
          if (side > 0) { try { o.flipX(true); } catch (e) {} }
        }
        snd('gust.wav', 35);
        if (!g.said.gust) { g.said.gust = 1; say('Wind! Tap the gusts before they blow it out!', 5); }
      }
    }
    if (g.t > 110 && !g.said.bliz) { g.said.bliz = 1; say('Blizzard! Hang on, dawn is coming!', 5); }
    if (g.t > 136 && !g.said.dawn) { g.said.dawn = 1; say('Almost dawn...', 4); }

    const tx = FX, ty = FY - 52, fr = 34 + g.fire * 0.32;
    for (const o of objs('Snow').slice()) {
      if (o.__dead) continue;
      const x = cx(o), y = cy(o), dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
      o.__ph += dt * 2.2;
      const wob = Math.sin(o.__ph) * 40;
      center(o, x + (dx / d) * o.__sp * dt - (dy / d) * wob * dt, y + (dy / d) * o.__sp * dt + (dx / d) * wob * dt);
      o.setAngle(o.getAngle() + o.__spin * dt);
      if (d < fr) { g.fire -= 5; g.hits++; puffs(x, y, 5, true); snd('hiss.wav', 55); kill(o); g.shake = Math.max(g.shake, 0.18); }
    }
    for (const o of objs('Clump').slice()) {
      if (o.__dead) continue;
      const x = cx(o), y = cy(o), dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
      o.__vy *= Math.pow(0.02, dt);
      center(o, x + (dx / d) * o.__sp * dt, y + (dy / d) * o.__sp * dt + o.__vy * dt);
      o.setAngle(o.getAngle() + o.__spin * dt);
      if (o.__flash > 0) { o.__flash -= dt; o.setOpacity(140); } else o.setOpacity(255);
      if (d < fr + 8) { g.fire -= 12; g.hits++; puffs(x, y, 10, true); snd('hiss.wav', 70); snd('thud.wav', 50); kill(o); g.shake = 0.3; }
    }
    for (const o of objs('Gust').slice()) {
      if (o.__dead) continue;
      o.__ph += dt * 3;
      const x = cx(o) + o.__vx * dt;
      center(o, x, o.__by + Math.sin(o.__ph) * 14);
      if (Math.abs(x - FX) < 50) { g.fire -= 14; g.hits++; sparks(FX, FY - 60, 10); snd('hiss.wav', 60); kill(o); g.shake = 0.3; }
      else if (x < -320 || x > W + 320) kill(o);
    }
    for (const n of ['Twig', 'Cone']) for (const o of objs(n).slice()) {
      if (o.__dead) continue;
      if (o.__flying) {
        o.__ft += dt / 0.45;
        const u = Math.min(1, o.__ft);
        center(o, o.__sx + (FX - o.__sx) * u, o.__sy + (FY - 40 - o.__sy) * u - Math.sin(Math.PI * u) * 170);
        o.setAngle(o.getAngle() + 720 * dt);
        if (u >= 1) {
          g.fire = Math.min(100, g.fire + o.__val);
          g.fed++;
          const pts = o.__val > 15 ? 25 : 15;
          g.score += pts;
          sparks(FX, FY - 50, o.__val > 15 ? 22 : 12);
          snd('crackle.wav', 65);
          floatText('+' + pts, FX + 80, FY - 190, '255;214;120');
          kill(o);
        }
      } else if (!o.__landed) {
        o.__vy += 420 * dt;
        const x = cx(o) + o.__vx * dt, y = cy(o) + o.__vy * dt;
        center(o, x, y);
        o.setAngle(o.getAngle() + o.__spin * dt);
        if (y >= o.__gy) { o.__landed = true; o.__life = 6; center(o, x, o.__gy); o.setAngle((rand() - 0.5) * 30); snd('thud.wav', 20); }
      } else {
        o.__life -= dt;
        o.setOpacity(o.__life < 2 ? (Math.floor(o.__life * 8) % 2 ? 90 : 255) : 255);
        if (o.__life <= 0) { puffs(cx(o), cy(o), 3, true); kill(o); }
      }
    }

    g.fire = Math.min(100, g.fire);
    g.minFire = Math.min(g.minFire, g.fire);
    if (g.fire < 25 && !g.said.low) { g.said.low = 1; say('Feed me! Tap the twigs!', 3); }
    if (g.fire > 40) g.said.low = 0;
    if (g.fire < 20 && !g.growled) { g.growled = true; snd('growl.wav', 45); }
    if (g.fire > 35) g.growled = false;
    if (g.fire <= 0) { g.fire = 0; finish(false); }
    else if (g.t >= NIGHT) finish(true);
  } else {
    g.endT += dt;
    if (click && g.endT > 1.2) start();
  }

  // ---- ambient snow on the title and after a loss (harmless, just weather) ----
  if (g.state === 'title' || g.state === 'lost') {
    g.tAmb -= dt;
    if (g.tAmb <= 0) {
      g.tAmb = 0.35 + rand() * 0.4;
      const o = spawn('Snow', rand() * W, -30, 9);
      if (o) { Object.assign(o, { __amb: true, __ph: rand() * 6, __sp: 35 + rand() * 30, __spin: (rand() - 0.5) * 80 }); o.setScale(0.5 + rand() * 0.4); o.setOpacity(200); }
    }
    for (const o of objs('Snow').slice()) {
      if (!o.__amb || o.__dead) continue;
      o.__ph += dt * 1.5;
      o.setPosition(o.getX() + Math.sin(o.__ph) * 20 * dt, o.getY() + o.__sp * dt);
      o.setAngle(o.getAngle() + o.__spin * dt);
      if (o.getY() > 660) kill(o);
    }
  }

  // ---- particles ----
  for (const o of objs('Puff').slice()) {
    if (o.__dead) continue;
    o.__life -= dt;
    if (o.__life <= 0) { kill(o); continue; }
    o.__vx *= Math.pow(0.1, dt); o.__vy = o.__vy * Math.pow(0.1, dt) - 10 * dt;
    o.setPosition(o.getX() + o.__vx * dt, o.getY() + o.__vy * dt);
    o.setOpacity(255 * o.__life / o.__max);
  }
  for (const o of objs('Spark').slice()) {
    if (o.__dead) continue;
    o.__life -= dt;
    if (o.__life <= 0) { kill(o); continue; }
    o.__vy += 30 * dt; o.__vx += Math.sin(g.frames * 0.2 + o.__life * 7) * 40 * dt;
    o.setPosition(o.getX() + o.__vx * dt, o.getY() + o.__vy * dt);
    o.setOpacity(255 * Math.min(1, (o.__life / o.__max) * 1.5));
  }
  for (const o of objs('Float').slice()) {
    if (o.__dead) continue;
    o.__life -= dt;
    if (o.__life <= 0) { kill(o); continue; }
    o.setY(o.getY() - 50 * dt);
    o.setOpacity(255 * Math.min(1, (o.__life / o.__max) * 2));
  }
  };
  const nSub = Math.max(1, Math.min(20, Math.ceil(dt / 0.05 - 1e-9)));
  g.subSteps = nSub;
  for (let i = 0; i < nSub; i++) tick(dt / nSub, i === 0 ? click : null);

  // ---- the ember itself ----
  const out = g.state === 'lost';
  const shown = g.state === 'title' ? 62 : clamp(g.fire, 0, 100);
  const fs = 0.5 + (shown / 100) * 0.75;
  const fl = Math.floor(g.frames / 7) % 2;
  const sx = fs * (1 + 0.05 * Math.sin(g.frames * 0.31)), sy = fs * (1 + 0.07 * Math.sin(g.frames * 0.23 + 1));
  for (const n of ['FlameA', 'FlameB']) {
    const f = one(n);
    if (!f) continue;
    f.setScaleX(sx); f.setScaleY(sy);
    f.setPosition(FX - f.getWidth() / 2, FY + 6 - f.getHeight());
    f.hide(out || ((n === 'FlameA') !== (fl === 0)));
  }
  g.blinkT -= dt;
  if (g.blinkT < -0.14) g.blinkT = 2 + rand() * 3;
  const fA = one('FlameA'), fh = fA ? fA.getHeight() : 120;
  const worried = g.state === 'play' && g.fire < 30;
  const mood = out ? '' : g.blinkT < 0 ? 'FaceBlink' : worried ? 'FaceSad' : 'Face';
  for (const n of ['Face', 'FaceSad', 'FaceBlink']) {
    const f = one(n);
    if (!f) continue;
    f.setScale(Math.max(0.6, fs));
    center(f, FX + (worried ? Math.sin(g.frames * 0.9) * 2 : 0), FY + 6 - fh * 0.36);
    f.hide(n !== mood);
  }
  const gl = one('Glow');
  if (gl) {
    gl.setScale(out ? 0.01 : (1.4 + (shown / 100) * 2.4) * (1 + 0.04 * Math.sin(g.frames * 0.27)));
    center(gl, FX, FY - 50);
    gl.setOpacity(out ? 0 : 150 + shown);
  }
  if (!out && rand() < dt * (2 + shown / 12)) sparks(FX, FY - 30 - fs * 50, 1, true);

  // ---- sky, darkness and the eyes in the woods ----
  const pr = clamp(g.t / NIGHT, 0, 1);
  const dawn = g.state === 'title' || g.state === 'lost' ? 0 : g.state === 'won' ? 1 : clamp((pr - 0.55) / 0.45, 0, 1);
  g.dawnV += (dawn - g.dawnV) * Math.min(1, dt * 1.5);
  const sd = one('SkyDawn');
  if (sd) sd.setOpacity(255 * g.dawnV);
  const dk = one('Dark');
  if (dk) dk.setOpacity(out ? 170 : (1 - g.dawnV) * (40 + 120 * (1 - shown / 100)));
  const danger = out ? 1 : g.state === 'play' ? clamp((32 - g.fire) / 32, 0, 1) : 0;
  for (const o of objs('Eyes')) {
    if (o.__bx === undefined) { o.__bx = o.getX(); o.__by = o.getY(); }
    const toward = o.__bx < FX ? 1 : -1;
    o.setPosition(o.__bx + toward * danger * 120, o.__by);
    o.setOpacity(255 * danger);
    o.hide(danger <= 0 || g.frames % 200 < 6);
  }

  // ---- text and HUD ----
  const playing = g.state === 'play', ended = g.state === 'won' || g.state === 'lost', title = g.state === 'title';
  show('TitleImg', title); show('Help', title); show('Credit', title);
  show('Sub', !playing);
  show('Start', (title || (ended && g.endT > 1.2)) && Math.floor(g.frames / 30) % 2 === 0);
  show('BarBack', playing); show('BarFill', playing); show('Warm', playing);
  show('Clock', playing || ended); show('Score', playing || ended);
  show('Big', ended); show('Best', title ? g.best > 0 : ended);
  g.hintT -= dt;
  show('Hint', playing && g.hintT > 0);
  const ti = one('TitleImg');
  if (ti) center(ti, W / 2, 150 + Math.sin(g.frames * 0.05) * 4);
  if (title) {
    place('Sub', 'Keep the little ember alive until dawn.', W / 2, 222, true);
    place('Help', 'Tap falling twigs to feed it.   Tap snow and wind before they reach it.', W / 2, 280, true);
    place('Start', 'Click or tap to begin', W / 2, 340, true);
    place('Best', 'Best score: ' + g.best, W / 2, 392, true);
    place('Credit', 'MV2 of Munim, Inc.  -  made with GDevelop for GDevelop BIG Game Jam #10', W / 2, 688, true);
  }
  if (playing || ended) {
    place('Clock', clock(), 24, 16, false);
    place('Score', 'Score ' + g.score, W - 24, 16, 'r');
  }
  if (playing) {
    const bb = one('BarBack'), bf = one('BarFill');
    if (bb) bb.setPosition(W / 2 - bb.getWidth() / 2, 18);
    if (bf) { bf.setScaleX(Math.max(0.01, (g.fire / 100) * 80)); bf.setPosition(W / 2 - 160, 22); }
    place('Warm', g.fire < 25 ? 'WARMTH - LOW!' : 'WARMTH', W / 2, 50, true);
    const wm = one('Warm');
    if (wm) { try { wm.setColor(g.fire < 25 ? (g.frames % 20 < 10 ? '255;110;90' : '255;220;200') : '255;236;210'); } catch (e) {} }
    place('Hint', g.hint, W / 2, 96, true);
    const hn = one('Hint');
    if (hn) hn.setOpacity(255 * clamp(g.hintT, 0, 1));
  }
  if (ended) {
    const won = g.state === 'won';
    place('Big', won ? 'Dawn! Little Ember made it.' : 'The ember went out at ' + g.lostAt + '.', W / 2, 150, true);
    place('Sub', won ? 'Dawn bonus +' + g.bonus + '.   Final score ' + g.score + '.'
      : 'It stayed alive ' + Math.floor(g.t) + ' seconds into the night.   Score ' + g.score + '.', W / 2, 230, true);
    place('Best', g.newBest ? 'New best score!' : 'Best score: ' + g.best, W / 2, 286, true);
    place('Start', 'Click or tap to play again', W / 2, 340, true);
  }

  // ---- screen shake ----
  if (g.shake > 0) {
    g.shake -= dt;
    const m = (7 * Math.max(0, g.shake)) / 0.3;
    layer.setCameraX(W / 2 + (rand() - 0.5) * 2 * m);
    layer.setCameraY(H / 2 + (rand() - 0.5) * 2 * m);
  } else { layer.setCameraX(W / 2); layer.setCameraY(H / 2); }

  g.nSnow = objs('Snow').filter((o) => !o.__amb && !o.__dead).length;
  g.nTwig = objs('Twig').filter((o) => !o.__dead).length + objs('Cone').filter((o) => !o.__dead).length;
  g.nClump = objs('Clump').filter((o) => !o.__dead).length;
  g.nGust = objs('Gust').filter((o) => !o.__dead).length;
} catch (e) {
  if (g.errors.length < 5) g.errors.push(String((e && e.stack) || e).slice(0, 400));
}
