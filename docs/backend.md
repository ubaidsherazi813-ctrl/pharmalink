# ⚙️ Backend Guide — PharmaLink

**Stack:** Node.js 18+ · Express · bcryptjs · jsonwebtoken · dotenv · cors · helmet
**Data storage:** Linked Lists in server memory + JSON snapshot file (**koi database nahi**)

---

## 1. Architecture

```
Browser (Frontend)
      │  fetch() + JWT
      ▼
 Express Routes  ──►  Middleware (auth, validate)
      │
      ▼
   Services  ──►  LinkedList (data yahin rehta hai)
      │                 │
      │                 └── save/load ──► data/*.json (backup)
      ▼
 External APIs (openFDA, RxNav, ExchangeRate)
```

**Kyun database nahi?** Ye DSA project hai. Agar data MongoDB/MySQL mein jata to linked list ka koi kaam nahi bachta. Isliye data nodes mein rakha, aur sirf restart se bachane ke liye JSON file mein snapshot save hota hai.

## 2. Install

```bash
cd backend
npm init -y
npm install express cors helmet bcryptjs jsonwebtoken dotenv
npm install --save-dev nodemon
```

`package.json` scripts:
```json
"scripts": { "start": "node server.js", "dev": "nodemon server.js" }
```

`.env.example`:
```
PORT=5000
JWT_SECRET=koi_lamba_random_string_yahan
JWT_EXPIRES_IN=1d
```

## 3. Linked List Implementation (Core DSA Code)

### `structures/Node.js`
```js
class Node {
  constructor(data) {
    this.data = data;   // medicine / user / sale object
    this.next = null;   // agle node ka pointer
  }
}
module.exports = Node;
```

### `structures/LinkedList.js`
```js
const Node = require('./Node');

class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  // CREATE ---------------------------------------------
  insertAtHead(data) {            // O(1)
    const node = new Node(data);
    node.next = this.head;
    this.head = node;
    if (!this.tail) this.tail = node;
    this.size++;
    return data;
  }

  insertAtTail(data) {            // O(1) (tail pointer ki wajah se)
    const node = new Node(data);
    if (!this.head) { this.head = this.tail = node; }
    else { this.tail.next = node; this.tail = node; }
    this.size++;
    return data;
  }

  // READ -----------------------------------------------
  findById(id) {                  // O(n)
    let cur = this.head;
    while (cur) {
      if (cur.data.id === id) return cur.data;
      cur = cur.next;
    }
    return null;
  }

  toArray() {                     // O(n)
    const out = [];
    let cur = this.head;
    while (cur) { out.push(cur.data); cur = cur.next; }
    return out;
  }

  // UPDATE ---------------------------------------------
  updateById(id, newFields) {     // O(n)
    let cur = this.head;
    while (cur) {
      if (cur.data.id === id) {
        cur.data = { ...cur.data, ...newFields, id, updatedAt: new Date().toISOString() };
        return cur.data;
      }
      cur = cur.next;
    }
    return null;
  }

  // DELETE ---------------------------------------------
  deleteById(id) {                // O(n)
    if (!this.head) return false;

    // Case 1: head delete
    if (this.head.data.id === id) {
      this.head = this.head.next;
      if (!this.head) this.tail = null;
      this.size--;
      return true;
    }
    // Case 2: middle / tail
    let prev = this.head, cur = this.head.next;
    while (cur) {
      if (cur.data.id === id) {
        prev.next = cur.next;
        if (cur === this.tail) this.tail = prev;
        this.size--;
        return true;
      }
      prev = cur;
      cur = cur.next;
    }
    return false;
  }

  // EXTRA ----------------------------------------------
  filter(fn) {                    // O(n)
    return this.toArray().filter(fn);
  }

  reverse() {                     // O(n)
    let prev = null, cur = this.head;
    this.tail = this.head;
    while (cur) { const nxt = cur.next; cur.next = prev; prev = cur; cur = nxt; }
    this.head = prev;
  }

  // Merge sort on linked list: O(n log n)
  sortBy(compareFn) {
    this.head = this._mergeSort(this.head, compareFn);
    let cur = this.head;
    while (cur && cur.next) cur = cur.next;
    this.tail = cur;
  }
  _mergeSort(head, cmp) {
    if (!head || !head.next) return head;
    // middle dhoondo (slow/fast pointer)
    let slow = head, fast = head.next;
    while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }
    const right = slow.next;
    slow.next = null;
    return this._merge(this._mergeSort(head, cmp), this._mergeSort(right, cmp), cmp);
  }
  _merge(a, b, cmp) {
    const dummy = new Node(null);
    let t = dummy;
    while (a && b) {
      if (cmp(a.data, b.data) <= 0) { t.next = a; a = a.next; }
      else { t.next = b; b = b.next; }
      t = t.next;
    }
    t.next = a || b;
    return dummy.next;
  }

  // Snapshot helpers -----------------------------------
  static fromArray(arr) {
    const list = new LinkedList();
    arr.forEach(item => list.insertAtTail(item));
    return list;
  }
}
module.exports = LinkedList;
```

### Complexity Summary

| Method | Time | Space |
|---|---|---|
| insertAtHead / insertAtTail | O(1) | O(1) |
| findById / updateById / deleteById | O(n) | O(1) |
| toArray / filter | O(n) | O(n) |
| reverse | O(n) | O(1) |
| sortBy (merge sort) | O(n log n) | O(log n) |

## 4. Lists Used in the App

```js
// services/store.js
const LinkedList = require('../structures/LinkedList');
const fs = require('fs');
const path = require('path');

const store = {
  medicines: new LinkedList(),
  users:     new LinkedList(),
  sales:     new LinkedList(),
  suppliers: new LinkedList(),
  activity:  new LinkedList(),
};

// Persistence: har badlav ke baad snapshot
function save(name) {
  fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
  fs.writeFileSync(
    path.join(__dirname, `../data/${name}.json`),
    JSON.stringify(store[name].toArray(), null, 2)
  );
}
// Startup par load
function loadAll() {
  Object.keys(store).forEach(name => {
    const file = path.join(__dirname, `../data/${name}.json`);
    if (fs.existsSync(file)) store[name] = LinkedList.fromArray(JSON.parse(fs.readFileSync(file)));
  });
}
module.exports = { store, save, loadAll };
```

## 5. Data Models

```js
Medicine = { id, name, genericName, category, batchNo, manufacturer, supplierId,
             quantity, reorderLevel, purchasePrice, salePrice, expiryDate,
             createdAt, updatedAt }

User     = { id, name, email, passwordHash, role: 'admin' | 'pharmacist', createdAt }

Sale     = { id, invoiceNo, items: [{ medicineId, name, qty, price }],
             discountPercent, total, soldBy, date }

Supplier = { id, name, phone, email, address }

Activity = { id, userId, userName, action, details, timestamp }
```

ID banane ke liye: `Date.now().toString(36) + Math.random().toString(36).slice(2, 6)`

## 6. REST API Endpoints

**Base URL:** `/api` · Protected routes ke liye header: `Authorization: Bearer <token>`

### 6.1 Auth
| Method | Endpoint | Access | Kaam |
|---|---|---|---|
| POST | `/auth/register` | Public | Naya user |
| POST | `/auth/login` | Public | Login, token milta hai |
| GET | `/auth/me` | Logged in | Current user |

### 6.2 Medicines
| Method | Endpoint | Access | Linked list method |
|---|---|---|---|
| GET | `/medicines?q=&category=&status=&sort=&order=&page=&limit=` | Logged in | `toArray()` + filter + `sortBy()` |
| GET | `/medicines/:id` | Logged in | `findById()` |
| POST | `/medicines` | Logged in | `insertAtTail()` |
| PUT | `/medicines/:id` | Logged in | `updateById()` |
| DELETE | `/medicines/:id` | **Admin** | `deleteById()` |
| GET | `/medicines/stats` | Logged in | Dashboard ke numbers |
| GET | `/medicines/alerts` | Logged in | Low / expiring / expired |
| GET | `/medicines/export` | Logged in | CSV download |
| POST | `/medicines/import` | Admin | CSV bulk add |

### 6.3 Sales
| Method | Endpoint | Kaam |
|---|---|---|
| POST | `/sales` | Sale complete (stock minus + `insertAtHead`) |
| GET | `/sales?from=&to=` | Sales history |
| GET | `/sales/:id` | Invoice detail |
| GET | `/sales/summary` | Last 7 din + top sellers |

### 6.4 Suppliers
| Method | Endpoint | Kaam |
|---|---|---|
| GET / POST | `/suppliers` | List / Add |
| PUT / DELETE | `/suppliers/:id` | Update / Delete |

### 6.5 Activity & Visualizer
| Method | Endpoint | Kaam |
|---|---|---|
| GET | `/activity?limit=20` | Recent logs |
| GET | `/linkedlist/state` | Nodes ki chain (id, name) visualizer ke liye |
| POST | `/linkedlist/simulate` | Insert / delete / search ke steps wapas bhejta hai |

### 6.6 External API Proxy (backend ke zariye)
| Method | Endpoint | Aage kis API ko call karta hai |
|---|---|---|
| GET | `/external/drug-info?name=` | openFDA Drug Label |
| GET | `/external/suggest?name=` | RxNav spelling suggestions |
| GET | `/external/rates` | open.er-api.com (USD → PKR) |

### Standard Response Format
```json
{ "success": true,  "data": { }, "message": "Medicine added" }
{ "success": false, "error": "Quantity cannot be negative" }
```

**Status codes:** 200 OK · 201 Created · 400 Bad input · 401 Not logged in · 403 Not allowed · 404 Not found · 500 Server error

## 7. External APIs — Code Examples

> Node 18+ mein `fetch` built-in hai. Endpoints ko coding se pehle browser mein ek baar test zaroor karo.

```js
// routes/external.js
const router = require('express').Router();

// 1) openFDA — drug info
router.get('/drug-info', async (req, res) => {
  try {
    const name = encodeURIComponent(req.query.name);
    const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${name}"+openfda.generic_name:"${name}"&limit=1`;
    const r = await fetch(url);
    if (!r.ok) return res.json({ success: true, data: null, message: 'No info found' });
    const j = await r.json();
    const d = j.results?.[0] || {};
    res.json({ success: true, data: {
      purpose: d.purpose?.[0] || d.indications_and_usage?.[0]?.slice(0, 300),
      warnings: d.warnings?.[0]?.slice(0, 300),
      genericName: d.openfda?.generic_name?.[0],
      manufacturer: d.openfda?.manufacturer_name?.[0],
    }});
  } catch { res.json({ success: true, data: null, message: 'Info unavailable' }); }
});

// 2) RxNav — name suggestions
router.get('/suggest', async (req, res) => {
  try {
    const r = await fetch(`https://rxnav.nlm.nih.gov/REST/spellingsuggestions.json?name=${encodeURIComponent(req.query.name)}`);
    const j = await r.json();
    res.json({ success: true, data: j.suggestionGroup?.suggestionList?.suggestion || [] });
  } catch { res.json({ success: true, data: [] }); }
});

// 3) Exchange rates
router.get('/rates', async (req, res) => {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    const j = await r.json();
    res.json({ success: true, data: { USD_PKR: j.rates?.PKR, updated: j.time_last_update_utc } });
  } catch { res.json({ success: true, data: null }); }
});

module.exports = router;
```

QR code (frontend par direct): `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=<id>-<batchNo>`

## 8. Authentication & Security

**Register:**
```js
const bcrypt = require('bcryptjs');
const passwordHash = await bcrypt.hash(password, 10);
```
**Login:**
```js
const ok = await bcrypt.compare(password, user.passwordHash);
const token = jwt.sign({ id: user.id, role: user.role, name: user.name },
                       process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
```
**Middleware (`middleware/auth.js`):**
```js
const jwt = require('jsonwebtoken');
exports.protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'Login required' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
};
exports.adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ success: false, error: 'Admin only' });
```

**Security checklist**
- [ ] Password kabhi plain text mein save nahi
- [ ] `.env` ko `.gitignore` mein daalo (GitHub par mat jaye)
- [ ] `helmet()` aur `cors()` lagao
- [ ] Har input validate karo (negative quantity, khaali naam, galat date)
- [ ] `passwordHash` kabhi response mein mat bhejo
- [ ] Expired medicine ka sale server par bhi block karo (sirf frontend par nahi)

## 9. `server.js` Skeleton

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { loadAll } = require('./services/store');

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

loadAll();                                   // snapshot se lists wapas banao

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/sales',     require('./routes/sales'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/external',  require('./routes/external'));
app.use('/api/activity',  require('./routes/activity'));
app.use('/api/linkedlist',require('./routes/linkedlist'));

app.use(express.static(path.join(__dirname, '../frontend')));   // frontend serve

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'Server error' });
});

app.listen(process.env.PORT || 5000, () => console.log('PharmaLink running'));
```

## 10. Business Logic Notes

- **Status nikalna:**
  - `quantity === 0` → Out of stock
  - `quantity <= reorderLevel` → Low
  - `expiryDate < today` → Expired
  - `expiryDate - today <= 30 din` → Expiring soon
- **Sale complete hone par:** har item ke liye `findById` → stock check → `updateById` (quantity minus) → sale `insertAtHead` → activity log → snapshot save.
- **First run par:** agar users list khaali ho to demo admin account seed karo.

## 11. Testing Checklist

- [ ] Head, middle, tail par delete theek chal raha hai
- [ ] Khaali list par delete / search crash nahi karta
- [ ] Duplicate batch number par warning
- [ ] Bina token ke protected route 401 deta hai
- [ ] Pharmacist delete try kare to 403
- [ ] Server restart ke baad data wapas aata hai
- [ ] External API band ho to app crash nahi hoti
