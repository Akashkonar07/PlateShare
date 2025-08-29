const Donation = require("../models/Donation");
const User = require("../models/user");
const cloudinary = require("../config/cloudinary");

// ===== Donor Creates Donation =====
exports.createDonation = async (req, res) => {
  try {
    const { foodType, quantity, bestBefore, latitude, longitude, description } = req.body;
    let photoUrl = null;

    // Upload photo to cloudinary if provided
    if (req.file) {
      const result = await cloudinary.uploader.upload_stream(
        { resource_type: "image", folder: "plateshare/donations" },
        (error, result) => {
          if (error) throw error;
          return result;
        }
      );
      
      // Convert buffer to base64 and upload
      const base64 = req.file.buffer.toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${base64}`;
      const uploadResult = await cloudinary.uploader.upload(dataURI, {
        folder: "plateshare/donations"
      });
      photoUrl = uploadResult.secure_url;
    }

    const donation = new Donation({
      donor: req.user._id,
      foodType,
      quantity: parseInt(quantity),
      bestBefore: new Date(bestBefore),
      photoUrl,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      description,
      status: "Pending"
    });

    await donation.save();
    
    // Populate donor info for response
    await donation.populate('donor', 'name email');
    
    res.status(201).json({ 
      message: "Donation created successfully", 
      donation 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ===== Donor Views Their Donations =====
exports.getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user._id })
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 });
    res.json({ donations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

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
    if (!["PickedUp", "Assigned"].includes(donation.status)) {
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
