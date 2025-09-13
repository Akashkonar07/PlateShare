const Donation = require("../models/Donation");
const User = require("../models/user");

// Get real-time statistics for home page
exports.getHomeStatistics = async (req, res) => {
  try {
    // Get total meals saved (sum of all delivered donations)
    const deliveredDonations = await Donation.find({ status: "Delivered" });
    const totalMealsSaved = deliveredDonations.reduce((sum, donation) => sum + donation.quantity, 0);

    // Get active donors count (users who have created donations)
    const activeDonors = await User.countDocuments({ 
      role: "Donor",
      isVerified: true 
    });

    // Get active volunteers count
    const activeVolunteers = await User.countDocuments({ 
      role: "Volunteer",
      isVerified: true 
    });

    // Get active NGOs count
    const activeNGOs = await User.countDocuments({ 
      role: "NGO",
      isVerified: true 
    });

    // Get pending donations count
    const pendingDonations = await Donation.countDocuments({ status: "Pending" });

    // Get active assignments count (assigned but not delivered)
    const activeAssignments = await Donation.countDocuments({ 
      status: { $in: ["Assigned", "PickedUp"] } 
    });

    // Get today's donations count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayDonations = await Donation.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    // Get this week's donations count
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeekDonations = await Donation.countDocuments({
      createdAt: { $gte: weekAgo }
    });

    // Get this month's donations count
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const thisMonthDonations = await Donation.countDocuments({
      createdAt: { $gte: monthAgo }
    });

    res.status(200).json({
      success: true,
      data: {
        totalMealsSaved,
        activeDonors,
        activeVolunteers,
        activeNGOs,
        pendingDonations,
        activeAssignments,
        todayDonations,
        thisWeekDonations,
        thisMonthDonations,
        totalUsers: activeDonors + activeVolunteers + activeNGOs
      }
    });
  } catch (error) {
    console.error("Error fetching home statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message
    });
  }
};

// Get detailed statistics for admin dashboard
exports.getDetailedStatistics = async (req, res) => {
  try {
    // Get donations by status
    const donationsByStatus = await Donation.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" }
        }
      }
    ]);

    // Get donations by role distribution
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          verifiedCount: {
            $sum: { $cond: ["$isVerified", 1, 0] }
          }
        }
      }
    ]);

    // Get monthly donation trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await Donation.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      }
    ]);

    // Get top performing volunteers (by completed deliveries)
    const topVolunteers = await User.aggregate([
      {
        $match: { role: "Volunteer" }
      },
      {
        $lookup: {
          from: "donations",
          localField: "_id",
          foreignField: "assignedTo",
          as: "deliveries"
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          totalDeliveries: {
            $size: {
              $filter: {
                input: "$deliveries",
                as: "delivery",
                cond: { $eq: ["$$delivery.status", "Delivered"] }
              }
            }
          },
          totalQuantity: {
            $sum: {
              $filter: {
                input: "$deliveries",
                as: "delivery",
                cond: { $eq: ["$$delivery.status", "Delivered"] }
              }
            }
          }
        }
      },
      {
        $sort: { totalDeliveries: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get top performing NGOs (by received donations)
    const topNGOs = await User.aggregate([
      {
        $match: { role: "NGO" }
      },
      {
        $lookup: {
          from: "donations",
          localField: "_id",
          foreignField: "assignedTo",
          as: "received"
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          totalReceived: {
            $size: {
              $filter: {
                input: "$received",
                as: "donation",
                cond: { $eq: ["$$donation.status", "Delivered"] }
              }
            }
          },
          totalQuantity: {
            $sum: {
              $filter: {
                input: "$received",
                as: "donation",
                cond: { $eq: ["$$donation.status", "Delivered"] }
              }
            }
          }
        }
      },
      {
        $sort: { totalReceived: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        donationsByStatus,
        usersByRole,
        monthlyTrends,
        topVolunteers,
        topNGOs
      }
    });
  } catch (error) {
    console.error("Error fetching detailed statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching detailed statistics",
      error: error.message
    });
  }
};
