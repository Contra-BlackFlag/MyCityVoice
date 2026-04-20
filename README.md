# CivicPulse v4

## Setup

### 1. Supabase
- Create project at https://supabase.com
- Run `SUPABASE_SETUP.sql` in SQL Editor
- Authentication → Email → disable "Confirm email"
- Get Project URL + service_role key from Project Settings → API

### 2. server/.env (copy from .env.example)
```
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=long_random_string
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  (service_role key)
ADMIN_SECRET_CODE=your_code
```

### 3. Install & run
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
npm run dev
```

### Admin setup
Login screen → "🛡️ Admin Registration" → enter secret code

## Features
- ✅ Auth with forgot/reset password
- ✅ Admin portal with geofencing (Maharashtra map)
- ✅ Admin sets pin threshold (live update)
- ✅ Camera-only photo with auto GPS location
- ✅ Up/downvote with pin threshold progress bar
- ✅ Delete own posts and comments
- ✅ Edit profile with photo
- ✅ Fixed filter bar (sort + category)
- ✅ Mobile-first responsive (works on phone + desktop)
- ✅ Real-time updates via Socket.io
- ✅ Leaderboard with 🥇🥈🥉 badges
