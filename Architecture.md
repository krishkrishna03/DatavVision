# AI-Powered Dashboard Web Application Architecture

## 1. Project Phases & Roadmap

### Phase 1: MVP (Core Local Features & Basic AI)
* **Goal:** Allow users to upload datasets, get an auto-generated dashboard, edit charts manually, and export.
* **Storage:** LocalStorage (Zustand persist) + IndexedDB for larger datasets.
* **Features:**
  * File parsing (CSV, Excel, JSON).
  * Auto-generation of 4 core charts (Bar, Line, Pie, KPI) based on schema heuristics.
  * Drag-and-drop dashboard grid (React-Grid-Layout).
  * Basic Chart Editor (select X/Y axes, chart type).
  * Client-side export to PNG/PDF.

### Phase 2: Backend Integration & User Accounts (The Scale-Up)
* **Goal:** Introduce persistence, authentication, and backend APIs for real-time auto-saving.
* **Backend:** Node.js (Express/Next.js API routes), PostgreSQL.
* **Features:**
  * User Auth (Email/Pass + OAuth via Supabase, Auth0, or NextAuth).
  * Centralized PostgreSQL Database for Dashboard configs and templates.
  * Dataset Uploads -> Stored securely in AWS S3 or directly uploaded in PostgreSQL (if small enough).
  * Continuous Auto-saving logic using debounced API calls over JSON configurations.

### Phase 3: Advanced AI & Templates (The Differentiator)
* **Goal:** Template gallery, advanced analytics, and deeper AI integration.
* **Features:**
  * "Save as Template" and public Template Gallery.
  * Integration with LLMs (e.g., OpenAI API) for natural language querying ("Show me top 5 revenue by state").
  * AI-based Outlier detection and anomaly reporting (Python backend microservice or complex DB queries).
  * Sharing via secure Read-Only unique links.

---

## 2. Technology Stack

* **Frontend Framework:** `React 18` (Vite or Next.js for SSR)
* **UI & Styling:** `Tailwind CSS`, `Vanilla CSS` (we are using CSS variables and modern layout), `Lucide React` (Icons).
* **State Management:** `Zustand` (for dashboard UI state & simple local persistence).
* **Drag-and-Drop:** `react-grid-layout` (The industry standard for responsive grid dashboards).
* **Charting Library:** `Recharts` (Highly customizable, React-native, great performance).
* **Data Parsing:** `PapaParse` (CSV), `xlsx` (Excel).
* **Backend Framework:** `Node.js` + `Express` OR `Next.js Server Actions/API Routes`.
* **Database:** `PostgreSQL` (using Prisma or Drizzle ORM). JSON/JSONB fields in Postgres are perfect for flexible dashboard configurations.
* **Cloud Storage:** `AWS S3` (for raw dataset files).
* **Authentication:** `NextAuth.js` or `Supabase Auth`.

---

## 3. Database Schema Design (PostgreSQL + Prisma)

```prisma
// SCHEMA DESIGN

model User {
  id            String      @id @default(uuid())
  email         String      @unique
  name          String?
  dashboards    Dashboard[]
  templates     Template[]
  createdAt     DateTime    @default(now())
}

model Dataset {
  id            String      @id @default(uuid())
  userId        String
  filename      String
  fileUrl       String      // S3 Link
  schema        Json        // Detected columns and data types
  rowCount      Int
  createdAt     DateTime    @default(now())
  Dashboards    Dashboard[]
}

model Dashboard {
  id            String      @id @default(uuid())
  title         String
  userId        String
  datasetId     String
  user          User        @relation(fields: [userId], references: [id])
  dataset       Dataset     @relation(fields: [datasetId], references: [id])
  layout        Json        // React-Grid-Layout coordinate data [{i, x, y, w, h}]
  charts        Json        // Array of chart configs [{id, type, xAxis, yAxis, colors}]
  isPublic      Boolean     @default(false)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model Template {
  id            String      @id @default(uuid())
  title         String
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  layout        Json        
  charts        Json
  tags          String[]
  isPublic      Boolean     @default(true)
  useCount      Int         @default(0)
  createdAt     DateTime    @default(now())
}
```

---

## 4. System Architecture & Flow

### 1. Data Pipeline
1. **User Action:** Uploads `sales_data.csv`.
2. **Frontend:** Parses the first 100 rows locally to determine column types (Numeric, Categorical, Date).
3. **Frontend -> Backend:** Uploads raw file to AWS S3, gets secure URL. Creates `Dataset` record in PostgreSQL.
4. **AI Generation Rules (Heuristics or LLM):**
   * If `Numeric` & `Category` -> Suggest Bar Chart.
   * If `Numeric` & `Date` -> Suggest Line Chart.
   * Calculate `Total/Avg` -> Suggest KPI Cards.

### 2. Auto-Save Logic (Debounced Updates)
Instead of saving on every keystroke or pixel drag, we debounce the save action.
```javascript
import { debounce } from 'lodash';

// Frontend Auto-save Trigger
const autoSaveDashboard = useCallback(
  debounce(async (dashboardId, layout, charts) => {
    await fetch(`/api/dashboards/${dashboardId}`, {
      method: "PATCH",
      body: JSON.stringify({ layout, charts })
    });
  }, 1500), 
[]);
```

### 3. Editor Architecture (Currently built locally)
* **Canvas (`DashboardGrid.jsx`):** Uses `react-grid-layout` for positioning. Maps over the `charts` array in the store.
* **Components (`ChartWidget.jsx`):** Determines which Recharts component (`<BarChart>`, `<LineChart>`) to render based on the config.
* **Side Panel (`DashboardEditor.jsx`):** Allows updating the Zustand store constraints. Updates reactively rendering instantly.

---

## 5. Deployment Guide

### Option 1: Vercel (Total Fullstack - Recommended for Next.js)
1. **Frontend & Backend API:** Hosted seamlessly on Vercel.
2. **Database:** Supabase (PostgreSQL) or Vercel Postgres.
3. **Storage:** Vercel Blob or AWS S3.
*Pros:* CI/CD is automatic. Serverless functions scale effortlessly.

### Option 2: AWS / Render (Containerized for Express)
1. **Frontend:** Hosted on Vercel or Netlify.
2. **Backend:** Node/Express app Dockerized and hosted on Render / AWS App Runner.
3. **Database:** AWS RDS PostgreSQL.
*Pros:* Better for long-running processes (e.g. if you introduce heavy AI Python microservices to calculate advanced outliers).
