const VolunteerProfile = require("../models/VolunteerProfile");
const User = require("../models/user");
const Donation = require("../models/Donation");

// Get or create volunteer profile
const getVolunteerProfile = async (req, res) => {
  try {
    let profile = await VolunteerProfile.findOne({ user: req.user._id })
      .populate('user', 'name email');
    
    if (!profile) {
      // Create new profile for first-time volunteer
      profile = new VolunteerProfile({
        user: req.user._id,
        stats: {
          joinedDate: new Date()
        }
      });
      await profile.save();
      await profile.populate('user', 'name email');
    }
    
    res.json({ success: true, profile });
  } catch (error) {
    console.error("Error fetching volunteer profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update volunteer stats after delivery
const updateVolunteerStats = async (userId, donationData) => {
  try {
    let profile = await VolunteerProfile.findOne({ user: userId });
    
    if (!profile) {
      profile = new VolunteerProfile({ user: userId });
    }
    
    // Update basic stats
    profile.stats.totalDeliveries += 1;
    profile.stats.totalServingsDelivered += donationData.quantity;
    
    // Calculate points based on delivery
    let points = 10; // Base points
    points += Math.floor(donationData.quantity / 5) * 2; // Bonus for quantity
    
    // Bonus points for urgent deliveries
    if (donationData.priority === "Urgent") points += 15;
    else if (donationData.priority === "High") points += 10;
    else if (donationData.priority === "Medium") points += 5;
    
    // Add points and check for level up
    const leveledUp = profile.addPoints(points, "Delivery completed");
    
    // Update streak
    profile.updateStreak();
    
    // Check delivery-based achievements
    checkDeliveryAchievements(profile);
    
    await profile.save();
    
    return { profile, leveledUp, pointsEarned: points };
  } catch (error) {
    console.error("Error updating volunteer stats:", error);
    throw error;
  }
};

// Check and award delivery-based achievements
const checkDeliveryAchievements = (profile) => {
  const deliveryBadges = {
    1: { id: "first_delivery", name: "First Steps", icon: "👶", description: "Completed your first delivery" },
    10: { id: "delivery_10", name: "Getting Started", icon: "🚀", description: "Completed 10 deliveries" },
    50: { id: "delivery_50", name: "Reliable Helper", icon: "🤝", description: "Completed 50 deliveries" },
    100: { id: "delivery_100", name: "Century Club", icon: "💯", description: "Completed 100 deliveries" },
    500: { id: "delivery_500", name: "Super Volunteer", icon: "🦸‍♂️", description: "Completed 500 deliveries" }
  };
  
  const servingBadges = {
    100: { id: "servings_100", name: "Hunger Fighter", icon: "🍽️", description: "Delivered 100 servings" },
    500: { id: "servings_500", name: "Meal Master", icon: "👨‍🍳", description: "Delivered 500 servings" },
    1000: { id: "servings_1000", name: "Food Hero", icon: "🏆", description: "Delivered 1000 servings" }
  };
  
  // Check delivery count achievements
  if (deliveryBadges[profile.stats.totalDeliveries]) {
    profile.awardAchievement(deliveryBadges[profile.stats.totalDeliveries], "Delivery");
  }
  
  // Check servings count achievements
  if (servingBadges[profile.stats.totalServingsDelivered]) {
    profile.awardAchievement(servingBadges[profile.stats.totalServingsDelivered], "Impact");
  }
};

// Get leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const { type = "monthly", limit = 10 } = req.query;
    
    let sortField;
    switch (type) {
      case "weekly":
        sortField = "weeklyPoints";
        break;
      case "monthly":
        sortField = "monthlyPoints";
        break;
      case "alltime":
        sortField = "totalPoints";
        break;
      default:
        sortField = "monthlyPoints";
    }
    
    const leaderboard = await VolunteerProfile.find({
      "preferences.showOnLeaderboard": true
    })
    .populate('user', 'name')
    .sort({ [sortField]: -1 })
    .limit(parseInt(limit))
    .select(`user level ${sortField} stats.totalDeliveries stats.totalServingsDelivered achievements`);
    
    res.json({ success: true, leaderboard, type });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get volunteer achievements
const getAchievements = async (req, res) => {
  try {
    const profile = await VolunteerProfile.findOne({ user: req.user._id });
    
    if (!profile) {
      return res.status(404).json({ message: "Volunteer profile not found" });
    }
    
    // Get all possible achievements for progress tracking
    const allAchievements = getAllPossibleAchievements();
    
    // Mark which ones are earned
    const achievementsWithStatus = allAchievements.map(achievement => ({
      ...achievement,
      earned: profile.achievements.some(a => a.badgeId === achievement.id),
      earnedAt: profile.achievements.find(a => a.badgeId === achievement.id)?.earnedAt
    }));
    
    res.json({ 
      success: true, 
      achievements: achievementsWithStatus,
      earnedCount: profile.achievements.length,
      totalCount: allAchievements.length
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all possible achievements for reference
const getAllPossibleAchievements = () => {
  return [
    // Delivery achievements
    { id: "first_delivery", name: "First Steps", icon: "👶", description: "Complete your first delivery", category: "Delivery" },
    { id: "delivery_10", name: "Getting Started", icon: "🚀", description: "Complete 10 deliveries", category: "Delivery" },
    { id: "delivery_50", name: "Reliable Helper", icon: "🤝", description: "Complete 50 deliveries", category: "Delivery" },
    { id: "delivery_100", name: "Century Club", icon: "💯", description: "Complete 100 deliveries", category: "Delivery" },
    { id: "delivery_500", name: "Super Volunteer", icon: "🦸‍♂️", description: "Complete 500 deliveries", category: "Delivery" },
    
    // Impact achievements
    { id: "servings_100", name: "Hunger Fighter", icon: "🍽️", description: "Deliver 100 servings", category: "Impact" },
    { id: "servings_500", name: "Meal Master", icon: "👨‍🍳", description: "Deliver 500 servings", category: "Impact" },
    { id: "servings_1000", name: "Food Hero", icon: "🏆", description: "Deliver 1000 servings", category: "Impact" },
    
    // Consistency achievements
    { id: "streak_7", name: "Week Warrior", icon: "🔥", description: "Maintain a 7-day delivery streak", category: "Consistency" },
    { id: "streak_30", name: "Monthly Marvel", icon: "💪", description: "Maintain a 30-day delivery streak", category: "Consistency" },
    { id: "streak_100", name: "Consistency King", icon: "👑", description: "Maintain a 100-day delivery streak", category: "Consistency" },
    
    // Level achievements
    { id: "level_5", name: "Rising Star", icon: "⭐", description: "Reach level 5", category: "Milestone" },
    { id: "level_10", name: "Dedicated Helper", icon: "🌟", description: "Reach level 10", category: "Milestone" },
    { id: "level_25", name: "Community Champion", icon: "🏆", description: "Reach level 25", category: "Milestone" },
    { id: "level_50", name: "Food Hero", icon: "🦸", description: "Reach level 50", category: "Milestone" }
  ];
};

// Update volunteer preferences
const updatePreferences = async (req, res) => {
  try {
    const { showOnLeaderboard, receiveAchievementNotifications, preferredDeliveryRadius, availabilityHours } = req.body;
    
    const profile = await VolunteerProfile.findOne({ user: req.user._id });
    
    if (!profile) {
      return res.status(404).json({ message: "Volunteer profile not found" });
    }
    
    // Update preferences
    if (showOnLeaderboard !== undefined) profile.preferences.showOnLeaderboard = showOnLeaderboard;
    if (receiveAchievementNotifications !== undefined) profile.preferences.receiveAchievementNotifications = receiveAchievementNotifications;
    if (preferredDeliveryRadius !== undefined) profile.preferences.preferredDeliveryRadius = preferredDeliveryRadius;
    if (availabilityHours !== undefined) profile.preferences.availabilityHours = availabilityHours;
    
    profile.updatedAt = new Date();
    await profile.save();
    
    res.json({ success: true, preferences: profile.preferences });
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset weekly/monthly points (for scheduled tasks)
const resetPeriodicPoints = async (req, res) => {
  try {
    const { period } = req.params; // 'weekly' or 'monthly'
    
    if (!['weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ message: "Invalid period. Use 'weekly' or 'monthly'" });
    }
    
    const updateField = period === 'weekly' ? 'weeklyPoints' : 'monthlyPoints';
    
    await VolunteerProfile.updateMany(
      {},
      { $set: { [updateField]: 0 } }
    );
    
    res.json({ success: true, message: `${period} points reset successfully` });
  } catch (error) {
    console.error(`Error resetting ${period} points:`, error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getVolunteerProfile,
  updateVolunteerStats,
  getLeaderboard,
  getAchievements,
  updatePreferences,
  resetPeriodicPoints
};