# 🏙️ CivicPulse v3

Full-stack civic issue reporting platform with Supabase backend.

## ✨ Features
| Feature | Details |
|---|---|
| **Auth** | Sign up / Sign in / Forgot password via Supabase Auth |
| **Admin Portal** | Separate admin registration with secret code |
| **Geofencing** | Admin draws polygon zone — filters admin view by area |
| **Dynamic threshold** | Admin sets upvote threshold for map pinning |
| **Camera only** | Photo capture with automatic GPS location |
| **Feed** | Instagram-style posts from all users, real-time |
| **Up/Downvote** | Toggle votes, can't vote own posts |
| **Map Pinning** | Threshold upvotes → auto-pins to public map |
| **Leaderboard** | 🥇🥈🥉 badges for top 3 contributors |
| **Live updates** | Socket.io real-time for new posts, votes, threshold changes |

## 🚀 Setup

### 1. Create Supabase project
Go to https://supabase.com → New Project

### 2. Run SQL schema
Dashboard → SQL Editor → New Query → paste `SUPABASE_SETUP.sql` → Run

### 3. Get your keys
Dashboard → Project Settings → API:
- **Project URL** → `SUPABASE_URL`
- **service_role secret** → `SUPABASE_SERVICE_KEY`

### 4. Configure server
Copy `server/.env.example` to `server/.env` and fill in:
```env
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_long_random_secret_here
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
ADMIN_SECRET_CODE=your_admin_secret
```

### 5. Install & run
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
npm run dev
```

Frontend: http://localhost:5173
Backend:  http://localhost:5000

## 🛡️ Admin Setup
1. Go to http://localhost:5173
2. Click **"🛡️ Admin Registration"** on the login screen
3. Fill in username, email, password + admin secret code (from your .env)
4. You'll be redirected to the admin dashboard

## 🗺️ Geofencing Logic
- Admin draws a zone polygon on the map
- Reports **outside** the zone still appear in the **public feed** for all users
- Reports **outside** the zone are **hidden from the admin's reports tab**
- This way citizens can still see all reports, but admins only manage their area

## 📦 Tech Stack
| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, React-Leaflet, leaflet-draw |
| Backend | Node.js, Express, Socket.io |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + JWT |
| Storage | Supabase Storage (images) |
| Map tiles | CartoDB Dark (free, no API key) |
| Geocoding | Nominatim (free) |
