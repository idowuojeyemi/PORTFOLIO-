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
