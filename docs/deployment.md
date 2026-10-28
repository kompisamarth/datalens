# DataLens Studio — Cloud Production Deployment Guide

This guide details the complete deployment workflow for **DataLens Studio** across premier cloud hosting platforms, with optimized configurations for **Vercel** (Serverless + Edge CDN) and **Render** (Continuous Container Web Service).

---

## 1. Prerequisites: Cloud Database (MongoDB Atlas)

Before deploying to any cloud host, create a free cloud-hosted MongoDB cluster:

1. Visit [MongoDB Atlas](https://www.mongodb.com/atlas/database) and sign in or create an account.
2. Click **Create a Database** → Select the **M0 Free Tier** cluster.
3. Under **Security Quickstart**:
   - Create a database user with username and strong password (e.g., `datalens_admin` / `<secure-password>`).
   - Under **IP Access List**, click **Add IP Address** → Choose **Allow Access from Anywhere (`0.0.0.0/0`)** so serverless cloud functions can connect.
4. Click **Connect** → **Drivers** (Node.js) → Copy the connection string:
   ```
   mongodb+srv://datalens_admin:<password>@cluster0.abcde.mongodb.net/datalens_studio?retryWrites=true&w=majority
   ```

---

## 2. Option A: Deploy to Vercel (Recommended for Jamstack/Serverless)

DataLens Studio includes native Vercel serverless adapters:
- `vercel.json`: Manages URL rewrites, static caching for `/client/`, and clean routing without `.html` extensions.
- `api/index.js`: Serverless bridge connecting Express with persistent MongoDB connection pooling.

### Step 1: Deploy via Vercel CLI
From the project root in terminal:
```bash
# Run Vercel CLI
npx vercel
```
1. Accept defaults:
   - `Set up and deploy?` → **Y**
   - `Which scope?` → Select your Vercel account
   - `Link to existing project?` → **N**
   - `Project name?` → `datalens-studio`
   - `Directory located?` → `./` (Current directory)
2. Add Production Environment Variables in Vercel:
   ```bash
   npx vercel env add MONGODB_URI production
   # Paste: mongodb+srv://...

   npx vercel env add SESSION_SECRET production
   # Enter 32+ character random string

   npx vercel env add NODE_ENV production
   # Enter: production
   ```
3. Deploy to production:
   ```bash
   npx vercel --prod
   ```

### Step 2: Deploy via GitHub (Alternative)
1. Push the repository to GitHub.
2. Log into [vercel.com](https://vercel.com) → Click **Add New Project** → Import repository.
3. In **Environment Variables**, add:
   - `MONGODB_URI`: `mongodb+srv://...`
   - `SESSION_SECRET`: `<your-random-32char-secret>`
   - `NODE_ENV`: `production`
4. Click **Deploy**. Vercel will build and assign an SSL-secured live URL (e.g. `https://datalens-studio.vercel.app`).

---

## 3. Option B: Deploy to Render (Recommended for Full-Stack Node)

Render runs DataLens Studio as a continuous persistent container service using the included `render.yaml`.

1. Push the repository to GitHub.
2. Log into [render.com](https://render.com) → Click **New +** → **Blueprint** (or **Web Service**).
3. Connect your GitHub repository.
4. If choosing **Web Service** manually:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `MONGODB_URI` = `mongodb+srv://...`
   - `SESSION_SECRET` = `<your-random-secret>`
   - `FRONTEND_ORIGIN` = `*`
6. Click **Create Web Service**. Render will provision and launch your service with a public URL (e.g. `https://datalens-studio.onrender.com`).

---

## 4. Option C: Containerized Deployment (Docker)

To deploy using Docker or container orchestrators (Railway, Fly.io, AWS ECS):

```bash
# Build the production image
docker build -t datalens-studio .

# Run the container
docker run -p 5000:5000 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e SESSION_SECRET="your-production-secret" \
  -e NODE_ENV="production" \
  datalens-studio
```

---

## 5. Production Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Enables secure session cookies and security optimizations. |
| `MONGODB_URI` | **Yes** | — | MongoDB Atlas cloud connection URI (`mongodb+srv://...`). |
| `SESSION_SECRET` | **Yes** | — | 32+ character random string used to sign session cookies. |
| `PORT` | No | `5000` | Port on which the HTTP server listens. |
| `FRONTEND_ORIGIN`| No | `*` | Allowed CORS origins. Previews on `*.vercel.app` & `*.onrender.com` are auto-whitelisted. |
| `SESSION_MAX_AGE_MS`| No | `86400000` | Session lifetime (default: 24 hours). |

---

## 6. Post-Deployment Seed & Health Verification

Once deployed:
1. **Health Check:** Visit `https://your-domain/api/v1/health` → Expect `{"status": "healthy"}`.
2. **Seed Demo Data (Optional):**
   ```bash
   MONGODB_URI="mongodb+srv://..." node server/src/seed/seed.js
   ```
3. Test Registration, Sample Benchmark loading, and HTML Report downloads directly in the live browser.
