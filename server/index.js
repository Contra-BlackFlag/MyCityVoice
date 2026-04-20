require("dotenv").config();
const express = require("express");
const http    = require("http");
const { Server } = require("socket.io");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");

const authRouter    = require("./routes/auth");
const reportsRouter = require("./routes/reports");
const adminRouter   = require("./routes/admin");

const app        = express();
const httpServer = http.createServer(app);
const PORT       = process.env.PORT || 5000;

// ── CORS — must be first, before all routes ──────────────────
const corsOptions = {
  origin: true,
  methods: ["GET","POST","PATCH","DELETE","PUT","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight

// ── Socket.io ─────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ["GET","POST"],
    credentials: true,
  },
});
app.locals.io = io;

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── API Routes ────────────────────────────────────────────────
app.use("/api/auth",    authRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/admin",   adminRouter);
app.get("/api/health",  (_, res) => res.json({ status: "ok" }));

// ── Serve React (only if dist exists — not on Render/API-only) ─
const distPath = path.join(__dirname, "../client/dist");
if (process.env.NODE_ENV === "production" && fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/uploads"))
      res.sendFile(path.join(distPath, "index.html"));
  });
}

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[Error]", err.message);
  res.status(err.status || 500).json({ success: false, error: err.message || "Server error" });
});

// ── Socket events ─────────────────────────────────────────────
io.on("connection", socket => {
  console.log(`[Socket] +${socket.id}`);
  socket.on("disconnect", () => console.log(`[Socket] -${socket.id}`));
});

// ── Start ─────────────────────────────────────────────────────
httpServer.listen(PORT, () => console.log(`\n🚀 CivicPulse v4 on :${PORT}\n`));