const { cloudinary } = require('../config/cloudinary');
const Donation = require("../models/Donation");
const User = require("../models/user");
const AutoAssignmentService = require("../services/autoAssignmentService");
const { generateCSRPDF, sendCSREmail } = require('../utils/csrGenerator');

// ===== Donor Creates Donation =====
exports.createDonation = async (req, res) => {
  try {
    const { foodType, quantity, bestBefore, latitude, longitude, description } = req.body;
    let photoUrl = null;

    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${base64}`;
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "plateshare/donations",
        resource_type: "image"
      });
      
      photoUrl = result.secure_url;
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
    
    if (donation.quantity >= 10) {
      setTimeout(async () => {
        await AutoAssignmentService.autoAssignBulkDonation(donation._id);
      }, 1000);
    }
    
    // Populate donor info for response
    await donation.populate('donor', 'name email');
    
    res.status(201).json({ 
      message: "Donation created successfully", 
      donation,
      autoAssignmentTriggered: donation.quantity >= 10
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
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
  try {
    const { id: donationId } = req.params;
    const { 
      recipientName, 
      recipientType: inputRecipientType, 
      recipientContact, 
      numberOfPeopleServed, 
      notes 
    } = req.body;

    const validTypes = ['Individual', 'NGO', 'Shelter', 'Other'];
    let recipientType = 'Individual';
    
    if (inputRecipientType) {
      const normalizedType = inputRecipientType.trim();
      const capitalizedType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1).toLowerCase();
      recipientType = validTypes.includes(capitalizedType) ? capitalizedType : 'Other';
    }

    if (!donationId) {
      return res.status(400).json({ 
        success: false,
        message: 'Donation ID is required' 
      });
    }

    if (!donationId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid donation ID format' 
      });
    }

    // Find and populate donation with donor and assignee details
    const donation = await Donation.findById(donationId)
      .populate('donor', 'name email')
      .populate('assignedTo', 'name email role');
      
    if (!donation) {
      return res.status(404).json({ 
        success: false,
        message: 'Donation not found' 
      });
    }

    // Verify donation status
    if (donation.status !== "PickedUp") {
      return res.status(400).json({ 
        success: false,
        message: `Donation must be in 'PickedUp' status for delivery confirmation. Current status: ${donation.status}`
      });
    }
    
    // Verify user is assigned to this donation
    if (!donation.assignedTo || donation.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this donation',
        error: 'USER_NOT_AUTHORIZED'
      });
    }

    // Upload delivery photo to Cloudinary
    let deliveryPhotoUrl = null;
    if (req.file) {
      try {
        const base64 = req.file.buffer.toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${base64}`;
        
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: `plateshare/deliveries/${donationId}`,
          resource_type: 'image',
          public_id: `delivery_${Date.now()}`
        });
        
        deliveryPhotoUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading delivery photo:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload delivery photo',
          error: uploadError.message
        });
      }
    }

    // Update donation with delivery details
    donation.status = 'Delivered';
    donation.deliveryDetails = {
      deliveredAt: new Date(),
      deliveredBy: req.user._id,
      recipientName: recipientName.trim(),
      recipientType,
      recipientContact: recipientContact ? recipientContact.trim() : '',
      numberOfPeopleServed: parseInt(numberOfPeopleServed) || 1,
      notes: notes ? notes.trim() : '',
      deliveryPhotoUrl
    };
    
    // Add to tracking history
    donation.trackingHistory = donation.trackingHistory || [];
    donation.trackingHistory.push({
      status: 'Delivered',
      timestamp: new Date(),
      updatedBy: req.user._id,
      notes: `Delivered to ${recipientName} (${recipientType})`,
      ...(deliveryPhotoUrl && { photoUrl: deliveryPhotoUrl })
    });

    await donation.save();

    // Generate and send CSR report to donor
    try {
      const donationForCSR = {
        _id: donation._id,
        foodType: donation.foodType,
        quantity: donation.quantity,
        createdAt: donation.createdAt,
        pickupTime: donation.pickupTime,
        deliveryDetails: {
          deliveredAt: donation.deliveryDetails.deliveredAt,
          recipientName,
          recipientType,
          numberOfPeopleServed: donation.deliveryDetails.numberOfPeopleServed,
          notes: donation.deliveryDetails.notes,
          deliveryPhotoUrl
        },
        csrDetails: {
          recipientName,
          recipientType
        }
      };

      const donorInfo = {
        name: donation.donor?.name || 'Anonymous Donor',
        email: donation.donor?.email
      };

      // Generate PDF buffer
      const pdfBuffer = await generateCSRPDF(donationForCSR, donorInfo);

      // Send email with PDF attachment
      await sendCSREmail(donationForCSR, donorInfo, pdfBuffer);

      console.log(`CSR report sent to ${donation.donor.email} for donation ${donation._id}`);
    } catch (csrError) {
      console.error('Error generating/sending CSR report:', csrError);
      // Don't fail the request if CSR generation fails
    }

    // Update user stats based on role
    try {
      const update = {
        $inc: {},
        $set: { lastDelivery: new Date() }
      };

      if (req.user.role === 'NGO') {
        update.$inc['ngoStats.mealsDelivered'] = donation.quantity || 1;
        update.$inc['ngoStats.totalDeliveries'] = 1;
      } else {
        // Volunteer stats
        update.$inc['volunteerStats.deliveriesCompleted'] = 1;
        update.$inc['volunteerStats.mealsDelivered'] = donation.quantity || 1;
        
        // Calculate points (10 base + 1 per meal)
        const pointsEarned = 10 + (donation.quantity || 1);
        update.$inc['volunteerStats.points'] = pointsEarned;
      }

      await User.findByIdAndUpdate(req.user._id, update);
    } catch (statsError) {
      console.error('Error updating user stats:', statsError);
      // Continue even if stats update fails
    }

    // Return success response with delivery details
    res.status(200).json({
      success: true,
      message: 'Delivery confirmed successfully',
      donation: {
        _id: donation._id,
        status: donation.status,
        deliveredAt: donation.deliveryDetails.deliveredAt,
        recipientName: donation.deliveryDetails.recipientName,
        recipientType: donation.deliveryDetails.recipientType,
        deliveryPhotoUrl: donation.deliveryDetails.deliveryPhotoUrl
      },
      csrReport: {
        sent: true,
        recipient: donation.donor.email
      }
    });
  } catch (error) {
    console.error('Error in confirmDelivery:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming delivery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    let query = {};
    
    // For NGOs, only show unassigned donations or donations assigned to them
    if (req.user.role === 'NGO') {
      query = {
        $or: [
          { assignedTo: { $exists: false } }, // Unassigned
          { assignedTo: req.user._id }, // Assigned to this NGO
          { assignedTo: null } // Explicitly null
        ],
        status: { $in: ['Pending', 'Assigned'] } // Only show pending or assigned
      };
    } 
    // For Volunteers, show all donations (existing behavior)
    else if (req.user.role === 'Volunteer') {
      query = {};
    }
    // For Admins, show all donations (existing behavior)
    
    const donations = await Donation.find(query)
      .populate("donor", "name email")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 });
    
    res.json({ success: true, donations });
  } catch (error) {
    console.error("Error fetching all donations:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Confirm NGO Pickup =====
exports.confirmNGOPickup = async (req, res) => {
  try {
    const { donationId } = req.params;
    
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ 
        success: false,
        message: "Donation not found" 
      });
    }

    // Check if the NGO is assigned to this donation
    if (!donation.assignedTo || donation.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "Not authorized to update this donation" 
      });
    }

    // Verify the donation is in correct status (must be Assigned)
    if (donation.status !== 'Assigned') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot pickup donation in ${donation.status} status. Donation must be in 'Assigned' status.`
      });
    }

    // Update status and add tracking entry
    donation.status = "PickedUp";
    donation.pickupTime = new Date();
    
    donation.trackingHistory = donation.trackingHistory || [];
    donation.trackingHistory.push({
      status: "PickedUp",
      timestamp: new Date(),
      updatedBy: req.user._id,
      notes: `Pickup confirmed by NGO: ${req.user.name}`
    });

    await donation.save();
    
    // Populate all necessary fields for response
    await donation.populate([
      { path: 'donor', select: 'name email' },
      { path: 'assignedTo', select: 'name email role' }
    ]);

    // Update NGO stats
    try {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'ngoStats.mealsCollected': donation.quantity || 1 },
        $set: { 'ngoStats.lastPickup': new Date() }
      });
    } catch (statsError) {
      console.error('Error updating NGO stats:', statsError);
      // Continue even if stats update fails
    }

    res.json({ 
      success: true, 
      message: 'NGO pickup confirmed successfully',
      donation 
    });
  } catch (error) {
    console.error('Error in confirmNGOPickup:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error confirming NGO pickup',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===== Confirm NGO Delivery =====
exports.confirmNGODelivery = async (req, res) => {
  try {
    const { donationId } = req.params;
    const { 
      recipientName, 
      recipientType: inputRecipientType, 
      recipientContact, 
      numberOfPeopleServed, 
      notes 
    } = req.body;

    const validTypes = ['Individual', 'NGO', 'Shelter', 'Other'];
    let recipientType = 'Individual';
    
    if (inputRecipientType) {
      const normalizedType = inputRecipientType.trim();
      const capitalizedType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1).toLowerCase();
      recipientType = validTypes.includes(capitalizedType) ? capitalizedType : 'Other';
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Delivery photo is required'
      });
    }

    // Upload delivery photo to Cloudinary
    const base64 = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${base64}`;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "plateshare/ngo-deliveries",
      resource_type: "image",
      public_id: `delivery_${Date.now()}`
    });
    
    const donation = await Donation.findById(donationId)
      .populate('donor', 'name email')
      .populate('assignedTo', 'name email role');
      
    if (!donation) {
      return res.status(404).json({ 
        success: false,
        message: 'Donation not found' 
      });
    }

    // Verify the NGO is assigned to this donation
    if (!donation.assignedTo || donation.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this donation',
        error: 'USER_NOT_AUTHORIZED'
      });
    }

    // Verify donation status is PickedUp
    if (donation.status !== 'PickedUp') {
      return res.status(400).json({ 
        success: false,
        message: `Donation must be in 'PickedUp' status for delivery confirmation. Current status: ${donation.status}`
      });
    }

    const deliveryPhotoUrl = result.secure_url;

    // Update donation with delivery details
    donation.status = 'Delivered';
    donation.deliveryDetails = {
      deliveredAt: new Date(),
      deliveredBy: req.user._id,
      recipientName: recipientName.trim(),
      recipientType,
      recipientContact: recipientContact ? recipientContact.trim() : '',
      numberOfPeopleServed: parseInt(numberOfPeopleServed) || 1,
      notes: notes ? notes.trim() : '',
      deliveryPhotoUrl
    };
    
    // Add to tracking history
    donation.trackingHistory = donation.trackingHistory || [];
    donation.trackingHistory.push({
      status: 'Delivered',
      timestamp: new Date(),
      updatedBy: req.user._id,
      notes: `Delivered to ${recipientName} (${recipientType}) by NGO`,
      photoUrl: deliveryPhotoUrl
    });

    await donation.save();

    // Generate and send CSR report to donor
    try {
      const donationForCSR = {
        _id: donation._id,
        foodType: donation.foodType,
        quantity: donation.quantity,
        createdAt: donation.createdAt,
        pickupTime: donation.pickupTime,
        deliveryDetails: {
          deliveredAt: donation.deliveryDetails.deliveredAt,
          recipientName,
          recipientType,
          numberOfPeopleServed: donation.deliveryDetails.numberOfPeopleServed,
          notes: donation.deliveryDetails.notes,
          deliveryPhotoUrl
        },
        csrDetails: {
          recipientName,
          recipientType
        }
      };

      const donorInfo = {
        name: donation.donor?.name || 'Anonymous Donor',
        email: donation.donor?.email
      };

      // Generate PDF buffer
      const pdfBuffer = await generateCSRPDF(donationForCSR, donorInfo);

      // Send email with PDF attachment
      await sendCSREmail(donationForCSR, donorInfo, pdfBuffer);

      console.log(`CSR report sent to ${donation.donor.email} for donation ${donation._id}`);
    } catch (csrError) {
      console.error('Error generating/sending CSR report:', csrError);
      // Don't fail the request if CSR generation fails
    }

    // Update NGO stats
    try {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 
          'ngoStats.mealsDelivered': donation.quantity || 1,
          'ngoStats.totalDeliveries': 1 
        },
        $set: { 'ngoStats.lastDelivery': new Date() }
      });
    } catch (statsError) {
      console.error('Error updating NGO stats:', statsError);
      // Continue even if stats update fails
    }

    // Return success response with delivery details
    res.status(200).json({
      success: true,
      message: 'NGO delivery confirmed successfully',
      donation: {
        _id: donation._id,
        status: donation.status,
        deliveredAt: donation.deliveryDetails.deliveredAt,
        recipientName: donation.deliveryDetails.recipientName,
        recipientType: donation.deliveryDetails.recipientType,
        deliveryPhotoUrl: donation.deliveryDetails.deliveryPhotoUrl
      }
    });
  } catch (error) {
    console.error('Error in confirmNGODelivery:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming NGO delivery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===== Get Assigned Donations for Volunteer/NGO =====
exports.getAssignedDonations = async (req, res) => {
  try {
    let query;

    if (req.user.role === 'NGO') {
      // For NGOs, get donations assigned to them with status Assigned, PickedUp, or Delivered
      query = {
        assignedTo: req.user._id,
        status: { $in: ["Assigned", "PickedUp", "Delivered"] }
      };
    } else {
      // For Volunteers, get donations assigned to them with various statuses including Delivered
      query = {
        assignedTo: req.user._id,
        status: { $in: ["Assigned", "PickedUp", "Accepted", "Delivered"] }
      };
    }

    const donations = await Donation.find(query)
      .populate("donor", "name email")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 });

    res.json({ 
      success: true,
      count: donations.length,
      donations 
    });
  } catch (err) {
    console.error('Error in getAssignedDonations:', err);
    res.status(500).json({ 
      success: false,
      message: "Error fetching assigned donations",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ===== Confirm Pickup of a Donation (Volunteer Only) =====
exports.confirmPickup = async (req, res) => {
  try {
    const { donationId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Pickup photo is required'
      });
    }

    // Upload photo to Cloudinary
    const base64 = req.file.buffer.toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${base64}`;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "plateshare/pickups",
      resource_type: "image"
    });
    
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ 
        success: false,
        message: "Donation not found" 
      });
    }

    // Check if the user is assigned to this donation
    if (!donation.assignedTo || donation.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: "Not authorized to update this donation" 
      });
    }

    // Verify the donation is in correct status
    if (donation.status !== 'Assigned' && donation.status !== 'Accepted') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot pickup donation in ${donation.status} status`
      });
    }

    // Update status and add tracking entry with photo
    donation.status = "PickedUp";
    donation.pickupTime = new Date();
    donation.pickupPhotoUrl = result.secure_url;
    
    donation.trackingHistory = donation.trackingHistory || [];
    donation.trackingHistory.push({
      status: "PickedUp",
      timestamp: new Date(),
      updatedBy: req.user._id,
      notes: `Pickup confirmed by ${req.user.name}`,
      photoUrl: result.secure_url
    });

    await donation.save();
    
    // Populate all necessary fields for response
    await donation.populate([
      { path: 'donor', select: 'name email' },
      { path: 'assignedTo', select: 'name email role' }
    ]);

    res.json({ 
      success: true, 
      message: 'Pickup confirmed successfully',
      donation 
    });
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

// ===== NGO Confirms Assignment =====
// ===== Assign Donation to NGO =====
exports.assignToNGO = async (req, res) => {
  try {
    const { donationId } = req.params;
    const { notes = '' } = req.body;
    
    // Find the donation
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Donation not found' 
      });
    }

    // Check if donation is available for assignment
    if (donation.status !== 'Pending' && donation.status !== 'Assigned') {
      return res.status(400).json({ 
        success: false, 
        message: 'Donation is not available for assignment' 
      });
    }

    // Check if the NGO is already assigned
    if (donation.assignedTo && donation.assignedTo.toString() === req.user._id.toString()) {
      // If already assigned to this NGO, return success with a message
      return res.status(200).json({ 
        success: true, 
        message: 'You are already assigned to this donation',
        data: await donation.populate(['assignedTo', 'donor'])
      });
    }

    // Update the donation
    donation.assignedTo = req.user._id;
    donation.status = 'Assigned';
    
    // Add to tracking history
    donation.trackingHistory = donation.trackingHistory || [];
    donation.trackingHistory.push({
      status: 'Assigned',
      updatedBy: req.user._id,
      notes: `Assigned to NGO: ${req.user.name}. ${notes}`.trim(),
      timestamp: new Date()
    });

    await donation.save();

    // Populate the assignedTo field for the response
    await donation.populate('assignedTo', 'name email role');
    await donation.populate('donor', 'name email');

    res.status(200).json({
      success: true,
      message: 'Donation assigned successfully',
      data: donation
    });
  } catch (error) {
    console.error('Error assigning donation to NGO:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===== NGO Confirms Assignment =====
exports.confirmAssignment = async (req, res) => {
  try {
    const { donationId } = req.params;
    const ngoId = req.user._id;

    // Find the donation
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ 
        success: false,
        message: 'Donation not found' 
      });
    }

    // Verify the donation is assigned to this NGO
    if (!donation.assignedTo || donation.assignedTo.toString() !== ngoId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'This donation is not assigned to your NGO' 
      });
    }

    // Verify the donation is in correct status (Pending or Assigned)
    if (!['Pending', 'Assigned'].includes(donation.status)) {
      return res.status(400).json({ 
        success: false,
        message: `Cannot confirm assignment for donation in ${donation.status} status` 
      });
    }

    // Update the donation status to Assigned
    donation.status = 'Assigned';
    donation.assignedAt = donation.assignedAt || new Date();
    
    // Add to tracking history
    donation.trackingHistory = donation.trackingHistory || [];
    donation.trackingHistory.push({
      status: 'Assigned',
      updatedBy: ngoId,
      notes: 'NGO has accepted the assignment',
      timestamp: new Date()
    });

    await donation.save();
    
    // Populate the response data
    await donation.populate([
      { path: 'donor', select: 'name email' },
      { path: 'assignedTo', select: 'name email role' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Donation assignment confirmed successfully',
      data: donation
    });

  } catch (error) {
    console.error('Error confirming assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
