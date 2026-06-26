(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const arena = $('arenaCanvas');
  const camera = $('cameraCanvas');
  const ctx = arena.getContext('2d');
  const cam = camera.getContext('2d');

  const W = arena.width;
  const H = arena.height;
  const PAD = 20;
  const GRID = 50;

  const obstacles = [
    { x1: 420, y1: 140, x2: 580, y2: 240, label: 'Tower' },
    { x1: 700, y1: 360, x2: 880, y2: 500, label: 'Building' },
    { x1: 330, y1: 420, x2: 520, y2: 560, label: 'Trees' },
  ];

  const home = { x: 180, y: 300 };
  const drone = {
    x: home.x,
    y: home.y,
    heading: 0,
    speed: 140,
    turnSpeed: 140,
    flying: false,
    battery: 100,
    path: [{ x: home.x, y: home.y }],
  };

  let running = false;
  let queue = [];
  let lastT = performance.now();
  let lastFocusBeforeModal = null;
  let mousePoint = null;

  const scriptEl = $('script');
  const statusEl = $('status');
  const mouseCoords = $('mouseCoords');
  const lessonPanel = $('lessonPanel');
  const btnLesson = $('btnLesson');
  const helpModal = $('helpModal');
  const closeHelp = $('closeHelp');

  const hud = {
    state: $('hudState'),
    queue: $('hudQueue'),
    pos: $('hudPos'),
    head: $('hudHead'),
    speed: $('hudSpeed'),
    bat: $('hudBat'),
  };

  const missions = {
    square: `# Square mission\nTAKEOFF\nSETSPEED 140\nMOVE 150\nTURN 90\nMOVE 150\nTURN 90\nMOVE 150\nTURN 90\nMOVE 150\nHOME\nLAND`,
    patrol: `# Patrol mission around safe points\nTAKEOFF\nSETSPEED 160\nGOTO 300 160\nWAIT 0.4\nGOTO 650 110\nWAIT 0.4\nGOTO 890 280\nWAIT 0.4\nGOTO 620 590\nWAIT 0.4\nHOME\nLAND`,
    default: `TAKEOFF\nSETSPEED 140\nMOVE 160\nTURN 90\nMOVE 90\nTURN -45\nMOVE 140\nWAIT 0.4\nHOME\nLAND`,
  };

  scriptEl.value = missions.default;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const deg2rad = (d) => (d * Math.PI) / 180;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function getCss(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function setStatus(message, kind = '') {
    statusEl.textContent = message;
    statusEl.className = `status ${kind}`.trim();
  }

  function inBounds(x, y) {
    return PAD + 10 <= x && x <= W - PAD - 10 && PAD + 10 <= y && y <= H - PAD - 10;
  }

  function obstacleHitAt(x, y) {
    const rr = drone.flying ? 14 : 12;
    for (const r of obstacles) {
      const cx = clamp(x, r.x1, r.x2);
      const cy = clamp(y, r.y1, r.y2);
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= rr * rr) return r;
    }
    return null;
  }

  function stopMission(message, kind = 'bad') {
    running = false;
    queue = [];
    setStatus(message, kind);
  }

  function reset() {
    running = false;
    queue = [];
    drone.x = home.x;
    drone.y = home.y;
    drone.heading = 0;
    drone.speed = 140;
    drone.flying = false;
    drone.battery = 100;
    drone.path = [{ x: drone.x, y: drone.y }];
    lastT = performance.now();
    setStatus('Reset complete. Ready for a new mission.', 'good');
  }

  function clearPath() {
    drone.path = [{ x: drone.x, y: drone.y }];
    setStatus('Path cleared.', 'good');
  }

  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = '#f0e2ca';
    ctx.lineWidth = 1;
    ctx.font = '10px system-ui';
    ctx.fillStyle = getCss('--muted');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let x = PAD + GRID; x < W - PAD; x += GRID) {
      ctx.beginPath();
      ctx.moveTo(x, PAD);
      ctx.lineTo(x, H - PAD);
      ctx.stroke();
      ctx.fillText(String(x), x, PAD + 4);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let y = PAD + GRID; y < H - PAD; y += GRID) {
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(W - PAD, y);
      ctx.stroke();
      ctx.fillText(String(y), PAD + 4, y);
    }
    ctx.restore();
  }

  function drawArena() {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 2;
    ctx.strokeStyle = getCss('--border');
    ctx.strokeRect(PAD, PAD, W - 2 * PAD, H - 2 * PAD);
    drawGrid();

    for (const r of obstacles) {
      ctx.fillStyle = '#fff2d6';
      ctx.strokeStyle = getCss('--border');
      ctx.lineWidth = 2;
      ctx.fillRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1);
      ctx.strokeRect(r.x1, r.y1, r.x2 - r.x1, r.y2 - r.y1);
      ctx.fillStyle = getCss('--warn');
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.label.toUpperCase(), (r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2);
    }

    ctx.beginPath();
    ctx.fillStyle = getCss('--ok');
    ctx.arc(home.x, home.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = getCss('--ok');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`HOME (${home.x}, ${home.y})`, home.x + 12, home.y + 2);

    if (drone.path.length > 1) {
      ctx.strokeStyle = getCss('--brand2');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(drone.path[0].x, drone.path[0].y);
      for (const p of drone.path) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    if (mousePoint) {
      ctx.save();
      ctx.strokeStyle = 'rgba(31, 41, 55, 0.35)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(mousePoint.x, PAD);
      ctx.lineTo(mousePoint.x, H - PAD);
      ctx.moveTo(PAD, mousePoint.y);
      ctx.lineTo(W - PAD, mousePoint.y);
      ctx.stroke();
      ctx.restore();
    }

    const r = drone.flying ? 15 : 12;
    ctx.beginPath();
    ctx.fillStyle = getCss('--brand');
    ctx.arc(drone.x, drone.y, r, 0, Math.PI * 2);
    ctx.fill();

    const a = deg2rad(drone.heading);
    const ax = drone.x + Math.cos(a) * 28;
    const ay = drone.y - Math.sin(a) * 28;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(drone.x, drone.y);
    ctx.lineTo(ax, ay);
    ctx.stroke();

    ctx.fillStyle = drone.flying ? getCss('--ink') : getCss('--muted');
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(drone.flying ? 'DRONE' : 'DRONE ON GROUND', drone.x, drone.y - 24);
  }

  function drawCamera() {
    const cw = camera.width;
    const ch = camera.height;
    cam.clearRect(0, 0, cw, ch);

    const sky = cam.createLinearGradient(0, 0, 0, ch * 0.58);
    sky.addColorStop(0, '#bfe8ff');
    sky.addColorStop(1, '#f7fbff');
    cam.fillStyle = sky;
    cam.fillRect(0, 0, cw, ch * 0.58);

    const ground = cam.createLinearGradient(0, ch * 0.58, 0, ch);
    ground.addColorStop(0, '#f5d79e');
    ground.addColorStop(1, '#b87935');
    cam.fillStyle = ground;
    cam.fillRect(0, ch * 0.58, cw, ch * 0.42);

    cam.fillStyle = 'rgba(255,255,255,0.82)';
    cam.beginPath();
    cam.arc(cw * 0.83, ch * 0.18, 22, 0, Math.PI * 2);
    cam.fill();

    cam.strokeStyle = 'rgba(255,255,255,0.62)';
    cam.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = ch * 0.68 + i * 28;
      cam.beginPath();
      cam.moveTo(cw * 0.5 - 40 - i * 46, y);
      cam.lineTo(cw * 0.5 + 40 + i * 46, y);
      cam.stroke();
    }

    const headingRad = deg2rad(drone.heading);
    const viewDir = { x: Math.cos(headingRad), y: -Math.sin(headingRad) };
    const rightDir = { x: Math.cos(headingRad + Math.PI / 2), y: -Math.sin(headingRad + Math.PI / 2) };

    function project(point, label, color, size) {
      const rel = { x: point.x - drone.x, y: point.y - drone.y };
      const forward = rel.x * viewDir.x + rel.y * viewDir.y;
      const side = rel.x * rightDir.x + rel.y * rightDir.y;
      if (forward < -40) return;
      const depth = clamp(forward + 180, 60, 900);
      const scale = clamp(260 / depth, 0.32, 2.0);
      const x = cw / 2 + side * scale * 0.75;
      const y = ch * 0.70 - forward * scale * 0.10;
      if (x < -80 || x > cw + 80) return;
      cam.fillStyle = color;
      cam.fillRect(x - size * scale / 2, y - size * scale, size * scale, size * scale);
      cam.fillStyle = '#172033';
      cam.font = `bold ${Math.max(11, 12 * scale)}px system-ui`;
      cam.textAlign = 'center';
      cam.fillText(label, x, y - size * scale - 5);
    }

    for (const r of obstacles) {
      project({ x: (r.x1 + r.x2) / 2, y: (r.y1 + r.y2) / 2 }, r.label, '#f59e0b', 48);
    }
    project(home, 'HOME', '#166534', 34);

    cam.fillStyle = 'rgba(11, 18, 32, 0.82)';
    cam.fillRect(12, 12, 250, 82);
    cam.fillStyle = '#e5e7eb';
    cam.font = 'bold 15px system-ui';
    cam.textAlign = 'left';
    cam.fillText(`Camera: ${drone.flying ? 'AIRBORNE' : 'GROUND'}`, 24, 36);
    cam.fillText(`Heading: ${drone.heading.toFixed(0)}°`, 24, 60);
    cam.fillText(`Home distance: ${distance(drone, home).toFixed(0)} px`, 24, 84);

    cam.strokeStyle = 'rgba(255,255,255,0.8)';
    cam.lineWidth = 2;
    cam.beginPath();
    cam.moveTo(cw / 2 - 18, ch / 2);
    cam.lineTo(cw / 2 + 18, ch / 2);
    cam.moveTo(cw / 2, ch / 2 - 18);
    cam.lineTo(cw / 2, ch / 2 + 18);
    cam.stroke();
  }

  function updateHud() {
    hud.state.textContent = `State: ${drone.flying ? 'FLYING' : 'GROUND'}`;
    hud.queue.textContent = `Queue: ${queue.length} cmd`;
    hud.pos.textContent = `Pos: (${drone.x.toFixed(1)}, ${drone.y.toFixed(1)})`;
    hud.head.textContent = `Heading: ${drone.heading.toFixed(1)}°`;
    hud.speed.textContent = `Speed: ${drone.speed.toFixed(0)} px/s`;
    hud.bat.textContent = `Battery: ${drone.battery.toFixed(1)}%`;
  }

  function commandError(lineNumber, lineText, message) {
    throw new Error(`Line ${lineNumber}: ${lineText}\n${message}`);
  }

  function requireArgCount(parts, count, lineNumber, lineText, syntax) {
    if (parts.length !== count) commandError(lineNumber, lineText, `Expected: ${syntax}`);
  }

  function numberArg(value, lineNumber, lineText, name) {
    const n = Number(value);
    if (!Number.isFinite(n)) commandError(lineNumber, lineText, `Invalid ${name}. Use a number.`);
    return n;
  }

  function parseScript(text) {
    const rawLines = text.split(/\r?\n/);
    const cmds = [];

    rawLines.forEach((raw, idx) => {
      const lineNumber = idx + 1;
      const withoutComment = raw.replace(/\s+#.*$/, '').trim();
      if (!withoutComment || withoutComment.startsWith('#')) return;

      const parts = withoutComment.split(/\s+/);
      const command = parts[0].toUpperCase();

      if (command === 'TAKEOFF') {
        requireArgCount(parts, 1, lineNumber, withoutComment, 'TAKEOFF');
        cmds.push({ type: 'TAKEOFF', lineNumber });
      } else if (command === 'LAND') {
        requireArgCount(parts, 1, lineNumber, withoutComment, 'LAND');
        cmds.push({ type: 'LAND', lineNumber });
      } else if (command === 'HOME') {
        requireArgCount(parts, 1, lineNumber, withoutComment, 'HOME');
        cmds.push({ type: 'HOME', lineNumber });
      } else if (command === 'WAIT') {
        requireArgCount(parts, 2, lineNumber, withoutComment, 'WAIT seconds');
        const t = numberArg(parts[1], lineNumber, withoutComment, 'wait time');
        if (t < 0 || t > 30) commandError(lineNumber, withoutComment, 'WAIT must be between 0 and 30 seconds.');
        cmds.push({ type: 'WAIT', t, elapsed: 0, lineNumber });
      } else if (command === 'SETSPEED') {
        requireArgCount(parts, 2, lineNumber, withoutComment, 'SETSPEED speed');
        const v = numberArg(parts[1], lineNumber, withoutComment, 'speed');
        if (v < 40 || v > 300) commandError(lineNumber, withoutComment, 'SETSPEED must be between 40 and 300.');
        cmds.push({ type: 'SETSPEED', v, lineNumber });
      } else if (command === 'TURN') {
        requireArgCount(parts, 2, lineNumber, withoutComment, 'TURN degrees');
        const deg = numberArg(parts[1], lineNumber, withoutComment, 'degrees');
        if (Math.abs(deg) > 1440) commandError(lineNumber, withoutComment, 'TURN is too large. Use -1440 to 1440 degrees.');
        cmds.push({ type: 'TURN', deg, remaining: null, lineNumber });
      } else if (command === 'MOVE') {
        requireArgCount(parts, 2, lineNumber, withoutComment, 'MOVE distance');
        const dist = numberArg(parts[1], lineNumber, withoutComment, 'distance');
        if (Math.abs(dist) > 1200) commandError(lineNumber, withoutComment, 'MOVE is too large. Use -1200 to 1200.');
        cmds.push({ type: 'MOVE', dist, remaining: null, lineNumber });
      } else if (command === 'GOTO') {
        requireArgCount(parts, 3, lineNumber, withoutComment, 'GOTO x y');
        const x = numberArg(parts[1], lineNumber, withoutComment, 'x coordinate');
        const y = numberArg(parts[2], lineNumber, withoutComment, 'y coordinate');
        if (!inBounds(x, y)) commandError(lineNumber, withoutComment, 'GOTO point is outside the safe arena boundary.');
        const hit = obstacleHitAt(x, y);
        if (hit) commandError(lineNumber, withoutComment, `GOTO point is inside or too close to obstacle: ${hit.label}.`);
        cmds.push({ type: 'GOTO', x, y, lineNumber });
      } else {
        commandError(lineNumber, withoutComment, `Unknown command: ${command}`);
      }
    });

    if (!cmds.length) throw new Error('No commands found. Add TAKEOFF, MOVE, TURN, GOTO, HOME or LAND commands.');
    return cmds;
  }

  function doTakeoff() {
    if (!drone.flying) {
      drone.flying = true;
      drone.path.push({ x: drone.x, y: drone.y });
      setStatus('Takeoff complete.', 'good');
    } else {
      setStatus('TAKEOFF ignored: drone is already flying.', 'warn');
    }
  }

  function doLand() {
    if (drone.flying) {
      drone.flying = false;
      setStatus('Landing complete.', 'good');
    } else {
      setStatus('LAND ignored: drone is already on the ground.', 'warn');
    }
  }

  function tryMove(nx, ny) {
    if (!inBounds(nx, ny)) {
      stopMission('Mission stopped: boundary reached. Stay inside the arena.', 'bad');
      return false;
    }
    const hit = obstacleHitAt(nx, ny);
    if (hit) {
      stopMission(`Mission stopped: obstacle collision near ${hit.label}. Use GOTO around it.`, 'bad');
      return false;
    }
    drone.x = nx;
    drone.y = ny;
    drone.path.push({ x: drone.x, y: drone.y });
    return true;
  }

  function stepCommand(cmd, dt) {
    if (drone.flying) {
      drone.battery = Math.max(0, drone.battery - 0.35 * dt);
      if (drone.battery <= 5) {
        doLand();
        stopMission('Mission stopped: low battery. Drone landed safely.', 'warn');
        return true;
      }
    }

    if (cmd.type === 'TAKEOFF') {
      doTakeoff();
      return true;
    }
    if (cmd.type === 'LAND') {
      doLand();
      return true;
    }
    if (cmd.type === 'SETSPEED') {
      drone.speed = cmd.v;
      setStatus(`Speed set to ${cmd.v} px/s.`, 'good');
      return true;
    }
    if (cmd.type === 'WAIT') {
      cmd.elapsed += dt;
      setStatus(`Waiting ${Math.min(cmd.elapsed, cmd.t).toFixed(1)} / ${cmd.t.toFixed(1)} seconds...`, 'warn');
      return cmd.elapsed >= cmd.t;
    }

    if (!drone.flying) {
      setStatus(`${cmd.type} ignored on line ${cmd.lineNumber}: TAKEOFF first.`, 'warn');
      return true;
    }

    if (cmd.type === 'TURN') {
      if (cmd.remaining === null) cmd.remaining = cmd.deg;
      const s = Math.sign(cmd.remaining) * Math.min(Math.abs(cmd.remaining), drone.turnSpeed * dt);
      drone.heading = (drone.heading + s + 360) % 360;
      cmd.remaining -= s;
      return Math.abs(cmd.remaining) < 0.5;
    }

    if (cmd.type === 'MOVE') {
      if (cmd.remaining === null) cmd.remaining = cmd.dist;
      const s = Math.sign(cmd.remaining) * Math.min(Math.abs(cmd.remaining), drone.speed * dt);
      const a = deg2rad(drone.heading);
      const nx = drone.x + Math.cos(a) * s;
      const ny = drone.y - Math.sin(a) * s;
      if (!tryMove(nx, ny)) return true;
      cmd.remaining -= s;
      return Math.abs(cmd.remaining) < 0.8;
    }

    if (cmd.type === 'GOTO' || cmd.type === 'HOME') {
      const targetPoint = cmd.type === 'HOME' ? home : { x: cmd.x, y: cmd.y };
      const dx = targetPoint.x - drone.x;
      const dy = drone.y - targetPoint.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 10) return true;

      const targetHeading = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
      const diff = ((targetHeading - drone.heading + 540) % 360) - 180;
      if (Math.abs(diff) > 3) {
        const s = Math.sign(diff) * Math.min(Math.abs(diff), drone.turnSpeed * dt);
        drone.heading = (drone.heading + s + 360) % 360;
        return false;
      }

      const step = Math.min(dist, drone.speed * dt);
      const a = deg2rad(drone.heading);
      const nx = drone.x + Math.cos(a) * step;
      const ny = drone.y - Math.sin(a) * step;
      if (!tryMove(nx, ny)) return true;
      return false;
    }

    return true;
  }

  function runMission() {
    try {
      queue = parseScript(scriptEl.value);
      running = true;
      lastT = performance.now();
      setStatus(`Running ${queue.length} command(s)...`, 'good');
    } catch (err) {
      stopMission(err.message, 'bad');
      alert(err.message);
    }
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;

    if (running && queue.length) {
      if (stepCommand(queue[0], dt)) queue.shift();
      if (!queue.length) {
        running = false;
        setStatus('Mission complete.', 'good');
      }
    }

    drawArena();
    drawCamera();
    updateHud();
    requestAnimationFrame(loop);
  }

  function canvasPoint(evt) {
    const r = arena.getBoundingClientRect();
    return {
      x: Math.round(((evt.clientX - r.left) * arena.width) / r.width),
      y: Math.round(((evt.clientY - r.top) * arena.height) / r.height),
    };
  }

  function openHelp() {
    lastFocusBeforeModal = document.activeElement;
    helpModal.classList.add('open');
    helpModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeHelp.focus();
  }

  function closeHelpModal() {
    helpModal.classList.remove('open');
    helpModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocusBeforeModal) lastFocusBeforeModal.focus();
  }

  function toggleLesson(force) {
    const show = typeof force === 'boolean' ? force : lessonPanel.hidden;
    lessonPanel.hidden = !show;
    btnLesson.setAttribute('aria-expanded', String(show));
    btnLesson.textContent = show ? 'Hide Lesson' : 'Show Lesson';
    if (show) lessonPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('btnRun').addEventListener('click', runMission);
  $('runScript').addEventListener('click', runMission);
  $('btnPause').addEventListener('click', () => {
    running = false;
    setStatus('Paused.', 'warn');
  });
  $('btnReset').addEventListener('click', reset);
  $('stopNow').addEventListener('click', () => stopMission('Stopped by user.', 'warn'));
  $('clearPath').addEventListener('click', clearPath);
  $('btnHelp').addEventListener('click', openHelp);
  closeHelp.addEventListener('click', closeHelpModal);
  $('btnLesson').addEventListener('click', () => toggleLesson());
  $('btnHideLesson').addEventListener('click', () => toggleLesson(false));
  $('btnLoadSquare').addEventListener('click', () => {
    scriptEl.value = missions.square;
    setStatus('Square mission loaded.', 'good');
  });
  $('btnLoadPatrol').addEventListener('click', () => {
    scriptEl.value = missions.patrol;
    setStatus('Patrol mission loaded.', 'good');
  });
  $('btnCopyScript').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(scriptEl.value);
      setStatus('Mission script copied to clipboard.', 'good');
    } catch {
      scriptEl.select();
      setStatus('Clipboard blocked. Script selected; press Ctrl+C.', 'warn');
    }
  });

  arena.addEventListener('mousemove', (evt) => {
    mousePoint = canvasPoint(evt);
    mouseCoords.textContent = `Mouse: (${mousePoint.x}, ${mousePoint.y})`;
  });
  arena.addEventListener('mouseleave', () => {
    mousePoint = null;
    mouseCoords.textContent = 'Mouse: —';
  });
  arena.addEventListener('click', (evt) => {
    if (!evt.shiftKey) return;
    const p = canvasPoint(evt);
    if (!inBounds(p.x, p.y)) {
      setStatus('Cannot add GOTO: point is outside the safe arena.', 'bad');
      return;
    }
    const hit = obstacleHitAt(p.x, p.y);
    if (hit) {
      setStatus(`Cannot add GOTO: point is too close to ${hit.label}.`, 'bad');
      return;
    }
    scriptEl.value = `${scriptEl.value.trim()}\nGOTO ${p.x} ${p.y}\n`;
    setStatus(`Added GOTO ${p.x} ${p.y}.`, 'good');
  });

  helpModal.addEventListener('click', (evt) => {
    if (evt.target === helpModal) closeHelpModal();
  });

  window.addEventListener('keydown', (evt) => {
    const active = document.activeElement;
    const typing = active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.isContentEditable);
    const helpOpen = helpModal.classList.contains('open');

    if (evt.key === 'Escape') {
      if (helpOpen) closeHelpModal();
      else stopMission('Stopped by keyboard.', 'warn');
      return;
    }

    if (evt.key === 'Tab' && helpOpen) {
      const focusable = [...helpModal.querySelectorAll('button, [href], textarea, input, select, [tabindex]:not([tabindex="-1"])')]
        .filter((el) => !el.disabled && el.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (evt.shiftKey && document.activeElement === first) {
        evt.preventDefault();
        last.focus();
      } else if (!evt.shiftKey && document.activeElement === last) {
        evt.preventDefault();
        first.focus();
      }
    }

    if (evt.code === 'Space' && !typing && !helpOpen) {
      evt.preventDefault();
      if (!running && !queue.length) runMission();
      else {
        running = !running;
        setStatus(running ? 'Running...' : 'Paused.', running ? 'good' : 'warn');
      }
    }

    if (evt.key.toLowerCase() === 'h' && !typing) {
      evt.preventDefault();
      openHelp();
    }
  });

  requestAnimationFrame(loop);
})();
