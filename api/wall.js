// Shared "Sign the wall" guestbook, stored in Upstash Redis (Vercel Storage).
// GET  /api/wall  -> { signatures: [...] }  newest first
// POST /api/wall  -> { name, color, paths } -> { ok: true, signature }

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'wall:signatures';
const MAX_KEEP = 300;
const COLORS = ['#4a955e', '#db5a2b', '#4763d6', '#c0432c', '#141210'];

async function redis(commands) {
  const r = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`Redis error ${r.status}`);
  return r.json();
}

function clean(body) {
  if (!body || typeof body !== 'object') return null;
  const name = String(body.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24);
  const color = COLORS.includes(body.color) ? body.color : COLORS[0];
  if (!Array.isArray(body.paths) || body.paths.length === 0 || body.paths.length > 60) return null;
  const paths = [];
  let total = 0;
  for (const p of body.paths) {
    if (typeof p !== 'string' || !/^M[\d. ML-]+$/.test(p)) return null;
    total += p.length;
    paths.push(p);
  }
  if (total > 24000) return null;
  return { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, name, color, paths, at: Date.now() };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(503).json({ error: 'Wall storage is not connected.' });

  try {
    if (req.method === 'GET') {
      const [{ result }] = await redis([['LRANGE', KEY, '0', '99']]);
      const signatures = (result || []).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
      return res.status(200).json({ signatures });
    }

    if (req.method === 'POST') {
      const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
      const rlKey = `wall:rl:${ip}`;
      const [{ result: count }] = await redis([['INCR', rlKey], ['EXPIRE', rlKey, '600']]);
      if (count > 5) return res.status(429).json({ error: 'Too many signatures. Try again in a few minutes.' });

      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
      const sig = clean(body);
      if (!sig) return res.status(400).json({ error: 'That signature could not be saved.' });

      await redis([['LPUSH', KEY, JSON.stringify(sig)], ['LTRIM', KEY, '0', String(MAX_KEEP - 1)]]);
      return res.status(200).json({ ok: true, signature: sig });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
