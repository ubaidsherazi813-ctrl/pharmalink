# 🎨 UI/UX Guide — PharmaLink

**Rule #1:** Background hamesha **white**. Baki saare text, icons aur rang white ke upar saaf nazar aane chahiye.
**Rule #2:** Multiple rang use karne hain, lekin har rang ka ek matlab ho (sirf sajawat nahi).

---

## 1. Design Personality

Clean · Trustworthy (health ka kaam hai) · Friendly · Modern. Zyada bhaari ya darawni medical look nahi, halka aur rangeen.

## 2. Color Palette

### Brand & Semantic Colors

| Naam | Hex | Kahan use hoga |
|---|---|---|
| 🔵 **Primary Blue** | `#2563EB` | Main buttons, links, active menu, Total Medicines card |
| 🟣 **Purple** | `#7C3AED` | Expiring-soon, highlights, charts, gradient |
| 🟢 **Success Green** | `#16A34A` | In stock, success toast, stock value card |
| 🟠 **Warning Amber** | `#F59E0B` | Low stock, warnings |
| 🔴 **Danger Red** | `#DC2626` | Expired, delete, errors |
| 🔷 **Cyan** | `#0891B2` | Sales / info cards |
| 🩷 **Pink** | `#DB2777` | Chart accent |

### Neutral Colors (white background ke liye)

| Naam | Hex | Use |
|---|---|---|
| **Background** | `#FFFFFF` | Page ka main background |
| **Surface** | `#F8FAFC` | Sidebar, table header, input background |
| **Border** | `#E2E8F0` | Lines, card borders |
| **Text Primary** | `#0F172A` | Headings, main text |
| **Text Secondary** | `#475569` | Labels, descriptions |
| **Text Muted** | `#94A3B8` | Placeholder (sirf placeholder ke liye) |

### Light Tints (badges aur card backgrounds ke liye)

| Rang | Tint (background) | Text |
|---|---|---|
| Blue | `#EFF6FF` | `#1D4ED8` |
| Green | `#F0FDF4` | `#15803D` |
| Amber | `#FFFBEB` | `#92400E` |
| Red | `#FEF2F2` | `#B91C1C` |
| Purple | `#F5F3FF` | `#6D28D9` |
| Cyan | `#ECFEFF` | `#0E7490` |

> ⚠️ **Contrast ka khayal:** Amber (`#F59E0B`) ko white par text ke taur par mat use karo, parhna mushkil hota hai. Amber sirf icon / border / chart ke liye. Text ke liye dark amber `#92400E` use karo (upar table mein).

### Gradient (login panel, hero)
```css
background: linear-gradient(135deg, #2563EB 0%, #7C3AED 100%);
```

## 3. CSS Variables (copy-paste ready)

```css
/* css/variables.css */
:root {
  /* Brand */
  --blue: #2563EB;   --blue-tint: #EFF6FF;   --blue-text: #1D4ED8;
  --purple: #7C3AED; --purple-tint: #F5F3FF; --purple-text: #6D28D9;
  --green: #16A34A;  --green-tint: #F0FDF4;  --green-text: #15803D;
  --amber: #F59E0B;  --amber-tint: #FFFBEB;  --amber-text: #92400E;
  --red: #DC2626;    --red-tint: #FEF2F2;    --red-text: #B91C1C;
  --cyan: #0891B2;   --cyan-tint: #ECFEFF;   --cyan-text: #0E7490;
  --pink: #DB2777;

  /* Neutrals */
  --bg: #FFFFFF;
  --surface: #F8FAFC;
  --border: #E2E8F0;
  --text: #0F172A;
  --text-2: #475569;
  --text-muted: #94A3B8;

  /* Shape & depth */
  --radius-sm: 8px;
  --radius: 12px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, .06);
  --shadow: 0 4px 12px rgba(15, 23, 42, .08);
  --shadow-lg: 0 12px 32px rgba(15, 23, 42, .12);

  /* Spacing (8px grid) */
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px; --s6: 32px; --s7: 48px;

  /* Font */
  --font: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
}
```

## 4. Typography

**Font:** Inter (Google Fonts) ya fallback system font.
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

| Use | Size | Weight |
|---|---|---|
| Page title (H1) | 28px | 700 |
| Section title (H2) | 20px | 600 |
| Card title (H3) | 16px | 600 |
| Body | 14–16px | 400 |
| Label / small | 12–13px | 500 |
| KPI number | 32px | 700 |

Line height: 1.5 (body), 1.2 (headings). Body text kabhi 14px se chhota nahi.

## 5. Components

### Buttons
| Type | Look | Use |
|---|---|---|
| Primary | Blue background, white text | Save, Login, Add |
| Success | Green background, white text | Complete Sale |
| Danger | Red background, white text | Delete |
| Outline | White bg, blue border + text | Cancel, secondary |
| Ghost | Transparent, grey text | Toolbar actions |

States: hover (thora dark), active (aur dark), focus (3px blue outline ring), disabled (50% opacity + not-allowed cursor).
Size: height 40px (desktop), 44px (mobile, touch ke liye).

### KPI Card
```
┌──────────────────────┐
│ 🔵 icon (tint circle)│
│ Total Medicines      │  ← Text Secondary
│ 248                  │  ← 32px bold
│ +12 is hafte         │  ← small, green
└──────────────────────┘
```
White card, 1px border, `--radius`, `--shadow-sm`, upar 4px rangeen strip (har card ka apna rang).

| KPI | Rang |
|---|---|
| Total Medicines | Blue |
| Stock Value | Green |
| Low Stock | Amber |
| Expiring Soon | Purple |
| Expired | Red |
| Today's Sales | Cyan |

### Status Badges
Pill shape, tint background + dark text + chhota dot:
`● In Stock` (green) · `● Low` (amber) · `● Expiring` (purple) · `● Expired` (red)

### Inputs
Height 40px, border `--border`, radius 8px, focus par blue border + halka blue glow. Error par red border + neeche red text message. Hamesha upar label.

### Table
Header: `--surface` background, uppercase 12px muted text. Rows: white, hover par `#F8FAFC`, row ke beech 1px border. Actions icons right side.

### Modal
Center mein, white, `--radius-lg`, `--shadow-lg`, peeche halka dark overlay (`rgba(15,23,42,.5)`). Esc dabane ya bahar click se band.

### Toast
Top-right, 3 second, left par rangeen border + icon: success green, error red, warning amber, info blue.

### Sidebar
`--surface` background. Active item: blue tint background + blue text + left 3px blue bar. Har item ke saath icon.

## 6. Screen Wireframes

### Login
```
┌───────────────────────┬────────────────────────┐
│  [Blue→Purple gradient]│   💊 PharmaLink        │
│                       │   Welcome back 👋       │
│   Smart Pharmacy      │   ┌──────────────────┐ │
│   Inventory           │   │ Email            │ │
│                       │   └──────────────────┘ │
│   ✔ Stock alerts      │   ┌──────────────┬───┐ │
│   ✔ Fast billing      │   │ Password     │ 👁│ │
│   ✔ Live charts       │   └──────────────┴───┘ │
│                       │   [      Login       ] │
│                       │   Register karo →      │
└───────────────────────┴────────────────────────┘
```

### Dashboard
```
[KPI][KPI][KPI][KPI][KPI][KPI]
[ Category Donut ][ Sales Line   ]
[ Expiry Bars    ][ Top Sellers  ]
[ Alerts panel   ][ Recent Activity ]
```

### Medicines
```
Medicines                         [+ Add Medicine]
[🔍 Search...] [Category ▾] [Status ▾] [Sort ▾] [⬇ CSV]
┌──────────────────────────────────────────────────┐
│ NAME     CATEGORY  BATCH  QTY  PRICE  EXPIRY STATUS│
│ Panadol  Tablet    B-12   120  PKR 20 12/2027 ●In  │
│ ...                                                │
└──────────────────────────────────────────────────┘
                              ‹ 1 2 3 ›
```

## 7. UX Rules

1. **Feedback hamesha:** Har action ke baad toast ya visible badlav.
2. **Destructive action par confirm:** Delete se pehle "Pakka delete karna hai?"
3. **Khaali state:** Illustration + "Abhi koi medicine nahi, pehli add karo" + button.
4. **Loading state:** Table ke liye skeleton rows, button ke liye spinner.
5. **Error messages saaf aur madadgar:** "Quantity 0 se zyada honi chahiye" (sirf "Invalid" nahi).
6. **Kam clicks:** Dashboard se hi Add Medicine / New Sale ho sake.
7. **Consistency:** Har page par button, spacing aur rang same rules follow karein.
8. **Rang akela matlab na de:** Badge mein hamesha text bhi ho (colour-blind users ke liye).

## 8. Accessibility Checklist

- [ ] Text contrast kam az kam 4.5:1 (body), 3:1 (bara text)
- [ ] Keyboard se poori app chale (Tab, Enter, Esc)
- [ ] Focus ring nazar aaye (hata mat dena)
- [ ] Icons ke saath `aria-label` ya text
- [ ] Har input ka `<label>`
- [ ] Images / charts ke liye alt text ya summary
- [ ] Touch targets kam az kam 44×44px

## 9. Animations (halki, 150–300ms)

- Button hover: rang change + `translateY(-1px)`
- Modal: fade + halka scale-up
- Toast: right se slide-in
- Cards: page load par halka fade-in
- Visualizer: node highlight pulse
- `prefers-reduced-motion` par animations band

```css
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
```

## 10. Breakpoints

```css
/* Mobile first */
@media (min-width: 768px)  { /* tablet */ }
@media (min-width: 1024px) { /* desktop */ }
@media (min-width: 1280px) { /* wide */ }
```

## 11. Icons

Emoji se shuru kar sakte ho (jaldi), behtar look ke liye **Lucide** ya **Font Awesome** (CDN, pinned version). Sab icons ek hi style ke rakho.

## 12. Final Polish Checklist

- [ ] Saare pages par same navbar + sidebar
- [ ] White background har jagah, koi page "alag" nahi lagta
- [ ] Har rang ka matlab consistent (red = khatra, green = theek, amber = dhyan, purple = expiry)
- [ ] Mobile par test kiya
- [ ] Spelling aur language ek jaisi (English UI, ya Roman Urdu, mix nahi)
- [ ] Demo data achha laga hua (kam az kam 15–20 medicines, alag alag categories aur expiry)
