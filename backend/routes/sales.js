const router = require('express').Router();
const { store, save } = require('../services/store');
const { genId, ok, bad, round2, ymd, daysToExpiry, logActivity } = require('../services/helpers');

// Sale: prices hamesha server ki medicine list se, client ki bheji hui price par bharosa nahi
router.post('/', (req, res) => {
  const items = req.body?.items;
  const discount = Number(req.body?.discountPercent ?? 0);
  const customerId = req.body?.customerId ? String(req.body.customerId) : null;
  const customerName = req.body?.customerName ? String(req.body.customerName).trim() : 'Walk-in Customer';

  if (!Array.isArray(items) || items.length === 0) return bad(res, 'Cart is empty');
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) return bad(res, 'Discount must be between 0 and 100');

  const wanted = new Map();                                   // duplicate items merge karo
  for (const it of items) {
    const qty = Number(it?.qty);
    if (!it?.medicineId || !Number.isInteger(qty) || qty < 1) return bad(res, 'Each item needs a valid quantity');
    wanted.set(it.medicineId, (wanted.get(it.medicineId) || 0) + qty);
  }

  const lines = [];                                           // Phase 1: validate
  for (const [id, qty] of wanted) {
    const m = store.medicines.findById(id);
    if (!m) return bad(res, 'A medicine in the cart no longer exists');
    if (daysToExpiry(m.expiryDate) < 0) return bad(res, `${m.name} is expired and cannot be sold`);
    if (qty > m.quantity) return bad(res, `Only ${m.quantity} units of ${m.name} in stock`);
    lines.push({ m, qty });
  }

  const saleItems = lines.map(({ m, qty }) => {               // Phase 2: stock minus (linked list update)
    store.medicines.updateById(m.id, { quantity: m.quantity - qty });
    return {
      medicineId: m.id,
      name: m.name,
      batchNo: m.batchNo,
      shelfLocation: m.shelfLocation,
      qty,
      price: m.salePrice,
      costPrice: m.purchasePrice,
    };
  });

  const subtotal = round2(saleItems.reduce((s, i) => s + i.qty * i.price, 0));
  const discountAmount = round2(subtotal * (discount / 100));
  const total = round2(subtotal - discountAmount);

  const sale = store.sales.insertAtHead({                      // nayi sale list ke head par O(1)
    id: genId(),
    invoiceNo: `INV-${String(store.sales.size + 1).padStart(4, '0')}`,
    items: saleItems,
    subtotal,
    discountPercent: discount,
    discountAmount,
    total,
    customerId,
    customerName,
    soldBy: req.user.name,
    soldById: req.user.id,
    date: new Date().toISOString(),
  });

  save('medicines');
  save('sales');
  logActivity(req.user, 'SALE', `${sale.invoiceNo}: ${saleItems.length} item(s) to ${customerName}, total PKR ${sale.total}`);
  ok(res, sale, 'Sale completed successfully', 201);
});

router.get('/summary', (req, res) => {
  const sales = store.sales.toArray();
  const last7 = [];
  let total7DayRev = 0;
  let total7DayProfit = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = ymd(d);
    const daySales = sales.filter(s => ymd(new Date(s.date)) === key);
    const rev = round2(daySales.reduce((t, s) => t + s.total, 0));
    let cost = 0;
    daySales.forEach(s => s.items.forEach(it => {
      cost += it.qty * (it.costPrice || (it.price * 0.7));
    }));
    const profit = Math.max(0, round2(rev - cost));
    total7DayRev += rev;
    total7DayProfit += profit;
    last7.push({ date: key, total: rev, profit });
  }

  const qtyByName = new Map();
  sales.forEach(s => s.items.forEach(i => qtyByName.set(i.name, (qtyByName.get(i.name) || 0) + i.qty)));
  const topSellers = [...qtyByName].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);

  ok(res, {
    last7,
    topSellers,
    total7DayRev: round2(total7DayRev),
    total7DayProfit: round2(total7DayProfit),
    avgOrderValue: sales.length ? round2(sales.reduce((a, b) => a + b.total, 0) / sales.length) : 0,
    totalOrders: sales.length,
  });
});

router.get('/', (req, res) => {
  const { from, to, q } = req.query;
  const needle = String(q || '').trim().toLowerCase();
  ok(res, store.sales.toArray().filter(s => {
    const d = ymd(new Date(s.date));
    const matchesDate = (!from || d >= from) && (!to || d <= to);
    const matchesQ = !needle || (s.invoiceNo.toLowerCase().includes(needle) || (s.customerName || '').toLowerCase().includes(needle));
    return matchesDate && matchesQ;
  }));
});

router.get('/:id', (req, res) => {
  const s = store.sales.findById(req.params.id);
  return s ? ok(res, s) : bad(res, 'Sale not found', 404);
});

module.exports = router;
