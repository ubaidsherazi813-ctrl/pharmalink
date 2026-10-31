import { api, renderLayout, esc, money, fmtDate, badge, toast, openModal, closeModal, debounce, withLoading, getUser, logout, $ } from './common.js';

const CATEGORIES = ['Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment', 'Drops', 'Other'];
const isAdmin = getUser()?.role === 'admin';
const params = new URLSearchParams(location.search);
const st = { page: 1, q: params.get('q') || '', category: '', status: '', sort: 'name', order: 'asc' };
let suppliers = [], rows = [], rate = null;

if (renderLayout('medicines')) init();

async function init() {
  $('category').innerHTML += CATEGORIES.map(c => `<option>${c}</option>`).join('');
  $('f_category').innerHTML = CATEGORIES.map(c => `<option>${c}</option>`).join('');
  $('q').value = st.q;
  try { suppliers = (await api('/suppliers')).data; } catch { /* supplier optional */ }
  $('f_supplier').innerHTML = '<option value="">— None (Local / Direct) —</option>' + suppliers.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');

  $('q').addEventListener('input', debounce(() => { st.q = $('q').value.trim(); st.page = 1; load(); }, 350));
  $('category').onchange = () => { st.category = $('category').value; st.page = 1; load(); };
  $('status').onchange = () => { st.status = $('status').value; st.page = 1; load(); };
  $('sort').onchange = () => { [st.sort, st.order] = $('sort').value.split(':'); st.page = 1; load(); };
  $('prev').onclick = () => { st.page--; load(); };
  $('next').onclick = () => { st.page++; load(); };
  $('addBtn').onclick = () => openForm();
  $('exportBtn').onclick = exportCsv;
  $('medForm').addEventListener('submit', save);
  $('convBtn').onclick = convert;
  $('f_name').addEventListener('input', debounce(suggest, 400));
  $('rows').addEventListener('click', onRowClick);

  await load();
  if (params.get('add')) openForm();
}

async function load() {
  $('rows').innerHTML = '<tr><td colspan="9" class="empty">Loading inventory database...</td></tr>';
  try {
    const qs = new URLSearchParams({ page: st.page, limit: 10, q: st.q, category: st.category, status: st.status, sort: st.sort, order: st.order });
    const r = await api('/medicines?' + qs);
    rows = r.data; st.page = r.meta.page;
    $('rows').innerHTML = rows.length ? rows.map(m => `<tr>
      <td>
        <strong>${esc(m.name)}</strong>
        <div class="muted">${esc(m.genericName || '—')}</div>
      </td>
      <td>${esc(m.category)}</td>
      <td><code>${esc(m.batchNo)}</code></td>
      <td><span class="badge b-cyan" style="font-size:11px">📍 ${esc(m.shelfLocation || 'General')}</span></td>
      <td><strong>${m.quantity}</strong></td>
      <td>${money(m.salePrice)}</td>
      <td>${fmtDate(m.expiryDate)}</td>
      <td>${badge(m.status)}</td>
      <td class="actions">
        <button class="icon-btn" data-act="view" data-id="${esc(m.id)}" title="View Dossier">👁</button>
        <button class="icon-btn" data-act="edit" data-id="${esc(m.id)}" title="Edit Medicine">✏️</button>
        ${m.status === 'expired' && m.quantity > 0 ? `<button class="icon-btn" data-act="quarantine" data-id="${esc(m.id)}" title="Quarantine Batch">⛔</button>` : ''}
        ${isAdmin ? `<button class="icon-btn" data-act="del" data-id="${esc(m.id)}" title="Delete Medicine">🗑</button>` : ''}
      </td></tr>`).join('')
      : '<tr><td colspan="9"><div class="empty"><div class="big">💊</div>No medicines found matching criteria. Click "+ Add New Medicine" to add.</div></td></tr>';
    $('pageInfo').textContent = `Page ${r.meta.page} of ${r.meta.pages} · ${r.meta.total} medicine(s) in linked list`;
    $('prev').disabled = r.meta.page <= 1; $('next').disabled = r.meta.page >= r.meta.pages;
  } catch (e) { $('rows').innerHTML = ''; toast(e.message, 'error'); }
}

function onRowClick(e) {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const m = rows.find(x => x.id === b.dataset.id);
  if (!m) return;
  if (b.dataset.act === 'view') showView(m);
  if (b.dataset.act === 'edit') openForm(m);
  if (b.dataset.act === 'del') remove(m);
  if (b.dataset.act === 'quarantine') quarantine(m);
}

function openForm(m) {
  $('medForm').reset();
  $('f_id').value = m ? m.id : '';
  $('formTitle').textContent = m ? 'Edit Medicine Record' : 'Add New Medicine';
  $('f_reorder').value = 10; $('rateNote').textContent = '';
  if (m) {
    $('f_name').value = m.name;
    $('f_generic').value = m.genericName || '';
    $('f_category').value = m.category;
    $('f_batch').value = m.batchNo;
    $('f_rack').value = m.shelfLocation || '';
    $('f_manufacturer').value = m.manufacturer || '';
    $('f_supplier').value = m.supplierId || '';
    $('f_expiry').value = m.expiryDate;
    $('f_qty').value = m.quantity;
    $('f_reorder').value = m.reorderLevel;
    $('f_buy').value = m.purchasePrice;
    $('f_sell').value = m.salePrice;
  }
  openModal('formModal'); $('f_name').focus();
}

async function save(e) {
  e.preventDefault();
  const body = {
    name: $('f_name').value,
    genericName: $('f_generic').value,
    category: $('f_category').value,
    batchNo: $('f_batch').value,
    shelfLocation: $('f_rack').value,
    manufacturer: $('f_manufacturer').value,
    supplierId: $('f_supplier').value,
    expiryDate: $('f_expiry').value,
    quantity: $('f_qty').value,
    reorderLevel: $('f_reorder').value,
    purchasePrice: $('f_buy').value,
    salePrice: $('f_sell').value,
  };
  const id = $('f_id').value;
  await withLoading($('saveBtn'), async () => {
    try {
      const r = await api(id ? '/medicines/' + id : '/medicines', { method: id ? 'PUT' : 'POST', body });
      closeModal('formModal');
      toast(r.message);
      if (r.warning) toast(r.warning, 'warning');
      await load();
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function quarantine(m) {
  if (!confirm(`Quarantine expired batch ${m.batchNo} of "${m.name}"? It will be marked 0 in active stock.`)) return;
  try {
    await api(`/medicines/${m.id}/quarantine`, { method: 'POST' });
    toast(`Batch ${m.batchNo} quarantined successfully`);
    await load();
  } catch (e) { toast(e.message, 'error'); }
}

async function remove(m) {
  if (!confirm(`Delete "${m.name}" (batch ${m.batchNo})? This cannot be undone.`)) return;
  try {
    await api('/medicines/' + m.id, { method: 'DELETE' });
    toast('Medicine removed from linked list');
    await load();
  } catch (e) { toast(e.message, 'error'); }
}

async function showView(m) {
  const sup = suppliers.find(s => s.id === m.supplierId);
  $('viewTitle').textContent = m.name;
  $('viewBody').innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
      <dl class="detail-grid" style="flex:1;min-width:240px">
        <div><dt>Generic Name</dt><dd>${esc(m.genericName) || '—'}</dd></div>
        <div><dt>Dosage Category</dt><dd>${esc(m.category)}</dd></div>
        <div><dt>Batch Number</dt><dd><code>${esc(m.batchNo)}</code></dd></div>
        <div><dt>Rack / Shelf Location</dt><dd><span class="badge b-cyan">📍 ${esc(m.shelfLocation || 'General')}</span></dd></div>
        <div><dt>Manufacturer</dt><dd>${esc(m.manufacturer) || '—'}</dd></div>
        <div><dt>Supplier</dt><dd>${sup ? esc(sup.name) : '—'}</dd></div>
        <div><dt>Inventory Status</dt><dd>${badge(m.status)}</dd></div>
        <div><dt>Quantity in Stock</dt><dd><b>${m.quantity} units</b> (alert at ${m.reorderLevel})</dd></div>
        <div><dt>Expiry Date</dt><dd>${fmtDate(m.expiryDate)} (${m.daysToExpiry} days remaining)</dd></div>
        <div><dt>Purchase Cost</dt><dd>${money(m.purchasePrice)}</dd></div>
        <div><dt>Retail Price</dt><dd><strong>${money(m.salePrice)}</strong></dd></div>
      </dl>
      <div style="text-align:center;padding:8px;background:var(--surface);border-radius:12px;border:1px solid var(--border)">
        <img alt="QR code for ${esc(m.name)}" width="130" height="130"
          src="https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(m.id + '-' + m.batchNo)}">
        <div class="muted" style="font-size:11px;margin-top:4px">Batch Verification QR</div>
      </div>
    </div>
    <div class="info-box" id="drugInfo">🔎 Loading clinical monograph from openFDA...</div>`;
  openModal('viewModal');
  try {
    const r = await api('/external/drug-info?name=' + encodeURIComponent(m.genericName || m.name));
    const d = r.data;
    $('drugInfo').innerHTML = d && (d.purpose || d.warnings)
      ? `<strong>Clinical Drug Information (openFDA)</strong>
         ${d.purpose ? `<p style="margin-top:4px"><b>Indications:</b> ${esc(d.purpose)}</p>` : ''}
         ${d.warnings ? `<p style="margin-top:4px;color:var(--amber-text)"><b>Warnings:</b> ${esc(d.warnings)}</p>` : ''}
         ${d.genericName ? `<p class="muted" style="margin-top:4px">Official Formulation: ${esc(d.genericName)}</p>` : ''}`
      : 'No certified FDA monograph found for this formulation.';
  } catch { $('drugInfo').textContent = 'Clinical monograph server unreachable.'; }
}

async function suggest() {
  const v = $('f_name').value.trim();
  if (v.length < 3) return;
  try {
    const r = await api('/external/suggest?name=' + encodeURIComponent(v));
    $('nameSuggest').innerHTML = r.data.map(n => `<option value="${esc(n)}"></option>`).join('');
  } catch { /* suggestions optional */ }
}

async function convert() {
  const usd = Number($('f_usd').value);
  if (!(usd > 0)) return toast('Enter the USD price first', 'warning');
  if (!rate) { try { rate = (await api('/external/rates')).data?.USD_PKR; } catch { /* handled below */ } }
  if (!rate) return toast('Exchange rate unavailable right now', 'error');
  $('f_buy').value = Math.round(usd * rate * 100) / 100;
  $('rateNote').textContent = `1 USD = ${rate.toFixed(2)} PKR`;
}

async function exportCsv() {
  try {
    const res = await api('/medicines/export', { raw: true });
    if (res.status === 401) return logout();
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement('a'), { href: url, download: `medicines_inventory_${Date.now()}.csv` });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast('Inventory CSV exported');
  } catch (e) { toast(e.message, 'error'); }
}
