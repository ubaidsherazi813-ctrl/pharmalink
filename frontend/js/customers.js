import { api, renderLayout, esc, fmtDate, toast, openModal, closeModal, debounce, withLoading, $ } from './common.js';

let customers = [];
if (renderLayout('customers')) init();

async function init() {
  $('qCust').addEventListener('input', debounce(loadCustomers, 300));
  $('addCustBtn').onclick = () => openForm();
  $('custForm').addEventListener('submit', saveCustomer);
  $('custRows').addEventListener('click', onRowAction);
  await loadCustomers();
}

async function loadCustomers() {
  $('custRows').innerHTML = '<tr><td colspan="7" class="empty">Loading patient records...</td></tr>';
  const q = $('qCust').value.trim();
  try {
    const res = await api('/customers' + (q ? '?q=' + encodeURIComponent(q) : ''));
    customers = res.data;
    renderTable();
  } catch (e) {
    $('custRows').innerHTML = '';
    toast(e.message, 'error');
  }
}

function renderTable() {
  if (!customers.length) {
    $('custRows').innerHTML = '<tr><td colspan="7"><div class="empty"><div class="big">👥</div>No patient records found. Click "+ Register New Patient" to add one.</div></td></tr>';
    return;
  }
  $('custRows').innerHTML = customers.map(c => `
    <tr>
      <td><strong>${esc(c.name)}</strong></td>
      <td>${esc(c.phone)}</td>
      <td>${esc(c.doctorName || 'General OPD')}</td>
      <td>${c.allergies ? `<span class="badge b-amber">⚠️ ${esc(c.allergies)}</span>` : '<span class="muted">None reported</span>'}</td>
      <td><span class="muted" style="max-width:240px;display:inline-block">${esc(c.notes || '—')}</span></td>
      <td>${fmtDate(c.createdAt)}</td>
      <td class="actions">
        <button class="icon-btn" data-act="edit" data-id="${esc(c.id)}" title="Edit Patient">✏️</button>
        <button class="icon-btn" data-act="del" data-id="${esc(c.id)}" title="Delete Patient">🗑</button>
      </td>
    </tr>`).join('');
}

function onRowAction(e) {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const c = customers.find(x => x.id === b.dataset.id);
  if (!c) return;
  if (b.dataset.act === 'edit') openForm(c);
  if (b.dataset.act === 'del') deleteCustomer(c);
}

function openForm(c) {
  $('custForm').reset();
  $('c_id').value = c ? c.id : '';
  $('custTitle').textContent = c ? 'Edit Patient Record' : 'Register New Patient';
  if (c) {
    $('c_name').value = c.name;
    $('c_phone').value = c.phone;
    $('c_doctor').value = c.doctorName || '';
    $('c_allergies').value = c.allergies || '';
    $('c_notes').value = c.notes || '';
  }
  openModal('custModal');
  $('c_name').focus();
}

async function saveCustomer(e) {
  e.preventDefault();
  const id = $('c_id').value;
  const body = {
    name: $('c_name').value.trim(),
    phone: $('c_phone').value.trim(),
    doctorName: $('c_doctor').value.trim(),
    allergies: $('c_allergies').value.trim(),
    notes: $('c_notes').value.trim(),
  };

  await withLoading($('saveCustBtn'), async () => {
    try {
      const res = await api(id ? '/customers/' + id : '/customers', {
        method: id ? 'PUT' : 'POST',
        body,
      });
      closeModal('custModal');
      toast(res.message);
      await loadCustomers();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

async function deleteCustomer(c) {
  if (!confirm(`Are you sure you want to delete patient record "${c.name}"?`)) return;
  try {
    await api('/customers/' + c.id, { method: 'DELETE' });
    toast('Patient record removed');
    await loadCustomers();
  } catch (e) {
    toast(e.message, 'error');
  }
}
