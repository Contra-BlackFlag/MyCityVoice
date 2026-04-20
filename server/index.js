require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const authRouter    = require("./routes/auth");
const reportsRouter = require("./routes/reports");
const adminRouter   = require("./routes/admin");

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(httpServer, { cors:{ origin:CLIENT_URL, methods:["GET","POST"] } });
app.locals.io = io;

// Replace the existing cors line with this:
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "http://localhost:3000",
    ].filter(Boolean);
    // Allow requests with no origin (mobile apps, Postman, etc)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      console.log("[CORS] Blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET","POST","PATCH","DELETE","PUT"],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended:true }));
app.use("/uploads", express.static(path.join(__dirname,"uploads")));

app.use("/api/auth",    authRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/admin",   adminRouter);
app.get("/api/health",  (_,res) => res.json({ status:"ok" }));

// Serve React in production
// Serve React in production (only if dist folder exists)
const distPath = path.join(__dirname, "../client/dist");
if (process.env.NODE_ENV === "production" && require("fs").existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/uploads"))
      res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use((err,req,res,next) => {
  console.error("[Error]", err.message);
  res.status(err.status||500).json({ success:false, error:err.message||"Server error" });
});

io.on("connection", socket => {
  console.log(`[Socket] +${socket.id}`);
  socket.on("disconnect", () => console.log(`[Socket] -${socket.id}`));
});

httpServer.listen(PORT, () => console.log(`\n🚀 CivicPulse v4 on :${PORT}\n`));
