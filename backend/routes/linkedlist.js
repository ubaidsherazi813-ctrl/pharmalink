const router = require('express').Router();
const { store } = require('../services/store');
const { ok, bad } = require('../services/helpers');

// Visualizer ke liye: medicines ki chain (head se tail tak)
router.get('/state', (req, res) => {
  const nodes = store.medicines.toArray().map(m => ({ id: m.id, name: m.name }));
  ok(res, { size: store.medicines.size, headId: nodes[0]?.id ?? null, tailId: nodes[nodes.length - 1]?.id ?? null, nodes });
});

// Dry-run: asli data ko chhue baghair traversal ke steps batata hai
router.post('/simulate', (req, res) => {
  const op = req.body?.op;
  const q = String(req.body?.q ?? '').trim().toLowerCase();
  if (!['search', 'delete'].includes(op)) return bad(res, 'op must be "search" or "delete"');
  if (!q) return bad(res, 'Enter a medicine name to look for');

  const path = [];
  let foundId = null;
  for (let cur = store.medicines.head; cur; cur = cur.next) {
    path.push(cur.data.id);
    if (cur.data.name.toLowerCase().includes(q)) { foundId = cur.data.id; break; }
  }
  const explanation = foundId
    ? (op === 'search'
      ? `Head se ${path.length} node(s) traverse kiye aur match mil gaya.`
      : `${path.length} node(s) traverse kiye. Phir pichle node ka next pointer match ke agle node par set hota (head ho to head aage barhta).`)
    : 'Poori list traverse ho gayi aur koi match nahi mila (NULL tak pohanch gaye).';
  ok(res, { op, path, found: !!foundId, foundId, steps: path.length, complexity: 'O(n)', explanation, preview: true });
});

module.exports = router;
