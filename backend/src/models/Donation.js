const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  foodType: { type: String, required: true },
  quantity: { type: Number, required: true },
  bestBefore: { type: Date, required: true },
  description: { type: String },  // additional details about the food
  photoUrl: { type: String },  // store Cloudinary or local file URL
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  status: {
    type: String,
    enum: ["Pending", "Assigned", "PickedUp", "Delivered", "Rejected", "Cancelled"],
    default: "Pending",
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // volunteer or NGO
  assignedAt: { type: Date }, // when the donation was assigned
  trackingHistory: [{
    status: {
      type: String,
      enum: ["Pending", "Assigned", "PickedUp", "Delivered", "Rejected", "Cancelled"],
      required: true
    },
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String }
  }],
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Urgent"],
    default: "Medium"
  },
  estimatedPickupTime: { type: Date },
  actualPickupTime: { type: Date },
  actualDeliveryTime: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Donation", donationSchema);
