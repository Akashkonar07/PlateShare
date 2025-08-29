const Donation = require("../models/Donation");
const User = require("../models/user");
const cloudinary = require("../config/cloudinary");
const AutoAssignmentService = require("../services/autoAssignmentService");

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
    
    // Auto-assign bulk donations (10+ servings) to NGOs
    if (donation.quantity >= 10) {
      setTimeout(async () => {
        const autoAssignResult = await AutoAssignmentService.autoAssignBulkDonation(donation._id);
        console.log(`Auto-assignment result for donation ${donation._id}:`, autoAssignResult);
      }, 1000); // Small delay to ensure donation is fully saved
    }
    
    // Populate donor info for response
    await donation.populate('donor', 'name email');
    
    res.status(201).json({ 
      message: "Donation created successfully", 
      donation,
      autoAssignmentTriggered: donation.quantity >= 10
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
    if (donation.status !== "Pending") return res.status(400).json({ message: "Donation not available for acceptance" });

    donation.status = "Assigned";
    donation.assignedTo = req.user._id;
    donation.assignedAt = new Date();
    
    // Add tracking entry
    donation.trackingHistory = donation.trackingHistory || [];
    donation.trackingHistory.push({
      status: "Assigned",
      timestamp: new Date(),
      updatedBy: req.user._id,
      notes: `Donation accepted by ${req.user.name}`
    });
    
    await donation.save();

    res.json({ message: "Donation accepted successfully", donation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Volunteer/NGO Confirm Delivery =====
exports.confirmDelivery = async (req, res) => {
  const { donationId } = req.params;
  try {
    const donation = await Donation.findById(donationId)
      .populate('donor', 'name email');
      
    if (!donation) return res.status(404).json({ message: "Donation not found" });
    if (!["PickedUp", "Assigned"].includes(donation.status)) {
      return res.status(400).json({ message: "Donation not ready for delivery" });
    }

    donation.status = "Delivered";
    donation.actualDeliveryTime = new Date();
    
    // Add tracking entry
    donation.trackingHistory = donation.trackingHistory || [];
    donation.trackingHistory.push({
      status: "Delivered",
      timestamp: new Date(),
      updatedBy: req.user._id,
      notes: `Delivery completed by ${req.user.name}`
    });
    
    await donation.save();

    // Update volunteer stats and gamification (only for volunteers, not NGOs)
    if (req.user.role === "Volunteer") {
      try {
        const { updateVolunteerStats } = require("./volunteerController");
        const result = await updateVolunteerStats(req.user._id, donation);
        
        res.json({ 
          message: "Donation delivered successfully", 
          donation,
          gamification: {
            pointsEarned: result.pointsEarned,
            leveledUp: result.leveledUp,
            newLevel: result.profile.level
          }
        });
      } catch (gamificationError) {
        console.error("Gamification update failed:", gamificationError);
        // Still return success for delivery, even if gamification fails
        res.json({ message: "Donation delivered successfully", donation });
      }
    } else {
      res.json({ message: "Donation delivered successfully", donation });
    }
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

// ===== Get All Donations (for volunteers/NGOs to browse) =====
exports.getAllDonations = async (req, res) => {
  try {
    const donations = await Donation.find({})
      .populate("donor", "name email")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 });
    
    res.json({ success: true, donations });
  } catch (error) {
    console.error("Error fetching all donations:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Get Assigned Donations for Volunteer/NGO =====
exports.getAssignedDonations = async (req, res) => {
  try {
    const donations = await Donation.find({
      assignedTo: req.user._id,
      status: { $in: ["Assigned", "PickedUp"] },
    })
    .populate("donor", "name email")
    .sort({ createdAt: -1 });

    res.json({ donations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Confirm Pickup of a Donation =====
exports.confirmPickup = async (req, res) => {
  try {
    const { donationId } = req.params;
    
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }

    // Check if the user is assigned to this donation
    if (!donation.assignedTo || donation.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this donation" });
    }

    // Update status and add tracking entry
    donation.status = "PickedUp";
    donation.trackingHistory = donation.trackingHistory || [];
    donation.trackingHistory.push({
      status: "PickedUp",
      timestamp: new Date(),
      updatedBy: req.user._id,
      notes: `Pickup confirmed by ${req.user.name}`
    });

    await donation.save();
    
    await donation.populate("donor", "name email");
    await donation.populate("assignedTo", "name email role");

    res.json({ success: true, donation });
  } catch (error) {
    console.error("Error confirming pickup:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Get Donation Tracking History =====
exports.getDonationTracking = async (req, res) => {
  try {
    const { donationId } = req.params;
    
    const donation = await Donation.findById(donationId)
      .populate("donor", "name email")
      .populate("assignedTo", "name email role")
      .populate("trackingHistory.updatedBy", "name role");

    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }

    // Check if user has permission to view tracking
    const canView = req.user.role === "Admin" || 
                   donation.donor.toString() === req.user._id.toString() ||
                   (donation.assignedTo && donation.assignedTo._id.toString() === req.user._id.toString());

    if (!canView) {
      return res.status(403).json({ message: "Not authorized to view this donation" });
    }

    res.json({ 
      success: true, 
      donation: {
        _id: donation._id,
        foodType: donation.foodType,
        quantity: donation.quantity,
        status: donation.status,
        createdAt: donation.createdAt,
        donor: donation.donor,
        assignedTo: donation.assignedTo,
        trackingHistory: donation.trackingHistory || []
      }
    });
  } catch (error) {
    console.error("Error fetching donation tracking:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Update Donation Status (general endpoint) =====
exports.updateDonationStatus = async (req, res) => {
  try {
    const { donationId } = req.params;
    const { status, notes } = req.body;
    
    const validStatuses = ["Pending", "Assigned", "PickedUp", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ message: "Donation not found" });
    }

    // Check authorization
    const canUpdate = req.user.role === "Admin" || 
                     (donation.assignedTo && donation.assignedTo.toString() === req.user._id.toString());

    if (!canUpdate) {
      return res.status(403).json({ message: "Not authorized to update this donation" });
    }

    // Update status and add tracking entry
    donation.status = status;
    donation.trackingHistory = donation.trackingHistory || [];
    donation.trackingHistory.push({
      status: status,
      timestamp: new Date(),
      updatedBy: req.user._id,
      notes: notes || `Status updated to ${status} by ${req.user.name}`
    });

    await donation.save();
    
    await donation.populate("donor", "name email");
    await donation.populate("assignedTo", "name email role");

    res.json({ success: true, donation });
  } catch (error) {
    console.error("Error updating donation status:", error);
    res.status(500).json({ message: "Server error" });
  }
};
