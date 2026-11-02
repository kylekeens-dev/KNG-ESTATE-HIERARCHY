const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'chart.json');
const COOKIE_NAME = 'kng_admin';

if (!ADMIN_PASSWORD || !SESSION_SECRET) {
  console.error('Missing ADMIN_PASSWORD or SESSION_SECRET environment variable.');
  process.exit(1);
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}
function isAdmin(req) {
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE_NAME + '='));
  if (!match) return false;
  const token = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expires, signature] = parts;
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  return safeEqual(signature, sign(expires));
}
function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Please log in to make changes.' });
  next();
}

const starterChart = {
  title: 'KNG ESTATE',
  subtitle: 'Organisation structure',
  nodes: [
    { id: 'gm', role: 'General Manager', name: '', parentId: null },
    { id: 'community', role: 'Community Director', name: '', parentId: 'gm' },
    { id: 'orgs', role: 'Orgs Director', name: '', parentId: 'gm' },
    { id: 'wallstreet', role: 'WallStreet Director', name: '', parentId: 'gm' },
    { id: 'admin-manager', role: 'Administration Manager', name: '', parentId: 'community' },
    { id: 'culture-manager', role: 'Culture Manager', name: '', parentId: 'community' },
    { id: 'gangs-manager', role: 'Manager Of Gangs', name: '', parentId: 'orgs' },
    { id: 'legal-manager', role: 'Manager Of Legal', name: '', parentId: 'orgs' },
    { id: 'wolf', role: 'Wolf of WallStreet', name: '', parentId: 'wallstreet' },
    { id: 'tickets-resp', role: 'Tickets Responsible', name: '', parentId: 'admin-manager' },
    { id: 'admin-resp', role: 'Administration Responsible', name: '', parentId: 'admin-manager' },
    { id: 'entertainment', role: 'Entertainment Responsible', name: '', parentId: 'culture-manager' },
    { id: 'moderation', role: 'Moderation Responsible', name: '', parentId: 'culture-manager' },
    { id: 'influencer-resp', role: 'Influencer Responsible', name: '', parentId: 'culture-manager' },
    { id: 'gang-adms', role: 'Gangs ADMs', name: '', parentId: 'gangs-manager' },
    { id: 'legal-adm', role: 'Legal ADM', name: '', parentId: 'legal-manager' },
    { id: 'ws-resp', role: 'WallStreet Responsible', name: '', parentId: 'wolf' },
    { id: 'tickets-team', role: 'Tickets Team ADM', name: '', parentId: 'tickets-resp' },
    { id: 'knowledge', role: 'Knowledge ADM', name: '', parentId: 'admin-resp' },
    { id: 'discord', role: 'Discord ADM', name: '', parentId: 'admin-resp' },
    { id: 'action', role: 'Action ADM', name: '', parentId: 'entertainment' },
    { id: 'interactions', role: 'Interactions ADM', name: '', parentId: 'entertainment' },
    { id: 'calls', role: 'Calls ADM', name: '', parentId: 'moderation' },
    { id: 'order', role: 'Order ADM', name: '', parentId: 'moderation' },
    { id: 'influencer-team', role: 'Influencer Team', name: '', parentId: 'influencer-resp' },
    { id: 'ws-a', role: 'WS_CriminalA ADM', name: '', parentId: 'ws-resp' },
    { id: 'ws-b', role: 'WS_CriminalB ADM', name: '', parentId: 'ws-resp' }
  ]
};

function ensureData() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(starterChart, null, 2));
}
function readChart() {
  ensureData();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function saveChart(chart) {
  const temp = DATA_FILE + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(chart, null, 2));
  fs.renameSync(temp, DATA_FILE);
}

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'kng-estate-org-chart' }));
app.get('/api/chart', (req, res) => {
  try {
    const chart = readChart();
    if (!chart || !Array.isArray(chart.nodes)) throw new Error('The saved chart data is invalid.');
    res.json(chart);
  } catch (error) {
    console.error('Could not read chart data:', error);
    res.status(500).json({ error: 'The server could not read the saved chart data. Check the Render disk and server logs.' });
  }
});
app.get('/api/me', (req, res) => res.json({ admin: isAdmin(req) }));
app.post('/api/login', (req, res) => {
  const password = req.body && req.body.password;
  if (typeof password !== 'string' || !safeEqual(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  const expires = String(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = `${expires}.${sign(expires)}`;
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.json({ ok: true });
});
app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  res.json({ ok: true });
});
app.put('/api/chart', requireAdmin, (req, res) => {
  const chart = req.body;
  if (!chart || !Array.isArray(chart.nodes) || chart.nodes.length > 500) return res.status(400).json({ error: 'Invalid chart data.' });
  const ids = new Set();
  for (const node of chart.nodes) {
    if (!node || typeof node.id !== 'string' || typeof node.role !== 'string' || typeof node.name !== 'string') return res.status(400).json({ error: 'Each position needs a role and name.' });
    if (ids.has(node.id)) return res.status(400).json({ error: 'Duplicate position ID.' });
    ids.add(node.id);
  }
  for (const node of chart.nodes) {
    if (node.parentId !== null && !ids.has(node.parentId)) return res.status(400).json({ error: 'A parent position could not be found.' });
    let current = node;
    const seen = new Set([node.id]);
    while (current.parentId) {
      if (seen.has(current.parentId)) return res.status(400).json({ error: 'Positions cannot be placed underneath themselves.' });
      seen.add(current.parentId);
      current = chart.nodes.find(n => n.id === current.parentId);
      if (!current) break;
    }
  }
  saveChart({ title: 'KNG ESTATE', subtitle: 'Organisation structure', nodes: chart.nodes });
  res.json({ ok: true });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`KNG Org Chart running on port ${PORT}`));
