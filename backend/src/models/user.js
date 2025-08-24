const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: {
    type: String,
    enum: ["Donor", "Volunteer", "NGO", "Admin"],
    default: "Donor",
  },
  password: { type: String, required: true }, // hashed password
  isVerified: { type: Boolean, default: false }, // for email/OTP verification
  points: { type: Number, default: 0 },
  badges: [String],
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Password validation method
userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
