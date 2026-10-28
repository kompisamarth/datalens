# DataLens Studio — Comprehensive Test Plan

This document outlines the testing strategy, test classifications, execution commands, and acceptance criteria for DataLens Studio.

---

## 1. Testing Strategy & Pyramid

DataLens Studio employs a 4-tier testing hierarchy:
1. **Unit Tests:** Mathematical verification of statistical algorithms, IQR outlier formulas, data quality score calculations, and formula injection sanitization.
2. **API Integration Tests:** Automated HTTP testing of Express endpoints using Supertest and Node's native test runner (`node:test`), verifying authorization, input validation, CSRF, and cascading database operations.
3. **Security & Vulnerability Tests:** Verification of rate limiting, NoSQL injection prevention, password hash verification, cross-tenant isolation, and session invalidation.
4. **End-to-End Workflow Verification:** Step-by-step browser simulation of complete user journeys from registration through CSV upload, insight generation, chart rendering, and report export.

---

## 2. Test Suites

### Suite 1: Authentication & Access Control (`server/tests/auth.test.js`)
- **TC-AUTH-01:** Register a new user with valid name, email, and password (Expect 201).
- **TC-AUTH-02:** Reject duplicate registration with existing email (Expect 409).
- **TC-AUTH-03:** Reject registration with short password or missing fields (Expect 400).
- **TC-AUTH-04:** Successful login with valid credentials establishes session (Expect 200).
- **TC-AUTH-05:** Reject login with incorrect password with generic message (Expect 401).
- **TC-AUTH-06:** Verify password hashes are never exposed in user objects or responses.
- **TC-AUTH-07:** Logout invalidates session and subsequent protected calls fail (Expect 401).

### Suite 2: Dataset Ingestion & Management (`server/tests/dataset.test.js`)
- **TC-DATA-01:** Reject unauthenticated dataset upload (Expect 401).
- **TC-DATA-02:** Upload valid CSV file; verify row count, column count, and schema inference (Expect 201).
- **TC-DATA-03:** Reject non-CSV file or file exceeding upload size limit (Expect 400 / 413).
- **TC-DATA-04:** Paginated preview endpoint correctly returns bounded rows with search and sorting (Expect 200).
- **TC-DATA-05:** Update dataset metadata (name, description) persists to database (Expect 200).
- **TC-DATA-06:** Cross-tenant isolation: User B cannot view, edit, or delete User A's private dataset (Expect 404/403).
- **TC-DATA-07:** Delete dataset cascades to remove all associated `DatasetRow` and `SavedAnalysis` documents.

### Suite 3: Data Quality & Analytics Engine (`server/tests/analytics.test.js`)
- **TC-QLTY-01:** Calculate exact missing cell count and percentage.
- **TC-QLTY-02:** Detect duplicate rows accurately without false positives.
- **TC-QLTY-03:** Calculate reproducible Data Quality Score (0–100) based on weighted formula.
- **TC-QLTY-04:** Compute Tukey IQR fences ($Q1 - 1.5 \times IQR$, $Q3 + 1.5 \times IQR$) and identify numeric outliers.
- **TC-STAT-01:** Descriptive statistics (min, max, mean, median, stdDev) compute correctly against reference sets.
- **TC-STAT-02:** Pearson correlation coefficient ($r$) computes accurately with proper handling of constant columns.
- **TC-RECM-01:** Recommends Line Chart for Date + Number; Bar Chart for Category + Number; Scatter for Number + Number.

### Suite 4: Visual Studio & Saved Analyses (`server/tests/analysis.test.js`)
- **TC-ANLS-01:** Calculate aggregated chart dataset (Sum, Average, Count) with group-by and filters (Expect 200).
- **TC-ANLS-02:** Persist new SavedAnalysis with complete chart and filter configuration (Expect 201).
- **TC-ANLS-03:** Duplicate existing saved analysis produces an independent copy (Expect 201).
- **TC-ANLS-04:** Export standalone HTML report contains title, metadata, and print CSS (Expect 200).
- **TC-ANLS-05:** Export CSV ensures formula injection strings (`=cmd|...`) are escaped with leading single quotes.

---

## 3. Test Execution Commands

```bash
# Run all automated test suites
npm test

# Run a specific test suite
node --test server/tests/auth.test.js
node --test server/tests/dataset.test.js
node --test server/tests/analytics.test.js
node --test server/tests/analysis.test.js
```

---

## 4. Test Pass/Fail Acceptance Criteria
- 100% of defined integration test cases must pass without unhandled rejections.
- Isolated test database (`datalens_test`) must be used to preserve development data.
- All created test fixtures must be torn down upon test completion.
