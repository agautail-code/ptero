import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PANEL_URL = (process.env.PANEL_URL || '').replace(/\/+$/, '');
const API_KEY = process.env.PTERODACTYL_API_KEY;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET || 'replace-this-secret';

app.set('trust proxy', 1);
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  res.status(401).json({ error: 'unauthorized' });
}

async function pterodactyl(pathname, options = {}) {
  if (!PANEL_URL || !API_KEY) {
    const err = new Error('server_misconfigured');
    err.status = 500;
    throw err;
  }
  const response = await fetch(`${PANEL_URL}/api/application${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: 'Application/vnd.pterodactyl.v1+json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) {
    const message = data?.errors?.[0]?.detail || response.statusText;
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }
  return data;
}

app.post('/api/login', (req, res) => {
  if (!DASHBOARD_PASSWORD) return res.status(500).json({ error: 'server_misconfigured' });
  const { password } = req.body || {};
  if (password && password === DASHBOARD_PASSWORD) {
    req.session.authed = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'invalid_password' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  res.json({ authed: !!(req.session && req.session.authed) });
});

app.get('/api/servers', requireAuth, async (req, res) => {
  try {
    let servers = [];
    let page = 1;
    let totalPages = 1;
    do {
      const data = await pterodactyl(`/servers?include=user,node,allocations&per_page=50&page=${page}`);
      servers = servers.concat(data.data);
      totalPages = data.meta.pagination.total_pages;
      page += 1;
    } while (page <= totalPages);
    res.json(servers);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.get('/api/servers/:id', requireAuth, async (req, res) => {
  try {
    const data = await pterodactyl(`/servers/${req.params.id}?include=user,node,allocations,databases`);
    res.json(data);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/servers/:id/suspend', requireAuth, async (req, res) => {
  try {
    await pterodactyl(`/servers/${req.params.id}/suspend`, { method: 'POST' });
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/servers/:id/unsuspend', requireAuth, async (req, res) => {
  try {
    await pterodactyl(`/servers/${req.params.id}/unsuspend`, { method: 'POST' });
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/servers/:id/reinstall', requireAuth, async (req, res) => {
  try {
    await pterodactyl(`/servers/${req.params.id}/reinstall`, { method: 'POST' });
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.delete('/api/servers/:id', requireAuth, async (req, res) => {
  try {
    await pterodactyl(`/servers/${req.params.id}`, { method: 'DELETE' });
    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));
