// server/index.js
require("dotenv").config();
const express = require("express");
const http    = require("http");
const { Server } = require("socket.io");
const cors    = require("cors");
const path    = require("path");

const authRouter    = require("./routes/auth");
const reportsRouter = require("./routes/reports");
const adminRouter   = require("./routes/admin");

const app        = express();
const httpServer = http.createServer(app);
const PORT       = process.env.PORT || 5000;

// ✅ Allowed origins (local + production)
const allowedOrigins = [
  "http://localhost:5173",
  "https://my-city-voice.vercel.app" // from Render env
];

// ✅ Socket.io CORS
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  },
});
app.locals.io = io;

// ✅ Express CORS (robust)
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS not allowed: " + origin));
    }
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth",    authRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/admin",   adminRouter);

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error("[Error]", err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Server error"
  });
});

// ✅ Socket logs
io.on("connection", socket => {
  console.log(`[Socket] +${socket.id}`);
  socket.on("disconnect", () => console.log(`[Socket] -${socket.id}`));
});

// ✅ Start server
httpServer.listen(PORT, () => {
  console.log(`\n🚀 CivicPulse v3 on :${PORT} (Supabase backend)\n`);
});