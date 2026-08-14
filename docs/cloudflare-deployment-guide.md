# Cloudflare Pages Deployment Guide — DHARTI-RAKSHAK

Follow these quick steps to host your DHARTI-RAKSHAK Web Dashboard for free on Cloudflare Pages with auto-deployment from GitHub.

---

## Step 1: Sign in to Cloudflare
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com/)
2. Sign in or create a free Cloudflare account.

---

## Step 2: Navigate to Workers & Pages
1. In the left-hand sidebar, click on **Workers & Pages**.
2. Click the **Create Application** button.
3. Select the **Pages** tab.
4. Click **Connect to Git**.

---

## Step 3: Connect Your GitHub Repository
1. Select your GitHub account (`ss0199472`).
2. If prompted, authorize Cloudflare to access your GitHub repositories.
3. Select the repository: **`DHARTI-RAKSHAK-Smart-Soil-Monitor`**.
4. Click **Begin setup**.

---

## Step 4: Configure Build Settings
Fill in the deployment settings:

| Setting | Value | Notes |
|---|---|---|
| **Project name** | `dharti-rakshak-dashboard` | (or any name you like) |
| **Production branch** | `master` | Default branch |
| **Framework preset** | `None` | Static HTML/JS |
| **Build command** | *(Leave empty)* | No build tool required |
| **Build output directory** | `web-dashboard` | ⚠️ **Important: Point to `web-dashboard` folder** |

---

## Step 5: Deploy
1. Click **Save and Deploy**.
2. Cloudflare will fetch the repository from GitHub and deploy your site in ~10 seconds.
3. You will receive a permanent live URL like:
   `https://dharti-rakshak-dashboard.pages.dev`

---

## Automatic Continuous Deployment (CI/CD)
Whenever you push changes or new updates to GitHub in the `master` branch, Cloudflare Pages will automatically rebuild and deploy your website live within seconds!
