const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Check if the model already exists to prevent recompilation
let User;

try {
  // Try to get the model if it exists
  User = mongoose.model("User");
} catch (e) {
  // If it doesn't exist, define it
  const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["Donor", "Volunteer", "NGO", "Admin"],
      default: "Donor",
    },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    points: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  });

  // 🔒 Hash password before saving
  userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    try {
      this.password = await bcrypt.hash(this.password, 10);
      next();
    } catch (err) {
      next(err);
    }
  });

  // ✅ Compare password method
  userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
  };

  User = mongoose.model("User", userSchema);
}

module.exports = User;
