require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { loadAll, store, save } = require('./services/store');
const { seedIfEmpty } = require('./services/seed');
const { protect, adminOnly } = require('./middleware/auth');
const { ok, logActivity } = require('./services/helpers');

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));   // CDN (Chart.js, fonts, QR) ke liye CSP band
app.use(cors());
app.use(express.json({ limit: '200kb' }));

loadAll();        // snapshot se linked lists wapas banao
seedIfEmpty();    // pehli run par demo data

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medicines', protect, require('./routes/medicines'));
app.use('/api/sales', protect, require('./routes/sales'));
app.use('/api/suppliers', protect, require('./routes/suppliers'));
app.use('/api/customers', protect, require('./routes/customers'));
app.use('/api/external', protect, require('./routes/external'));
app.use('/api/activity', protect, require('./routes/activity'));
app.use('/api/linkedlist', protect, require('./routes/linkedlist'));

// Full system snapshot download (JSON Backup)
app.get('/api/backup/export', protect, adminOnly, (req, res) => {
  const snapshot = {
    exportedAt: new Date().toISOString(),
    system: 'PharmaPulse Pro (Powered by PharmaLink DSA Engine)',
    data: {
      medicines: store.medicines.toArray(),
      users: store.users.toArray().map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt })),
      sales: store.sales.toArray(),
      suppliers: store.suppliers.toArray(),
      customers: store.customers.toArray(),
      activity: store.activity.toArray(),
    },
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="pharmapulse_backup.json"');
  res.send(JSON.stringify(snapshot, null, 2));
});

app.use('/api', (req, res) => res.status(404).json({ success: false, error: 'Route not found' }));

const FRONTEND = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND));
app.get('/', (req, res) => res.redirect('/login.html'));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  console.error(err);
  res.status(500).json({ success: false, error: 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`PharmaPulse Pro running on http://localhost:${PORT}`));
