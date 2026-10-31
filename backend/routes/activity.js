const router = require('express').Router();
const { store } = require('../services/store');
const { ok } = require('../services/helpers');

// Admin ko poora log, pharmacist ko sirf apna
router.get('/', (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const items = store.activity.toArray().filter(a => req.user.role === 'admin' || a.userId === req.user.id);
  ok(res, items.slice(0, limit));
});
module.exports = router;
