# DataLens Studio — User Stories & Acceptance Criteria

This document outlines the user personas, core epic workflows, and measurable acceptance criteria for DataLens Studio.

---

## 1. User Personas

### Persona A: Dr. Elena Rostova — Epidemiological Researcher
- **Goal:** Rapidly inspect regional health metrics, detect anomalies in reported case rates, identify temporal trends, and export clean charts for presentations.
- **Pain Points:** Needs clean, instant data profiling without writing repetitive Python pandas boilerplate or configuring heavy BI servers.

### Persona B: Marcus Vance — Business & Growth Analyst
- **Goal:** Upload monthly sales and marketing performance CSV files, evaluate data cleanliness, examine correlations between advertising spend and conversion, and save interactive charts for recurring board reports.
- **Pain Points:** Worried about formula injection and dirty data (duplicate rows, missing customer IDs) distorting analytical conclusions.

### Persona C: College Evaluator / Faculty Member
- **Goal:** Verify full-stack architecture, validate database integrity, confirm end-to-end CRUD operations, inspect security controls (rate limiting, CSRF, session isolation), and review code cleanliness.

---

## 2. Epics & User Stories

### Epic 1: Authentication & Access Control

#### US-1.1: User Registration
- **As a** new data analyst,
- **I want to** register for an account using my full name, email, and a secure password,
- **So that** I have a private, secured workspace to store my datasets and analyses.
- **Acceptance Criteria:**
  - Form validates non-empty name, standard email syntax, and minimum 8-character password.
  - Server returns HTTP 409 Conflict if email is already registered.
  - Passwords are encrypted using bcrypt prior to database storage.
  - Successful registration immediately logs the user in and redirects to the dashboard.

#### US-1.2: User Login & Session Persistence
- **As a** registered analyst,
- **I want to** securely authenticate with my email and password and remain logged in across page refreshes,
- **So that** I can seamlessly access my analyses without re-authenticating repeatedly.
- **Acceptance Criteria:**
  - Generic error message ("Invalid email or password") returned on authentication failure to prevent user enumeration.
  - Rate limiting triggers after 5 failed attempts within 15 minutes (HTTP 429).
  - Session cookie is marked `HttpOnly` and `SameSite=Lax`.
  - Session ID is regenerated upon login to prevent session fixation.

#### US-1.3: User Logout & Route Guarding
- **As an** authenticated user,
- **I want to** log out of my account,
- **So that** unauthorized users on shared hardware cannot access my datasets.
- **Acceptance Criteria:**
  - Server destroys the session in MongoDB and clears the session cookie.
  - Attempting to access `/api/v1/datasets` or private views redirects to `/login.html`.
  - Client state and cached user details are purged.

---

### Epic 2: Dataset Management & Exploration

#### US-2.1: CSV Dataset Upload
- **As an** analyst,
- **I want to** upload CSV files up to 5 MB via drag-and-drop or file selector,
- **So that** I can import external data into DataLens Studio.
- **Acceptance Criteria:**
  - Non-CSV files or files exceeding 5 MB are rejected with an explicit error message.
  - Headers are sanitized; empty or duplicate headers are safely disambiguated.
  - Server parses rows in streaming chunks, infers column types (numeric, date, boolean, string), and writes to `Dataset` and `DatasetRow`.
  - An activity log record is created for auditing.

#### US-2.2: Built-in COVID-19 Dataset Exploration
- **As a** first-time user,
- **I want to** instantly load the built-in COVID-19 sample dataset,
- **So that** I can test the platform's analytical capabilities without preparing an external file.
- **Acceptance Criteria:**
  - Dashboard and Dataset Library include a 1-click "Explore Sample COVID-19 Dataset" button.
  - Historical dataset is seeded into the user's workspace with full attribution, valid dates, case numbers, and regional breakdown.

#### US-2.3: Paginated Dataset Table Preview
- **As a** user reviewing an imported dataset,
- **I want to** inspect the actual table records with search, column sorting, and pagination,
- **So that** I can visually inspect the raw values and detect any anomalies.
- **Acceptance Criteria:**
  - Supports 10, 25, 50, and 100 rows per page.
  - Full dataset search filters matching records on the backend.
  - Column headers indicate inferred data types (`Number`, `Date`, `Text`, `Boolean`).
  - Missing/empty cells are visually highlighted with badge indicators.

#### US-2.4: Dataset CRUD Operations
- **As an** analyst,
- **I want to** update dataset metadata (name, description) and delete datasets I no longer need,
- **So that** my analytics workspace remains organized.
- **Acceptance Criteria:**
  - Inline modal allows modifying name and description with validation.
  - Delete action requires explicit modal confirmation.
  - Deleting a dataset cascades to remove all associated `DatasetRow` documents and `SavedAnalysis` records.

---

### Epic 3: Data Quality Intelligence

#### US-3.1: Comprehensive Data Quality Audit
- **As a** researcher,
- **I want to** see an automated 0–100 Data Quality Score and an issue breakdown upon uploading a dataset,
- **So that** I know whether the data is reliable enough for downstream decision-making.
- **Acceptance Criteria:**
  - Data Quality Score is calculated systematically from missingness, duplicates, mixed types, constant columns, and outliers.
  - Issues are grouped into Severity tiers (Critical, Warning, Informational).
  - Each issue lists affected columns, count of affected records, and actionable remediation advice.

#### US-3.2: Non-Destructive Data Cleaning
- **As an** analyst working with dirty data,
- **I want to** apply automated cleaning actions (e.g. remove exact duplicates, impute missing numbers with mean/median, or filter rows),
- **So that** I can clean my dataset without permanently corrupting raw records.
- **Acceptance Criteria:**
  - User can choose to update the dataset or create a new cleaned version.
  - Deduplication detects and purges identical rows.
  - Missing value imputation supports Mean, Median, and Mode.

---

### Epic 4: Automatic Insight Discovery

#### US-4.1: Descriptive Statistical Profiling
- **As an** analyst,
- **I want to** view instant statistical summaries for all numeric and categorical columns,
- **So that** I don't have to calculate means, medians, or frequencies manually.
- **Acceptance Criteria:**
  - Numeric columns show Count, Min, Max, Mean, Median, StdDev, and IQR.
  - Categorical columns show Unique Count and Top 5 Most Frequent values with percentages.

#### US-4.2: Correlation Discovery
- **As a** researcher,
- **I want to** inspect a Pearson correlation matrix for numeric columns,
- **So that** I can identify co-varying variables while remaining mindful of non-causality.
- **Acceptance Criteria:**
  - Matrix displays coefficients between -1.0 and +1.0.
  - Relationships with $|r| \ge 0.7$ are highlighted with analytical insights.
  - Prominent disclaimer warns: "Correlation does not imply causation."

---

### Epic 5: Smart Chart Recommendations & Visual Workspace

#### US-5.1: Chart Recommendations
- **As an** analyst building a presentation,
- **I want the** system to suggest suitable chart types based on my data types and cardinality,
- **So that** I avoid creating unreadable or misleading visualizations.
- **Acceptance Criteria:**
  - Suggests Line Charts for Temporal (Date) + Numeric pairings.
  - Suggests Bar Charts for Low-to-Medium cardinality Categorical + Numeric comparisons.
  - Suggests Doughnut Charts for Low cardinality part-to-whole breakdowns.
  - Suggests Scatter Plots for pairs of Continuous Numeric variables.
  - Explains the analytical rationale for each recommendation.

#### US-5.2: Interactive Chart Studio
- **As a** user,
- **I want to** configure charts by selecting X and Y dimensions, aggregation functions (Sum, Avg, Count), and filter criteria,
- **So that** I can visually answer specific questions about my data.
- **Acceptance Criteria:**
  - Chart.js renders interactive canvas with responsive tooltips and legends.
  - Aggregations update the chart live without page refresh.
  - Filters (equals, contains, greater than, less than) can be added dynamically.

---

### Epic 6: Reusable Saved Analyses & Export

#### US-6.1: Saving and Reopening Analyses
- **As an** analyst,
- **I want to** save my complete chart configuration, active filters, and notes as a named Analysis,
- **So that** I can revisit, refine, or present it later.
- **Acceptance Criteria:**
  - Saved analysis captures datasetId, chartType, xAxis, yAxis, aggregation, filters, and notes.
  - Saved reports list displays all user analyses with search and quick actions.
  - Opening an analysis restores the exact visual chart state.

#### US-6.2: Report and Dataset Export
- **As a** decision-maker,
- **I want to** export the filtered dataset as a CSV and the analysis as a formatted HTML report,
- **So that** I can share insights with non-technical executives or print them.
- **Acceptance Criteria:**
  - CSV export escapes potential formula injection triggers (`=`, `+`, `-`, `@`).
  - HTML report is a standalone, beautifully styled, print-ready document with embedded metadata, tables, and charts.
