import { api, renderLayout, esc, toast, openModal, closeModal, withLoading, getUser, $ } from './common.js';

const isAdmin = getUser()?.role === 'admin';
let list = [], meds = [], current = null;
if (renderLayout('suppliers')) init();

async function init() {
  $('addBtn').onclick = () => openForm();
  $('supForm').addEventListener('submit', save);
  $('waBtn').onclick = sendWhatsApp;
  $('r_med').onchange = suggestQty;
  $('rows').addEventListener('click', onClick);
  await load();
}

async function load() {
  try {
    list = (await api('/suppliers')).data;
    $('rows').innerHTML = list.length ? list.map(s => `<tr>
      <td><strong>${esc(s.name)}</strong></td><td>${esc(s.phone) || '—'}</td><td>${esc(s.email) || '—'}</td><td>${esc(s.address) || '—'}</td>
      <td class="actions">
        <button class="icon-btn" data-act="reorder" data-id="${esc(s.id)}" aria-label="Reorder from ${esc(s.name)}">💬</button>
        <button class="icon-btn" data-act="edit" data-id="${esc(s.id)}" aria-label="Edit ${esc(s.name)}">✏️</button>
        ${isAdmin ? `<button class="icon-btn" data-act="del" data-id="${esc(s.id)}" aria-label="Delete ${esc(s.name)}">🗑</button>` : ''}
      </td></tr>`).join('')
      : '<tr><td colspan="5"><div class="empty"><div class="big">🏭</div>No suppliers yet. Add your first one.</div></td></tr>';
  } catch (e) { toast(e.message, 'error'); }
}

function onClick(e) {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const s = list.find(x => x.id === b.dataset.id);
  if (b.dataset.act === 'edit') openForm(s);
  if (b.dataset.act === 'del') remove(s);
  if (b.dataset.act === 'reorder') openReorder(s);
}

function openForm(s) {
  $('supForm').reset();
  $('s_id').value = s ? s.id : '';
  $('supTitle').textContent = s ? 'Edit Supplier' : 'Add Supplier';
  if (s) { $('s_name').value = s.name; $('s_phone').value = s.phone; $('s_email').value = s.email; $('s_address').value = s.address; }
  openModal('supModal'); $('s_name').focus();
}

async function save(e) {
  e.preventDefault();
  const body = { name: $('s_name').value, phone: $('s_phone').value, email: $('s_email').value, address: $('s_address').value };
  const id = $('s_id').value;
  await withLoading($('saveBtn'), async () => {
    try {
      const r = await api(id ? '/suppliers/' + id : '/suppliers', { method: id ? 'PUT' : 'POST', body });
      closeModal('supModal'); toast(r.message); await load();
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function remove(s) {
  if (!confirm(`Delete supplier "${s.name}"?`)) return;
  try { await api('/suppliers/' + s.id, { method: 'DELETE' }); toast('Supplier deleted'); await load(); }
  catch (e) { toast(e.message, 'error'); }
}

async function openReorder(s) {
  current = s;
  $('reTitle').textContent = 'Reorder from ' + s.name;
  try {
    meds = (await api('/medicines?limit=500&sort=quantity&order=asc')).data;       // kam stock pehle
    $('r_med').innerHTML = meds.map(m => `<option value="${esc(m.id)}">${esc(m.name)} (stock: ${m.quantity})</option>`).join('');
    suggestQty(); openModal('reModal');
  } catch (e) { toast(e.message, 'error'); }
}

function suggestQty() {
  const m = meds.find(x => x.id === $('r_med').value);
  if (m) $('r_qty').value = Math.max(10, m.reorderLevel * 2 - m.quantity);
}

function sendWhatsApp() {
  const m = meds.find(x => x.id === $('r_med').value);
  const qty = parseInt($('r_qty').value, 10);
  const phone = (current?.phone || '').replace(/\D/g, '');
  if (!phone) return toast('This supplier has no phone number. Edit the supplier first.', 'error');
  if (!m || !(qty > 0)) return toast('Choose a medicine and a valid quantity', 'warning');
  const msg = `Assalam o Alaikum, mujhe ${m.name} ke ${qty} units chahiye. Shukriya.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  closeModal('reModal');
}
