# 🏙️ CivicPulse — Report. Track. Resolve.

A full-stack civic issue reporting platform where citizens can:
- 📸 **Photo-report** issues with geolocation pinning on a live map
- 🗺️ **View all reports** on an interactive world map (OpenStreetMap)
- 📡 **Live Feed** — social media-style real-time updates via WebSockets
- 👍 **Upvote** issues to surface the most critical problems
- 💬 **Comment** on reports for community discussion
- 🔍 **Filter** by category, status, and sort order

---

## 🗂️ Project Structure

```
civic-report/
├── package.json              # Root scripts (dev, build, start)
├── server/                   # Node.js + Express backend
│   ├── index.js              # Server entry point + Socket.io
│   ├── package.json
│   ├── .env                  # Environment config
│   ├── db/
│   │   └── database.js       # SQLite init + schema
│   ├── middleware/
│   │   └── upload.js         # Multer image upload config
│   ├── routes/
│   │   └── reports.js        # All report CRUD endpoints
│   ├── data/                 # SQLite DB file (auto-created)
│   └── uploads/              # Uploaded images (auto-created)
└── client/                   # React + Vite frontend
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx           # Entry point
        ├── App.jsx            # Router + modal state
        ├── styles/
        │   └── globals.css    # Design system + tokens
        ├── context/
        │   └── SocketContext.jsx  # Socket.io provider
        ├── hooks/
        │   └── useSession.js  # Anonymous session ID
        ├── services/
        │   └── api.js         # Axios API client
        ├── utils/
        │   └── constants.js   # Categories, statuses, helpers
        ├── components/
        │   ├── Navbar.jsx/css
        │   ├── ReportModal.jsx/css   # Multi-step report form
        │   ├── ReportDetail.jsx/css  # Issue detail panel
        │   └── FeedCard.jsx/css      # Feed post card
        └── pages/
            ├── MapPage.jsx/css   # Leaflet map view
            └── FeedPage.jsx/css  # Live social feed
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- npm v9+

### 1. Install all dependencies

```bash
# From the project root
npm run install:all
```

Or manually:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment (optional)

The server ships with a default `.env`. Edit `server/.env` if needed:
```
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Run in development mode

```bash
# From project root — starts both server + client
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health check**: http://localhost:5000/api/health

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | List reports (supports `?category`, `?status`, `?sort`, `?limit`, `?offset`) |
| GET | `/api/reports/map` | Minimal map data for all pins |
| GET | `/api/reports/:id` | Single report with comments |
| POST | `/api/reports` | Create report (multipart/form-data) |
| POST | `/api/reports/:id/upvote` | Toggle upvote |
| POST | `/api/reports/:id/comments` | Add comment |
| PATCH | `/api/reports/:id/status` | Update status (open/in_progress/resolved) |

### POST /api/reports fields
| Field | Type | Required |
|-------|------|----------|
| title | string | ✅ |
| description | string | ✅ |
| latitude | number | ✅ |
| longitude | number | ✅ |
| category | string | ❌ (default: other) |
| address | string | ❌ |
| image | file (JPEG/PNG/WebP) | ❌ |

---

## 🌐 Real-time Events (Socket.io)

| Event | Direction | Payload |
|-------|-----------|---------|
| `new_report` | Server → All clients | Full report object |
| `upvote_update` | Server → All clients | `{ reportId, upvotes }` |
| `new_comment` | Server → All clients | `{ reportId, comment }` |
| `status_update` | Server → All clients | `{ reportId, status }` |

---

## 🏗️ Build for Production

```bash
# Build React frontend
npm run build

# Serve everything from the Node server
# The built files go to client/dist/
# Point your Express server to serve client/dist as static
npm start
```

---

## 🗺️ Map Provider

Uses **OpenStreetMap + CartoDB Dark** tiles — completely free, no API key required.
Reverse geocoding uses **Nominatim** (free OpenStreetMap geocoder).

---

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, React-Leaflet |
| Styling | Custom CSS with CSS variables |
| Real-time | Socket.io |
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| File uploads | Multer |
| Map tiles | CartoDB Dark (OpenStreetMap) |
| Geocoding | Nominatim (OpenStreetMap) |
