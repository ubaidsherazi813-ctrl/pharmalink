const bcrypt = require('bcryptjs');
const { store, save } = require('./store');
const { genId, ymd, round2 } = require('./helpers');

const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };

// Pehli baar chalne par rich demo data banata hai (users list khaali ho to)
function seedIfEmpty() {
  const now = new Date().toISOString();

  // Seed demo customers if list is empty
  if (store.customers.size === 0) {
    const custs = [
      ['Muhammad Ali', '03009876543', 'Dr. Farooq (Cardiologist)', 'Hypertension, Penicillin Allergy', 'Prescription active (BP monitoring)'],
      ['Fatima Zahra', '03124567890', 'Dr. Ayesha (Gynecologist)', 'None', 'Regular prenatal vitamins'],
      ['Tariq Mehmood', '03451234567', 'Dr. Noman (Orthopedic)', 'Diabetic (Type 2)', 'Post-surgery painkillers and calcium'],
      ['Zainab Bibi', '03337654321', 'Dr. Asif (Pediatrician)', 'None', 'Pediatric cough syrup & antibiotics'],
    ];
    custs.forEach(([name, phone, doctorName, allergies, notes]) => {
      store.customers.insertAtTail({
        id: genId(), name, phone, doctorName, allergies, notes, createdAt: now,
      });
    });
    save('customers');
    console.log('[seed] demo customers seeded');
  }

  // Ensure demo shelf locations on medicines if missing
  for (let cur = store.medicines.head; cur; cur = cur.next) {
    if (!cur.data.shelfLocation) {
      cur.data.shelfLocation = 'Rack A-' + String((Math.abs(cur.data.id.charCodeAt(0)) % 4) + 1);
    }
  }
  save('medicines');

  if (store.users.size > 0) return;

  store.users.insertAtTail({
    id: genId(), name: 'Admin', email: 'admin@pharmalink.com',
    passwordHash: bcrypt.hashSync('Admin@123', 10), role: 'admin', createdAt: now,
  });

  const sup = [
    ['Alpha Distributors', '923001234567', 'alpha@pharmadist.com', 'Plot 42, Korangi Industrial Area, Karachi'],
    ['MediCare Wholesale', '923331234567', 'medicare@pkpharma.com', 'Station Road, Sukkur'],
    ['HealthLine Traders', '923211234567', 'healthline@medsupply.com', 'Auto Bhan Road, Hyderabad'],
  ].map(([name, phone, email, address]) => store.suppliers.insertAtTail({ id: genId(), name, phone, email, address }));

  // name, generic, category, batch, manufacturer, qty, reorder, buy, sell, expiry(days from today), shelfLocation
  const meds = [
    ['Panadol 500mg', 'Paracetamol', 'Tablet', 'PN-2301', 'GSK', 220, 50, 12, 18, 420, 'Rack A-01'],
    ['Brufen 400mg', 'Ibuprofen', 'Tablet', 'BR-1189', 'Abbott', 140, 40, 15, 22, 300, 'Rack A-02'],
    ['Augmentin 625mg', 'Amoxicillin/Clavulanate', 'Tablet', 'AG-7742', 'GSK', 18, 30, 95, 130, 200, 'Rack B-01 (Antibiotics)'],
    ['Flagyl 400mg', 'Metronidazole', 'Tablet', 'FL-3321', 'Sanofi', 90, 30, 8, 14, 25, 'Rack B-02'],
    ['Calpol Syrup', 'Paracetamol', 'Syrup', 'CP-5510', 'GSK', 45, 20, 70, 105, 150, 'Shelf S-01 (Syrups)'],
    ['Ventolin Inhaler', 'Salbutamol', 'Other', 'VT-9008', 'GSK', 12, 15, 320, 410, 380, 'Drawer D-03'],
    ['Voltral Injection', 'Diclofenac', 'Injection', 'VO-4410', 'Novartis', 60, 20, 35, 55, 90, 'Cold Storage C-01'],
    ['Zyrtec 10mg', 'Cetirizine', 'Tablet', 'ZY-2210', 'UCB', 150, 40, 10, 16, 510, 'Rack A-03'],
    ['Risek 20mg', 'Omeprazole', 'Capsule', 'RK-6620', 'Getz', 0, 25, 18, 28, 260, 'Rack C-01 (Gastro)'],
    ['Betnovate Cream', 'Betamethasone', 'Ointment', 'BT-1002', 'GSK', 33, 15, 85, 125, 180, 'Shelf O-02 (Derma)'],
    ['Maxitrol Eye Drops', 'Neomycin/Dexamethasone', 'Drops', 'MX-3003', 'Alcon', 25, 10, 140, 190, 15, 'Shelf D-01 (Ophthalmic)'],
    ['Disprin', 'Aspirin', 'Tablet', 'DS-7001', 'Reckitt', 75, 30, 4, 7, -20, 'Quarantine Bin Q-01'],
    ['Ponstan Forte', 'Mefenamic Acid', 'Tablet', 'PF-8832', 'Pfizer', 110, 30, 14, 21, 340, 'Rack A-04'],
    ['Gaviscon Syrup', 'Alginate/Antacid', 'Syrup', 'GV-4409', 'Reckitt', 8, 12, 210, 290, 60, 'Shelf S-02'],
    ['Surbex Z', 'Multivitamin + Zinc', 'Tablet', 'SZ-5521', 'Abbott', 130, 30, 22, 35, 55, 'Rack V-01 (Vitamins)'],
    ['Cac-1000 Plus', 'Calcium + Vitamin C', 'Tablet', 'CC-9012', 'GSK', 95, 25, 30, 48, 85, 'Rack V-02'],
  ].map(([name, genericName, category, batchNo, manufacturer, quantity, reorderLevel, purchasePrice, salePrice, exp, shelfLocation], i) =>
    store.medicines.insertAtTail({
      id: genId(), name, genericName, category, batchNo, manufacturer, supplierId: sup[i % 3].id,
      quantity, reorderLevel, purchasePrice, salePrice, expiryDate: addDays(exp), shelfLocation: shelfLocation || 'General Rack',
      createdAt: now, updatedAt: now,
    }));

  let n = 0;
  for (let day = 6; day >= 0; day--) {
    for (let k = 0; k < 2; k++) {
      const picks = [meds[(day + k) % 8], meds[(day * 2 + k + 3) % 8]];
      const items = picks.map((m, j) => ({
        medicineId: m.id, name: m.name, qty: 1 + ((day + j + k) % 3), price: m.salePrice, costPrice: m.purchasePrice,
      }));
      const subtotal = round2(items.reduce((s, i) => s + i.qty * i.price, 0));
      const date = new Date(); date.setDate(date.getDate() - day); date.setHours(10 + k * 4, 15, 0, 0);
      n++;
      store.sales.insertAtHead({
        id: genId(), invoiceNo: `INV-${String(n).padStart(4, '0')}`,
        items, subtotal, discountPercent: 0, total: subtotal,
        customerName: 'Walk-in Customer',
        soldBy: 'Admin', soldById: 'seed', date: date.toISOString(),
      });
    }
  }
  store.activity.insertAtHead({ id: genId(), userId: 'seed', userName: 'System', action: 'SEED', details: 'Enterprise demo seed loaded with patients, shelf locations & sales', timestamp: now });
  ['users', 'suppliers', 'customers', 'medicines', 'sales', 'activity'].forEach(save);
  console.log('[seed] enterprise demo data loaded (admin@pharmalink.com / Admin@123)');
}
module.exports = { seedIfEmpty };
