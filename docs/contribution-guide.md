# DataLens Studio — Team Collaboration & GitHub Workflow Guide

This document establishes the collaboration standards, Git branching models, code review processes, and team responsibilities for the DataLens Studio capstone team.

---

## 1. Team Roles & Division of Responsibilities

To satisfy college capstone evaluation criteria, technical responsibilities are divided into 4 modular domains. Each team member is responsible for authoring, testing, and presenting their respective domain during the faculty evaluation:

| Domain | Lead Focus | Key Deliverables |
|---|---|---|
| **Member 1: Security & Identity Architect** | Authentication, Sessions, CSRF, Security Headers, User Settings | Auth routes, Bcrypt hashing, Mongo session store, Rate limiting, CSRF tokens, Account deletion cascade |
| **Member 2: Data Pipeline & Storage Engineer** | CSV Upload, Schema Inference, Mongoose Models, Row Bounding | Streaming CSV parser, Type detector, Dataset CRUD, Paginated row preview, MongoDB indexes, cascading cleanup |
| **Member 3: Data Quality & Analytics Engineer** | Data Quality Intelligence, Automated Insights, Outliers, Cleaning | 0–100 Quality Score algorithm, Missingness/Duplicate audits, Tukey IQR fences, Pearson correlation, Imputation service |
| **Member 4: Visualization & UX Architect** | Chart Advisor, Visual Studio, Saved Reports, Design System, Exports | Chart.js interactive engine, Recommendation advisor, Saved analyses CRUD, Standalone HTML report exporter, CSS Theme tokens |

---

## 2. Git Branching Strategy

Our team uses a structured **Feature Branch Workflow**:
- `main`: Production-ready, fully-tested codebase demonstrated to faculty.
- `develop`: Integration branch where feature branches are merged after review.
- `feature/*`: Dedicated branches for isolated feature implementations.
- `test/*`: Automated test suites and integration verification.
- `docs/*`: Capstone documentation, diagrams, and demonstration guides.

### Branch Naming Conventions
- `feature/authentication` — Registration, login, sessions, security middleware
- `feature/dataset-management` — Upload, preview, schema inference, dataset CRUD
- `feature/data-quality` — Quality scoring, audits, and cleaning operations
- `feature/visualizations` — Chart studio, Chart.js integration, recommendation engine
- `feature/analysis-reports` — Saved analyses, duplication, and HTML report export
- `test/api-integration` — Automated test suites and regression scripts
- `docs/project-documentation` — Requirements, wireframes, architecture specs, demo guide

---

## 3. Step-by-Step Contribution Workflow

### Step 1: Sync with Upstream
```bash
git checkout develop
git pull origin develop
```

### Step 2: Create a Feature Branch
```bash
git checkout -b feature/data-quality
```

### Step 3: Implement Code & Local Testing
- Ensure all new logic follows the layered architecture (Route -> Controller -> Service -> Model).
- Run automated tests before committing:
  ```bash
  npm test
  ```

### Step 4: Commit with Conventional Commits
```bash
git status
git add <files>
git commit -m "feat(quality): implement 0-100 data quality score calculation"
```
*Commit Prefix Convention:*
- `feat:` New feature
- `fix:` Bug fix
- `test:` Adding or updating tests
- `docs:` Documentation updates
- `style:` Formatting or UI styling

### Step 5: Push Branch and Open a Pull Request (PR)
```bash
git push -u origin feature/data-quality
```
- Open a PR targeting `develop`.
- Complete the PR template checklist.
- Tag at least one peer reviewer.

### Step 6: Code Review & Merging
- Reviewers inspect code for:
  - Input validation on both client and server.
  - Ownership verification (`ownerId` check).
  - Absence of hardcoded credentials or mock placeholders.
  - Test coverage.
- Merge via **Squash and Merge** or **Rebase and Merge** to maintain clean Git history.

---

## 4. Pull Request Verification Checklist
Before submitting a pull request, ensure:
- [ ] Code starts without errors using `npm start`.
- [ ] New endpoints have server-side validation and error envelopes.
- [ ] Associated automated tests pass (`npm test`).
- [ ] No plaintext secrets or real `.env` files are tracked.
- [ ] UI changes have been tested in both Light and Dark themes.
- [ ] Responsive design verified on mobile screen widths (375px+).
