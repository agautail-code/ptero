const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const grid = document.getElementById('grid');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search');
const modalLayer = document.getElementById('modal-layer');
const modal = document.getElementById('modal');
const toastLayer = document.getElementById('toast-layer');
const panelHost = document.getElementById('panel-host');

let servers = [];

const ICONS = {
  cpu: '<svg class="icon" viewBox="0 0 20 20"><rect x="6" y="6" width="8" height="8" rx="1.2"/><line x1="9" y1="2.5" x2="9" y2="6"/><line x1="11" y1="2.5" x2="11" y2="6"/><line x1="9" y1="14" x2="9" y2="17.5"/><line x1="11" y1="14" x2="11" y2="17.5"/><line x1="2.5" y1="9" x2="6" y2="9"/><line x1="2.5" y1="11" x2="6" y2="11"/><line x1="14" y1="9" x2="17.5" y2="9"/><line x1="14" y1="11" x2="17.5" y2="11"/></svg>',
  memory: '<svg class="icon" viewBox="0 0 20 20"><rect x="3" y="6" width="14" height="8" rx="1.2"/><line x1="6" y1="6" x2="6" y2="3.5"/><line x1="10" y1="6" x2="10" y2="3.5"/><line x1="14" y1="6" x2="14" y2="3.5"/></svg>',
  disk: '<svg class="icon" viewBox="0 0 20 20"><rect x="3" y="4" width="14" height="12" rx="1.4"/><line x1="3" y1="12" x2="17" y2="12"/><circle cx="6.4" cy="14" r="0.7" fill="currentColor" stroke="none"/></svg>',
  user: '<svg class="icon" viewBox="0 0 20 20"><circle cx="10" cy="6.5" r="3.2"/><path d="M3.5 17c0-3.4 3-5.2 6.5-5.2s6.5 1.8 6.5 5.2"/></svg>',
  node: '<svg class="icon" viewBox="0 0 20 20"><ellipse cx="10" cy="5" rx="6.5" ry="2.2"/><path d="M3.5 5v4c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2V5"/><path d="M3.5 9v4c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2V9"/></svg>',
  play: '<svg class="icon" viewBox="0 0 20 20" fill="currentColor" stroke="none"><path d="M6.5 4l9 6-9 6V4z"/></svg>',
  pause: '<svg class="icon" viewBox="0 0 20 20" fill="currentColor" stroke="none"><rect x="5.5" y="4" width="3" height="12" rx="0.8"/><rect x="11.5" y="4" width="3" height="12" rx="0.8"/></svg>',
  refresh: '<svg class="icon" viewBox="0 0 20 20"><path d="M3.5 10.5a6.5 6.5 0 0 1 11.2-4.5l1.3 1.3"/><path d="M16 3.5v3.8h-3.8"/><path d="M16.5 9.5a6.5 6.5 0 0 1-11.2 4.5l-1.3-1.3"/><path d="M4 16.5v-3.8h3.8"/></svg>',
  trash: '<svg class="icon" viewBox="0 0 20 20"><line x1="3.5" y1="6" x2="16.5" y2="6"/><path d="M5.5 6l0.8 9.5A1.5 1.5 0 0 0 7.8 17h4.4a1.5 1.5 0 0 0 1.5-1.5L14.5 6"/><path d="M8 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2"/></svg>',
  calendar: '<svg class="icon" viewBox="0 0 20 20"><rect x="3" y="4.5" width="14" height="12" rx="1.4"/><line x1="3" y1="8" x2="17" y2="8"/><line x1="7" y1="2.5" x2="7" y2="5.5"/><line x1="13" y1="2.5" x2="13" y2="5.5"/></svg>',
  database: '<svg class="icon" viewBox="0 0 20 20"><ellipse cx="10" cy="5" rx="6.5" ry="2.2"/><path d="M3.5 5v4c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2V5"/><path d="M3.5 9v4c0 1.2 2.9 2.2 6.5 2.2s6.5-1 6.5-2.2V9"/></svg>',
  backup: '<svg class="icon" viewBox="0 0 20 20"><path d="M4 9a6 6 0 1 1 1.8 4.3"/><polyline points="2 10 4 9 5.5 11"/></svg>',
  activity: '<svg class="icon" viewBox="0 0 20 20"><polyline points="2.5 10 6 10 8 5 12 15 14 10 17.5 10"/></svg>'
};

function toast(message, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'ok' ? 'toast-ok' : 'toast-err'}`;
  el.textContent = message;
  toastLayer.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'error');
  return data;
}

async function checkSession() {
  const data = await api('/api/session');
  if (data.authed) {
    showApp();
  } else {
    loginScreen.hidden = false;
    appScreen.hidden = true;
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const password = document.getElementById('password').value;
  try {
    await api('/api/login', { method: 'POST', body: JSON.stringify({ password }) });
    showApp();
  } catch (err) {
    loginError.textContent = 'Mot de passe incorrect.';
    loginError.hidden = false;
  }
});

document.getElementById('logout').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  location.reload();
});

async function showApp() {
  loginScreen.hidden = true;
  appScreen.hidden = false;
  panelHost.textContent = location.host;
  await loadServers();
}

async function loadServers() {
  try {
    servers = await api('/api/servers');
    renderStats();
    renderGrid(servers);
  } catch (err) {
    toast('Impossible de charger les serveurs.', 'err');
  }
}

function renderStats() {
  const total = servers.length;
  const suspended = servers.filter((s) => s.attributes.suspended).length;
  const active = total - suspended;
  const nodes = new Set(servers.map((s) => s.attributes.node)).size;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-active').textContent = active;
  document.getElementById('stat-suspended').textContent = suspended;
  document.getElementById('stat-nodes').textContent = nodes;
}

function statusInfo(attrs) {
  if (attrs.suspended) return { label: 'Suspendu', className: 'status-suspended' };
  if (attrs.status && attrs.status !== 'installed' && attrs.status !== null) {
    return { label: attrs.status, className: 'status-installing' };
  }
  return { label: 'Actif', className: 'status-active' };
}

function renderGrid(list) {
  grid.innerHTML = '';
  if (list.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  list.forEach((server, i) => {
    const attrs = server.attributes;
    const status = statusInfo(attrs);
    const relationships = attrs.relationships || {};
    const owner = relationships.user && relationships.user.attributes
      ? relationships.user.attributes.email
      : `user #${attrs.user}`;
    const nodeName = relationships.node && relationships.node.attributes
      ? relationships.node.attributes.name
      : `node #${attrs.node}`;

    const card = document.createElement('div');
    card.className = `card surface ${status.className}`;
    card.style.animationDelay = `${Math.min(i * 25, 350)}ms`;
    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="card-name">${escapeHtml(attrs.name)}</div>
          <div class="card-id">${attrs.identifier}</div>
        </div>
        <span class="status-pill"><span class="status-dot"></span>${status.label}</span>
      </div>
      <div class="card-meta">
        <span class="meta-item">${ICONS.memory}<b>${formatMb(attrs.limits.memory)}</b></span>
        <span class="meta-item">${ICONS.disk}<b>${formatMb(attrs.limits.disk)}</b></span>
        <span class="meta-item">${ICONS.cpu}<b>${attrs.limits.cpu || '∞'}%</b></span>
      </div>
      <div class="card-owner">
        <div>${ICONS.user}${escapeHtml(owner)}</div>
        <div>${ICONS.node}${escapeHtml(nodeName)}</div>
      </div>
    `;
    card.addEventListener('click', () => openModal(server));
    grid.appendChild(card);
  });
}

function formatMb(value) {
  if (!value) return '∞';
  if (value >= 1024) return `${(value / 1024).toFixed(1)} Go`;
  return `${value} Mo`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function openModal(server) {
  const attrs = server.attributes;
  const status = statusInfo(attrs);
  modal.innerHTML = `
    <button class="modal-close" id="modal-close">
      <svg class="icon" viewBox="0 0 20 20"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>
    </button>
    <h2>${escapeHtml(attrs.name)}</h2>
    <p class="muted card-id">${attrs.identifier} · uuid ${attrs.uuid}</p>
    <div class="modal-section">
      <div class="modal-row"><span class="label">${ICONS.activity}Statut</span><span class="value">${status.label}</span></div>
      <div class="modal-row"><span class="label">${ICONS.memory}RAM</span><span class="value">${formatMb(attrs.limits.memory)}</span></div>
      <div class="modal-row"><span class="label">${ICONS.disk}Disque</span><span class="value">${formatMb(attrs.limits.disk)}</span></div>
      <div class="modal-row"><span class="label">${ICONS.cpu}CPU</span><span class="value">${attrs.limits.cpu || 'illimité'}%</span></div>
      <div class="modal-row"><span class="label">${ICONS.database}Bases de données</span><span class="value">${attrs.feature_limits.databases}</span></div>
      <div class="modal-row"><span class="label">${ICONS.backup}Backups</span><span class="value">${attrs.feature_limits.backups}</span></div>
      <div class="modal-row"><span class="label">${ICONS.calendar}Créé le</span><span class="value">${new Date(attrs.created_at).toLocaleDateString('fr-FR')}</span></div>
    </div>
    <div class="modal-actions">
      <button class="btn-action ${attrs.suspended ? 'btn-mint' : 'btn-peach'}" id="act-suspend">
        ${attrs.suspended ? ICONS.play : ICONS.pause}<span>${attrs.suspended ? 'Réactiver' : 'Suspendre'}</span>
      </button>
      <button class="btn-action btn-lavender" id="act-reinstall">${ICONS.refresh}<span>Réinstaller</span></button>
      <button class="btn-action btn-rose" id="act-delete">${ICONS.trash}<span>Supprimer</span></button>
    </div>
  `;
  modalLayer.hidden = false;
  document.getElementById('modal-close').addEventListener('click', closeModal);

  document.getElementById('act-suspend').addEventListener('click', async () => {
    const endpoint = attrs.suspended ? 'unsuspend' : 'suspend';
    try {
      await api(`/api/servers/${server.attributes.id}/${endpoint}`, { method: 'POST' });
      toast(attrs.suspended ? 'Serveur réactivé.' : 'Serveur suspendu.');
      closeModal();
      loadServers();
    } catch {
      toast('Action impossible.', 'err');
    }
  });

  document.getElementById('act-reinstall').addEventListener('click', async () => {
    if (!confirm('Lancer une réinstallation de ce serveur ?')) return;
    try {
      await api(`/api/servers/${server.attributes.id}/reinstall`, { method: 'POST' });
      toast('Réinstallation lancée.');
      closeModal();
    } catch {
      toast('Action impossible.', 'err');
    }
  });

  document.getElementById('act-delete').addEventListener('click', async () => {
    if (!confirm(`Supprimer définitivement "${attrs.name}" ? Cette action est irréversible.`)) return;
    try {
      await api(`/api/servers/${server.attributes.id}`, { method: 'DELETE' });
      toast('Serveur supprimé.');
      closeModal();
      loadServers();
    } catch {
      toast('Action impossible.', 'err');
    }
  });
}

function closeModal() {
  modalLayer.hidden = true;
}

modalLayer.addEventListener('click', (e) => {
  if (e.target === modalLayer) closeModal();
});

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return renderGrid(servers);
  const filtered = servers.filter((s) => {
    const attrs = s.attributes;
    const relationships = attrs.relationships || {};
    const owner = relationships.user?.attributes?.email || '';
    const node = relationships.node?.attributes?.name || '';
    return (
      attrs.name.toLowerCase().includes(q) ||
      attrs.identifier.toLowerCase().includes(q) ||
      owner.toLowerCase().includes(q) ||
      node.toLowerCase().includes(q)
    );
  });
  renderGrid(filtered);
});

checkSession();
