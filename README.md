# ⚡ CleanMax Procurement & Operations Dashboard

A enterprise-grade, high-performance web dashboard built for **CleanMax** to streamline O&M vendor management, solar plant capacity tracking, contract renewal lifecycles, regional geographical mapping, and procurement analytics.

---

## 📌 Executive Summary

The **CleanMax Dashboard** provides a centralized, real-time command center for managing solar energy projects, O&M vendors, purchase orders (POs), contract rates, and geographical plant assets across India. 

Designed with modern aesthetics, real-time database synchronization, client-side Excel processing, and custom mapping, this application enables procurement and operations teams to monitor contract expirations proactively, track rate history, and prevent site operational disruptions.

---

## ⭐ Core Features & Capabilities

### 1. 📊 Executive Analytics & Key Metrics (`Analytics.jsx`)
* **Live KPI Counters:** Total active vendors, total plant capacity (in MWp / kWp), total active PO value, and renewal alerts.
* **Interactive Data Visualizations:** Region-wise capacity distribution charts, vendor contract status breakdown (Active, Expiring Soon, Expired), rate trend analysis, and capacity-to-cost metrics.

### 2. 🗺️ Interactive Geographical Map (`RegionMap.jsx`)
* **Custom GeoJSON & TopoJSON Mapping:** Interactive map of India rendered using Leaflet and D3-Geo.
* **Regional & State Breakdown:** Seamless visualization of assets across **North, South, East, West, and Central** regions.
* **Interactive Markers & Clustering:** Marker clusters grouping plant sites with interactive popups displaying vendor names, capacities, PO numbers, and contract end dates.
* **Region Filtering:** Click on any region or state to instantly filter active plants and vendor contracts.

### 3. 🏭 Vendor & Contract Management (`Vendors.jsx`)
* **Master Vendor Directory:** Comprehensive table listing vendor codes, vendor names, plant names, PO numbers, PR numbers, rates, capacities, and contract dates.
* **Automated Expiry Status Calculation:** Auto-classifies contracts:
  * 🟢 **Active:** Expiry date is > 30 days away.
  * 🟡 **Expiring Soon:** Expiry date is within 30 days.
  * 🔴 **Expired:** Contract end date has passed.
* **Smart Search & Multi-Filter:** Filter by region, contract status, capacity unit (kWp/MWp), or search by vendor code / plant name.
* **Auto-Archiving Renewals:** Editing a vendor contract automatically creates a historical audit record in Contract History.

### 4. 🏗️ Solar Project Master (`Projects.jsx`)
* **Project Directory:** Track solar plants, client associations, plant capacities, and project status (`In Progress`, `Planning`, `Completed`).
* **Automated Vendor Matching:** Cross-references vendors with project sites to display active vendor coverage.

### 5. 🔄 Contract Renewals & Audit History (`Renewals.jsx`)
* **Historical Audit Logs:** Detailed log of all renewed contracts.
* **Rate & PO Comparison:** Compares previous PO rates vs. renewed PO rates, old PO numbers vs. new PO numbers, and previous contract terms vs. extended terms.
* **Renewal Export:** Export renewal audit trails directly to Excel/CSV for compliance and reporting.

### 6. 📥 Fast Client-Side Excel Import (`AddExcel.jsx`)
* **Drag-and-Drop Batch Upload:** Upload vendor/project Excel spreadsheets directly in the browser using `ExcelJS`.
* **Smart Data Validation:** Validates columns, parses dates in multiple formats (`DD/MM/YYYY`, `YYYY-MM-DD`), and normalizes regional names automatically.
* **In-Place Deduplication & Merging:** Merges incoming Excel data with existing database records seamlessly without creating duplicate entries.

### 7. 👥 User & Employee Management (`Employees.jsx`)
* **Role-Based Access Control (RBAC):** Supports `Admin`, `Procurement`, `Operations`, and `Viewer` roles.
* **Two-Factor Authentication (TOTP):** Built-in 2FA configuration support.
* **Directory Management:** Manage team members, departments, contact details, and system permissions.

### 8. ♻️ Soft-Delete Safety Net & Recycle Bin
* **Accidental Deletion Protection:** Deleted vendors or projects are moved to a soft-delete Recycle Bin.
* **Instant Restore:** One-click restoration of accidentally deleted records with complete audit logging.

---

## 🛠️ Technology Stack

| Layer | Technology Used | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** + **Vite 8** | Fast rendering, Hot Module Replacement (HMR) |
| **Styling & UI** | **Vanilla CSS + Glassmorphism** | Custom dark/light responsive design system |
| **Icons & Micro-UI** | **Lucide-React** | Modern vector icon library |
| **Mapping Engine** | **Leaflet** + **React-Leaflet** | Interactive vector mapping and cluster markers |
| **Data Visualization** | **Recharts** + **D3-Geo** | Responsive charts, pie diagrams, and geo-projections |
| **Excel Parser** | **ExcelJS** | High-speed, client-side spreadsheet import & export |
| **Database & Sync** | **Firebase Firestore** / **Custom REST API** | Real-time multi-user synchronization |
| **Routing & State** | **React Context API** (`ProcureContext`) | Centralized state management & data pipeline |

---

## 📁 Project Architecture & Directory Structure

```
cleanmax-dashboard/
├── .env.example             # Template for environment configuration
├── HANDOVER_DOCUMENT.md     # Detailed developer & IT handover guide
├── README.md                # Project documentation (this file)
├── schema.sql               # Ready-to-run SQL database schema script
├── index.html               # Main HTML entry point
├── package.json             # NPM dependencies & build scripts
├── vite.config.js           # Vite bundle optimizer & dynamic chunk splitter
│
├── public/                  # Public assets, GeoJSON maps & logos
│   └── india_states.json    # India states geographical TopoJSON/GeoJSON
│
└── src/
    ├── App.jsx              # Main App component with routing & navigation
    ├── firebase.js          # Firebase connection setup
    │
    ├── components/          # Reusable UI components
    │   ├── Header.jsx       # Top navigation header & user profile
    │   ├── Layout.jsx       # App sidebar & responsive shell layout
    │   └── IndiaMap.jsx     # Leaflet custom map component
    │
    ├── context/
    │   └── ProcureContext.jsx # Central state store, CRUD, & Excel merge logic
    │
    ├── utils/
    │   ├── constants.js     # Region normalizers, state lists, & conversions
    │   ├── notify.js        # Notification audio & toast trigger functions
    │   ├── seedData.js      # Fallback datasets, status formulas, & generators
    │   └── totp.js          # 2FA / TOTP authentication utilities
    │
    └── views/               # Page views & dashboards
        ├── AddExcel.jsx     # Excel upload & validation interface
        ├── Analytics.jsx    # Executive KPI dashboard & charts
        ├── Employees.jsx    # Team directory & RBAC permissions
        ├── Login.jsx        # Authentication & login screen
        ├── Projects.jsx     # Solar plant & project management
        ├── RegionMap.jsx    # Interactive regional map view
        ├── Renewals.jsx     # Contract renewal audit history
        ├── Settings.jsx     # System configuration & maintenance mode
        └── Vendors.jsx      # Master vendor & contract list
```

---

## 🗄️ Database Setup & IT Integration

The dashboard is designed with a **decoupled central data layer** inside `src/context/ProcureContext.jsx`.

### Option A: Using the Provided SQL Script (Internal Database)
If your IT team uses PostgreSQL, MySQL, SQL Server, or Oracle:
1. Open **`schema.sql`** in the project root.
2. Execute `schema.sql` in your SQL database manager to create the 5 core tables (`vendors`, `projects`, `users`, `archived_contracts`, `deleted_records`).
3. Follow the backend integration instructions in **`HANDOVER_DOCUMENT.md`**.

### Option B: Using Firebase Firestore
1. Copy `.env.example` to `.env`.
2. Fill in your Firebase API credentials (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, etc.).

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **NPM**: v9.0.0 or higher

### Installation Steps

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Akeel-guhagarkar/cleanmax-dashboard.git
   cd cleanmax-dashboard
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Start Local Development Server:**
   ```bash
   npm run dev
   ```
   *Open your browser and navigate to `http://localhost:5173`*

4. **Build for Production:**
   ```bash
   npm run build
   ```
   *The optimized production files will be generated in the `dist/` folder.*

5. **Deploy to GitHub Pages:**
   ```bash
   npm run deploy
   ```

---

## 🔒 Security & Best Practices

* **Environment Variables:** Credentials and backend URLs are managed via `.env` files.
* **Audit Logging:** Soft deletions and contract renewals record the timestamp, user ID, and user role.
* **Client-Side Data Protection:** Input strings, vendor names, and Excel uploads are cleaned and validated to prevent injection or corruption.

---

## 🌐 Live Demo & Repository Links

* **Live Website:** [https://akeel-guhagarkar.github.io/cleanmax-dashboard/](https://akeel-guhagarkar.github.io/cleanmax-dashboard/)
* **GitHub Repository:** [https://github.com/Akeel-guhagarkar/cleanmax-dashboard](https://github.com/Akeel-guhagarkar/cleanmax-dashboard)
* **IT Handover Guide:** [HANDOVER_DOCUMENT.md](HANDOVER_DOCUMENT.md)
* **SQL Schema Script:** [schema.sql](schema.sql)

---

*CleanMax Dashboard — Operations & Procurement Intelligence*
