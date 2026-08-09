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

function toast(message, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast glass ${type === 'ok' ? 'toast-ok' : 'toast-err'}`;
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
  if (attrs.suspended) return { label: 'Suspendu', className: 'badge-suspended' };
  if (attrs.status && attrs.status !== 'installed' && attrs.status !== null) {
    return { label: attrs.status, className: 'badge-installing' };
  }
  return { label: 'Actif', className: 'badge-active' };
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
    card.className = 'card glass';
    card.style.animationDelay = `${Math.min(i * 30, 400)}ms`;
    card.innerHTML = `
      <div class="card-top">
        <div>
          <div class="card-name">${escapeHtml(attrs.name)}</div>
          <div class="card-id">${attrs.identifier}</div>
        </div>
        <span class="badge ${status.className}">${status.label}</span>
      </div>
      <div class="card-meta">
        <span>RAM <b>${formatMb(attrs.limits.memory)}</b></span>
        <span>Disque <b>${formatMb(attrs.limits.disk)}</b></span>
        <span>CPU <b>${attrs.limits.cpu || '∞'}%</b></span>
      </div>
      <div class="card-owner">${escapeHtml(owner)} · ${escapeHtml(nodeName)}</div>
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
    <button class="modal-close" id="modal-close">✕</button>
    <h2>${escapeHtml(attrs.name)}</h2>
    <p class="muted card-id">${attrs.identifier} · uuid ${attrs.uuid}</p>
    <div class="modal-section">
      <div class="modal-row"><span>Statut</span><span>${status.label}</span></div>
      <div class="modal-row"><span>RAM</span><span>${formatMb(attrs.limits.memory)}</span></div>
      <div class="modal-row"><span>Disque</span><span>${formatMb(attrs.limits.disk)}</span></div>
      <div class="modal-row"><span>CPU</span><span>${attrs.limits.cpu || 'illimité'}%</span></div>
      <div class="modal-row"><span>Bases de données</span><span>${attrs.feature_limits.databases}</span></div>
      <div class="modal-row"><span>Backups</span><span>${attrs.feature_limits.backups}</span></div>
      <div class="modal-row"><span>Créé le</span><span>${new Date(attrs.created_at).toLocaleDateString('fr-FR')}</span></div>
    </div>
    <div class="modal-actions">
      <button class="btn-action" id="act-suspend">${attrs.suspended ? 'Réactiver' : 'Suspendre'}</button>
      <button class="btn-action" id="act-reinstall">Réinstaller</button>
      <button class="btn-action btn-danger" id="act-delete" style="grid-column: 1 / -1;">Supprimer</button>
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
