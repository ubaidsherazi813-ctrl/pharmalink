// Shared helpers: API wrapper, auth, toast, modal, layout
const TOKEN = 'pl_token', USER = 'pl_user';

export const getUser = () => { try { return JSON.parse(localStorage.getItem(USER) || 'null'); } catch { return null; } };
export function setSession(token, user) { localStorage.setItem(TOKEN, token); localStorage.setItem(USER, JSON.stringify(user)); }
export function logout() { localStorage.removeItem(TOKEN); localStorage.removeItem(USER); location.href = '/login.html'; }
export function requireLogin() {
  if (!localStorage.getItem(TOKEN)) { location.href = '/login.html'; return false; }
  return true;
}

export async function api(path, { method = 'GET', body, raw = false } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const t = localStorage.getItem(TOKEN);
  if (t) headers.Authorization = 'Bearer ' + t;
  const res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401 && path !== '/auth/login') { logout(); throw new Error('Session expired'); }
  if (raw) return res;
  let json;
  try { json = await res.json(); } catch { throw new Error('Server error'); }
  if (!json.success) throw new Error(json.error || 'Something went wrong');
  return json;
}

// XSS protection
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = n => 'PKR ' + Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const fmtDate = s => {
  if (!s) return '—';
  const d = s.length === 10 ? new Date(s + 'T00:00:00') : new Date(s);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const fmtTime = s => new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const debounce = (fn, ms = 400) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const $ = id => document.getElementById(id);

const STATUS = {
  ok: ['b-green', 'In Stock'],
  low: ['b-amber', 'Low Stock'],
  out: ['b-red', 'Out of Stock'],
  expiring: ['b-purple', 'Expiring Soon'],
  expired: ['b-red', 'Expired'],
};
export const badge = s => {
  const meta = STATUS[s] || ['b-blue', s];
  return `<span class="badge ${meta[0]}">● ${meta[1]}</span>`;
};

export function toast(msg, type = 'success') {
  let box = $('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<strong>${type === 'success' ? '✔' : type === 'error' ? '✖' : '⚠'}</strong> <span>${esc(msg)}</span>`;
  box.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(() => el.remove(), 250);
  }, 3500);
}

export const openModal = id => {
  const el = $(id);
  if (el) el.classList.add('open');
};
export const closeModal = id => {
  const el = $(id);
  if (el) el.classList.remove('open');
};
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
});
document.addEventListener('click', e => {
  if (e.target.classList?.contains('modal')) e.target.classList.remove('open');
  if (e.target.closest?.('[data-close]')) e.target.closest('.modal').classList.remove('open');
});

// Button spinner during async actions
export async function withLoading(btn, fn) {
  const old = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Processing...';
  try { return await fn(); }
  finally { btn.disabled = false; btn.innerHTML = old; }
}

export function renderLayout(active) {
  if (!requireLogin()) return false;
  const u = getUser() || { name: 'Staff User', role: 'pharmacist' };
  const nav = [
    ['dashboard', '📊', 'Dashboard'],
    ['medicines', '💊', 'Inventory & Racks'],
    ['billing', '🧾', 'POS Billing'],
    ['customers', '👥', 'Patients & Rx'],
    ['suppliers', '🏭', 'Wholesale Suppliers'],
    ['visualizer', '🔗', 'DSA Visualizer'],
  ];

  const sidebarEl = $('sidebar');
  if (sidebarEl) {
    sidebarEl.innerHTML = `
      <div class="brand-wrap">
        <a class="brand" href="/dashboard.html">
          <span class="brand-icon">💊</span>
          <div>
            <div class="brand-title">PharmaPulse<span class="pro-tag">PRO</span></div>
            <div class="brand-sub">Linked List DSA Engine</div>
          </div>
        </a>
      </div>
      <nav class="nav" aria-label="Main">
        ${nav.map(([k, i, l]) =>
          `<a href="/${k}.html" class="${k === active ? 'active' : ''}" ${k === active ? 'aria-current="page"' : ''}>
            <span class="nav-icon">${i}</span> <span>${l}</span>
          </a>`).join('')}
        <div class="nav-divider"></div>
        <button id="backupBtn" type="button" class="nav-item">💾 Backup Data</button>
        <button id="logoutBtn" type="button" class="nav-item logout">⏻ Logout</button>
      </nav>
      <div class="sidebar-footer">
        <div class="system-status"><span class="status-dot"></span> In-Memory Linked Lists Active</div>
      </div>`;
  }

  const topbarEl = $('topbar');
  if (topbarEl) {
    topbarEl.innerHTML = `
      <button class="btn ghost sm hamburger" id="burger" aria-label="Open menu">☰</button>
      <div class="search-box">
        <span class="search-ic">🔍</span>
        <input class="search" id="globalSearch" type="search" placeholder="Quick search medicine, generic, or rack..." aria-label="Search medicines">
      </div>
      <span class="grow"></span>
      <div class="topbar-actions">
        <a class="bell" href="/dashboard.html#alerts" aria-label="Alerts" title="Stock & Expiry Alerts">
          🔔<span class="count hidden" id="bellCount">0</span>
        </a>
        <div class="user-chip">
          <span class="user-avatar">${esc(u.name.charAt(0).toUpperCase())}</span>
          <div class="user-meta">
            <span class="user-name">${esc(u.name)}</span>
            <span class="user-role">${esc(u.role ? u.role.toUpperCase() : 'STAFF')}</span>
          </div>
        </div>
      </div>`;
  }

  $('logoutBtn').onclick = logout;
  $('burger').onclick = () => $('sidebar').classList.toggle('open');
  $('backupBtn').onclick = async () => {
    try {
      const res = await api('/backup/export', { raw: true });
      if (res.status === 401) return logout();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `pharmapulse_backup_${Date.now()}.json` });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast('System snapshot JSON exported successfully');
    } catch (e) { toast(e.message, 'error'); }
  };

  $('globalSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      location.href = '/medicines.html?q=' + encodeURIComponent(e.target.value.trim());
    }
  });

  api('/medicines/alerts').then(r => {
    if (r.data.count > 0) {
      $('bellCount').textContent = r.data.count;
      $('bellCount').classList.remove('hidden');
    }
  }).catch(() => {});

  return true;
}
