const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  foodType: { type: String, required: true },
  quantity: { type: Number, required: true },
  bestBefore: { type: Date, required: true },
  photoUrl: { type: String },  // store Cloudinary or local file URL
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  status: {
    type: String,
    enum: ["Pending", "Assigned", "PickedUp", "Delivered", "Rejected"],
    default: "Pending",
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // volunteer or NGO
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Donation", donationSchema);
