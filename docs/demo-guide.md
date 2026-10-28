# DataLens Studio — Faculty Demonstration Script & Evaluation Guide

This guide provides an exact, step-by-step walkthrough for presenting DataLens Studio during capstone evaluation. Each step outlines the presenter action, visual observation, underlying technical mechanism, and expected outcome.

---

## Pre-Demonstration Setup (1 Minute)

1. Open PowerShell / Terminal in project directory:
   ```bash
   cd "C:\Users\HP\OneDrive\Desktop\SEM III\Skill Labs 3\DATA_LENS"
   ```
2. Ensure MongoDB service is running (or local `127.0.0.1:27017`).
3. Start the application:
   ```bash
   npm start
   ```
4. Open browser to: `http://localhost:5000`

---

## 20-Step Live Demonstration Walkthrough

| Step # | Action / Workflow | Visual Observation | Technical Underpinning Explained | Expected Outcome |
|---|---|---|---|---|
| **1** | Open Landing Page | Modern SaaS landing view with brand identity, feature cards, and clear value proposition. | Responsive HTML5/CSS3 custom design system with theme tokens. | Establishes project context: "Turn raw data into clear decisions." |
| **2** | Register New Account | Fill name "Dr. Elena Rostova", email "elena@datalens.edu", password "Password123". Submit. | Client-side validation checks syntax. Server validates, salts and hashes with bcrypt, creates User record. | Automatically logs in and redirects to Dashboard with toast message. |
| **3** | Explore Dashboard | Personalized greeting, metric cards (Datasets, Analyses, Avg Quality, Total Rows), recent activity cards. | Calls `GET /api/v1/dashboard/summary`. All metrics computed live from MongoDB for logged-in user. | Clean, real dashboard reflecting active user state. |
| **4** | Load COVID-19 Benchmark | Click "Load Sample COVID-19 Dataset" button on Dashboard. | Calls `POST /api/v1/datasets/sample`. Seeds 180+ real historical records from Our World in Data / WHO with full attribution. | Dataset imported in <1 second; appears immediately in library with quality score 94%. |
| **5** | Explore Data Preview | Click on dataset to open Workspace. Navigate through paginated table (25 rows/page). Test column sorting and search bar. | Calls `GET /api/v1/datasets/:id/preview?page=1&limit=25`. Server-side pagination & projection over `dataset_rows`. | Fast, bounded row rendering. Missing cells visually flagged with amber badges. |
| **6** | Review Data Quality Audit | Click "Quality Intelligence" tab. View 0–100 score (94%), progress ring, issue severity breakdown, and outlier count. | Calls `GET /api/v1/datasets/:id/quality`. Server computes missingness ratio, duplicate hash audit, and Tukey IQR outlier fences. | Demonstrates unique feature: deterministic, reproducible data quality intelligence. |
| **7** | Inspect Auto-Insights | Click "Automatic Insights" tab. View descriptive stats (Min, Max, Mean, Median, IQR) and Pearson correlation matrix. | Calls `GET /api/v1/datasets/:id/insights`. In-memory statistical algorithms calculate Pearson $r$ with non-causality notices. | Real statistical discovery without external AI or Python dependencies. |
| **8** | Generate Chart Recommendations | Inspect "Recommended Visualizations" section. | Calls `GET /api/v1/datasets/:id/recommendations`. Rule engine evaluates column data types & cardinality. | Suggests Line Chart for Date + Cases, Bar Chart for Region + Cases, Scatter Plot for Cases + Deaths. |
| **9** | Build Chart in Analysis Studio | Click "Open in Studio" or navigate to Analysis. Select X = `Date`, Y = `ConfirmedCases`, Aggregation = `Sum`, Group = `Region`. | Calls `POST /api/v1/analyses/chart-data`. Server groups, aggregates, and formats payload for Chart.js. | Canvas renders interactive time-series line chart with tooltips and responsive legend. |
| **10** | Save the Analysis | Enter title "Global Wave 1 Trajectory", add description notes, and click "Save Analysis". | Calls `POST /api/v1/analyses`. Persists complete configuration in `saved_analyses` collection. | Success toast appears; analysis saved with unique ID. |
| **11** | Test Browser Persistence | Refresh browser (Ctrl+R / F5) or open a new browser tab to `/reports.html`. | Client calls `GET /api/v1/auth/me` with session cookie; verifies session; fetches analyses from DB. | Analysis appears in Saved Reports list with all configurations intact. |
| **12** | Reopen & Edit Analysis | Click "Open in Studio" from reports list. Change chart type to Bar Chart. Click "Update Analysis". | Calls `PATCH /api/v1/analyses/:id`. Updates existing MongoDB document. | Chart updates dynamically to Bar Chart and changes persist. |
| **13** | Export Data & Report | 1) Click "Export CSV" on dataset preview.<br>2) Click "Export HTML Report" on analysis. | 1) Downloads CSV with formula injection prevention (`'`).<br>2) Downloads standalone styled HTML report with print styles. | Both files open cleanly in Excel/Notepad and browser/print dialog. |
| **14** | Rename / Edit Dataset | On Dataset Library, click "Edit" on a dataset card. Change name to "COVID-19 Archival 2020". | Calls `PATCH /api/v1/datasets/:id` with validation. | Name updates in MongoDB and updates instantly across UI. |
| **15** | Delete Saved Analysis | In Reports list, click "Delete" on an analysis. Confirm modal. | Calls `DELETE /api/v1/analyses/:id`. Removes document from collection. | Item deleted with toast confirmation; list updates cleanly. |
| **16** | Logout & Route Guarding | Click "Logout" in top navbar. Attempt to manually navigate back to `/dashboard.html` or call `/api/v1/datasets`. | Calls `POST /api/v1/auth/logout`. Session destroyed in MongoDB and cookie cleared. Route guard intercepts navigation. | Immediate redirect to `/login.html`. API returns HTTP 401 Unauthorized. |
| **17** | Cross-Tenant Isolation | Register second user "Marcus Vance" (`marcus@datalens.edu`). Check dashboard and datasets. Attempt to access first user's dataset ID in URL. | Server checks `dataset.ownerId.equals(req.session.userId)`. | Marcus cannot see Elena's private datasets. Direct ID access returns HTTP 404 / 403. |
| **18** | Architecture & DB Review | Open terminal and inspect MongoDB collections (`users`, `datasets`, `dataset_rows`, `saved_analyses`, `activity_logs`). | Explain Mongoose schemas, compound indexes, and session storage in `connect-mongo`. | Demonstrates full-stack technical depth to examiners. |
| **19** | Error Handling & Validation | Attempt to upload a .txt file, an empty file, or register with a 4-character password. | Validation middleware intercepts invalid input with structured `{ success: false, error: { ... } }` payload. | Clear inline error banners and toast messages; server remains resilient. |
| **20** | Team Contribution & Git | Present Git branching documentation (`docs/contribution-guide.md`), PR template, and 4-member responsibility matrix. | Each student explains the exact module they authored, tested, and reviewed. | Satisfies college collaboration and individual defense criteria. |
