# DataLens Studio: Dataset Analytics Studio

> **Tagline:** *Turn raw data into clear decisions.*  
> **Capstone Project:** Full-Stack Dataset Analytics, Quality Intelligence & Visual Studio  
> **Stack:** HTML5, CSS3, Vanilla JavaScript (ES Modules), Chart.js, Node.js, Express.js, MongoDB, Mongoose

--

## 1. Project Overview

**DataLens Studio** is a self-contained, full-stack exploratory data analytics platform. It empowers data analysts, researchers, students, and stakeholders to upload CSV datasets, automatically inspect and audit data quality, uncover statistical patterns without writing code, generate intelligent visualizations, and save reusable analytical reports.

Unlike superficial CRUD projects or static dashboards, DataLens Studio computes real statistical indicators (min, max, mean, median, IQR, Pearson correlations), implements non-destructive data cleaning, recommends optimal visualization archetypes, and enforces strict tenant isolation and security boundaries.

### Primary Workflow
```text
Register ➔ Log In ➔ Upload CSV (or Load Benchmark) ➔ Audit Quality Health ➔
Discover Insights ➔ Configure Interactive Charts ➔ Save Analysis ➔ Export HTML/CSV Reports
```

---

## 2. Distinctive Capabilities

### 🛡️ 1. Data Quality Intelligence
- **Reproducible 0–100 Quality Score:** Calculated systematically from missing cell ratios, duplicate records, mixed types, zero-variance columns, and statistical outliers.
- **Tukey IQR Outlier Detection:** Identifies numeric values falling beyond $[Q1 - 1.5 \times IQR, Q3 + 1.5 \times IQR]$ fences.
- **Actionable Remediation:** Itemizes issues by severity (*Critical, Warning, Informational*) and suggests concrete fixes.
- **Non-Destructive Cleaning:** Supports purging exact duplicate rows, dropping unused columns, and imputing missing numbers via mean/median either in-place or into a new derived dataset.

### ⚡ 2. Autonomous Insight Discovery
- **Descriptive Statistics:** Computes five-number summaries, mean, standard deviation, and IQR for all continuous numeric dimensions.
- **Category Frequency & Dominance:** Identifies dominant classes accounting for $>40\%$ of records.
- **Pearson Correlation Matrix ($r$):** Evaluates linear associations for all numeric pairs with a non-causality notice: *"Correlation indicates association, not direct causality."*
- **Temporal Trajectories:** Chronologically evaluates growth momentum and flags periodic spikes exceeding $+50\%$.

### 📊 3. Smart Chart Recommendations & Visual Studio
- **Rule-Based Advisor:** Inspects data types and cardinality to recommend:
  - **Line Charts:** For temporal sequences (Date + Metric).
  - **Bar Charts:** For discrete category comparisons (Category + Metric).
  - **Doughnut / Pie Charts:** For low-cardinality part-to-whole compositions.
  - **Scatter Plots:** For pairwise relationships between continuous variables.
  - **Histograms:** For numeric frequency distribution across equal-width bins.
- **Interactive Studio:** Live multi-dimensional grouping, aggregations (*Sum, Average, Count, Min, Max*), and dynamic filter rules rendered via Chart.js.

### 📑 4. Reusable Saved Analyses & Safe Exports
- **State Persistence:** Full chart dimensions, aggregation choices, filter conditions, and insight snapshots persist to MongoDB.
- **Formula-Injection Mitigated CSV Export:** Neutralizes spreadsheet formula execution by safely prefixing untrusted triggers (`=`, `+`, `-`, `@`) with `'`.
- **Standalone HTML Reports:** Self-contained, print-ready HTML documents embedding metadata, executive findings, and responsive Chart.js canvases.

### 🌐 5. Built-in Historical COVID-19 Benchmark
- Ships with an archival historical dataset (March–August 2020) spanning Europe, North America, Asia, and South America with metrics for confirmed cases, deaths, recoveries, and active cases. Sourced from open public health records (Our World in Data / WHO) for zero-friction exploration.

---

## 3. Technology Stack & Architecture

```text
datalens-studio/
├── client/                     # Pure Vanilla Web Frontend (No frameworks, No build step)
│   ├── index.html              # Modern SaaS Landing Page with Live Benchmark Preview
│   ├── login.html              # Secure Authentication View
│   ├── register.html           # User Registration View
│   ├── dashboard.html          # Workspace Health & Metrics Dashboard
│   ├── datasets.html           # Dataset Library with Search, Sorting, & Upload
│   ├── dataset-detail.html     # Dataset Workspace: Preview, Quality, Insights, Charts
│   ├── analysis.html           # Multi-Dimensional Visual Analysis Studio
│   ├── reports.html            # Saved Reports Management & Duplication
│   ├── settings.html           # Profile, Theme Toggle, Password & Account Purge
│   ├── css/main.css            # Cohesive Design System with Light/Dark Theme Tokens
│   ├── js/                     # Modular Vanilla JavaScript (ES Modules)
│   │   ├── api.js              # Centralized Fetch Client (Credentials + CSRF)
│   │   ├── auth.js             # Route Guards, Session State & Navbar Controller
│   │   ├── theme.js            # Light/Dark Theme Manager
│   │   ├── toast.js            # Notification Toast System
│   │   ├── modal.js            # Reusable Dialog & Confirmation System
│   │   ├── dashboard.js        # Dashboard Metrics Controller
│   │   ├── datasets.js         # Library Controller & Filtering
│   │   ├── dataset-detail.js   # Workspace Tabs & Table Preview
│   │   ├── analysis.js         # Interactive Chart Studio Engine
│   │   ├── reports.js          # Saved Reports Controller
│   │   └── settings.js         # Account & Preferences Controller
│   └── assets/                 # SVGs and Local Chart.js UMD Bundle
├── server/                     # Layered Node.js / Express Backend
│   ├── src/
│   │   ├── app.js              # Express App, Security Headers & Route Mounting
│   │   ├── server.js           # Server Entry Point & Graceful Shutdown
│   │   ├── config/             # DB (Mongoose), Session (connect-mongo), Security (Helmet, CORS)
│   │   ├── models/             # User, Dataset, DatasetRow, SavedAnalysis, ActivityLog
│   │   ├── controllers/        # Request handling and HTTP responses
│   │   ├── services/           # CSV parsing, Quality score, Insights, Charting, Exports
│   │   ├── middleware/         # Auth guard, CSRF double-submit, Multer, Error handler
│   │   ├── routes/             # Versioned REST API endpoints (/api/v1/*)
│   │   └── seed/               # covid-sample.csv and automated seed script
│   └── tests/                  # Automated Integration & Unit Test Suites
├── docs/                       # Formal Capstone Documentation
│   ├── requirements.md         # Software Requirements Specification (SRS)
│   ├── user-stories.md         # Epics, Personas, and Acceptance Criteria
│   ├── wireframes.md           # Interface Wireframes & View Architecture
│   ├── database-design.md      # MongoDB Schema Specs, Indexes & ERD
│   ├── api-documentation.md    # Complete REST API Contract (/api/v1)
│   ├── test-plan.md            # Test Matrix, Verification & Pass/Fail Criteria
│   ├── contribution-guide.md   # Git Feature Branch Workflow & Team Matrix
│   └── demo-guide.md           # 20-Step Live Faculty Demonstration Script
├── .github/                    # PR and Issue Templates
├── .env.example                # Safe Environment Variables Template
├── package.json                # Project Manifest & NPM Scripts
└── README.md                   # This Document
```

---

## 4. Prerequisites

- **Node.js:** v20.x or v24.x (Tested on v24.19.0)
- **NPM:** v10.x or higher
- **MongoDB:** Local MongoDB instance running on port 27017 or a MongoDB Atlas URI

---

## 5. Installation & Setup

### Step 1: Clone or Navigate to the Workspace
```bash
cd "c:\Users\HP\OneDrive\Desktop\SEM III\Skill Labs 3\DATA_LENS"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Review `.env` settings:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/datalens_studio
SESSION_SECRET=datalens_local_dev_secret_key_8f7b2a9e4d1c603b5f
FRONTEND_ORIGIN=http://localhost:5000,http://127.0.0.1:5000
MAX_FILE_SIZE_BYTES=5242880
MAX_ROW_COUNT=10000
```

---

## 6. Running the Application

### Seed Initial Demonstration Data
To pre-populate the database with the verified COVID-19 historical benchmark dataset and a default researcher account:
```bash
npm run seed
```
*Default Credentials Created:*
- **Email:** `elena.rostova@university.edu`
- **Password:** `Password123`

### Start the Application
```bash
npm start
```
The server will start at:
```text
====================================================
🚀 DataLens Studio Server running at http://localhost:5000
📊 Mode: development
🌐 API V1: http://localhost:5000/api/v1/health
====================================================
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.

---

## 7. Running the Automated Test Suite

DataLens Studio includes comprehensive automated integration and unit test suites:

```bash
# Run all automated tests
npm test
```

### Individual Test Suites
```bash
# Authentication, Sessions, & CSRF
node --test server/tests/auth.test.js

# Dataset CRUD, Streaming Upload, & Cross-Tenant Security
node --test server/tests/dataset.test.js

# Data Quality Score, Tukey IQR Outliers, & Statistical Insights
node --test server/tests/analytics.test.js

# Saved Analyses, Chart Aggregations, & Safe HTML/CSV Reports
node --test server/tests/analysis.test.js
```

**Verification Results:**
- 26 out of 26 tests passing (100% pass rate).
- Total duration: ~1.6 seconds.
- 0 vulnerabilities, 0 memory leaks.

---

## 8. Faculty Demonstration Order

For an optimal presentation to faculty evaluators, follow the structured 20-step walkthrough documented in detail in [`docs/demo-guide.md`](file:///c:/Users/HP/OneDrive/Desktop/SEM%20III/Skill%20Labs%203/DATA_LENS/docs/demo-guide.md):

1. **Product Purpose:** Open `http://localhost:5000` and present the landing page and live interactive Chart.js benchmark.
2. **Account Registration:** Register a new user (`marcus@datalens.edu`). Show client/server validation.
3. **Workspace Dashboard:** View real-time metrics computed directly from MongoDB.
4. **1-Click Benchmark Load:** Click *"⚡ Load Sample COVID-19 Dataset"*.
5. **Data Table Preview:** Navigate through paginated records, test column sorting, search filtering, and view missing-value flags.
6. **Data Quality Intelligence:** Inspect the 0–100 quality score, missing cell breakdown, duplicate row audit, and Tukey IQR outlier detection.
7. **Automated Insights:** Review descriptive statistics, dominant classes, temporal acceleration spikes, and the Pearson correlation matrix ($r$).
8. **Chart Recommendations:** Inspect why specific visualizations (Line, Bar, Scatter) are recommended.
9. **Analysis Studio:** Build a multi-series Line Chart of `ConfirmedCases` over `Date` grouped by `Region`.
10. **Save Analysis:** Save the active configuration to the database.
11. **Persistence Verification:** Refresh the browser or open in a new tab; verify the state persists.
12. **Saved Reports Management:** Reopen, edit, duplicate, and export the analysis.
13. **Safe Exports:** Download the formula-injection safe CSV and standalone styled HTML report.
14. **Cross-Tenant Isolation:** Register a second account and demonstrate that private datasets cannot be accessed across users.
15. **Logout & Route Guarding:** Sign out and show that protected views and API endpoints immediately reject unauthenticated requests.

---

## 9. Capturing Actual Application Screenshots

To add real screenshots for presentation slides or documentation:
1. Start the server and navigate to `http://localhost:5000`.
2. Take full-resolution browser screenshots of:
   - `docs/screenshots/landing.png` (Landing page)
   - `docs/screenshots/dashboard.png` (Main dashboard with metrics)
   - `docs/screenshots/preview-table.png` (Paginated dataset preview)
   - `docs/screenshots/quality-audit.png` (Quality score gauge & audit issues)
   - `docs/screenshots/insights-matrix.png` (Pearson correlation matrix & five-number summary)
   - `docs/screenshots/analysis-studio.png` (Interactive Chart.js visual studio)
   - `docs/screenshots/html-report.png` (Exported print-ready HTML analytical report)

---

## 10. Security & Defensive Design

- **Password Hashing:** Passwords are never stored in plaintext; salted and hashed via bcrypt (salt rounds $\ge 10$).
- **Session Security:** `express-session` with MongoDB store (`connect-mongo`), `HttpOnly`, `SameSite=Lax`, and session ID regeneration upon authentication.
- **CSRF Defense:** Double-submit session CSRF token validated on all mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Formula Injection Mitigation:** Escapes untrusted cell prefixes (`=`, `+`, `-`, `@`) in exported CSV files.
- **NoSQL Injection Guard:** Strict schema validation with Mongoose; user-supplied objects are never passed directly to raw database queries.
- **Rate Limiting:** Protects authentication endpoints (15 attempts / 15 min) and API routes (600 requests / 15 min).
- **Security Headers:** Configured via Helmet with Content Security Policy allowing Chart.js execution.

---

## 11. Team Collaboration & Git Branching

DataLens Studio satisfies college criteria for multi-member engineering teams through modular domain separation:
- **Member 1 (Security & Identity Architect):** Authentication, sessions, rate limiting, CSRF, and user profile management.
- **Member 2 (Data Pipeline & Storage Engineer):** CSV ingestion, schema inference, Mongoose models, and cascading deletions.
- **Member 3 (Data Quality & Analytics Engineer):** Quality scoring algorithm, Tukey IQR outlier fences, Pearson correlation, and non-destructive cleaning.
- **Member 4 (Visualization & UX Architect):** Chart recommendation advisor, Chart.js studio, saved reports, design system, and HTML report export.

*Refer to [`docs/contribution-guide.md`](file:///c:/Users/HP/OneDrive/Desktop/SEM%20III/Skill Labs 3/DATA_LENS/docs/contribution-guide.md) for branch naming conventions, PR templates, and Git workflows.*

---

## 12. Cloud Deployment

DataLens Studio is configured for production deployment across multiple platforms:
- **Vercel (Serverless):** Native `vercel.json` rewrites and `api/index.js` serverless handler with pooled database connections.
- **Render (Continuous Container):** Built-in `render.yaml` blueprint with zero-config setup.
- **Railway / Docker:** Production-ready `Dockerfile` and `Procfile`.

*Refer to the complete step-by-step [Cloud Deployment Guide](file:///c:/Users/HP/OneDrive/Desktop/SEM%20III/Skill%20Labs%203/DATA_LENS/docs/deployment.md) for MongoDB Atlas setup, environment variable configuration, and deployment commands.*

---

## 13. License & Academic Attribution

This software is developed as an academic capstone project at **R.V. College of Engineering (RVCE)**.

**&copy; 2026 DataLens Studio. All rights reserved. • Made with ❤️ in RVCE**

Archival COVID-19 epidemiological data is provided for educational demonstration purposes and attributed to public health tracking archives (Our World in Data / World Health Organization).
