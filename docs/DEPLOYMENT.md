# Deployment Guide — Free Hosting

This guide deploys the Next.js frontend to **Vercel** (free) and the Rust/Axum backend to **Render** (free).

---

## Overview

| Service  | Platform | Cost | URL shape                          |
|----------|----------|------|------------------------------------|
| Frontend | Vercel   | Free | `https://your-app.vercel.app`      |
| Backend  | Render   | Free | `https://your-backend.onrender.com`|

**Free tier caveats:**
- Render free instances spin down after 15 minutes of inactivity. The first request after sleep takes ~30 seconds to wake up. Upgrade to a paid plan ($7/mo) to eliminate cold starts.
- Vercel free tier has generous bandwidth and build limits suitable for a personal/small project.

---

## Prerequisites

- A [GitHub](https://github.com) account with this repo pushed
- A [Vercel](https://vercel.com) account (sign in with GitHub)
- A [Render](https://render.com) account (sign in with GitHub)
- Your `GOOGLE_CIVIC_API_KEY` from Google Cloud Console

---

## Step 1 — Update Backend CORS

The backend currently only allows `http://localhost:3000`. Before deploying, update it to also allow your Vercel URL.

Open `backend/src/main.rs` and replace the CORS block:

```rust
// Replace this:
let cors = CorsLayer::new()
    .allow_origin(
        "http://localhost:3000"
            .parse::<axum::http::HeaderValue>()
            .unwrap(),
    )
    .allow_methods(Any)
    .allow_headers(Any);

// With this (reads allowed origins from env so you don't hardcode URLs):
let allowed_origins: Vec<axum::http::HeaderValue> = std::env::var("ALLOWED_ORIGINS")
    .unwrap_or_else(|_| "http://localhost:3000".to_string())
    .split(',')
    .filter_map(|s| s.trim().parse().ok())
    .collect();

let cors = CorsLayer::new()
    .allow_origin(allowed_origins)
    .allow_methods(Any)
    .allow_headers(Any);
```

Commit and push this change before deploying.

---

## Step 2 — Deploy the Backend to Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure the service:
   - **Name:** `votingapp-backend` (or any name)
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Docker`
   - **Instance Type:** `Free`
4. Under **Environment Variables**, add:
   | Key | Value |
   |-----|-------|
   | `GOOGLE_CIVIC_API_KEY` | your actual API key |
   | `ALLOWED_ORIGINS` | `https://your-app.vercel.app` *(fill in after Step 3)* |
5. Click **Create Web Service**
6. Wait for the build (~5–10 min first time). Copy the service URL when done — it looks like `https://votingapp-backend.onrender.com`.

> **Note:** You'll update `ALLOWED_ORIGINS` after you know your Vercel URL (Step 3). You can set it to `*` temporarily to unblock testing, then lock it down.

---

## Step 3 — Deploy the Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Configure the project:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `frontend`
4. Under **Environment Variables**, add:
   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://votingapp-backend.onrender.com` (your Render URL) |
5. Click **Deploy**
6. When done, Vercel gives you a URL like `https://votingapp-abc123.vercel.app`. Note this URL.

---

## Step 4 — Update Backend ALLOWED_ORIGINS

Now that you have your Vercel URL:

1. Go to Render → your backend service → **Environment**
2. Update `ALLOWED_ORIGINS` to your exact Vercel URL:
   ```
   https://votingapp-abc123.vercel.app
   ```
3. Render will redeploy automatically.

---

## Step 5 — Verify

```bash
# Check backend health
curl https://votingapp-backend.onrender.com/health
# Expected: {"status":"ok"}

# Visit frontend
open https://votingapp-abc123.vercel.app
```

Test the voter info lookup end-to-end with a real address.

---

## Custom Domain (Optional, Free)

Vercel allows you to attach a custom domain on the free tier:

1. Vercel → your project → **Settings** → **Domains**
2. Add your domain and follow the DNS instructions
3. Update `ALLOWED_ORIGINS` on Render to your custom domain

---

## Keeping the Backend Awake (Optional)

To avoid the 30-second cold start on Render's free tier, set up a free uptime monitor to ping `/health` every 10 minutes:

- [UptimeRobot](https://uptimerobot.com) — free, monitors up to 50 URLs
  - Monitor type: HTTP(s)
  - URL: `https://votingapp-backend.onrender.com/health`
  - Interval: 5 minutes

---

## Continuous Deployment

Both platforms auto-deploy on every push to `main` — no extra setup needed. The existing GitHub Actions CI (`.github/workflows/ci.yml`) will continue to run on PRs.
