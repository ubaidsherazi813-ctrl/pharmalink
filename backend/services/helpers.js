const { store, save } = require('./store');

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const ok = (res, data, message, code = 200, extra = {}) => res.status(code).json({ success: true, data, message, ...extra });
const bad = (res, error, code = 400) => res.status(code).json({ success: false, error });
const round2 = n => Math.round(n * 100) / 100;
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function isValidDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function daysToExpiry(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

// expired > out > expiring > low > ok
function statusOf(m) {
  const d = daysToExpiry(m.expiryDate);
  if (d < 0) return 'expired';
  if (m.quantity === 0) return 'out';
  if (d <= 30) return 'expiring';
  if (m.quantity <= m.reorderLevel) return 'low';
  return 'ok';
}
const decorate = m => ({ ...m, daysToExpiry: daysToExpiry(m.expiryDate), status: statusOf(m) });

function logActivity(user, action, details) {
  store.activity.insertAtHead({
    id: genId(), userId: user.id, userName: user.name, action, details, timestamp: new Date().toISOString(),
  });
  while (store.activity.size > 300) store.activity.deleteById(store.activity.tail.data.id);  // log ko chhota rakho
  save('activity');
}

module.exports = { genId, ok, bad, round2, ymd, isValidDate, daysToExpiry, statusOf, decorate, logActivity };
