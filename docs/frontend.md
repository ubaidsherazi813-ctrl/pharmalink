# 🖥️ Frontend Guide — PharmaLink

**Stack:** HTML5 · CSS3 · Vanilla JavaScript (ES Modules) · Chart.js (CDN) · Google Fonts
**Koi framework nahi** (React/Vue ki zaroorat nahi), taake code simple rahe aur video mein explain karna asaan ho.

Design ke rang aur layout ke liye dekho: [`ui-ux.md`](./ui-ux.md)

---

## 1. Folder Structure

```
frontend/
├── login.html
├── dashboard.html
├── medicines.html
├── billing.html
├── suppliers.html
├── visualizer.html
├── css/
│   ├── variables.css     (rang, fonts, spacing)
│   └── style.css         (base, layout, components, pages)
└── js/
    ├── common.js         (api wrapper, auth guard, toast, modal, sidebar/topbar layout)
    ├── login.js, dashboard.js, medicines.js, billing.js, suppliers.js, visualizer.js
    └── vendor/chart.umd.js   (Chart.js 4.4.1, local copy)

## 2. Pages

| Page | File | Access | Kaam |
|---|---|---|---|
| Login / Register | `login.html` | Public | Authentication |
| Dashboard | `dashboard.html` | Login | Stats, charts, alerts |
| Medicines | `medicines.html` | Login | CRUD table |
| Billing | `billing.html` | Login | POS + invoice |
| Suppliers | `suppliers.html` | Login | Supplier list + reorder |
| Visualizer | `visualizer.html` | Login | Linked list ki drawing |

## 3. Shared Layout (har page par same)

```
┌──────────────────────────────────────────────────────┐
│ ☰  PharmaLink            🔍 Search     🔔(3)  👤 Ubaid ▾│  ← Top navbar
├────────────┬─────────────────────────────────────────┤
│ 📊 Dashboard│                                         │
│ 💊 Medicines│          Page content                   │
│ 🧾 Billing  │                                         │
│ 🏭 Suppliers│                                         │
│ 🔗 Visualizer│                                        │
│ ⚙ Logout   │                                         │
└────────────┴─────────────────────────────────────────┘
        ↑ Sidebar (mobile par hamburger se khulta hai)
```

## 4. Core JavaScript Files

### `js/api.js` — saari API calls ek jagah
```js
const BASE = '/api';

export function getToken() { return localStorage.getItem('pl_token'); }

export async function api(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401) { localStorage.clear(); location.href = '/login.html'; return; }
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Something went wrong');
  return json;
}
```

### `js/auth.js` — route guard
```js
export function requireLogin() {
  if (!localStorage.getItem('pl_token')) location.href = '/login.html';
}
export function currentUser() {
  return JSON.parse(localStorage.getItem('pl_user') || 'null');
}
export function logout() { localStorage.clear(); location.href = '/login.html'; }
```
Har protected page ki pehli line: `requireLogin();`

### `js/ui.js` — helpers
- `toast(message, type)` → success (green), error (red), warning (amber)
- `openModal(id)` / `closeModal(id)`
- `showLoader()` / `hideLoader()`
- `confirmDialog(text)` → delete se pehle puchna

## 5. Page Details

### 5.1 Login Page (`login.html`)

**Layout:** Do hisse. Left mein rangeen illustration/gradient panel (branding), right mein white card form.

```
┌─────────────────────┬──────────────────────┐
│  💊 PharmaLink      │   Welcome back 👋     │
│  Smart pharmacy     │   Email    [________] │
│  inventory manager  │   Password [____ 👁]  │
│                     │   [ Login  ]          │
│  (blue→purple       │   ──── ya ────        │
│   gradient)         │   Account nahi hai?   │
│                     │   Register karo       │
└─────────────────────┴──────────────────────┘
```

**Elements & behaviour**
- Email + password fields, password show/hide button
- Login / Register tabs (ek hi page par)
- Validation: email format, password min 8 chars, inline error text
- Button par loading spinner jab tak request chal rahi ho
- Success par token + user `localStorage` mein, phir `dashboard.html`
- Error par red toast: "Email ya password galat hai"

### 5.2 Dashboard (`dashboard.html`)

**Upar:** 6 KPI cards (rang `ui-ux.md` mein), `GET /api/medicines/stats`
**Beech mein:** 2×2 charts grid
1. Doughnut: category-wise stock
2. Line: last 7 din ki sales (`GET /api/sales/summary`)
3. Bar: expiry buckets (0–30 / 31–60 / 61–90)
4. Horizontal bar: top 5 selling

**Neeche:** Alerts panel (`GET /api/medicines/alerts`), Recent activity, Quick action buttons

```js
// Chart.js example
new Chart(document.getElementById('categoryChart'), {
  type: 'doughnut',
  data: {
    labels: Object.keys(stats.byCategory),
    datasets: [{ data: Object.values(stats.byCategory),
      backgroundColor: ['#2563EB','#16A34A','#F59E0B','#7C3AED','#0891B2','#DB2777','#64748B'] }]
  }
});
```
Chart.js ki local copy: `<script src="js/vendor/chart.umd.js"></script>` (internet ki zaroorat nahi)

### 5.3 Medicines Page (`medicines.html`)

**Toolbar:** Search box · Category dropdown · Status dropdown · Sort dropdown · `+ Add Medicine` button · Export CSV
**Table columns:** Name · Category · Batch · Qty · Price · Expiry · Status badge · Actions (👁 ✏️ 🗑)
**Status badges:** In Stock (green) · Low (amber) · Expired (red) · Expiring (purple)
**Pagination:** 10 rows per page

**Add / Edit Modal fields:** Name (with RxNav suggestions dropdown) · Generic name · Category · Batch · Manufacturer · Supplier · Quantity · Reorder level · Purchase price · Sale price · Expiry date

**Flow**
1. `+ Add Medicine` → modal khulta hai
2. Name likhte hi 400ms debounce ke baad `/external/suggest` se suggestions
3. Save → `POST /api/medicines` → table refresh → green toast
4. Edit → same modal pre-filled → `PUT`
5. Delete → confirm dialog → `DELETE` (pharmacist ko button hi nahi dikhega)
6. 👁 View → detail drawer: sari info + **openFDA drug info** + **QR code**

**Debounce helper**
```js
function debounce(fn, ms = 400) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
```

### 5.4 Billing Page (`billing.html`)

```
┌───────────────────────────┬──────────────────────┐
│ 🔍 Medicine search        │  🛒 Cart             │
│ ┌──────┐ ┌──────┐         │  Panadol  x2  PKR 40 │
│ │Card  │ │Card  │ ...     │  Brufen   x1  PKR 60 │
│ │+ Add │ │+ Add │         │  ────────────────    │
│ └──────┘ └──────┘         │  Discount [ 5 ]%     │
│                           │  Total: PKR 95       │
│                           │  [ Complete Sale ]   │
└───────────────────────────┴──────────────────────┘
```
- Expired / out-of-stock cards disabled (grey)
- Quantity stock se zyada nahi ja sakti
- Sale ke baad invoice modal → `window.print()` button

### 5.5 Suppliers Page
- Cards ya table: naam, phone, email
- Add / Edit / Delete modal
- **Reorder button:**
```js
const msg = encodeURIComponent(`Assalam o Alaikum, mujhe ${med.name} ke ${qty} units chahiye. Shukriya.`);
window.open(`https://wa.me/${supplier.phone}?text=${msg}`, '_blank');
```
(phone international format mein, jaise `923001234567`)

### 5.6 Linked List Visualizer (`visualizer.html`)

**Dikhana kya hai:**
```
HEAD → [ Panadol | • ]→[ Brufen | • ]→[ Augmentin | • ]→ NULL
                                                    ↑ TAIL
```
- Har node ek rangeen box: left mein data (naam), right mein pointer dot
- Arrows CSS / inline SVG se
- Controls: `Insert at Head`, `Insert at Tail`, `Search`, `Delete`, `Reverse`, `Sort`
- Operation chalne par node **highlight** hota hai (amber) aur step-by-step animation (500ms delay)
- Side panel: **Operation naam, steps count, time complexity** (jaise "deleteById → O(n)")
- Data `GET /api/linkedlist/state` se aata hai

> Video demo mein pehle yahan se explain karo ke linked list kya hai, phir dikhao ke asli medicines isi mein hain.

## 6. Reusable Components

| Component | Use |
|---|---|
| `.btn` (primary / success / danger / outline) | Har jagah buttons |
| `.card` | KPI aur content boxes |
| `.badge` (green / amber / red / purple) | Status |
| `.modal` | Forms |
| `.table` | Data tables (hover row, zebra optional) |
| `.toast` | Notifications (top-right, 3 sec) |
| `.spinner` | Loading |
| `.empty-state` | "Koi medicine nahi mili" + icon |

## 7. Responsive Rules

| Screen | Behaviour |
|---|---|
| Desktop ≥ 1024px | Sidebar fixed, 3–4 card columns |
| Tablet 768–1023px | Sidebar collapse hota hai, 2 columns |
| Mobile < 768px | Hamburger menu, 1 column, table horizontally scroll |

## 8. Frontend Best Practices

- [ ] Har async call par try/catch aur loader
- [ ] User ka diya text `innerHTML` mein mat daalo (XSS). `textContent` use karo ya escape karo
- [ ] Buttons par disabled state jab request chal rahi ho (double submit se bachao)
- [ ] Har form field ka `<label>` ho
- [ ] Empty aur error states design karo, sirf khushi wala raasta nahi
- [ ] Console mein errors zero hon (demo se pehle check)

## 9. Build Order (suggested)

1. `variables.css` + `base.css` + `components.css`
2. `login.html` + `auth.js` + `api.js`
3. Shared layout (sidebar + navbar)
4. `medicines.html` (sabse zaroori)
5. `dashboard.html`
6. `billing.html`
7. `visualizer.html`
8. `suppliers.html`
9. Polish: animations, empty states, mobile check
