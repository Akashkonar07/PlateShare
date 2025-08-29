const { cloudinary, upload } = require('../config/cloudinary');
const Donation = require("../models/Donation");
const User = require("../models/user");
const AutoAssignmentService = require("../services/autoAssignmentService");
const { generateCSRPDF, sendCSREmail } = require('../utils/csrGenerator');
// Import error classes from centralized error handler
const {
  NotFoundError,
  BadRequestError,
  ForbiddenError
} = require('../middleware/errorHandler');

// ===== Donor Creates Donation =====
exports.createDonation = async (req, res) => {
  try {
    const { foodType, quantity, bestBefore, latitude, longitude, description } = req.body;
    let photoUrl = null;

    // Upload photo to cloudinary if provided
    if (req.file) {
      try {
        // Convert buffer to base64
        const base64 = req.file.buffer.toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${base64}`;
        
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: "plateshare/donations",
          resource_type: "image"
        });
        
        photoUrl = result.secure_url;
      } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw new Error('Failed to upload image. Please try again.');
      }
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
  console.log('=== confirmDelivery called ===');
  console.log('Request params:', req.params);
  console.log('Request body:', req.body);
  console.log('Request file:', req.file ? {
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    buffer: req.file.buffer ? `Buffer of ${req.file.buffer.length} bytes` : 'No buffer'
  } : 'No file uploaded');

  if (!req.file) {
    console.error('No delivery photo uploaded');
    return res.status(400).json({
      success: false,
      message: 'Delivery photo is required',
      receivedFiles: req.files,
      fileFields: Object.keys(req.files || {})
    });
  }

  try {
    console.log('Processing delivery confirmation...');
    const { id: donationId } = req.params;
    const { 
      recipientName, 
      recipientType: inputRecipientType, 
      recipientContact, 
      numberOfPeopleServed, 
      notes 
    } = req.body;

    // Validate and normalize recipient type
    const validTypes = ['Individual', 'NGO', 'Shelter', 'Other'];
    let recipientType = 'Individual'; // Default value
    
    if (inputRecipientType) {
      const normalizedType = inputRecipientType.trim();
      const capitalizedType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1).toLowerCase();
      
      // Check if the normalized type is valid, otherwise use 'Other'
      recipientType = validTypes.includes(capitalizedType) ? capitalizedType : 'Other';
    }

    console.log('Request data:', {
      donationId,
      recipientName,
      recipientType,
      recipientContact,
      numberOfPeopleServed,
      notes
    });

    if (!donationId) {
      return res.status(400).json({ message: 'Donation ID is required' });
    }

    if (!recipientName || !recipientType) {
      return res.status(400).json({ message: 'Recipient name and type are required' });
    }

    if (!donationId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid donation ID format' });
    }

    console.log('Looking up donation:', donationId);
    const donation = await Donation.findById(donationId)
      .populate('donor', 'name email');
      
    if (!donation) {
      console.error('Donation not found:', donationId);
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.status !== "PickedUp") {
      console.log(`Invalid status for delivery. Current status: ${donation.status}`);
      return res.status(400).json({ 
        message: "Donation must be picked up before delivery",
        currentStatus: donation.status
      });
    }

    // Check if the user is assigned to this donation
    if (donation.assignedTo.toString() !== req.user._id.toString()) {
      console.log(`User ${req.user._id} not authorized to update donation ${donationId}`);
      return res.status(403).json({ 
        message: 'Not authorized to update this donation',
        assignedTo: donation.assignedTo,
        currentUser: req.user._id
      });
    }

    // Check if delivery photo is provided
    if (!req.file) {
      console.log('No delivery photo provided in the request');
      return res.status(400).json({ 
        message: 'Delivery photo is required',
        receivedFiles: req.files,
        fileFields: Object.keys(req.files || {})
      });
    }

    // Upload delivery photo
    let deliveryPhotoUrl = null;
    try {
      console.log('Starting file upload to Cloudinary...');
      console.log('File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer
      });
      
      if (!req.file.buffer) {
        throw new Error('File buffer is empty');
      }
      
      const base64 = req.file.buffer.toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${base64}`;
      
      console.log('Uploading file to Cloudinary...');
      const uploadResult = await cloudinary.uploader.upload(dataURI, {
        folder: "plateshare/deliveries",
        resource_type: 'auto',
        chunk_size: 6000000, // 6MB chunks for large files
        timeout: 30000 // 30 seconds timeout
      });
      
      console.log('Cloudinary upload successful:', {
        url: uploadResult.secure_url,
        bytes: uploadResult.bytes,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height
      });
      
      deliveryPhotoUrl = uploadResult.secure_url;
    } catch (uploadError) {
      console.error('Error uploading delivery photo to Cloudinary:', {
        error: uploadError.message,
        stack: uploadError.stack,
        name: uploadError.name,
        http_code: uploadError.http_code,
        file: req.file ? {
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          hasBuffer: !!req.file.buffer
        } : 'No file',
        cloudinaryError: uploadError.response ? {
          status: uploadError.response.status,
          statusText: uploadError.response.statusText,
          data: uploadError.response.data
        } : 'No response from Cloudinary'
      });
      return res.status(500).json({ 
        message: 'Error uploading delivery photo',
        error: uploadError.message,
        code: uploadError.http_code || 'CLOUDINARY_UPLOAD_ERROR'
      });
    }

    
    const deliveryData = {
      'csrDetails.recipientName': req.body.recipientName,
      'csrDetails.recipientType': recipientType,
      'csrDetails.numberOfPeopleServed': parseInt(req.body.numberOfPeopleServed) || 1,
      'csrDetails.notes': req.body.notes,
      'deliveryPhotoUrl': deliveryPhotoUrl,
      'status': 'Delivered',
      'actualDeliveryTime': new Date()
    };
    
    // Update donation with delivery data
    donation.csrDetails = donation.csrDetails || {};
    donation.csrDetails.recipientName = req.body.recipientName;
    donation.csrDetails.recipientType = recipientType;
    donation.csrDetails.numberOfPeopleServed = parseInt(req.body.numberOfPeopleServed) || 1;
    donation.csrDetails.notes = req.body.notes;
    donation.deliveryPhotoUrl = deliveryPhotoUrl;
    donation.status = 'Delivered';
    donation.actualDeliveryTime = new Date();
    
    // Add tracking entry with photo
    donation.trackingHistory = donation.trackingHistory || [];
    donation.trackingHistory.push({
      status: "Delivered",
      timestamp: new Date(),
      updatedBy: req.user._id,
      notes: `Delivery completed by ${req.user.name}`,
      photoUrl: deliveryPhotoUrl
    });
    
    // Save the updated donation
    await donation.save();
    
    // Refresh the document to ensure we have the latest data
    const updatedDonation = await Donation.findById(donationId)
      .populate('donor', 'name email')
      .populate('assignedTo', 'name email');

    // Generate and send CSR certificate to donor
    let csrGenerated = false;
    try {
      // Get donor details
      const donor = await User.findById(donation.donor);
      if (donor && donor.email) {
        // Generate CSR PDF
        const pdfBuffer = await generateCSRPDF(donation, donor);
        
        // Send email with CSR certificate
        csrGenerated = await sendCSREmail(donation, donor, pdfBuffer);
        
        if (csrGenerated) {
          console.log(`CSR certificate sent to donor: ${donor.email}`);
        } else {
          console.error('Failed to send CSR certificate email');
        }
      }
    } catch (csrError) {
      console.error('Error generating/sending CSR certificate:', csrError);
      // Don't fail the delivery confirmation if CSR generation fails
    }

    // Update volunteer stats and gamification (only for volunteers, not NGOs)
    if (req.user.role === "Volunteer") {
      try {
        const { updateVolunteerStats } = require("./volunteerController");
        const result = await updateVolunteerStats(req.user._id, donation);
        
        res.status(200).json({ 
          success: true,
          message: "Donation delivered successfully", 
          donation: updatedDonation,
          csrGenerated,
          gamification: result ? {
            pointsEarned: result.pointsEarned,
            leveledUp: result.leveledUp,
            newLevel: result.profile?.level
          } : null
        });
      } catch (gamificationError) {
        console.error("Gamification update failed:", gamificationError);
        // Still return success for delivery, even if gamification fails
        res.status(200).json({ 
          success: true,
          message: "Donation delivered successfully", 
          donation: updatedDonation,
          csrGenerated: true
        });
      }
    } else {
      res.status(200).json({ 
        success: true,
        message: "Donation delivered successfully", 
        donation: updatedDonation,
        csrGenerated
      });
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

// ===== NGO Confirms Assignment =====
exports.confirmAssignment = async (req, res) => {
  try {
    const { donationId } = req.params;
    const ngoId = req.user._id;

    // Find the donation
    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Verify the donation is assigned to this NGO
    if (!donation.assignedTo || donation.assignedTo.toString() !== ngoId.toString()) {
      return res.status(403).json({ message: 'This donation is not assigned to your NGO' });
    }

    // Verify the donation is in correct status
    if (donation.status !== 'Assigned') {
      return res.status(400).json({ message: 'This donation is not in a state that can be confirmed' });
    }

    // Update the donation status to confirmed
    donation.status = 'Confirmed';
    donation.assignedAt = new Date();
    
    // Add to tracking history
    donation.trackingHistory = donation.trackingHistory || [];
    donation.trackingHistory.push({
      status: 'Confirmed',
      updatedBy: ngoId,
      notes: 'NGO has confirmed the assignment',
      timestamp: new Date()
    });

    await donation.save();

    res.status(200).json({
      success: true,
      message: 'Donation assignment confirmed successfully',
      data: donation
    });

  } catch (error) {
    console.error('Error confirming assignment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error confirming assignment',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};
