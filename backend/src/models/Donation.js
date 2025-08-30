const mongoose = require("mongoose");

// Check if the model already exists to prevent recompilation
let Donation;

try {
  // Try to get the model if it exists
  Donation = mongoose.model("Donation");
} catch (e) {
  // If it doesn't exist, define it
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
    notes: { type: String },
    photoUrl: { type: String } // Photo URL for verification
  }],
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Urgent"],
    default: "Medium"
  },
  estimatedPickupTime: { type: Date },
  actualPickupTime: { type: Date },
  actualDeliveryTime: { type: Date },
  // Photo verification
  pickupPhotoUrl: { type: String }, // Photo taken during pickup
  deliveryPhotoUrl: { type: String }, // Photo taken during delivery
  // CSR Details
  csrDetails: {
    recipientName: { type: String },
    recipientType: { type: String, enum: ["Individual", "NGO", "Shelter", "Other"] },
    recipientContact: { type: String },
    numberOfPeopleServed: { type: Number },
    notes: { type: String },
    verifiedByDonor: { 
      isVerified: { type: Boolean, default: false },
      verifiedAt: { type: Date },
      feedback: { type: String }
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

  Donation = mongoose.model("Donation", donationSchema);
}

module.exports = Donation;
