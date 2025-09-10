require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");

// ===== Middleware Imports =====
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

// ===== Middleware =====
app.use(express.json());
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
  credentials: true
}));

// ===== Logging middleware =====
app.use((req, res, next) => {
  // Only log non-asset requests
  if (!req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

// Multer configuration has been moved to individual route files

// ===== MongoDB Connection =====
mongoose.connect(process.env.MONGO_URI) // modern default options
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ===== Route Imports =====
const authRoutes = require("./routes/auth");
const donationRoutes = require("./routes/donations");
const volunteerRoutes = require("./routes/volunteers");
const ngoRoutes = require("./routes/ngos");
const reportRoutes = require("./routes/reports");
const mlRoutes = require("./routes/ml");
const notificationRoutes = require("./routes/notifications");

// ===== Debug: Ensure routers are valid =====
[
  { name: "authRoutes", router: authRoutes },
  { name: "donationRoutes", router: donationRoutes },
  { name: "volunteerRoutes", router: volunteerRoutes },
  { name: "ngoRoutes", router: ngoRoutes },
  { name: "reportRoutes", router: reportRoutes },
  { name: "mlRoutes", router: mlRoutes },
  { name: "notificationRoutes", router: notificationRoutes }
].forEach(({ name, router }) => {
  if (!router || typeof router !== "function") {
    console.error(`❌ ${name} is invalid:`, router);
  } else {
    console.log(`✅ ${name} is valid`);
  }
});

// ===== API Routes =====
app.use("/api/auth", authRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/volunteers", volunteerRoutes);
app.use("/api/ngos", ngoRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/notifications", notificationRoutes);

// ===== Test Route =====
app.get("/", (req, res) => res.send("PlateShare API running..."));

// ===== 404 Handler =====
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// ===== Global Error Handler =====
app.use(errorHandler);

// ===== Start Server =====
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
});

module.exports = app;
