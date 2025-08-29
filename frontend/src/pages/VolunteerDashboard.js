import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { fetchDonations, acceptDonation, confirmPickup, confirmDelivery } from "../services/donation";
import VolunteerStats from "../components/VolunteerStats";
import Leaderboard from "../components/Leaderboard";

const VolunteerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("available");
  const [donations, setDonations] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAvailableDonations();
      fetchMyAssignments();
    }
  }, [user]);

  const fetchAvailableDonations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetchDonations(token);
      // Filter for pending donations only
      const availableDonations = response.donations?.filter(d => d.status === "Pending") || [];
      setDonations(availableDonations);
    } catch (error) {
      console.error("Error fetching donations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAssignments = async () => {
    try {
      const token = localStorage.getItem("token");
      // This would be a specific endpoint for volunteer assignments
      // For now, we'll filter from all donations
      const response = await fetchDonations(token);
      const myDonations = response.donations?.filter(d => 
        d.assignedTo && d.assignedTo._id === user.id && 
        ["Assigned", "PickedUp"].includes(d.status)
      ) || [];
      setMyAssignments(myDonations);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    }
  };

  const handleAcceptDonation = async (donationId) => {
    try {
      const token = localStorage.getItem("token");
      console.log("Calling acceptDonation API for:", donationId);
      
      // Use the correct acceptDonation API call - POST /donations/:id/accept
      const result = await acceptDonation(donationId, token);
      console.log("Accept donation result:", result);
      
      // Refresh both lists
      fetchAvailableDonations();
      fetchMyAssignments();
      
      alert("Donation accepted successfully!");
    } catch (error) {
      console.error("Error accepting donation:", error);
      console.error("Error details:", error.response?.data);
      console.error("Status:", error.response?.status);
      alert(`Error accepting donation: ${error.response?.data?.message || error.message}`);
    }
  };

  const handlePickupComplete = async (donationId) => {
    try {
      const token = localStorage.getItem("token");
      await confirmPickup(donationId, token);
      
      fetchMyAssignments();
      alert("Pickup confirmed!");
    } catch (error) {
      console.error("Error confirming pickup:", error);
      alert("Error confirming pickup. Please try again.");
    }
  };

  const handleDeliveryComplete = async (donationId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await confirmDelivery(donationId, token);
      
      fetchMyAssignments();
      
      // Show gamification feedback if available
      if (response.gamification) {
        alert(`Delivery completed! 🎉\n+${response.gamification.pointsEarned} points earned!${response.gamification.leveledUp ? `\nLevel up! You're now level ${response.gamification.newLevel}!` : ''}`);
      } else {
        alert("Delivery completed! Great work!");
      }
    } catch (error) {
      console.error("Error confirming delivery:", error);
      alert("Error confirming delivery. Please try again.");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "Assigned": return "bg-blue-100 text-blue-800";
      case "PickedUp": return "bg-purple-100 text-purple-800";
      case "Delivered": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Simple distance calculation (you could use a more accurate formula)
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto mt-20 p-4 bg-white shadow rounded">
        <p>Please login to access your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-20 p-4">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Volunteer Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user.name}!</p>
            <div className="flex items-center mt-2 space-x-4">
              <div className="flex items-center">
                <span className="text-yellow-500">⭐</span>
                <span className="ml-1 font-medium">{user.points || 0} Points</span>
              </div>
              {user.badges && user.badges.length > 0 && (
                <div className="flex items-center">
                  <span className="text-blue-500">🏆</span>
                  <span className="ml-1 font-medium">{user.badges.length} Badges</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("available")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "available"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Available Donations ({donations.length})
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "assignments"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              My Assignments ({myAssignments.length})
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "stats"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              My Stats & Achievements
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "leaderboard"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Leaderboard
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "available" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Available Donations</h2>
                <button
                  onClick={fetchAvailableDonations}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading donations...</p>
                </div>
              ) : donations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No available donations at the moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {donations.map((donation) => (
                    <div key={donation._id} className="bg-gray-50 rounded-lg p-4 border hover:shadow-md transition-shadow">
                      {donation.photoUrl && (
                        <img
                          src={donation.photoUrl}
                          alt="Food"
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-lg">{donation.foodType}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
                            {donation.status}
                          </span>
                        </div>
                        
                        <p className="text-gray-600">
                          <strong>Quantity:</strong> {donation.quantity} servings
                        </p>
                        
                        <p className="text-gray-600">
                          <strong>Best Before:</strong> {formatDate(donation.bestBefore)}
                        </p>
                        
                        {donation.description && (
                          <p className="text-gray-600">
                            <strong>Description:</strong> {donation.description}
                          </p>
                        )}
                        
                        <p className="text-gray-600">
                          <strong>Donor:</strong> {donation.donor?.name || "Anonymous"}
                        </p>
                        
                        {donation.location && (
                          <p className="text-gray-600">
                            <strong>Location:</strong> {donation.location.latitude.toFixed(4)}, {donation.location.longitude.toFixed(4)}
                          </p>
                        )}
                        
                        <p className="text-gray-500 text-sm">
                          Posted: {formatDate(donation.createdAt)}
                        </p>

                        <button
                          onClick={() => handleAcceptDonation(donation._id)}
                          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors mt-4"
                        >
                          🤝 Accept Donation
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "assignments" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">My Assignments</h2>
                <button
                  onClick={fetchMyAssignments}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Refresh
                </button>
              </div>

              {myAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No active assignments. Check available donations to help!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myAssignments.map((donation) => (
                    <div key={donation._id} className="bg-gray-50 rounded-lg p-4 border">
                      {donation.photoUrl && (
                        <img
                          src={donation.photoUrl}
                          alt="Food"
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-lg">{donation.foodType}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
                            {donation.status}
                          </span>
                        </div>
                        
                        <p className="text-gray-600">
                          <strong>Quantity:</strong> {donation.quantity} servings
                        </p>
                        
                        <p className="text-gray-600">
                          <strong>Best Before:</strong> {formatDate(donation.bestBefore)}
                        </p>
                        
                        <p className="text-gray-600">
                          <strong>Donor:</strong> {donation.donor?.name || "Anonymous"}
                        </p>
                        
                        {donation.location && (
                          <p className="text-gray-600">
                            <strong>Location:</strong> {donation.location.latitude.toFixed(4)}, {donation.location.longitude.toFixed(4)}
                          </p>
                        )}

                        <div className="flex space-x-2 mt-4">
                          {donation.status === "Assigned" && (
                            <button
                              onClick={() => handlePickupComplete(donation._id)}
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                              📦 Confirm Pickup
                            </button>
                          )}
                          
                          {donation.status === "PickedUp" && (
                            <button
                              onClick={() => handleDeliveryComplete(donation._id)}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                              ✅ Confirm Delivery
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "stats" && (
            <div>
              <VolunteerStats userId={user.id} showDetailed={true} />
            </div>
          )}

          {activeTab === "leaderboard" && (
            <div>
              <Leaderboard type="monthly" limit={20} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VolunteerDashboard;
