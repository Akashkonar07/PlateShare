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
    
    // Profile Information
    profile: {
      phone: { type: String },
      address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        zipCode: { type: String },
        coordinates: {
          latitude: { type: Number },
          longitude: { type: Number }
        }
      },
      avatar: { type: String }, // Profile picture URL
      bio: { type: String },
      dateOfBirth: { type: Date },
      preferences: {
        notifications: {
          email: { type: Boolean, default: true },
          push: { type: Boolean, default: true },
          sms: { type: Boolean, default: false }
        },
        privacy: {
          showProfile: { type: Boolean, default: true },
          showLocation: { type: Boolean, default: true },
          showStats: { type: Boolean, default: true }
        }
      }
    },
    
    // NGO Specific Fields
    ngoCapacity: {
      dailyCapacity: { type: Number, default: 0 },
      currentLoad: { type: Number, default: 0 },
      maxBulkSize: { type: Number, default: 100 },
      operatingHours: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "18:00" }
      },
      workingDays: [{ type: String, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] }],
      foodPreferences: [{ type: String }], // Types of food they prefer to handle
      serviceRadius: { type: Number, default: 10 }, // km
      reliabilityScore: { type: Number, default: 100, min: 0, max: 100 },
      performanceMetrics: {
        totalConfirmed: { type: Number, default: 0 },
        totalAssigned: { type: Number, default: 0 },
        avgConfirmationTime: { type: Number, default: 0 }, // minutes
        lastResetDate: { type: Date, default: Date.now }
      }
    },
    
    // Volunteer Specific Fields  
    volunteerPreferences: {
      maxDistance: { type: Number, default: 15 }, // km
      availableHours: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "18:00" }
      },
      availableDays: [{ type: String, enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] }],
      vehicleType: { type: String, enum: ["Walking", "Bicycle", "Motorcycle", "Car", "Van"], default: "Car" },
      maxCapacity: { type: Number, default: 5 } // servings
    },
    
    // General Stats and Points
    points: { type: Number, default: 0 },
    badges: { type: [String], default: [] },
    
    // Activity Tracking
    lastLoginAt: { type: Date },
    lastActiveAt: { type: Date },
    loginCount: { type: Number, default: 0 },
    
    // Account Status
    isActive: { type: Boolean, default: true },
    suspendedUntil: { type: Date },
    suspensionReason: { type: String },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }, {
    timestamps: true
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
