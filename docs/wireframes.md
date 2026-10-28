# DataLens Studio — Interface Wireframes & View Architecture

This document provides visual ASCII and structural layout specifications for all key views within DataLens Studio.

---

## 1. Landing Page (`/` or `/index.html`)

```text
+-----------------------------------------------------------------------------------+
|  [DL] DataLens Studio            Features   Sample Data   Docs    [Log In] [Sign Up]|
+-----------------------------------------------------------------------------------+
|                                                                                   |
|           Turn Raw Data into Clear Decisions.                                    |
|           Empowering analysts to audit data quality, discover patterns,           |
|           and build interactive dashboards in seconds.                            |
|                                                                                   |
|           [ Explore Live Demo ]     [ Get Started Free -> ]                       |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|  FEATURE HIGHLIGHTS                                                               |
|  +--------------------+  +--------------------+  +--------------------+           |
|  | Data Quality Audit |  | Auto-Insights      |  | Chart Advisor      |           |
|  | 0-100 score, null  |  | Distributions,     |  | Smart type picks   |           |
|  | checks, outliers   |  | correlations, stats|  | Line, Bar, Scatter |           |
|  +--------------------+  +--------------------+  +--------------------+           |
+-----------------------------------------------------------------------------------+
|  BUILT-IN BENCHMARK: COVID-19 HISTORICAL ANALYSIS PREVIEW                        |
|  [ Line Chart: Confirmed Cases Over Time ]  [ Bar Chart: Regional Death Rates ]   |
+-----------------------------------------------------------------------------------+
|  Footer: (c) 2026 DataLens Studio | Capstone Project | Built with Node, Mongo, JS |
+-----------------------------------------------------------------------------------+
```

---

## 2. Authentication Views (`/login.html` & `/register.html`)

### Login View
```text
+-----------------------------------------------------------------------------------+
|                                 [DL] DataLens Studio                              |
|                                                                                   |
|                           +-----------------------------+                         |
|                           |        Welcome Back         |                         |
|                           | Enter credentials to log in |                         |
|                           |                             |                         |
|                           | Email Address:              |                         |
|                           | [ user@example.com        ] |                         |
|                           |                             |                         |
|                           | Password:                   |                         |
|                           | [ **********          (eye)]|                         |
|                           |                             |                         |
|                           | [      Log In to Studio   ] |                         |
|                           |                             |                         |
|                           | Don't have an account? Sign Up                        |
|                           +-----------------------------+                         |
+-----------------------------------------------------------------------------------+
```

---

## 3. Main Dashboard (`/dashboard.html`)

```text
+-----------------------------------------------------------------------------------+
| [DL] DataLens  | Dashboard  Datasets  Analysis Studio  Reports  Settings  [Logout]|
+-----------------------------------------------------------------------------------+
| Welcome back, Dr. Elena Rostova!                   [ + Upload CSV ] [ Sample Data]|
|                                                                                   |
| METRIC CARDS                                                                      |
| +-----------------+  +-----------------+  +-----------------+  +----------------+ |
| | Total Datasets  |  | Saved Analyses  |  | Avg Quality     |  | Total Records  | |
| |       4         |  |       7         |  |     92 / 100    |  |     14,250     | |
| +-----------------+  +-----------------+  +-----------------+  +----------------+ |
|                                                                                   |
| RECENT DATASETS                                RECENT ANALYSES                    |
| +-------------------------------------------+  +--------------------------------+ |
| | Name            Rows   Score  Actions     |  | Title           Chart   Action | |
| | COVID-19 Sample  180    94%   [Open][Del] |  | Regional Trend   Line   [Open] | |
| | Q3 Sales Ledger  1,200  88%   [Open][Del] |  | Churn Scatter   Scat.  [Open] | |
| +-------------------------------------------+  +--------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 4. Dataset Library (`/datasets.html`)

```text
+-----------------------------------------------------------------------------------+
| [DL] DataLens  | Dashboard  Datasets  Analysis Studio  Reports  Settings  [Logout]|
+-----------------------------------------------------------------------------------+
| Dataset Library                                            [ + Upload New Dataset]|
|                                                                                   |
| [ Search datasets...               ]  Sort: [ Date (Newest) v ]  Source: [ All v ]|
|                                                                                   |
| DATASET CARDS                                                                     |
| +-----------------------------------+ +-----------------------------------+      |
| | COVID-19 Global Benchmark         | | E-Commerce Customer Cohorts       |      |
| | Uploaded: Oct 15, 2026            | | Uploaded: Oct 22, 2026            |      |
| | 180 rows * 7 columns | 42 KB      | | 3,420 rows * 12 columns | 380 KB  |      |
| | Quality Score: [ 94/100 ] (High)  | | Quality Score: [ 86/100 ] (Good)  |      |
| | [ Workspace ] [ Edit ] [ Delete ] | | [ Workspace ] [ Edit ] [ Delete ] |      |
| +-----------------------------------+ +-----------------------------------+      |
+-----------------------------------------------------------------------------------+
```

---

## 5. Dataset Workspace & Quality Studio (`/dataset-detail.html`)

```text
+-----------------------------------------------------------------------------------+
| [DL] DataLens  | < Back to Datasets | COVID-19 Benchmark       [ Create Analysis ]|
+-----------------------------------------------------------------------------------+
| TABS: [ 1. Data Preview ] [ 2. Quality Intelligence ] [ 3. Auto-Insights ]        |
+-----------------------------------------------------------------------------------+
| TAB 1: DATA PREVIEW                                                               |
| Show: [ 25 v ] rows   Search table: [                 ]  Export: [ CSV v ]        |
| +------------+---------------+-----------+-----------+------------+-------------+ |
| | Date (D)   | Region (S)    | Cases (N) | Deaths(N) | Active (N) | Quality (I) | |
| +------------+---------------+-----------+-----------+------------+-------------+ |
| | 2020-03-01 | North America | 1,420     | 45        | 1,200      | [ Valid ]   | |
| | 2020-03-02 | Europe        | 2,150     | 82        | 1,900      | [ Valid ]   | |
| | 2020-03-03 | Asia          | <empty>   | 12        | <empty>    | [ Missing ] | |
| +------------+---------------+-----------+-----------+------------+-------------+ |
| Showing 1 to 25 of 180 rows                     [ Prev ]  Page 1 of 8  [ Next ]   |
|                                                                                   |
| TAB 2: QUALITY INTELLIGENCE (SCORE: 94 / 100)                                     |
| [ Gauge / Progress Bar: 94% Quality Health ]                                      |
| - Missing Cells: 3 cells (0.2%) in column 'Recovered'                             |
| - Outliers: 2 high-volume records detected in 'Cases' via Tukey IQR               |
| - Duplicate Rows: 0 exact duplicates                                              |
| [ Recommended Cleanings ]: [ Drop Constant Cols ] [ Impute Missing with Mean ]    |
|                                                                                   |
| TAB 3: AUTO-INSIGHTS                                                              |
| +--------------------+ +--------------------+ +---------------------------------+ |
| | Dominant Class     | | Correlation Alert  | | Temporal Spike                  | |
| | Europe accounts for| | Cases & Deaths     | | +340% case acceleration noticed | |
| | 38% of records     | | r = 0.92 (Strong)  | | between Week 10 and Week 14     | |
| +--------------------+ +--------------------+ +---------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 6. Analysis Builder (`/analysis.html`)

```text
+-----------------------------------------------------------------------------------+
| [DL] DataLens  | Analysis Studio: "Regional Mortality vs Cases"   [ Save Analysis]|
+-----------------------------------------------------------------------------------+
| CONFIGURATION PANEL (LEFT)        | INTERACTIVE VISUALIZATION STAGE (RIGHT)       |
|                                   |                                               |
| Dataset:                          |   Chart Preview (Chart.js Interactive Canvas) |
| [ COVID-19 Global Benchmark   v ] |   +---------------------------------------+   |
|                                   |   | 100k|        * (Europe)               |   |
| Chart Type:                       |   |  75k|      *                          |   |
| [ Line ] [ Bar ] [ Doughnut ]     |   |  50k|   * (Asia)                      |   |
| [ Scatter ] [ Histogram ]         |   |  25k| * (Americas)                    |   |
|                                   |   |    0+-----------------------------+   |
| X-Axis (Dimension):               |   |     0     1M    2M    3M    4M        |   |
| [ Date                        v ] |   +---------------------------------------+   |
|                                   |                                               |
| Y-Axis (Metric):                  | ACTIVE INSIGHTS FOR THIS CONFIGURATION        |
| [ ConfirmedCases              v ] | - Upward trend confirmed over 6-month period  |
|                                   | - Peak registered on Nov 24                   |
| Aggregation:                      |                                               |
| [ Sum v ] Group by: [ Region  v ] | ACTIONS:                                      |
|                                   | [ Download HTML Report ]  [ Export Chart PNG] |
| Filters:                          |                                               |
| [ Region ] [ Equals ] [ Europe  ] |                                               |
+-----------------------------------+-----------------------------------------------+
```

---

## 7. Saved Reports (`/reports.html`)

```text
+-----------------------------------------------------------------------------------+
| [DL] DataLens  | Dashboard  Datasets  Analysis Studio  Reports  Settings  [Logout]|
+-----------------------------------------------------------------------------------+
| Saved Analytical Reports                                                          |
| [ Search reports...                ]             Sort: [ Recently Updated v ]     |
|                                                                                   |
| +-------------------------------------------------------------------------------+ |
| | Title: COVID-19 European Wave 1 Trajectory                                    | |
| | Dataset: COVID-19 Global Benchmark | Chart: Line Chart (Sum of ConfirmedCases)| |
| | Created: Oct 20, 2026 | Last modified: Oct 24, 2026                           | |
| | Actions: [ Open in Studio ]  [ Export HTML Report ]  [ Duplicate ]  [ Delete ]| |
| +-------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 8. Settings & Profile (`/settings.html`)

```text
+-----------------------------------------------------------------------------------+
| [DL] DataLens  | Dashboard  Datasets  Analysis Studio  Reports  Settings  [Logout]|
+-----------------------------------------------------------------------------------+
| Account & Workspace Settings                                                      |
|                                                                                   |
| 1. PROFILE DETAILS                                                                |
| Full Name:      [ Dr. Elena Rostova               ]                               |
| Email Address:  [ elena.rostova@university.edu    ] (Read-only)                   |
|                                                                                   |
| 2. VISUAL PREFERENCES                                                             |
| Theme:          (o) Light Theme (Default)   ( ) Dark Theme                        |
|                                                                                   |
| 3. SECURITY & PASSWORD                                                            |
| Current Password: [ ****************** ]                                          |
| New Password:     [ ****************** ] (Min 8 chars, 1 uppercase, 1 digit)      |
| [ Save Changes ]                                                                  |
|                                                                                   |
| 4. DANGER ZONE                                                                    |
| Delete Account: Permanently delete account, all datasets, rows, and saved reports |
| [ Delete Account (Confirmation Required) ]                                        |
+-----------------------------------------------------------------------------------+
```
