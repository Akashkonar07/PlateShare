const User = require("../models/user");
const VolunteerProfile = require("../models/VolunteerProfile");
const Notification = require("../models/Notification");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ===== Register =====
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already exists" });

    // Normalize role to match enum values
    const normalizedRole = role === 'Ngo' ? 'NGO' : role;

    // Create user with login tracking
    user = await User.create({ 
      name, 
      email, 
      password, 
      role: normalizedRole,
      lastLoginAt: new Date(),
      loginCount: 1
    });

    // Create volunteer profile if user is a volunteer
    if (normalizedRole === 'Volunteer') {
      await VolunteerProfile.create({ user: user._id });
    }

    // Get complete user profile
    const completeProfile = await getUserCompleteProfile(user._id);
    const token = generateToken(user);
    
    res.status(201).json({ 
      token, 
      user: completeProfile
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Login =====
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Fix role casing if needed and update login tracking
    if (user.role === 'Ngo') {
      user.role = 'NGO';
    }
    user.lastLoginAt = new Date();
    user.lastActiveAt = new Date();
    user.loginCount += 1;
    await user.save();

    // Get complete user profile with all related data
    const completeProfile = await getUserCompleteProfile(user._id);
    const token = generateToken(user);
    
    res.json({ 
      token, 
      user: completeProfile
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Get Current User =====
exports.getProfile = async (req, res) => {
  try {
    // Update last active time
    await User.findByIdAndUpdate(req.user._id, { 
      lastActiveAt: new Date() 
    });
    
    // Get complete user profile
    const completeProfile = await getUserCompleteProfile(req.user._id);
    res.json({ user: completeProfile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Update User Profile =====
exports.updateProfile = async (req, res) => {
  try {
    const { profile, ngoCapacity, volunteerPreferences } = req.body;
    const userId = req.user._id;
    
    const updateData = {};
    if (profile) updateData.profile = profile;
    if (ngoCapacity && req.user.role === 'NGO') updateData.ngoCapacity = ngoCapacity;
    if (volunteerPreferences && req.user.role === 'Volunteer') updateData.volunteerPreferences = volunteerPreferences;
    
    const user = await User.findByIdAndUpdate(
      userId, 
      { $set: updateData, updatedAt: new Date() }, 
      { new: true }
    );
    
    const completeProfile = await getUserCompleteProfile(userId);
    res.json({ user: completeProfile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ===== Helper Function: Get Complete User Profile =====
const getUserCompleteProfile = async (userId) => {
  try {
    // Get user with all fields
    const user = await User.findById(userId).select('-password');
    if (!user) throw new Error('User not found');
    
    const profile = user.toObject();
    
    // Get volunteer profile if user is a volunteer
    if (user.role === 'Volunteer') {
      const volunteerProfile = await VolunteerProfile.findOne({ user: userId });
      if (volunteerProfile) {
        profile.volunteerProfile = volunteerProfile;
      }
    }
    
    // Get unread notifications count
    const unreadNotifications = await Notification.countDocuments({
      userId: userId,
      isRead: false
    });
    profile.unreadNotifications = unreadNotifications;
    
    // Get recent notifications (last 10)
    const recentNotifications = await Notification.find({
      userId: userId
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('donationId', 'foodType quantity status');
    
    profile.recentNotifications = recentNotifications;
    
    return profile;
  } catch (err) {
    console.error('Error getting complete profile:', err);
    throw err;
  }
};

exports.getUserCompleteProfile = getUserCompleteProfile;
