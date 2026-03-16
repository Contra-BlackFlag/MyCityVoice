// server/index.js
require("dotenv").config();
const express = require("express");
const http    = require("http");
const { Server } = require("socket.io");
const cors    = require("cors");
const path    = require("path");

const authRouter    = require("./routes/auth");
const reportsRouter = require("./routes/reports");

const app        = express();
const httpServer = http.createServer(app);
const PORT       = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, methods: ["GET","POST"] },
});
app.locals.io = io;

app.use(cors({ origin: CLIENT_URL, methods: ["GET","POST","PATCH","DELETE","PUT"] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth",    authRouter);
app.use("/api/reports", reportsRouter);
app.get("/api/health",  (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error("[Error]", err.message);
  res.status(err.status || 500).json({ success: false, error: err.message || "Server error" });
});

io.on("connection", socket => {
  console.log(`[Socket] connected: ${socket.id}`);
  socket.on("disconnect", () => console.log(`[Socket] disconnected: ${socket.id}`));
});

httpServer.listen(PORT, () => {
  console.log(`\n🚀 CivicPulse server on :${PORT}`);
  console.log(`🗄️  SQLite via node:sqlite (built-in, no compilation)\n`);
});
