const router = require('express').Router();
const { store, save } = require('../services/store');
const { genId, ok, bad, logActivity } = require('../services/helpers');

function clean(b) {
  return {
    name: String(b.name ?? '').trim(),
    phone: String(b.phone ?? '').trim(),
    doctorName: String(b.doctorName ?? '').trim(),
    allergies: String(b.allergies ?? '').trim(),
    notes: String(b.notes ?? '').trim(),
  };
}

function validate(c) {
  if (!c.name) return 'Customer / Patient name is required';
  if (c.name.length > 80) return 'Name is too long';
  if (!c.phone) return 'Phone number is required';
  return null;
}

// GET all customers
router.get('/', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  let list = store.customers.toArray();
  if (q) {
    list = list.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.doctorName || '').toLowerCase().includes(q)
    );
  }
  ok(res, list);
});

// GET single customer
router.get('/:id', (req, res) => {
  const c = store.customers.findById(req.params.id);
  if (!c) return bad(res, 'Customer not found', 404);
  ok(res, c);
});

// POST new customer (insertAtTail: O(1))
router.post('/', (req, res) => {
  const c = clean(req.body);
  const err = validate(c);
  if (err) return bad(res, err);

  const newCust = {
    id: genId(),
    ...c,
    createdAt: new Date().toISOString(),
  };
  store.customers.insertAtTail(newCust);
  save('customers');
  logActivity(req.user, 'ADD_CUSTOMER', `Registered patient "${newCust.name}" (${newCust.phone})`);
  ok(res, newCust, 'Patient profile created successfully', 201);
});

// PUT update customer (updateById: O(n))
router.put('/:id', (req, res) => {
  const existing = store.customers.findById(req.params.id);
  if (!existing) return bad(res, 'Customer not found', 404);

  const c = clean(req.body);
  const err = validate(c);
  if (err) return bad(res, err);

  const updated = store.customers.updateById(req.params.id, c);
  save('customers');
  logActivity(req.user, 'UPDATE_CUSTOMER', `Updated patient "${updated.name}"`);
  ok(res, updated, 'Patient profile updated');
});

// DELETE customer (deleteById: O(n))
router.delete('/:id', (req, res) => {
  const existing = store.customers.findById(req.params.id);
  if (!existing) return bad(res, 'Customer not found', 404);

  store.customers.deleteById(req.params.id);
  save('customers');
  logActivity(req.user, 'DELETE_CUSTOMER', `Removed patient record "${existing.name}"`);
  ok(res, null, 'Patient profile deleted');
});

module.exports = router;
