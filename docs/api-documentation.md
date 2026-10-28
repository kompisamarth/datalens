# DataLens Studio — REST API Specification (`/api/v1`)

All endpoints adhere to REST conventions, communicate via JSON (except file upload and download endpoints), enforce session-based cookie authentication, and return uniform envelope payloads:

**Success Response Envelope:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Response Envelope:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable error description",
    "details": []
  }
}
```

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### 1.1. Register Account
- **Method:** `POST`
- **Path:** `/api/v1/auth/register`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "name": "Dr. Elena Rostova",
    "email": "elena.rostova@university.edu",
    "password": "Password123"
  }
  ```
- **Responses:**
  - `201 Created`: User registered and authenticated.
  - `400 Bad Request`: Validation failure (short password, invalid email).
  - `409 Conflict`: Email already exists.

### 1.2. Login
- **Method:** `POST`
- **Path:** `/api/v1/auth/login`
- **Auth:** Public (Rate Limited: max 10/15min)
- **Request Body:**
  ```json
  {
    "email": "elena.rostova@university.edu",
    "password": "Password123"
  }
  ```
- **Responses:**
  - `200 OK`: Authenticated; session cookie established; CSRF token returned.
  - `401 Unauthorized`: Invalid credentials.
  - `429 Too Many Requests`: Rate limit exceeded.

### 1.3. Logout
- **Method:** `POST`
- **Path:** `/api/v1/auth/logout`
- **Auth:** Authenticated
- **Responses:**
  - `200 OK`: Session destroyed and cookie cleared.

### 1.4. Current User & CSRF Token
- **Method:** `GET`
- **Path:** `/api/v1/auth/me`
- **Auth:** Authenticated
- **Responses:**
  - `200 OK`: Returns authenticated user info and CSRF token.
  - `401 Unauthorized`: Not authenticated.

---

## 2. Dashboard Endpoints (`/api/v1/dashboard`)

### 2.1. Dashboard Summary
- **Method:** `GET`
- **Path:** `/api/v1/dashboard/summary`
- **Auth:** Authenticated
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "totalDatasets": 4,
      "totalAnalyses": 7,
      "avgQualityScore": 91.5,
      "totalRows": 14250,
      "recentDatasets": [ ... ],
      "recentAnalyses": [ ... ]
    }
  }
  ```

---

## 3. Dataset Endpoints (`/api/v1/datasets`)

### 3.1. List Datasets
- **Method:** `GET`
- **Path:** `/api/v1/datasets`
- **Query Parameters:** `search`, `sort` (`newest`, `oldest`, `name`, `score`, `rows`), `sourceType`, `page`, `limit`
- **Auth:** Authenticated
- **Response `200 OK`:** Paginated array of dataset metadata documents.

### 3.2. Upload Dataset
- **Method:** `POST`
- **Path:** `/api/v1/datasets`
- **Content-Type:** `multipart/form-data`
- **Auth:** Authenticated
- **Payload:** `file` (CSV, max 5MB), `name` (string), `description` (optional)
- **Responses:**
  - `201 Created`: Returns newly created dataset with inferred schema and quality score.
  - `400 Bad Request`: Malformed CSV, empty file, or duplicate columns.
  - `413 Payload Too Large`: Exceeds 5MB or max rows limit.

### 3.3. Load Built-in Sample COVID-19 Dataset
- **Method:** `POST`
- **Path:** `/api/v1/datasets/sample`
- **Auth:** Authenticated
- **Response `201 Created`:** Seeds the curated, legally-attributed COVID-19 benchmark dataset directly into the user's workspace.

### 3.4. Get Dataset by ID
- **Method:** `GET`
- **Path:** `/api/v1/datasets/:id`
- **Auth:** Authenticated (Owner Check)
- **Response `200 OK`:** Full dataset document.

### 3.5. Update Dataset Metadata
- **Method:** `PATCH`
- **Path:** `/api/v1/datasets/:id`
- **Auth:** Authenticated (Owner Check)
- **Request Body:** `{ "name": "Updated Title", "description": "Updated Notes" }`
- **Response `200 OK`:** Updated dataset document.

### 3.6. Delete Dataset
- **Method:** `DELETE`
- **Path:** `/api/v1/datasets/:id`
- **Auth:** Authenticated (Owner Check)
- **Response `200 OK`:** Confirmation of cascading deletion (Dataset, Rows, and linked Analyses).

### 3.7. Dataset Row Preview
- **Method:** `GET`
- **Path:** `/api/v1/datasets/:id/preview`
- **Query Parameters:** `page` (default 1), `limit` (default 25), `search`, `sortCol`, `sortDir` (`asc`|`desc`)
- **Auth:** Authenticated
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "rows": [ { "rowIndex": 0, "rowData": { "Date": "2020-03-01", "Region": "Europe", "Cases": 1200 } } ],
      "pagination": { "page": 1, "limit": 25, "totalRows": 180, "totalPages": 8 }
    }
  }
  ```

### 3.8. Data Quality Intelligence
- **Method:** `GET`
- **Path:** `/api/v1/datasets/:id/quality`
- **Auth:** Authenticated
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "score": 94,
      "status": "High",
      "missingCells": 3,
      "missingPct": 0.24,
      "duplicateRows": 0,
      "outlierCount": 2,
      "issues": [
        {
          "severity": "Warning",
          "title": "Minor Missing Values",
          "column": "Recovered",
          "affectedCount": 3,
          "recommendation": "Impute missing numbers with column mean or median."
        }
      ]
    }
  }
  ```

### 3.9. Automatic Insights
- **Method:** `GET`
- **Path:** `/api/v1/datasets/:id/insights`
- **Auth:** Authenticated
- **Response `200 OK`:** Statistical summaries, dominant categories, Pearson correlation matrix, and temporal trend analyses.

### 3.10. Smart Chart Recommendations
- **Method:** `GET`
- **Path:** `/api/v1/datasets/:id/recommendations`
- **Auth:** Authenticated
- **Response `200 OK`:** Recommended charts (Line, Bar, Scatter, Doughnut, Histogram) with suitability reasoning.

### 3.11. Data Cleaning
- **Method:** `POST`
- **Path:** `/api/v1/datasets/:id/clean`
- **Auth:** Authenticated
- **Request Body:**
  ```json
  {
    "removeDuplicates": true,
    "dropColumns": ["UnnecessaryCol"],
    "imputeMissing": [{ "column": "Cases", "strategy": "mean" }],
    "createNewDataset": true,
    "newDatasetName": "COVID-19 Benchmark (Cleaned)"
  }
  ```
- **Response `201 Created` / `200 OK`:** Cleared dataset or newly created derived dataset.

### 3.12. Export Dataset as CSV
- **Method:** `GET`
- **Path:** `/api/v1/datasets/:id/export`
- **Auth:** Authenticated
- **Response:** Streaming CSV download with formula injection mitigation.

---

## 4. Analysis & Visual Studio Endpoints (`/api/v1/analyses`)

### 4.1. List Saved Analyses
- **Method:** `GET`
- **Path:** `/api/v1/analyses`
- **Query Parameters:** `datasetId`, `search`, `sort`
- **Auth:** Authenticated
- **Response `200 OK`:** Array of saved analysis cards.

### 4.2. Create Saved Analysis
- **Method:** `POST`
- **Path:** `/api/v1/analyses`
- **Auth:** Authenticated
- **Request Body:**
  ```json
  {
    "datasetId": "653b...",
    "title": "Confirmed Cases by Region Over Time",
    "description": "Cross-sectional analysis of first wave acceleration",
    "chartType": "line",
    "xAxisColumn": "Date",
    "yAxisColumn": "ConfirmedCases",
    "aggregation": "sum",
    "groupByColumn": "Region",
    "filterRules": []
  }
  ```
- **Response `201 Created`:** Persisted analysis document.

### 4.3. Compute Live Chart Data
- **Method:** `POST`
- **Path:** `/api/v1/analyses/chart-data`
- **Auth:** Authenticated
- **Request Body:** Same parameters as Create Analysis (datasetId, chartType, xAxisColumn, yAxisColumn, aggregation, groupByColumn, filterRules).
- **Response `200 OK`:** Formatted Chart.js dataset structure: `{ labels: [...], datasets: [{ label, data: [...] }] }`.

### 4.4. Get / Update / Delete / Duplicate Analysis
- `GET /api/v1/analyses/:id`
- `PATCH /api/v1/analyses/:id`
- `DELETE /api/v1/analyses/:id`
- `POST /api/v1/analyses/:id/duplicate`

### 4.5. Export Analysis Report as Standalone HTML
- **Method:** `GET`
- **Path:** `/api/v1/analyses/:id/export`
- **Auth:** Authenticated
- **Response:** Formatted HTML download containing title, dataset details, metadata, key statistics, and print stylesheet.

---

## 5. User Profile & Settings (`/api/v1/user`)

- `PATCH /api/v1/user/profile` — Update user name and theme preference.
- `PATCH /api/v1/user/password` — Change password with current password verification.
- `DELETE /api/v1/user/account` — Permanently purge account and all associated datasets, rows, and reports.
