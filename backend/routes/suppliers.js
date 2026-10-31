const router = require('express').Router();
const { store, save } = require('../services/store');
const { genId, ok, bad, logActivity } = require('../services/helpers');
const { adminOnly } = require('../middleware/auth');

function clean(b) {
  return {
    name: String(b.name ?? '').trim(), phone: String(b.phone ?? '').trim(),
    email: String(b.email ?? '').trim(), address: String(b.address ?? '').trim(),
  };
}
function validate(s) {
  if (!s.name) return 'Supplier name is required';
  if (s.name.length > 100) return 'Name is too long';
  if (s.phone && !/^\+?[\d\s-]{7,16}$/.test(s.phone)) return 'Enter a valid phone number (with country code, e.g. 923001234567)';
  if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) return 'Enter a valid email';
  return null;
}

router.get('/', (req, res) => ok(res, store.suppliers.toArray()));

router.post('/', (req, res) => {
  const f = clean(req.body || {});
  const err = validate(f);
  if (err) return bad(res, err);
  const s = store.suppliers.insertAtTail({ id: genId(), ...f });
  save('suppliers');
  logActivity(req.user, 'ADD_SUPPLIER', `Added supplier ${s.name}`);
  ok(res, s, 'Supplier added', 201);
});

router.put('/:id', (req, res) => {
  const existing = store.suppliers.findById(req.params.id);
  if (!existing) return bad(res, 'Supplier not found', 404);
  const f = clean({ ...existing, ...(req.body || {}) });
  const err = validate(f);
  if (err) return bad(res, err);
  const s = store.suppliers.updateById(existing.id, f);
  save('suppliers');
  logActivity(req.user, 'UPDATE_SUPPLIER', `Updated supplier ${s.name}`);
  ok(res, s, 'Supplier updated');
});

router.delete('/:id', adminOnly, (req, res) => {
  const existing = store.suppliers.findById(req.params.id);
  if (!existing) return bad(res, 'Supplier not found', 404);
  store.suppliers.deleteById(existing.id);
  save('suppliers');
  logActivity(req.user, 'DELETE_SUPPLIER', `Deleted supplier ${existing.name}`);
  ok(res, { id: existing.id }, 'Supplier deleted');
});

module.exports = router;
