// External APIs backend ke zariye call hoti hain. Host fixed hain, sirf query encode hoti hai (SSRF nahi).
const router = require('express').Router();
const { ok } = require('../services/helpers');

const getJson = async url => {
  const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

// 1) openFDA - drug label info (pehle brand name, phir generic name)
router.get('/drug-info', async (req, res) => {
  const name = String(req.query.name || '').trim().slice(0, 80);
  if (name.length < 2) return ok(res, null, 'Name too short');
  for (const field of ['openfda.brand_name', 'openfda.generic_name']) {
    try {
      const j = await getJson(`https://api.fda.gov/drug/label.json?search=${field}:"${encodeURIComponent(name)}"&limit=1`);
      const d = j.results?.[0];
      if (d) {
        const cut = v => (Array.isArray(v) ? v[0] : v || '').toString().slice(0, 300);
        return ok(res, {
          purpose: cut(d.purpose) || cut(d.indications_and_usage),
          warnings: cut(d.warnings),
          genericName: d.openfda?.generic_name?.[0] || '',
          manufacturer: d.openfda?.manufacturer_name?.[0] || '',
        });
      }
    } catch { /* agli field try karo */ }
  }
  ok(res, null, 'No info found');
});

// 2) RxNav (NIH) - spelling / name suggestions
router.get('/suggest', async (req, res) => {
  const name = String(req.query.name || '').trim().slice(0, 60);
  if (name.length < 2) return ok(res, []);
  try {
    const j = await getJson(`https://rxnav.nlm.nih.gov/REST/spellingsuggestions.json?name=${encodeURIComponent(name)}`);
    ok(res, (j.suggestionGroup?.suggestionList?.suggestion || []).slice(0, 8));
  } catch { ok(res, []); }
});

// 3) Exchange rate (USD -> PKR)
router.get('/rates', async (req, res) => {
  try {
    const j = await getJson('https://open.er-api.com/v6/latest/USD');
    ok(res, { USD_PKR: j.rates?.PKR ?? null, updated: j.time_last_update_utc ?? null });
  } catch { ok(res, null, 'Rates unavailable'); }
});

module.exports = router;
