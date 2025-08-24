require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");

// ===== Route Imports =====
const authRoutes = require("./routes/auth");
const donationRoutes = require("./routes/donations");
const volunteerRoutes = require("./routes/volunteers");
const ngoRoutes = require("./routes/ngos");
const reportRoutes = require("./routes/reports");
const mlRoutes = require("./routes/ml");
const notificationRoutes = require("./routes/notifications");

// ===== Middleware Imports =====
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

// ===== Middleware =====
app.use(express.json());
app.use(cors()); // restrict in production

// ===== Logging middleware (dev) =====
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ===== Multer Setup (for file uploads) =====
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ===== MongoDB Connection =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB error:", err));

// ===== Routes =====
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
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
