# CleanMax Dashboard - Developer & IT Handover Guide

Welcome to the **CleanMax Dashboard** repository. This document outlines the project architecture, tech stack, database schemas, and instructions for integrating your internal custom database/APIs.

---

## 🛠️ Project Tech Stack
* **Frontend Framework:** React 19 + Vite 8
* **Styling & Icons:** Custom CSS / Glassmorphism + Lucide-React
* **Mapping Engine:** Leaflet & React-Leaflet + Custom GeoJSON TopoJSON mapping
* **Charts & Analytics:** Recharts + D3-Geo
* **Excel Data Processing:** ExcelJS (Client-side fast Excel import & validation)
* **Current Data Persistence:** Firebase Firestore (Real-time sync)

---

## 🚀 Quick Start for Developers

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Local Development Server:**
   ```bash
   npm run dev
   ```

3. **Build for Production Deployment:**
   ```bash
   npm run build
   ```
   *(Production assets will be generated in `dist/`)*

4. **Deploy to GitHub Pages (Optional):**
   ```bash
   npm run deploy
   ```

---

## 🗄️ Database Architecture & Schema Specification

A ready-to-run SQL script **`schema.sql`** is included in the project root. You can run it directly in PostgreSQL, MySQL, SQLite, or Oracle.

### 📊 Required Tables & Columns

#### 1. `vendors` (Main Vendor & Contract Master)
| Column Name | Data Type | Default / Null | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(100)` | Primary Key | Unique Vendor Record ID |
| `vendorCode` | `VARCHAR(50)` | NOT NULL | Vendor SAP/ERP Code (e.g. `101793`) |
| `vendorName` | `VARCHAR(255)`| NOT NULL | Company / Vendor Name |
| `vendorType` | `VARCHAR(50)` | DEFAULT `'O&M Vendor'` | Category / Type |
| `plantName` | `VARCHAR(255)`| NOT NULL | Site / Plant Name (e.g. `Nykaa BLR2`) |
| `region` | `VARCHAR(50)` | NOT NULL | Region (`North`, `South`, `East`, `West`, `Central`) |
| `state` | `VARCHAR(100)`| NULL | State Name |
| `city` | `VARCHAR(100)`| NULL | City Name |
| `plantCapacity` | `DECIMAL(10,2)`| DEFAULT `0.00` | Capacity Value |
| `capacityUnit` | `VARCHAR(20)` | DEFAULT `'kWp'` | Unit (`kWp` or `MWp`) |
| `rate` | `DECIMAL(10,2)`| DEFAULT `0.00` | Contract Rate per unit |
| `poNumber` | `VARCHAR(100)`| NULL | Purchase Order Number |
| `prNumber` | `VARCHAR(100)`| NULL | Purchase Requisition Number |
| `contractStart` | `TIMESTAMP` | NOT NULL | Contract Start Date |
| `contractEnd` | `TIMESTAMP` | NOT NULL | Contract Expiry Date |
| `status` | `VARCHAR(50)` | NOT NULL | Contract Status (`Active`, `Expiring Soon`, `Expired`) |

#### 2. `projects` (Project & Site Master)
| Column Name | Data Type | Default / Null | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(100)` | Primary Key | Project ID |
| `projectCode` | `VARCHAR(50)` | NOT NULL | Project Code (e.g. `PRJ-2026-01`) |
| `projectName` | `VARCHAR(255)`| NOT NULL | Project / Site Name |
| `client` | `VARCHAR(255)`| NOT NULL | Client Name |
| `type` | `VARCHAR(50)` | DEFAULT `'O&M Project'` | Category |
| `capacity` | `DECIMAL(10,2)`| DEFAULT `0.00` | Capacity Value |
| `unit` | `VARCHAR(20)` | DEFAULT `'kWp'` | Unit (`kWp` or `MWp`) |
| `status` | `VARCHAR(50)` | DEFAULT `'In Progress'` | Project Status |

#### 3. `users` (Employees & Authentication)
| Column Name | Data Type | Default / Null | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(100)` | Primary Key | User ID |
| `name` | `VARCHAR(255)`| NOT NULL | Full Name |
| `email` | `VARCHAR(255)`| UNIQUE, NOT NULL | Login Email |
| `password` | `VARCHAR(255)`| NOT NULL | Hashed Password |
| `role` | `VARCHAR(50)` | NOT NULL | Access Role (`admin`, `procurement`, `operations`, `viewer`) |
| `department` | `VARCHAR(100)`| NULL | Department Name |
| `jobTitle` | `VARCHAR(100)`| NULL | Job Title |

#### 4. `archived_contracts` (Contract Renewal Log)
| Column Name | Data Type | Default / Null | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(100)` | Primary Key | Renewal ID |
| `vendorId` | `VARCHAR(100)`| NULL | Associated Vendor ID |
| `oldPoNumber` | `VARCHAR(100)`| NULL | Previous PO Number |
| `newPoNumber` | `VARCHAR(100)`| NULL | Renewed PO Number |
| `oldRate` | `DECIMAL(10,2)`| DEFAULT `0.00` | Previous Rate |
| `newRate` | `DECIMAL(10,2)`| DEFAULT `0.00` | Renewed Rate |
| `oldContractStart`| `TIMESTAMP` | NULL | Previous Start Date |
| `oldContractEnd` | `TIMESTAMP` | NULL | Previous Expiry Date |
| `newContractStart`| `TIMESTAMP` | NULL | Renewed Start Date |
| `newContractEnd` | `TIMESTAMP` | NULL | Renewed Expiry Date |
| `renewedBy` | `VARCHAR(255)`| NULL | Employee Name who renewed |

---

## 🔄 Replacing Firebase with Internal Company API / Database

The application utilizes a **Centralized Context Pattern** via `ProcureContext` (`src/context/ProcureContext.jsx`). All components consume state using the custom hook `useProcure()`.

### Instructions for IT Developers:
To connect the dashboard to your own REST API, GraphQL, or SQL database backend:

1. **Central Data Layer:** Open `src/context/ProcureContext.jsx`.
2. **Replace Data Fetching:** Replace the `onSnapshot` Firestore listeners in `useEffect()` (around lines 440-500) with standard `fetch` / `axios` calls to your API endpoints:
   - `GET /api/vendors`
   - `GET /api/projects`
   - `GET /api/users`
3. **Replace Mutations:** Update action dispatchers (e.g. `ADD_VENDOR`, `UPDATE_VENDOR`, `SOFT_DELETE_VENDORS`, `IMPORT_EXCEL`) to trigger HTTP requests (`POST`, `PUT`, `DELETE`) to your backend.
4. **UI Decoupling:** **Zero changes** are needed in any UI components (`Views`, `Components`, `Modals`). Everything connects seamlessly through `ProcureContext`.

---

## 📁 Key File Map for Developers

| Directory / File | Description |
| :--- | :--- |
| `src/context/ProcureContext.jsx` | Main state provider, real-time sync, data CRUD logic & Excel merge logic |
| `schema.sql` | Standard SQL script creating all database tables & indexes |
| `src/firebase.js` | Firebase initialization & config |
| `src/views/` | Page views (Analytics, RegionMap, Projects, Vendors, Renewals, AddExcel, Employees, Settings) |
| `src/components/` | Reusable UI components (Layout, Header, Navigation, Modals, Map components) |
| `src/utils/seedData.js` | Initial fallback seed datasets & helper formulas |
| `src/utils/constants.js` | Region normalizers, state lists, capacity conversion formulas |

---

## 👥 Support & Contact
If your team has any questions during integration, please refer to `src/context/ProcureContext.jsx` and `schema.sql`.
