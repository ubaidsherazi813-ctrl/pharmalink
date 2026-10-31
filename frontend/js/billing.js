import { api, renderLayout, esc, money, fmtTime, fmtDate, toast, openModal, debounce, withLoading, $ } from './common.js';

let meds = [];
let customers = [];
const cart = new Map();          // medicineId -> qty
if (renderLayout('billing')) init();

async function init() {
  $('search').addEventListener('input', debounce(renderCards, 200));
  $('disc').addEventListener('input', renderCart);
  $('sellBtn').onclick = sell;
  $('printBtn').onclick = () => window.print();

  await Promise.all([loadMeds(), loadCustomers()]);
}

async function loadCustomers() {
  try {
    customers = (await api('/customers')).data;
    $('custSelect').innerHTML = '<option value="">— Walk-in Customer —</option>' +
      customers.map(c => `<option value="${esc(c.id)}">${esc(c.name)} (${esc(c.phone)})</option>`).join('');
  } catch { /* optional */ }
}

async function loadMeds() {
  try {
    meds = (await api('/medicines?limit=500&sort=name')).data;
    renderCards();
    renderCart();
  } catch (e) { toast(e.message, 'error'); }
}

const sellable = m => m.status !== 'expired' && m.quantity > 0;

function renderCards() {
  const q = $('search').value.trim().toLowerCase();
  const list = meds.filter(m => !q || (m.name + ' ' + (m.genericName || '') + ' ' + m.batchNo + ' ' + (m.shelfLocation || '')).toLowerCase().includes(q));
  
  $('cards').innerHTML = list.length ? list.map(m => `
    <div class="med-card ${sellable(m) ? '' : 'disabled'}">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <strong style="font-size:15px">${esc(m.name)}</strong>
        <span class="badge b-cyan" style="font-size:10px">📍 ${esc(m.shelfLocation || 'A-1')}</span>
      </div>
      <span class="muted" style="font-size:12px">${esc(m.genericName || 'Standard')}</span>
      <div style="font-size:16px;font-weight:700;color:var(--blue-text);margin:4px 0">${money(m.salePrice)}</div>
      <div class="muted" style="font-size:12px">Available: <b>${m.quantity} units</b> · Batch: ${esc(m.batchNo)}</div>
      <div>${m.status === 'expired' ? '<span class="badge b-red">● Expired (Locked)</span>' : m.quantity === 0 ? '<span class="badge b-red">● Out of Stock</span>' : m.status === 'expiring' ? '<span class="badge b-purple">● Expiring Soon</span>' : '<span class="badge b-green">● Active Stock</span>'}</div>
      <button class="btn sm" data-id="${esc(m.id)}" ${sellable(m) ? '' : 'disabled'} aria-label="Add ${esc(m.name)} to cart" style="margin-top:6px">
        + Add to Cart
      </button>
    </div>`).join('') : '<div class="empty">No medicines found matching search.</div>';

  $('cards').querySelectorAll('button[data-id]').forEach(b => b.onclick = () => add(b.dataset.id));
}

function add(id) {
  const m = meds.find(x => x.id === id);
  const cur = cart.get(id) || 0;
  if (cur + 1 > m.quantity) return toast(`Stock limit reached! Only ${m.quantity} available.`, 'warning');
  cart.set(id, cur + 1);
  renderCart();
}

function setQty(id, q) {
  const m = meds.find(x => x.id === id);
  if (q <= 0) cart.delete(id);
  else if (q > m.quantity) toast(`Stock limit reached! Only ${m.quantity} available.`, 'warning');
  else cart.set(id, q);
  renderCart();
}

function totals() {
  const subtotal = [...cart].reduce((s, [id, q]) => s + meds.find(m => m.id === id).salePrice * q, 0);
  const d = Math.min(100, Math.max(0, Number($('disc').value) || 0));
  return { subtotal, d, total: subtotal * (1 - d / 100) };
}

function renderCart() {
  $('cartCountBadge').textContent = `${cart.size} Item(s)`;
  $('cart').innerHTML = cart.size ? [...cart].map(([id, q]) => {
    const m = meds.find(x => x.id === id);
    return `
      <div class="cart-row">
        <div class="nm">
          <strong>${esc(m.name)}</strong>
          <div class="muted" style="font-size:11px">📍 ${esc(m.shelfLocation || 'A-1')} · ${money(m.salePrice)} each</div>
        </div>
        <div class="qty">
          <button data-id="${esc(id)}" data-d="-1" aria-label="Decrease">−</button>
          <span><b>${q}</b></span>
          <button data-id="${esc(id)}" data-d="1" aria-label="Increase">+</button>
        </div>
        <strong style="min-width:70px;text-align:right">${money(m.salePrice * q)}</strong>
      </div>`;
  }).join('') : '<div class="empty" style="padding:24px 0">Cart is empty. Select medicines on the left.</div>';

  $('cart').querySelectorAll('button[data-id]').forEach(b => b.onclick = () => setQty(b.dataset.id, (cart.get(b.dataset.id) || 0) + Number(b.dataset.d)));
  
  const t = totals();
  $('sub').textContent = money(t.subtotal);
  $('total').textContent = money(t.total);
  $('sellBtn').disabled = cart.size === 0;
}

async function sell() {
  await withLoading($('sellBtn'), async () => {
    try {
      const items = [...cart].map(([medicineId, qty]) => ({ medicineId, qty }));
      const selectedCustId = $('custSelect').value;
      const selectedCust = customers.find(c => c.id === selectedCustId);

      const r = await api('/sales', {
        method: 'POST',
        body: {
          items,
          discountPercent: Number($('disc').value) || 0,
          customerId: selectedCustId || null,
          customerName: selectedCust ? selectedCust.name : 'Walk-in Customer',
        },
      });

      showThermalReceipt(r.data, selectedCust);
      cart.clear();
      $('disc').value = 0;
      toast('Sale finalized & stock deducted in linked list');
      await loadMeds();
    } catch (e) { toast(e.message, 'error'); }
  });
}

function showThermalReceipt(s, cust) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent('PHARMAPULSE-' + s.invoiceNo + '-PKR-' + s.total)}`;
  
  $('invoice').innerHTML = `
    <div class="thermal-receipt" id="thermalPrintArea">
      <div class="receipt-header">
        <div class="receipt-brand">💊 PharmaPulse PRO</div>
        <div class="receipt-sub">License # DRAP-PK-49219</div>
        <div class="receipt-contact">Main Commercial Area, Karachi · Ph: 021-3456789</div>
      </div>
      <div class="receipt-divider">================================</div>
      <div class="receipt-meta">
        <div><b>Invoice:</b> ${esc(s.invoiceNo)}</div>
        <div><b>Date:</b> ${fmtTime(s.date)}</div>
        <div><b>Cashier:</b> ${esc(s.soldBy)}</div>
        <div><b>Patient:</b> ${esc(s.customerName || 'Walk-in Customer')}</div>
        ${cust?.doctorName ? `<div><b>Doctor:</b> ${esc(cust.doctorName)}</div>` : ''}
      </div>
      <div class="receipt-divider">--------------------------------</div>
      <table class="receipt-table">
        <thead>
          <tr>
            <th style="text-align:left">Item / Rack</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Price</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${s.items.map(i => `
            <tr>
              <td style="text-align:left">
                ${esc(i.name)}
                <div style="font-size:10px;color:#555">Rack: ${esc(i.shelfLocation || 'A-1')}</div>
              </td>
              <td style="text-align:center">${i.qty}</td>
              <td style="text-align:right">${money(i.price)}</td>
              <td style="text-align:right">${money(i.qty * i.price)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div class="receipt-divider">--------------------------------</div>
      <div class="receipt-calc">
        <div class="receipt-row"><span>Gross Subtotal:</span> <span>${money(s.subtotal)}</span></div>
        ${s.discountPercent > 0 ? `<div class="receipt-row"><span>Discount (${s.discountPercent}%):</span> <span>- ${money(s.discountAmount || (s.subtotal - s.total))}</span></div>` : ''}
        <div class="receipt-row grand"><span>NET TOTAL:</span> <span>${money(s.total)}</span></div>
      </div>
      <div class="receipt-divider">================================</div>
      <div class="receipt-footer">
        <img src="${qrUrl}" alt="Invoice QR" width="80" height="80" style="margin:4px 0">
        <div>Scan QR to verify authentic dispensing</div>
        <div style="margin-top:4px">*** Thank you for choosing PharmaPulse ***</div>
        <div style="font-size:10px;color:#666">Medicines once sold cannot be returned without original batch receipt</div>
      </div>
    </div>`;

  openModal('invModal');
}
