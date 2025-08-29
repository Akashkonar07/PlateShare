const mongoose = require("mongoose");

const achievementSchema = new mongoose.Schema({
  badgeId: { type: String, required: true },
  badgeName: { type: String, required: true },
  badgeIcon: { type: String, required: true },
  description: { type: String, required: true },
  earnedAt: { type: Date, default: Date.now },
  category: {
    type: String,
    enum: ["Delivery", "Impact", "Consistency", "Special", "Milestone"],
    required: true
  }
});

const volunteerProfileSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    unique: true 
  },
  
  // Points System
  totalPoints: { type: Number, default: 0 },
  monthlyPoints: { type: Number, default: 0 },
  weeklyPoints: { type: Number, default: 0 },
  
  // Statistics
  stats: {
    totalDeliveries: { type: Number, default: 0 },
    totalServingsDelivered: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActivityDate: { type: Date },
    joinedDate: { type: Date, default: Date.now },
    fastestDeliveryTime: { type: Number }, // in minutes
    totalDistanceTraveled: { type: Number, default: 0 }, // in km
  },
  
  // Level System
  level: { type: Number, default: 1 },
  experiencePoints: { type: Number, default: 0 },
  nextLevelPoints: { type: Number, default: 100 },
  
  // Achievements and Badges
  achievements: [achievementSchema],
  
  // Leaderboard Rankings
  rankings: {
    globalRank: { type: Number, default: 0 },
    monthlyRank: { type: Number, default: 0 },
    weeklyRank: { type: Number, default: 0 },
    localRank: { type: Number, default: 0 }
  },
  
  // Preferences
  preferences: {
    showOnLeaderboard: { type: Boolean, default: true },
    receiveAchievementNotifications: { type: Boolean, default: true },
    preferredDeliveryRadius: { type: Number, default: 10 }, // in km
    availabilityHours: {
      start: { type: String, default: "09:00" },
      end: { type: String, default: "18:00" }
    }
  },
  
  // Seasonal/Event Data
  seasonalStats: [{
    season: { type: String }, // "Spring2024", "Summer2024", etc.
    points: { type: Number, default: 0 },
    deliveries: { type: Number, default: 0 },
    specialBadges: [String]
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Calculate level based on experience points
volunteerProfileSchema.methods.calculateLevel = function() {
  const baseXP = 100;
  const multiplier = 1.5;
  let level = 1;
  let requiredXP = baseXP;
  
  while (this.experiencePoints >= requiredXP) {
    level++;
    requiredXP = Math.floor(baseXP * Math.pow(multiplier, level - 1));
  }
  
  this.level = level;
  this.nextLevelPoints = requiredXP;
  return level;
};

// Add points and check for level up
volunteerProfileSchema.methods.addPoints = function(points, reason = "Activity") {
  this.totalPoints += points;
  this.monthlyPoints += points;
  this.weeklyPoints += points;
  this.experiencePoints += points;
  
  const oldLevel = this.level;
  const newLevel = this.calculateLevel();
  
  // Check for level up achievement
  if (newLevel > oldLevel) {
    this.checkLevelUpAchievements(newLevel);
  }
  
  this.updatedAt = new Date();
  return newLevel > oldLevel;
};

// Check and award achievements
volunteerProfileSchema.methods.checkLevelUpAchievements = function(newLevel) {
  const levelBadges = {
    5: { id: "level_5", name: "Rising Star", icon: "⭐", description: "Reached level 5" },
    10: { id: "level_10", name: "Dedicated Helper", icon: "🌟", description: "Reached level 10" },
    25: { id: "level_25", name: "Community Champion", icon: "🏆", description: "Reached level 25" },
    50: { id: "level_50", name: "Food Hero", icon: "🦸", description: "Reached level 50" }
  };
  
  if (levelBadges[newLevel]) {
    this.awardAchievement(levelBadges[newLevel], "Milestone");
  }
};

// Award achievement
volunteerProfileSchema.methods.awardAchievement = function(badge, category = "Special") {
  const existingBadge = this.achievements.find(a => a.badgeId === badge.id);
  if (!existingBadge) {
    this.achievements.push({
      badgeId: badge.id,
      badgeName: badge.name,
      badgeIcon: badge.icon,
      description: badge.description,
      category: category,
      earnedAt: new Date()
    });
  }
};

// Update streak
volunteerProfileSchema.methods.updateStreak = function() {
  const today = new Date();
  const lastActivity = this.stats.lastActivityDate;
  
  if (!lastActivity) {
    this.stats.streakDays = 1;
  } else {
    const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day
      this.stats.streakDays += 1;
      if (this.stats.streakDays > this.stats.longestStreak) {
        this.stats.longestStreak = this.stats.streakDays;
      }
    } else if (daysDiff > 1) {
      // Streak broken
      this.stats.streakDays = 1;
    }
    // Same day, no change to streak
  }
  
  this.stats.lastActivityDate = today;
  
  // Check streak achievements
  this.checkStreakAchievements();
};

// Check streak-based achievements
volunteerProfileSchema.methods.checkStreakAchievements = function() {
  const streakBadges = {
    7: { id: "streak_7", name: "Week Warrior", icon: "🔥", description: "7-day delivery streak" },
    30: { id: "streak_30", name: "Monthly Marvel", icon: "💪", description: "30-day delivery streak" },
    100: { id: "streak_100", name: "Consistency King", icon: "👑", description: "100-day delivery streak" }
  };
  
  if (streakBadges[this.stats.streakDays]) {
    this.awardAchievement(streakBadges[this.stats.streakDays], "Consistency");
  }
};

module.exports = mongoose.model("VolunteerProfile", volunteerProfileSchema);
