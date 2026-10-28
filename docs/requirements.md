# DataLens Studio — Software Requirements Specification (SRS)

## 1. Product Identification
- **Product Name:** DataLens Studio
- **Tagline:** Turn raw data into clear decisions.
- **Classification:** Dataset Analytics & Visual Exploration Studio (Full-Stack Web SaaS)
- **Target Audience:** Data analysts, researchers, students, and business decision-makers needing fast, private, and automated exploratory data analysis without complex BI setups.

---

## 2. Problem Statement
Non-technical and semi-technical stakeholders frequently encounter raw CSV datasets (sales records, epidemiological data, customer logs) but lack access to or expertise in high-barrier data science environments (such as Jupyter, Python Pandas, or costly enterprise BI suites like Tableau). Consequently, data quality defects (null values, duplicates, mixed types, outliers) go undetected, exploratory analysis takes hours, and generating actionable visualizations is cumbersome. DataLens Studio bridges this gap by providing an autonomous, web-based analytics workspace that instantly profiles data quality, identifies statistical patterns, suggests the most appropriate visualizations, and compiles reusable analytical reports.

---

## 3. Scope & System Objectives
DataLens Studio delivers:
1. **Secure Session-Based User Accounts:** Registration, login, session persistence, and strict data isolation across accounts.
2. **Dataset Ingestion & Management:** Robust, validated CSV upload (up to 5 MB, configurable), column type inference, schema extraction, and paginated exploration.
3. **Data Quality Intelligence:** Automated audit calculating a 0–100 Data Quality Score, missingness analysis, duplicate detection, mixed type identification, and Tukey IQR outlier detection with recommended cleaning actions.
4. **Autonomous Insight Discovery:** Statistical computation of five-number summaries, category dominance, Pearson correlation matrices, and time-series trends without external AI dependencies.
5. **Smart Chart Recommendation & Studio:** Rule-based charting advisor recommending line, bar, doughnut, scatter, and histogram charts using Chart.js, with live filtering and aggregation.
6. **Reusable Analysis & Reporting:** Saving, reloading, duplicating, and exporting complete analytical configurations as standalone, print-ready HTML reports or CSV files.
7. **Built-in COVID-19 Benchmark Dataset:** Pre-loaded, legally attributed historical COVID-19 dataset allowing immediate, out-of-the-box exploration.

---

## 4. Technology Stack & Architecture
- **Frontend:** Vanilla HTML5, CSS3 (Custom Design System with CSS Custom Properties, Light & Dark themes), ES Modules (JavaScript), Chart.js (v4.4.x via local/CDN fallback).
- **Backend:** Node.js (v20+), Express.js (REST API v1).
- **Database:** MongoDB with Mongoose ODM (User, Dataset, DatasetRow, SavedAnalysis, ActivityLog).
- **Security & Session Layer:** `express-session` with MongoDB session store (`connect-mongo`), `bcryptjs` password hashing, Helmet HTTP headers, `express-rate-limit`, CSRF token validation on mutating requests, and formula-injection defenses on CSV exports.
- **Data Engine:** Streaming CSV parser (`csv-parser`), custom in-memory statistical and data-profiling algorithms.

---

## 5. User Roles & Access Control
1. **Guest / Unauthenticated User:** Can view the landing page, read feature documentation, and register/login.
2. **Registered User / Analyst:** Can upload datasets, inspect data previews, view quality audits, generate automatic insights, configure and save analyses, export reports, and manage profile settings.
3. **Data Isolation Rule:** Users can only view, edit, or delete datasets, rows, and analyses belonging to their own `ownerId`. Built-in sample datasets are shared in a read-only manner or cloned to the user's workspace upon request.

---

## 6. Functional Requirements (FR)

### FR-1: Account & Authentication
- **FR-1.1:** The system shall register users with Full Name, Email, and Password (minimum 8 characters with number and uppercase).
- **FR-1.2:** The system shall enforce unique email addresses and store passwords as bcrypt hashes (salt rounds >= 10).
- **FR-1.3:** The system shall maintain login sessions via `connect-mongo` with `HttpOnly`, `SameSite=Lax`, and configurable `Secure` cookies.
- **FR-1.4:** The system shall regenerate session IDs upon successful authentication to protect against session fixation.
- **FR-1.5:** The system shall provide a rate-limited login endpoint (max 5 failed attempts per 15-minute window).
- **FR-1.6:** The system shall invalidate sessions upon logout and clear the client cookie.

### FR-2: Dataset Management & Ingestion
- **FR-2.1:** The system shall allow users to upload CSV files via drag-and-drop or file picker up to 5 MB.
- **FR-2.2:** The system shall validate CSV headers, detect duplicate or empty headers, and handle UTF-8 encodings.
- **FR-2.3:** The system shall automatically infer column data types: `numeric`, `date`, `boolean`, and `string/categorical`.
- **FR-2.4:** The system shall store dataset metadata in `Dataset` and individual records in `DatasetRow` for bounded memory usage.
- **FR-2.5:** The system shall provide paginated dataset previews (10, 25, 50, 100 rows per page) with search and column sorting.
- **FR-2.6:** The system shall allow users to edit dataset name and description, and cascade-delete datasets along with rows and linked analyses.

### FR-3: Data Quality Intelligence
- **FR-3.1:** The system shall calculate an overall Data Quality Score (0–100) based on missingness, duplicate rows, mixed types, constant columns, and outliers.
- **FR-3.2:** The system shall itemize all detected issues with severity levels (Critical, Warning, Info) and affected column details.
- **FR-3.3:** The system shall support non-destructive cleaning transformations (deduplication, missing value imputation, row filtering) with preview capability.

### FR-4: Automatic Insight Discovery
- **FR-4.1:** The system shall calculate descriptive statistics for numeric columns (min, max, mean, median, standard deviation, IQR).
- **FR-4.2:** The system shall compute category distributions and identify dominant classes for categorical columns.
- **FR-4.3:** The system shall compute Pearson correlation coefficients ($r$) between all numeric column pairs and flag strong relationships ($|r| \ge 0.7$) with non-causality disclaimers.
- **FR-4.4:** The system shall identify time-series trajectories and periodic growth rates when a valid date column is present.

### FR-5: Chart Recommendation & Visual Workspace
- **FR-5.1:** The system shall recommend appropriate visualization types based on column data types and cardinality.
- **FR-5.2:** The system shall provide an interactive chart studio supporting Line, Bar, Doughnut, Scatter, and Histogram charts.
- **FR-5.3:** The system shall support aggregation operations (Sum, Average, Count, Min, Max) grouped by categorical or temporal keys.
- **FR-5.4:** The system shall allow saving the active chart configuration, active filters, and discovered insights to the database.

### FR-6: Reporting & Export
- **FR-6.1:** The system shall export full or filtered datasets as RFC 4180 compliant CSV files with formula-injection escaping.
- **FR-6.2:** The system shall generate standalone, print-ready HTML analytical reports embedding metadata, statistical summaries, and rendered charts.

---

## 7. Non-Functional Requirements (NFR)
- **NFR-1 (Performance):** Statistical profiling and quality calculation for datasets up to 10,000 rows shall execute within 1.5 seconds.
- **NFR-2 (Security):** Zero exposure of password hashes or session secrets; CSRF validation on all non-GET API requests; Helmet HTTP security headers; strict ownerId authorization checks.
- **NFR-3 (Reliability):** Graceful error handling with unified error responses `{ success: false, error: { message, code } }` and zero unhandled Promise rejections.
- **NFR-4 (Usability & Accessibility):** WCAG 2.1 AA color contrast compliance, keyboard navigable interactive components, visible focus outlines, and persistent light/dark theme toggle.
- **NFR-5 (Maintainability):** Modular ES module structure on frontend, layered MVC (routes, controllers, services, models) on backend, zero framework dependencies for frontend.

---

## 8. Acceptance Criteria
1. Full user authentication lifecycle verified with session persistence across page reloads.
2. Complete CRUD operational on both `Dataset` and `SavedAnalysis` collections.
3. Successful import, profiling, and chart rendering of the built-in COVID-19 dataset.
4. Comprehensive test suite passing with honest coverage reporting.
5. All documentation files present and aligned with actual implementation.
