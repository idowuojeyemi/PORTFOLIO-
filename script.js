const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Theme toggle (remembered per visitor)
document.querySelector('.theme-btn').addEventListener('click', () => {
  const current = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
});

// Scroll reveal
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
  });
}, { threshold: 0.15 });
document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

// Hero stickers drift with the mouse
const stickers = document.querySelectorAll('[data-float]');
if (!reduceMotion && matchMedia('(pointer: fine)').matches) {
  addEventListener('mousemove', (e) => {
    const x = e.clientX / innerWidth - 0.5;
    const y = e.clientY / innerHeight - 0.5;
    stickers.forEach((s) => {
      const d = +s.dataset.float;
      s.style.transform = `translate(${x * d}px, ${y * d}px)`;
    });
  });
}

// Running timecode (25 fps)
const tc = document.querySelector('[data-timecode]');
if (tc && !reduceMotion) {
  const start = performance.now();
  const pad = (n) => String(n).padStart(2, '0');
  const tick = (now) => {
    const f = Math.floor(((now - start) / 1000) * 25);
    tc.textContent = `${pad(Math.floor(f / 90000) % 24)}:${pad(Math.floor(f / 1500) % 60)}:${pad(Math.floor(f / 25) % 60)}:${pad(f % 25)}`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Copy email
const copyBtn = document.querySelector('.copy-btn');
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(copyBtn.dataset.copy);
    copyBtn.textContent = 'Copied ✓';
  } catch (e) {
    copyBtn.textContent = copyBtn.dataset.copy;
  }
  copyBtn.classList.add('done');
  setTimeout(() => { copyBtn.textContent = 'Copy email'; copyBtn.classList.remove('done'); }, 2000);
});

document.querySelector('[data-year]').textContent = new Date().getFullYear();

/* ---------- Sign the wall ----------
   Signatures are stored with wallStore. Right now that is the visitor's own
   browser (localStorage), so each visitor sees only their own autograph.
   To make the wall shared, swap load/save for calls to a small backend
   (e.g. Supabase or Firebase) and keep the same data shape:
   { name, color, paths: ["M x y L x y ...", ...], at } */
const wallStore = {
  key: 'wall-signatures',
  load() {
    try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch (e) { return []; }
  },
  save(list) {
    try { localStorage.setItem(this.key, JSON.stringify(list.slice(-50))); } catch (e) {}
  },
};

(() => {
  const row = document.querySelector('.wall-row');
  const pad = document.querySelector('.pad');
  const openBtn = document.querySelector('.sign-open');
  const status = document.querySelector('.wall-status');
  const canvas = pad.querySelector('.pad-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  let color = '#4a955e';
  let strokes = [];
  let current = null;

  const tilt = () => `${(Math.random() * 4 - 2).toFixed(1)}deg`;
  const card = (sig, mine) => {
    const li = document.createElement('li');
    li.className = 'sig' + (mine ? ' mine' : '');
    li.style.setProperty('--r', tilt());
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Signature by ${sig.name || 'Anonymous'}`);
    sig.paths.forEach((d) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', sig.color);
      path.setAttribute('stroke-width', '7');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(path);
    });
    const name = document.createElement('span');
    name.textContent = sig.name || 'Anonymous';
    li.append(svg, name);
    return li;
  };

  const render = () => {
    row.replaceChildren(...wallStore.load().slice().reverse().map((s, i) => card(s, i === 0 && s.mine)));
  };

  // drawing
  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * W), Math.round(((e.clientY - r.top) / r.height) * H)];
  };
  const redraw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
    strokes.forEach((s) => {
      ctx.beginPath();
      s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (s.length === 1) ctx.lineTo(s[0][0] + 0.1, s[0][1]);
      ctx.stroke();
    });
  };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    current = [point(e)];
    strokes.push(current);
    pad.classList.add('drawn');
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!current) return;
    const [x, y] = point(e);
    const [lx, ly] = current[current.length - 1];
    if (Math.abs(x - lx) + Math.abs(y - ly) > 2) { current.push([x, y]); redraw(); }
  });
  const end = () => { current = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  const clear = () => { strokes = []; pad.classList.remove('drawn'); redraw(); };
  pad.querySelector('.pad-clear').addEventListener('click', clear);

  pad.querySelectorAll('.swatch').forEach((sw) => sw.addEventListener('click', () => {
    pad.querySelectorAll('.swatch').forEach((o) => { o.classList.remove('on'); o.setAttribute('aria-checked', 'false'); });
    sw.classList.add('on'); sw.setAttribute('aria-checked', 'true');
    color = getComputedStyle(sw).getPropertyValue('--s').trim();
    redraw();
  }));

  openBtn.addEventListener('click', () => {
    pad.hidden = false;
    openBtn.hidden = true;
    pad.querySelector('.pad-name').value = '';
    clear();
    status.textContent = 'Draw your signature, add your name, then hit Sign.';
  });

  pad.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!strokes.length) { status.textContent = 'Draw something first ✍️'; return; }
    const sig = {
      name: pad.querySelector('.pad-name').value.trim().slice(0, 24),
      color,
      paths: strokes.map((s) => s.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')),
      at: Date.now(),
      mine: true,
    };
    const list = wallStore.load();
    list.push(sig);
    wallStore.save(list);
    render();
    row.scrollTo({ left: 0, behavior: 'smooth' });
    pad.hidden = true;
    openBtn.hidden = false;
    openBtn.textContent = 'Sign again';
    status.textContent = "Thanks! You're on the wall.";
  });

  render();
})();

/* ---------- Project video players (Google Drive embeds) ----------
   A .screen with data-video="<Drive file id>" plays that file when clicked.
   Buttons with .vid-chip in the same card switch which video plays.
   The Drive files must be shared as "Anyone with the link can view". */
(() => {
  const play = (screen, id, title) => {
    screen.dataset.video = id;
    screen.dataset.title = title;
    screen.querySelector('iframe')?.remove();
    const f = document.createElement('iframe');
    f.src = `https://drive.google.com/file/d/${id}/preview`;
    f.allow = 'autoplay; fullscreen';
    f.allowFullscreen = true;
    f.title = title;
    screen.appendChild(f);
    screen.classList.add('playing');
  };
  document.querySelectorAll('.screen[data-video]').forEach((screen) => {
    const card = screen.closest('.reel-card');
    const chips = card.querySelectorAll('.vid-chip');
    const label = screen.querySelector('.screen-tc');
    screen.querySelector('.play-btn')?.addEventListener('click', () => play(screen, screen.dataset.video, screen.dataset.title));
    chips.forEach((chip, i) => chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('on'));
      chip.classList.add('on');
      if (label) label.textContent = `${String(i + 1).padStart(2, '0')} / ${String(chips.length).padStart(2, '0')} · ${chip.dataset.title}`;
      play(screen, chip.dataset.video, chip.dataset.title);
    }));
  });
})();

/* ---------- Quote of the day ----------
   One pool per weekday; the day of the year picks which quote shows,
   so it changes every day and the same weekday rotates week to week. */
(() => {
  const el = document.querySelector('[data-quote]');
  if (!el) return;
  const quotes = {
    Sunday: [
      'Rest, rewatch, rethink.',
      'Plotting next week’s big idea from the sofa.',
      'Sunday is a slow fade. Enjoy it.',
      'Watch a good film today. It counts as research.',
      'Charging batteries. The camera’s and mine.',
    ],
    Monday: [
      'Monday is just a rough cut of the week. We’ll fix it in post.',
      'New week, new timeline. Hit record.',
      'Coffee first. Then the client notes.',
      'Every great film started on a Monday nobody wanted.',
      'Monday mood: rendering… 3% complete.',
    ],
    Tuesday: [
      'Tuesday is the B-roll of the week. Quietly holding everything together.',
      'Ideas don’t wait for Friday. Neither do deadlines.',
      'Today’s plan: fewer meetings, more frames.',
      'If it’s not working, try a different angle. Literally.',
      'Tuesday is Monday’s director’s cut. Slightly better.',
    ],
    Wednesday: [
      'Halfway through the week. The plot thickens.',
      'Wednesday: the mid-roll ad break of the week.',
      'Hump day. Add a keyframe and push through.',
      'Act two. This is where the good stuff happens.',
      'Middle of the week, middle of the edit. Don’t panic.',
    ],
    Thursday: [
      'Thursday is Friday’s trailer. The hype is real.',
      'Almost there. Final render loading…',
      'If the client says “one small change”, save a new version.',
      'Good stories need a strong third act. So does this week.',
      'Ctrl+S. Then Ctrl+S again. It’s Thursday, trust nothing.',
    ],
    Friday: [
      'That’s a wrap. Mostly.',
      'Export the week. No more revisions.',
      'It’s Friday. Even the timeline is dancing.',
      'final_final_v3_REALLY_FINAL.mp4. Happy Friday.',
      'Wrap the shoot, cue the jollof.',
    ],
    Saturday: [
      'Shooting for fun today, not for the client.',
      'Weekend mode: passion projects only.',
      'Saturdays are for side quests and short films.',
      'No brief today. Just vibes and a camera.',
      'Owambe season. Every party is a music video if you edit it right.',
    ],
  };
  const now = new Date();
  const day = now.toLocaleDateString('en-GB', { weekday: 'long' });
  const pool = quotes[day] || quotes.Monday;
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  el.querySelector('.q-day').textContent = `HAPPY ${day.toUpperCase()}`;
  el.querySelector('.q-text').textContent = pool[dayOfYear % pool.length];
})();
