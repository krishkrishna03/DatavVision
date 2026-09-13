# DataVision — AI-Powered Dashboard Builder

DataVision is a web application that lets you upload CSV, Excel, or JSON datasets and instantly generates an interactive, dark-blue-themed analytics dashboard. An AI engine analyzes your data's schema and automatically creates KPI cards, bar charts, line charts, pie charts, area charts, scatter plots, and a data table — all editable, rearrangeable, and exportable.

---

## Features

### Data Import
- Upload **CSV**, **Excel (.xlsx, .xls)**, or **JSON** files
- Multi-file upload with merge support — select multiple files and combine them into one dataset
- Automatic schema detection: identifies numeric, categorical, and date columns
- Full dataset preservation — no row limits, all data is kept for analysis

### AI Dashboard Generation
- Automatically generates **3 KPI cards** (sum, average, max, count) from numeric columns
- Creates **6–7 charts** using different column combinations to avoid repetition:
  - Bar chart (category vs numeric)
  - Line chart (trend over time or by category)
  - Pie/donut chart (share distribution)
  - Area chart (trend visualization)
  - Stacked bar chart (two metrics by category)
  - Scatter plot (correlation between two numerics)
- Includes a **data table** preview with the first 100 rows
- Each chart uses a different color from a curated palette

### Dashboard Management
- **Dashboard Gallery** — view all saved dashboards as cards with chart counts and creation dates
- **Sidebar list** — recent dashboards with inline rename and delete buttons
- Click any dashboard card to open it in the editor
- Delete dashboards with confirmation prompts

### Dashboard Editor
- **Inline title editing** — click the dashboard title to rename it
- **Chart editing** — click the pencil icon on any chart to change its type, axes, color theme, and display metrics
- **Add charts** — insert new charts with the "Add" button
- **Remove charts** — click the X icon on any chart
- **Filter panel** — interactive slicers for categorical columns (checkbox dropdowns) and date range pickers
- **Fullscreen mode** — expand the dashboard to fill the entire viewport
- **Export** — download the dashboard as a PNG image or a multi-page PDF report

### Template Gallery
- Save any dashboard as a reusable template
- Browse and apply templates to new datasets
- Track template usage counts

### Design
- Unified **dark blue color palette** across the entire app — no light/white sections
- Glassmorphism effects with backdrop blur
- Animated gradient orbs in the background
- Smooth fade-in and slide-in transitions
- Inter font family with JetBrains Mono for numeric data
- Responsive layout with a fixed sidebar and scrolling content area
- 8px spacing system with consistent border radii

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 19 with Vite 8 |
| Routing | React Router 7 |
| State Management | Zustand 5 (persisted to IndexedDB via idb-keyval) |
| Charts | Recharts 3 |
| Drag-and-Drop Grid | react-grid-layout 2 |
| File Parsing | PapaParse (CSV), xlsx (Excel) |
| File Upload | react-dropzone 15 |
| Icons | lucide-react |
| Export | html2canvas (PNG), jsPDF (PDF) |
| Animations | Framer Motion |
| Date Handling | date-fns |

---

## Project Structure

```
src/
├── App.jsx                          # Route definitions
├── index.css                        # Global styles, design tokens, animations
├── main.jsx                         # Entry point
├── pages/
│   ├── LandingPage.jsx              # Home / welcome screen
│   ├── UploadPage.jsx               # File upload with schema preview
│   ├── DashboardEditor.jsx          # Main dashboard editing canvas
│   ├── DashboardGallery.jsx         # Grid of all saved dashboards
│   ├── DatasetGallery.jsx           # List of uploaded datasets
│   └── TemplateGallery.jsx          # Browse saved templates
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx             # Sidebar + header + content wrapper
│   │   ├── Sidebar.jsx              # Navigation + dashboard list with rename/delete
│   │   └── Header.jsx               # Page title, search, AI badge, new button
│   ├── charts/
│   │   └── ChartWidget.jsx          # Renders all chart types (bar, line, pie, KPI, etc.)
│   └── dashboard/
│       ├── DashboardGrid.jsx        # react-grid-layout wrapper
│       ├── SlicerPanel.jsx          # Filter dropdowns + date range picker
│       └── ChartEditorModal.jsx     # Inline chart configuration panel
├── store/
│   └── store.js                     # Zustand stores (datasets, dashboards, templates)
└── utils/
    ├── aiSuggester.js               # AI chart generation engine + palettes
    ├── chartDataProcessor.js        # Data filtering, aggregation, date utilities
    ├── dataParser.js                # CSV/Excel/JSON file parsing + schema detection
    └── reportGenerator.js           # PDF report generation
```

---

## Getting Started

### Install dependencies

```bash
npm install
```

### Run the dev server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

---

## How It Works

1. **Upload** — Drop a CSV, Excel, or JSON file on the upload page. The parser detects column types (numeric, category, date) and shows a summary of your data shape.

2. **AI Generation** — The `aiSuggester` engine examines the schema and generates a full dashboard: 3 KPI cards from the first numeric columns, then bar/line/pie/area/stacked-bar/scatter charts using a column rotation system so each chart visualizes different data. A data table is appended at the end.

3. **Edit** — Open any dashboard to rename it, edit individual charts (change type, axes, colors, displayed metrics), add new charts, remove unwanted ones, and rearrange via drag-and-drop. Filter the data with the slicer panel or date range picker.

4. **Export** — Download the dashboard as a PNG screenshot or generate a multi-page PDF report with all charts and a data summary.

5. **Manage** — All dashboards are listed in the Dashboard Gallery and the sidebar. Rename or delete from either place. Save any dashboard as a template for future reuse.

---

## Data Storage

Data is stored locally in the browser using **IndexedDB** (via idb-keyval) through Zustand's persist middleware. Three stores are used:

- **`ai-dashboard-data`** — uploaded datasets (full row data + schema)
- **`ai-dashboard-boards`** — saved dashboards (charts, layout, filters, titles)
- **`ai-dashboard-templates`** — reusable templates

No data is sent to any server — everything runs client-side.
