const Donation = require("../models/Donation");
const User = require("../models/User");

// ===== Volunteer Accept Donation =====
exports.acceptDonation = async (req, res) => {
  const { donationId } = req.params;

  try {
    const donation = await Donation.findById(donationId);
    if (!donation) return res.status(404).json({ message: "Donation not found" });
    if (donation.status !== "Assigned") return res.status(400).json({ message: "Donation not available for pickup" });

    donation.status = "PickedUp";
    donation.assignedTo = req.user._id;
    await donation.save();

    res.json({ message: "Donation accepted and picked up", donation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Volunteer/NGO Confirm Delivery =====
exports.confirmDelivery = async (req, res) => {
  const { donationId } = req.params;

  try {
    const donation = await Donation.findById(donationId);
    if (!donation) return res.status(404).json({ message: "Donation not found" });
    if (donation.status !== "PickedUp" && donation.status !== "Assigned") {
      return res.status(400).json({ message: "Donation not ready for delivery" });
    }

    donation.status = "Delivered";
    await donation.save();

    res.json({ message: "Donation delivered successfully", donation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Volunteer Decline Donation =====
exports.declineDonation = async (req, res) => {
  const { donationId } = req.params;

  try {
    const donation = await Donation.findById(donationId);
    if (!donation) return res.status(404).json({ message: "Donation not found" });

    donation.status = "Rejected";
    donation.assignedTo = null;
    await donation.save();

    res.json({ message: "Donation declined", donation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Get Assigned Donations for Volunteer/NGO =====
exports.getAssignedDonations = async (req, res) => {
  try {
    const donations = await Donation.find({
      assignedTo: req.user._id,
      status: { $in: ["Assigned", "PickedUp"] },
    }).sort({ createdAt: -1 });

    res.json({ donations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
