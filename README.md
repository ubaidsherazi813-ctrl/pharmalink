# 💊 PharmaPulse™ PRO — Enterprise Pharmacy Operating System
### *(Powered by PharmaLink Pure Linked-List DSA Engine)*

> **Course:** SW 212 – Data Structures & Algorithms (Open-Ended Lab)  
> **Data Structure:** Singly Linked List with Head & Tail Pointers (Group A Specification)  
> **Stack:** HTML5 · CSS3 · Vanilla Modern JavaScript · Node.js · Express · Chart.js · openFDA API · open.er-api · QR Server API  
> **Storage:** In-Memory Linked Lists with Atomic JSON Backup Snapshot (**Zero SQL / NoSQL Database**)  

---

## 1. What is PharmaPulse™ PRO?

**PharmaPulse™ PRO** is an enterprise-grade Pharmacy Management System (PMS) and Clinical Point of Sale (POS) engineered to automate retail and community pharmacy workflows:
- Dispensing medicines with automated batch and expiry controls.
- Live inventory tracking across physical **Racks & Shelves** (e.g., Rack A-01, Shelf S-02).
- Patient profiles, doctor prescriptions, and allergy warning sentinel.
- Real-time 80mm thermal receipt generation with DRAP verification QR codes.
- 1-click WhatsApp restock dispatch directly to wholesale distributors.
- Live currency and landed import pricing calculator for life-saving imported drugs.
- Real-time openFDA drug indications, precautions, and boxed warnings.
- **Academic DSA Telemetry & Live Node Visualizer** demonstrating Big-O time and space complexity.

All application records live directly inside **Singly Linked Lists** in Node.js server RAM.

---

## 2. Market Research & Professional Capabilities

| Feature Area | Market Software (Marg ERP / PioneerRx) | PharmaPulse™ PRO Implementation |
|---|---|---|
| **Inventory Core** | SQL Database tables | **Pure Singly Linked List Nodes (O(1) insert, O(n) search)** |
| **Dispensing & POS** | Barcode / Counter billing | **Instant Cart with Rack Location & 80mm Thermal Receipt with QR** |
| **Physical Storage** | Rack / Bin locators | **`shelfLocation` tracking (Rack A-01, Drawer D-03, Cold Storage)** |
| **Patient Profiles** | Prescriptions & Allergies | **`LinkedList<Customer>` with allergy alerts & doctor tagging** |
| **Procurement** | Purchase Orders | **1-click WhatsApp procurement with pre-drafted supplier messages** |
| **Clinical Safety** | Drug monographs | **Live openFDA proxy: active ingredients, indications & boxed warnings** |
| **Financial / FX** | Currency conversions | **Live exchange rates (USD/PKR) + landed margin calculator** |
| **DSA Visualizer** | N/A (Proprietary closed source) | **Live node animator, pointer swap visualization & complexity telemetry** |

---

## 3. Architecture & Data Structures

```
Browser Client (Frontend)
    │   fetch() + JWT Token
    ▼
Express REST API Server (port 5000)
    │
    ├── Auth & Middleware (Helmet, CORS, Rate-limiter)
    │
    ▼
In-Memory Store (DSA Data Engine)
    ├── store.medicines  ──► LinkedList<Medicine> (Merge Sort O(n log n))
    ├── store.customers  ──► LinkedList<Customer> (Patients & Rx)
    ├── store.sales      ──► LinkedList<Sale>     (Head insertion O(1))
    ├── store.suppliers  ──► LinkedList<Supplier>
    ├── store.users      ──► LinkedList<User>
    └── store.activity   ──► LinkedList<Activity> (Audit Trail)
            │
            └── Atomic JSON Persistence ──► backend/data/*.json (Auto-sync)
```

---

## 4. Quick Start (Run Locally)

### Prerequisites
- Node.js (v18, v20, v22, or v24)
- npm (installed with Node)

### Step 1: Install Dependencies
```bash
cd backend
npm install
```

### Step 2: Configure Environment
A default `.env` is already configured:
```env
PORT=5000
JWT_SECRET=pharmapulse_secure_jwt_secret_dsa_2026_key
JWT_EXPIRES_IN=1d
```

### Step 3: Run the Application
```bash
# Production mode:
npm start

# Development mode (auto-reload on save):
npm run dev
```

### Step 4: Access in Browser
Open: **`http://localhost:5000`**

### Demo Login Accounts
- **Admin Email:** `admin@pharmalink.com`
- **Password:** `Admin@123`

---

## 5. Live Cloud Deployment Guide

PharmaPulse PRO is pre-configured to be deployed as a single fullstack service on **Render**, **Railway**, **Fly.io**, or **Heroku**:

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of PharmaPulse PRO"
   git remote add origin https://github.com/YOUR_USERNAME/pharmapulse-pro.git
   git push -u origin main
   ```
2. **Deploy on Render (Free)**:
   - Go to [Render.com](https://render.com) and create a **New Web Service**.
   - Connect your GitHub repository.
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `PORT`: `5000`
     - `JWT_SECRET`: `your_random_jwt_secret`
3. Click **Deploy Service**. Your pharmacy system is now live worldwide!
