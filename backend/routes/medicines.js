const router = require('express').Router();
const { store, save } = require('../services/store');
const LinkedList = require('../structures/LinkedList');
const { genId, ok, bad, round2, ymd, isValidDate, decorate, logActivity } = require('../services/helpers');
const { adminOnly } = require('../middleware/auth');

const CATEGORIES = ['Tablet', 'Syrup', 'Injection', 'Capsule', 'Ointment', 'Drops', 'Other'];

// Sirf allowed fields lo
function clean(b) {
  const num = v => (v === '' || v == null ? NaN : Number(v));
  return {
    name: String(b.name ?? '').trim(),
    genericName: String(b.genericName ?? '').trim(),
    category: b.category,
    batchNo: String(b.batchNo ?? '').trim(),
    manufacturer: String(b.manufacturer ?? '').trim(),
    supplierId: b.supplierId ? String(b.supplierId) : '',
    quantity: num(b.quantity),
    reorderLevel: b.reorderLevel === '' || b.reorderLevel == null ? 10 : num(b.reorderLevel),
    purchasePrice: num(b.purchasePrice),
    salePrice: num(b.salePrice),
    expiryDate: String(b.expiryDate ?? ''),
    shelfLocation: String(b.shelfLocation ?? '').trim() || 'General Rack',
  };
}

function validate(m, excludeId) {
  if (!m.name) return 'Name is required';
  if (m.name.length > 100) return 'Name is too long';
  if (!CATEGORIES.includes(m.category)) return 'Choose a valid category';
  if (!m.batchNo) return 'Batch number is required';
  if (!Number.isInteger(m.quantity) || m.quantity < 0) return 'Quantity must be a whole number (0 or more)';
  if (!Number.isInteger(m.reorderLevel) || m.reorderLevel < 0) return 'Reorder level must be a whole number (0 or more)';
  if (!Number.isFinite(m.purchasePrice) || m.purchasePrice <= 0) return 'Purchase price must be greater than 0';
  if (!Number.isFinite(m.salePrice) || m.salePrice <= 0) return 'Sale price must be greater than 0';
  if (!isValidDate(m.expiryDate)) return 'Enter a valid expiry date (YYYY-MM-DD)';
  if (m.supplierId && !store.suppliers.findById(m.supplierId)) return 'Supplier not found';
  const dup = store.medicines.find(x => x.id !== excludeId &&
    x.name.toLowerCase() === m.name.toLowerCase() && x.batchNo.toLowerCase() === m.batchNo.toLowerCase());
  if (dup) return 'This medicine with the same batch number already exists';
  return null;
}
const priceWarning = m => (m.salePrice <= m.purchasePrice ? 'Warning: sale price is not higher than purchase price' : undefined);

// ---------- Special routes (/:id se pehle) ----------
router.get('/stats', (req, res) => {
  const meds = store.medicines.toArray().map(decorate);
  const byCategory = {};
  const expiryBuckets = { '0-30 days': 0, '31-60 days': 0, '61-90 days': 0 };
  let stockValue = 0, lowStock = 0, expiringSoon = 0, expired = 0;
  for (const m of meds) {
    stockValue += m.quantity * m.purchasePrice;
    byCategory[m.category] = (byCategory[m.category] || 0) + m.quantity;
    if (m.daysToExpiry < 0) { expired++; continue; }
    if (m.quantity <= m.reorderLevel) lowStock++;
    if (m.daysToExpiry <= 30) { expiringSoon++; expiryBuckets['0-30 days']++; }
    else if (m.daysToExpiry <= 60) expiryBuckets['31-60 days']++;
    else if (m.daysToExpiry <= 90) expiryBuckets['61-90 days']++;
  }
  const today = ymd(new Date());
  const todaySalesList = store.sales.toArray().filter(s => ymd(new Date(s.date)) === today);
  const todaySales = todaySalesList.reduce((t, s) => t + s.total, 0);

  // Profit calculation: sale price minus purchase price of sold items
  let todayCost = 0;
  for (const s of todaySalesList) {
    for (const it of s.items) {
      const cost = it.costPrice || store.medicines.findById(it.medicineId)?.purchasePrice || (it.price * 0.7);
      todayCost += it.qty * cost;
    }
  }
  const todayProfit = Math.max(0, round2(todaySales - todayCost));

  // Linked list telemetry
  const telemetry = {
    totalNodes: store.medicines.size,
    headId: store.medicines.head?.data.id || null,
    headName: store.medicines.head?.data.name || 'Empty',
    tailId: store.medicines.tail?.data.id || null,
    tailName: store.medicines.tail?.data.name || 'Empty',
    listsActive: ['medicines', 'users', 'sales', 'suppliers', 'activity', 'customers'].length,
  };

  ok(res, {
    totalMedicines: meds.length,
    stockValue: round2(stockValue),
    lowStock,
    expiringSoon,
    expired,
    todaySales: round2(todaySales),
    todayProfit,
    totalPatients: store.customers.size,
    byCategory,
    expiryBuckets,
    telemetry,
  });
});

router.get('/alerts', (req, res) => {
  const meds = store.medicines.toArray().map(decorate);
  const suppliersMap = new Map();
  store.suppliers.toArray().forEach(s => suppliersMap.set(s.id, s));

  const enrich = m => ({
    ...m,
    supplier: suppliersMap.get(m.supplierId) || null,
  });

  const alerts = {
    expired: meds.filter(m => m.daysToExpiry < 0).map(enrich),
    outOfStock: meds.filter(m => m.daysToExpiry >= 0 && m.quantity === 0).map(enrich),
    expiringSoon: meds.filter(m => m.daysToExpiry >= 0 && m.daysToExpiry <= 30).map(enrich),
    lowStock: meds.filter(m => m.daysToExpiry >= 0 && m.quantity > 0 && m.quantity <= m.reorderLevel).map(enrich),
  };
  alerts.count = alerts.expired.length + alerts.outOfStock.length + alerts.expiringSoon.length + alerts.lowStock.length;
  ok(res, alerts);
});

router.get('/export', (req, res) => {
  const esc = v => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const cols = ['name', 'genericName', 'category', 'batchNo', 'shelfLocation', 'manufacturer', 'quantity', 'reorderLevel', 'purchasePrice', 'salePrice', 'expiryDate', 'status'];
  const rows = store.medicines.toArray().map(decorate).map(m => cols.map(c => esc(m[c])).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="medicines_inventory.csv"');
  res.send([cols.join(','), ...rows].join('\n'));
});

// ---------- READ (list) ----------
router.get('/', (req, res) => {
  const { q = '', category = '', status = '', sort = 'name', order = 'asc' } = req.query;
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 10));
  const needle = String(q).trim().toLowerCase();

  let items = store.medicines.toArray().map(decorate).filter(m =>
    (!needle || [m.name, m.genericName, m.batchNo, m.shelfLocation].some(f => String(f).toLowerCase().includes(needle))) &&
    (!category || m.category === category) && (!status || m.status === status));

  // Sort: linked list merge sort logic
  const mult = order === 'desc' ? -1 : 1;
  const cmp = (a, b) => {
    let va = a[sort], vb = b[sort];
    if (typeof va === 'string') return mult * va.localeCompare(vb);
    return mult * ((va || 0) - (vb || 0));
  };
  items.sort(cmp);

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pages, Math.max(1, parseInt(req.query.page) || 1));
  const paged = items.slice((page - 1) * limit, page * limit);
  ok(res, paged, undefined, 200, { meta: { page, pages, total, limit } });
});

router.get('/:id', (req, res) => {
  const m = store.medicines.findById(req.params.id);
  if (!m) return bad(res, 'Medicine not found', 404);
  ok(res, decorate(m));
});

// ---------- CREATE ----------
router.post('/', (req, res) => {
  const cleanBody = clean(req.body || {});
  const err = validate(cleanBody);
  if (err) return bad(res, err);

  const now = new Date().toISOString();
  const med = {
    id: genId(),
    ...cleanBody,
    createdAt: now,
    updatedAt: now,
  };

  store.medicines.insertAtTail(med);
  save('medicines');
  logActivity(req.user, 'CREATE_MED', `Added "${med.name}" (${med.category}) batch ${med.batchNo}`);
  ok(res, decorate(med), 'Medicine added successfully', 201, { warning: priceWarning(med) });
});

// ---------- UPDATE ----------
router.put('/:id', (req, res) => {
  const existing = store.medicines.findById(req.params.id);
  if (!existing) return bad(res, 'Medicine not found', 404);

  const cleanBody = clean(req.body || {});
  const err = validate(cleanBody, req.params.id);
  if (err) return bad(res, err);

  const updated = store.medicines.updateById(req.params.id, cleanBody);
  save('medicines');
  logActivity(req.user, 'UPDATE_MED', `Updated "${updated.name}" batch ${updated.batchNo}`);
  ok(res, decorate(updated), 'Medicine updated successfully', 200, { warning: priceWarning(updated) });
});

// ---------- QUARANTINE / MARK EXPIRED ----------
router.post('/:id/quarantine', (req, res) => {
  const existing = store.medicines.findById(req.params.id);
  if (!existing) return bad(res, 'Medicine not found', 404);

  const prevQty = existing.quantity;
  const updated = store.medicines.updateById(req.params.id, {
    quantity: 0,
    shelfLocation: 'Quarantine Ward / Return to Supplier',
  });
  save('medicines');
  logActivity(req.user, 'QUARANTINE', `Quarantined ${prevQty} units of "${existing.name}" (batch ${existing.batchNo})`);
  ok(res, decorate(updated), `Quarantined ${prevQty} units of ${existing.name}`);
});

// ---------- DELETE (Admin only) ----------
router.delete('/:id', adminOnly, (req, res) => {
  const m = store.medicines.findById(req.params.id);
  if (!m) return bad(res, 'Medicine not found', 404);

  store.medicines.deleteById(req.params.id);
  save('medicines');
  logActivity(req.user, 'DELETE_MED', `Deleted "${m.name}" batch ${m.batchNo}`);
  ok(res, null, `Medicine "${m.name}" deleted`);
});

module.exports = router;
