import { api, renderLayout, esc, money, badge, fmtDate, fmtTime, toast, withLoading, logout, $ } from './common.js';

const PALETTE = ['#2563EB', '#16A34A', '#F59E0B', '#7C3AED', '#0891B2', '#DB2777', '#64748B'];
let currentUsdRate = 278.50; // Fallback default

if (renderLayout('dashboard')) init();

function chart(id, cfg) {
  const el = $(id);
  if (!el) return;
  if (typeof Chart === 'undefined') {
    el.parentElement.innerHTML = '<div class="empty">Charts engine offline</div>';
    return;
  }
  new Chart(el, {
    ...cfg,
    options: {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { labels: { font: { family: "'Plus Jakarta Sans', 'Inter', sans-serif", size: 12 } } },
        ...(cfg.options?.plugins || {}),
      },
      ...(cfg.options || {}),
    },
  });
}

async function init() {
  try {
    const [s, sum, al, act] = await Promise.all([
      api('/medicines/stats'),
      api('/sales/summary'),
      api('/medicines/alerts'),
      api('/activity?limit=10'),
    ]);

    const d = s.data;
    const summary = sum.data;

    // 8 KPI Cards
    const kpis = [
      ['Total Medicines', d.totalMedicines, 'blue', '💊', 'In Linked List'],
      ['Stock Valuation', money(d.stockValue), 'green', '💰', 'At purchase cost'],
      ["Today's Revenue", money(d.todaySales), 'cyan', '🧾', 'Cash / POS Inflow'],
      ["Est. Net Profit", money(d.todayProfit || 0), 'purple', '📈', 'Gross Margin'],
      ['Low Stock Alert', d.lowStock, 'amber', '⚠️', 'Needs Reordering'],
      ['Expiring Soon', d.expiringSoon, 'purple', '⏳', '< 30 days window'],
      ['Expired / Locked', d.expired, 'red', '⛔', 'Quarantined from POS'],
      ['Patients / Rx', d.totalPatients || 0, 'blue', '👥', 'Active profiles'],
    ];

    $('kpis').innerHTML = kpis.map(([l, v, c, i, sub]) => `
      <div class="kpi c-${c}">
        <div class="kpi-top">
          <span class="ic" aria-hidden="true">${i}</span>
          <span class="kpi-sub">${sub}</span>
        </div>
        <div class="label">${l}</div>
        <div class="value">${esc(v)}</div>
      </div>`).join('');

    // Charts
    chart('chCat', {
      type: 'doughnut',
      data: {
        labels: Object.keys(d.byCategory),
        datasets: [{
          data: Object.values(d.byCategory),
          backgroundColor: PALETTE,
          borderWidth: 2,
          borderColor: '#ffffff',
        }],
      },
      options: { cutout: '68%' },
    });

    $('salesSummaryBadge').textContent = `7-Day Total: ${money(summary.total7DayRev)}`;

    chart('chSales', {
      type: 'line',
      data: {
        labels: summary.last7.map(x => x.date.slice(5)),
        datasets: [
          {
            label: 'Sales (PKR)',
            data: summary.last7.map(x => x.total),
            borderColor: '#0891B2',
            backgroundColor: 'rgba(8, 145, 178, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
          },
          {
            label: 'Estimated Profit (PKR)',
            data: summary.last7.map(x => x.profit || (x.total * 0.25)),
            borderColor: '#16A34A',
            borderDash: [5, 5],
            backgroundColor: 'transparent',
            tension: 0.35,
            borderWidth: 2,
          },
        ],
      },
      options: {
        scales: {
          y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
          x: { grid: { display: false } },
        },
      },
    });

    chart('chExp', {
      type: 'bar',
      data: {
        labels: Object.keys(d.expiryBuckets),
        datasets: [{
          label: 'Medicines',
          data: Object.values(d.expiryBuckets),
          backgroundColor: ['#DC2626', '#F59E0B', '#7C3AED'],
          borderRadius: 6,
        }],
      },
      options: {
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } },
        plugins: { legend: { display: false } },
      },
    });

    chart('chTop', {
      type: 'bar',
      data: {
        labels: summary.topSellers.map(x => x.name),
        datasets: [{
          label: 'Units Dispensed',
          data: summary.topSellers.map(x => x.qty),
          backgroundColor: '#2563EB',
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: 'y',
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } },
        plugins: { legend: { display: false } },
      },
    });

    // Emergency Restock Desk
    const lowItems = [...al.data.outOfStock, ...al.data.lowStock];
    $('lowStockCountBadge').textContent = `${lowItems.length} Urgent Item(s)`;

    if (lowItems.length) {
      $('reorderList').innerHTML = lowItems.slice(0, 5).map(m => {
        const phone = m.supplier?.phone || '923001234567';
        const msg = encodeURIComponent(`Assalam o Alaikum, PharmaPulse Pharmacy se hume ${m.name} (Batch: ${m.batchNo}) ke 50 units urgent restock karne hain. Please confirm order.`);
        const waLink = `https://wa.me/${phone}?text=${msg}`;
        return `
          <div class="ops-item">
            <div class="ops-details">
              <strong>${esc(m.name)}</strong>
              <div class="muted">Stock: <span style="color:var(--red-text);font-weight:700">${m.quantity}</span> / Reorder: ${m.reorderLevel} · Rack: <b>${esc(m.shelfLocation || 'A-1')}</b></div>
              <div class="muted">Supplier: ${esc(m.supplier?.name || 'General Stockist')}</div>
            </div>
            <div class="ops-actions">
              <a href="${waLink}" target="_blank" class="btn sm success" title="Order via WhatsApp">💬 WhatsApp Order</a>
            </div>
          </div>`;
      }).join('') + (lowItems.length > 5 ? `<div class="ops-more"><a href="/medicines.html?status=low">View all ${lowItems.length} items requiring restock →</a></div>` : '');
    } else {
      $('reorderList').innerHTML = '<div class="empty"><div class="big">✅</div>Inventory levels optimal. No emergency restock required.</div>';
    }

    // Expiry Quarantine Desk
    const expiryItems = [...al.data.expired, ...al.data.expiringSoon];
    $('expiryCountBadge').textContent = `${expiryItems.length} Item(s)`;

    if (expiryItems.length) {
      $('quarantineList').innerHTML = expiryItems.slice(0, 5).map(m => {
        const isExp = m.daysToExpiry < 0;
        return `
          <div class="ops-item">
            <div class="ops-details">
              <strong>${esc(m.name)}</strong>
              <div class="muted">Batch: ${esc(m.batchNo)} · Qty: ${m.quantity} units</div>
              <div class="muted">${isExp ? `<span class="badge b-red">Expired ${fmtDate(m.expiryDate)}</span>` : `<span class="badge b-purple">Expires in ${m.daysToExpiry} days</span>`}</div>
            </div>
            <div class="ops-actions">
              <button class="btn sm danger q-btn" data-id="${esc(m.id)}" ${m.quantity === 0 ? 'disabled' : ''}>
                ${m.quantity === 0 ? 'Quarantined' : '⛔ Quarantine Batch'}
              </button>
            </div>
          </div>`;
      }).join('') + (expiryItems.length > 5 ? `<div class="ops-more"><a href="/medicines.html?status=expired">View all ${expiryItems.length} expiry items →</a></div>` : '');

      $('quarantineList').querySelectorAll('.q-btn').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Are you sure you want to quarantine this batch? It will be marked out of stock and moved to the Quarantine Ward.')) return;
          try {
            await api(`/medicines/${btn.dataset.id}/quarantine`, { method: 'POST' });
            toast('Batch quarantined successfully');
            init();
          } catch (e) { toast(e.message, 'error'); }
        };
      });
    } else {
      $('quarantineList').innerHTML = '<div class="empty"><div class="big">✅</div>No expired or near-expiry batches detected.</div>';
    }

    // Pure DSA Linked-List Engine Telemetry
    if (d.telemetry) {
      $('telNodes').textContent = d.telemetry.totalNodes;
      $('telHead').textContent = d.telemetry.headName ? `[${d.telemetry.headName.slice(0, 14)}]` : 'NULL';
      $('telTail').textContent = d.telemetry.tailName ? `[${d.telemetry.tailName.slice(0, 14)}]` : 'NULL';
    }

    // Shift Activity Stream
    $('actList').innerHTML = act.data.length ? act.data.map(x => `
      <div class="act-item">
        <div class="act-avatar">${esc(x.userName.charAt(0).toUpperCase())}</div>
        <div class="act-content">
          <div class="act-header">
            <strong>${esc(x.userName)}</strong>
            <span class="badge ${x.action === 'SALE' ? 'b-green' : x.action.includes('MED') ? 'b-blue' : 'b-purple'}">${esc(x.action)}</span>
          </div>
          <div class="act-desc">${esc(x.details)}</div>
          <span class="act-time">${fmtTime(x.timestamp)}</span>
        </div>
      </div>`).join('')
      : '<div class="empty">No recent activity logged.</div>';

    // Live FX Rates Init
    api('/external/rates').then(r => {
      if (r.data?.USD_PKR) {
        currentUsdRate = r.data.USD_PKR;
        $('fxRateLabel').textContent = `Live Interbank: 1 USD = ${currentUsdRate.toFixed(2)} PKR (Auto-sync)`;
      } else {
        $('fxRateLabel').textContent = `Using reference rate: 1 USD = ${currentUsdRate.toFixed(2)} PKR`;
      }
      calcLanded();
    }).catch(() => {
      $('fxRateLabel').textContent = `Offline standard rate: 1 USD = ${currentUsdRate.toFixed(2)} PKR`;
      calcLanded();
    });

  } catch (e) { toast(e.message, 'error'); }
}

// FX Calculator handler
function calcLanded() {
  const fob = Number($('c_fob')?.value) || 0;
  const duty = (Number($('c_duty')?.value) || 0) / 100;
  const margin = (Number($('c_margin')?.value) || 0) / 100;

  const landedPkr = fob * currentUsdRate * (1 + duty);
  const retailPkr = landedPkr * (1 + margin);
  const profitPkr = retailPkr - landedPkr;

  if ($('resLanded')) $('resLanded').textContent = money(landedPkr);
  if ($('resRetail')) $('resRetail').textContent = money(retailPkr);
  if ($('resProfit')) $('resProfit').textContent = `+${money(profitPkr)}`;
}

$('calcFxBtn')?.addEventListener('click', calcLanded);
['c_fob', 'c_duty', 'c_margin'].forEach(id => $(id)?.addEventListener('input', calcLanded));

// openFDA Sentinel live inspector
$('sentinelBtn')?.addEventListener('click', async () => {
  const q = $('sentinelInput').value.trim();
  if (q.length < 2) return toast('Please enter a drug brand or generic name', 'warning');

  $('sentinelBox').innerHTML = '<div class="info-box">🔍 Querying official openFDA Drug Label Database...</div>';

  try {
    const res = await api('/external/drug-info?name=' + encodeURIComponent(q));
    const d = res.data;
    if (d && (d.purpose || d.warnings || d.genericName)) {
      $('sentinelBox').innerHTML = `
        <div class="sentinel-card-body">
          <div class="sentinel-drug-header">
            <h4>${esc(q.toUpperCase())}</h4>
            <span class="badge b-purple">${esc(d.genericName || 'Standard Formulation')}</span>
          </div>
          ${d.purpose ? `<div class="sentinel-sec"><label>INDICATIONS & USAGE:</label><p>${esc(d.purpose)}</p></div>` : ''}
          ${d.warnings ? `<div class="sentinel-sec warn"><label>⚠️ CLINICAL BOXED WARNINGS & PRECAUTIONS:</label><p>${esc(d.warnings)}</p></div>` : ''}
          ${d.manufacturer ? `<div class="sentinel-sec"><label>CERTIFIED MANUFACTURER:</label><p>${esc(d.manufacturer)}</p></div>` : ''}
        </div>`;
    } else {
      $('sentinelBox').innerHTML = `<div class="sentinel-placeholder">No FDA monograph found for "${esc(q)}". Check spelling or verify local DRAP registration.</div>`;
    }
  } catch {
    $('sentinelBox').innerHTML = '<div class="sentinel-placeholder">Clinical service unavailable. Please check internet connection.</div>';
  }
});

$('sentinelInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') $('sentinelBtn').click();
});

// Quick Export CSV
$('quickExportBtn')?.addEventListener('click', async () => {
  try {
    const res = await api('/medicines/export', { raw: true });
    if (res.status === 401) return logout();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `pharmapulse_inventory_${Date.now()}.csv` });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast('Medicines inventory CSV downloaded');
  } catch (e) { toast(e.message, 'error'); }
});
