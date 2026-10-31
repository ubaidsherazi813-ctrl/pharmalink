# 📋 PRD — PharmaLink (Product Requirements Document)

**Version:** 1.0  **Date:** 29 October 2026  **Due:** 11 November 2026

---

## 1. Problem Statement

Chhote aur medium pharmacies mein inventory aksar copy ya Excel mein hoti hai. Isse ye masle aate hain:

- Expired medicine ghalti se bik jati hai
- Stock khatam hone ka pata late chalta hai
- Hisaab kitab aur sales ka record manually banta hai
- Supplier ko order dene mein time lagta hai

## 2. Goal

Ek aasaan, tez aur khoobsurat web app banana jo medicine inventory ko **linked list data structure** se manage kare aur pharmacist ko alerts, billing aur reports de.

### Success Criteria
1. Saare CRUD operations linked list methods se chalte hain.
2. Login ke baad dashboard par live stats nazar aate hain.
3. Kam az kam 3 external APIs kaam karti hain.
4. Project GitHub par, report Classroom par, video G-Drive par.

## 3. Users (Personas)

| Persona | Kaun hai | Kya chahta hai |
|---|---|---|
| **Admin (Owner)** | Pharmacy ka malik | Poora control, reports, users manage karna |
| **Pharmacist** | Counter par kaam karne wala | Tez billing, stock check, alerts |

## 4. Scope

### ✅ In Scope (MVP — zaroor banana hai)
- Login / Register / Logout
- Dashboard
- Medicines CRUD + search + sort + filter
- Low stock + expiry alerts
- Linked List Visualizer
- Basic billing

### ⭐ Should Have (time ho to)
- Suppliers + WhatsApp reorder
- CSV export
- External APIs (drug info, suggestions, QR, currency)
- Activity log

### 🚀 Future Ideas
- Barcode scanner (camera se)
- Email / SMS alerts
- Urdu language support
- Multi-branch support
- PWA (mobile par install)

## 5. Feature Details

### 5.1 Authentication
- Register: name, email, password (min 8 chars, ek number + ek capital)
- Login: email + password → JWT token
- Roles: `admin`, `pharmacist`
- Admin ke paas extra: medicine delete, users dekhna, activity log poora
- Logout: token clear

**User Stories**
- Main as a pharmacist login karna chahta hon taake mera data secure rahe.
- Main as an admin naye staff ko role dena chahta hon.

### 5.2 Dashboard
**KPI Cards (rang ke saath):**

| Card | Value | Rang |
|---|---|---|
| Total Medicines | count | 🔵 Blue |
| Total Stock Value | PKR | 🟢 Green |
| Low Stock Items | count | 🟠 Amber |
| Expiring Soon (30 din) | count | 🟣 Purple |
| Expired | count | 🔴 Red |
| Today's Sales | PKR | 🔷 Cyan |

**Charts (Chart.js):**
1. Category-wise stock (Doughnut)
2. Last 7 din ki sales (Line)
3. Expiry timeline: 0–30, 31–60, 61–90 din (Bar)
4. Top 5 selling medicines (Horizontal bar)

**Widgets:** Recent activity, Alerts panel, Quick actions (Add Medicine, New Sale).

### 5.3 Medicines Management (CRUD)

| Field | Type | Rules |
|---|---|---|
| id | auto | unique, auto-generated |
| name | text | required |
| genericName | text | optional |
| category | dropdown | Tablet, Syrup, Injection, Capsule, Ointment, Drops, Other |
| batchNo | text | required |
| manufacturer | text | optional |
| supplierId | link | optional |
| quantity | number | ≥ 0 |
| reorderLevel | number | default 10 |
| purchasePrice | number | > 0 |
| salePrice | number | > purchasePrice (warning, block nahi) |
| expiryDate | date | required |

- **Create:** form (modal) → `insertAtTail`
- **Read:** table + card view, pagination, search by name / generic / batch
- **Update:** edit modal → `updateById`
- **Delete:** confirm dialog → `deleteById` (sirf admin)
- **Sort:** name, quantity, expiry, price (merge sort on linked list)
- **Filter:** category, status (In stock / Low / Expired)

### 5.4 Smart Alerts
- **Low stock:** `quantity <= reorderLevel` → amber badge
- **Out of stock:** `quantity == 0` → red badge
- **Expiring soon:** expiry 30 din ke andar → purple badge
- **Expired:** aaj se pehle → red badge, billing mein block
- Navbar mein 🔔 bell icon with count

### 5.5 Billing / POS
1. Medicine search karo → cart mein add
2. Quantity badlo, discount % lagao
3. "Complete Sale" → stock automatically kam, sale list ke head par insert
4. Invoice print / PDF (browser print)

Rules: expired medicine nahi bik sakti; stock se zyada quantity nahi.

### 5.6 Suppliers
- Supplier CRUD (name, phone, email, address)
- "Reorder" button → WhatsApp link `https://wa.me/<number>?text=<message>` jisme medicine ka naam aur quantity pehle se likhi hoti hai

### 5.7 External API Integrations

| # | API | Kaam | Key chahiye? |
|---|---|---|---|
| 1 | **openFDA Drug Label** | Medicine ki info: use, warnings, generic name | Nahi (free) |
| 2 | **RxNav (NIH)** | Medicine name autocomplete / spelling suggestions | Nahi |
| 3 | **ExchangeRate API** (open.er-api.com) | USD/EUR → PKR rates (imported medicine ki price) | Nahi |
| 4 | **QR Server API** (api.qrserver.com) | Har medicine ka QR code (batch + id) | Nahi |
| 5 | **WhatsApp click-to-chat** (wa.me) | Supplier ko reorder message | Nahi |
| 6 | *(Optional)* **EmailJS** | Low-stock email alerts | Haan (free key) |

> Zaroori: coding se pehle har API ka endpoint ek baar browser mein test kar lo, kyun ke free APIs kabhi kabhi badal jati hain. Agar API down ho to app crash na ho, sirf "Info unavailable" dikhaye.

### 5.8 Linked List Visualizer (DSA ka showpiece)
- Medicines list ko boxes aur arrows ke taur par dikhana: `[HEAD] → [Panadol] → [Brufen] → ... → NULL`
- Insert / delete / search karte waqt node highlight hota hai (animation)
- Side panel: "Operation: deleteById, Time: O(n), Steps: 4"
- Video demo mein ye teacher ko sabse zyada impress karega

### 5.9 Activity Log
Har action (login, add, edit, delete, sale) ek `Activity` node ban kar log list ke head par jata hai. Admin dekh sakta hai kisne kya kiya.

### 5.10 Export
- Medicines CSV download
- CSV import (bulk add)

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Page 2 second ke andar load, 1000 medicines tak smooth |
| Security | Password hashing (bcrypt), JWT, input validation, `.env` mein secrets |
| Usability | Saari screens mobile par bhi chalein |
| Reliability | Server restart par data JSON snapshot se wapas aaye |
| Accessibility | Rang ke saath text/icon bhi, achha contrast |
| Code Quality | Comments, alag files, meaningful naam |

## 7. Roadmap (13 din: 29 Oct → 11 Nov)

| Din | Kaam |
|---|---|
| 1–2 | Linked list class + tests, backend setup |
| 3–4 | Auth + Medicines CRUD APIs |
| 5–6 | Frontend: login, layout, medicines page |
| 7 | Dashboard + charts |
| 8 | Alerts + Billing |
| 9 | External APIs + Visualizer |
| 10 | Suppliers, export, polish |
| 11 | Screenshots + GitHub upload |
| 12 | Word report likhna |
| 13 | Video record + final check + submit |

> Tip: Din 11 se pehle submit-ready MVP rakho. Extra features baad mein.

## 8. Mapping to Lab Rubrics

| Rubric | Kaise cover hoga |
|---|---|
| Background Knowledge | Linked list theory, complexity table, visualizer |
| Tools Selection | Node.js, Express, Chart.js, reasoning "kyun" ke saath report mein |
| Analysis & Results | Har CRUD ke screenshots, dashboard stats, complexity analysis |
| Conclusions | Linked list ke fayde / nuqsan, future work (upar wali list) |
| Report Writing | Saaf headings, screenshots, GitHub + video links |

## 9. Risks

| Risk | Solution |
|---|---|
| Time kam | MVP pehle, extras baad mein |
| API down | Try/catch + fallback message |
| Restart par data khatam | JSON snapshot save/load |
| Linked list ka role chhupna | Visualizer + report mein clear explanation |
