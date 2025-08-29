import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { fetchDonations, updateDonationStatus } from "../services/donation";

const NGODashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("available");
  const [donations, setDonations] = useState([]);
  const [assignedDonations, setAssignedDonations] = useState([]);
  const [completedDonations, setCompletedDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDonations, setSelectedDonations] = useState([]);
  const [filterQuantity, setFilterQuantity] = useState("all");

  useEffect(() => {
    if (user) {
      fetchAllDonations();
    }
  }, [user]);

  const fetchAllDonations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetchDonations(token);
      
      const allDonations = response.donations || [];
      
      // Filter donations for NGO dashboard
      const availableDonations = allDonations.filter(d => 
        d.status === "Pending" && d.quantity >= 10 // NGOs handle bulk donations (10+ servings)
      );
      
      const assigned = allDonations.filter(d => 
        d.assignedTo && d.assignedTo._id === user.id && 
        ["Assigned", "PickedUp"].includes(d.status)
      );
      
      const completed = allDonations.filter(d => 
        d.assignedTo && d.assignedTo._id === user.id && 
        d.status === "Delivered"
      );
      
      setDonations(availableDonations);
      setAssignedDonations(assigned);
      setCompletedDonations(completed);
    } catch (error) {
      console.error("Error fetching donations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDonation = (donationId) => {
    setSelectedDonations(prev => 
      prev.includes(donationId) 
        ? prev.filter(id => id !== donationId)
        : [...prev, donationId]
    );
  };

  const handleSelectAll = () => {
    const filteredDonations = getFilteredDonations();
    if (selectedDonations.length === filteredDonations.length) {
      setSelectedDonations([]);
    } else {
      setSelectedDonations(filteredDonations.map(d => d._id));
    }
  };

  const handleBulkAccept = async () => {
    if (selectedDonations.length === 0) {
      alert("Please select donations to accept.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      
      // Accept all selected donations
      await Promise.all(
        selectedDonations.map(donationId => 
          updateDonationStatus(donationId, "Assigned", token)
        )
      );
      
      setSelectedDonations([]);
      fetchAllDonations();
      alert(`Successfully accepted ${selectedDonations.length} donations!`);
    } catch (error) {
      console.error("Error accepting donations:", error);
      alert("Error accepting donations. Please try again.");
    }
  };

  const handleStatusUpdate = async (donationId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await updateDonationStatus(donationId, newStatus, token);
      fetchAllDonations();
      
      const statusMessages = {
        "PickedUp": "Pickup confirmed!",
        "Delivered": "Delivery completed! Great work!"
      };
      
      alert(statusMessages[newStatus] || "Status updated successfully!");
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error updating status. Please try again.");
    }
  };

  const getFilteredDonations = () => {
    if (filterQuantity === "all") return donations;
    if (filterQuantity === "medium") return donations.filter(d => d.quantity >= 10 && d.quantity < 50);
    if (filterQuantity === "large") return donations.filter(d => d.quantity >= 50);
    return donations;
  };

  const getTotalServings = (donationList) => {
    return donationList.reduce((total, donation) => total + donation.quantity, 0);
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

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto mt-20 p-4 bg-white shadow rounded">
        <p>Please login to access your dashboard.</p>
      </div>
    );
  }

  const filteredDonations = getFilteredDonations();

  return (
    <div className="max-w-7xl mx-auto mt-20 p-4">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">NGO Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user.name}!</p>
            <div className="flex items-center mt-2 space-x-6">
              <div className="flex items-center">
                <span className="text-blue-500">📦</span>
                <span className="ml-1 font-medium">{assignedDonations.length} Active Assignments</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-500">✅</span>
                <span className="ml-1 font-medium">{completedDonations.length} Completed</span>
              </div>
              <div className="flex items-center">
                <span className="text-orange-500">🍽️</span>
                <span className="ml-1 font-medium">{getTotalServings(completedDonations)} Servings Delivered</span>
              </div>
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
              Bulk Donations ({filteredDonations.length})
            </button>
            <button
              onClick={() => setActiveTab("assigned")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "assigned"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Active Assignments ({assignedDonations.length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "completed"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Completed ({completedDonations.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "available" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <h2 className="text-2xl font-bold">Bulk Donations Available</h2>
                  <select
                    value={filterQuantity}
                    onChange={(e) => setFilterQuantity(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Sizes</option>
                    <option value="medium">Medium (10-49 servings)</option>
                    <option value="large">Large (50+ servings)</option>
                  </select>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSelectAll}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {selectedDonations.length === filteredDonations.length ? "Deselect All" : "Select All"}
                  </button>
                  {selectedDonations.length > 0 && (
                    <button
                      onClick={handleBulkAccept}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Accept Selected ({selectedDonations.length})
                    </button>
                  )}
                  <button
                    onClick={fetchAllDonations}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading donations...</p>
                </div>
              ) : filteredDonations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No bulk donations available at the moment.</p>
                  <p className="text-gray-500 text-sm mt-2">NGOs handle donations with 10+ servings</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDonations.map((donation) => (
                    <div key={donation._id} className={`bg-gray-50 rounded-lg p-4 border-2 transition-all ${
                      selectedDonations.includes(donation._id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}>
                      <div className="flex items-start space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedDonations.includes(donation._id)}
                          onChange={() => handleSelectDonation(donation._id)}
                          className="mt-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        
                        {donation.photoUrl && (
                          <img
                            src={donation.photoUrl}
                            alt="Food"
                            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h3 className="font-semibold text-lg">{donation.foodType}</h3>
                            <p className="text-gray-600">
                              <strong>{donation.quantity} servings</strong>
                            </p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)} mt-1`}>
                              {donation.status}
                            </span>
                          </div>
                          
                          <div>
                            <p className="text-gray-600">
                              <strong>Best Before:</strong> {formatDate(donation.bestBefore)}
                            </p>
                            <p className="text-gray-600">
                              <strong>Donor:</strong> {donation.donor?.name || "Anonymous"}
                            </p>
                            <p className="text-gray-500 text-sm">
                              Posted: {formatDate(donation.createdAt)}
                            </p>
                          </div>
                          
                          <div>
                            {donation.description && (
                              <p className="text-gray-600 text-sm mb-2">
                                <strong>Description:</strong> {donation.description}
                              </p>
                            )}
                            {donation.location && (
                              <p className="text-gray-600 text-sm">
                                <strong>Location:</strong> {donation.location.latitude.toFixed(4)}, {donation.location.longitude.toFixed(4)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "assigned" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Active Assignments</h2>
                <button
                  onClick={fetchAllDonations}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Refresh
                </button>
              </div>

              {assignedDonations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No active assignments. Check bulk donations to help!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {assignedDonations.map((donation) => (
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

                        <div className="flex space-x-2 mt-4">
                          {donation.status === "Assigned" && (
                            <button
                              onClick={() => handleStatusUpdate(donation._id, "PickedUp")}
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                            >
                              📦 Confirm Pickup
                            </button>
                          )}
                          
                          {donation.status === "PickedUp" && (
                            <button
                              onClick={() => handleStatusUpdate(donation._id, "Delivered")}
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

          {activeTab === "completed" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Completed Deliveries</h2>
                <div className="text-right">
                  <p className="text-lg font-semibold text-green-600">
                    Total Impact: {getTotalServings(completedDonations)} servings delivered
                  </p>
                </div>
              </div>

              {completedDonations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No completed deliveries yet. Start accepting donations to make an impact!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedDonations.map((donation) => (
                    <div key={donation._id} className="bg-green-50 rounded-lg p-4 border border-green-200">
                      {donation.photoUrl && (
                        <img
                          src={donation.photoUrl}
                          alt="Food"
                          className="w-full h-32 object-cover rounded-lg mb-4"
                        />
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-lg">{donation.foodType}</h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✅ Delivered
                          </span>
                        </div>
                        
                        <p className="text-gray-600">
                          <strong>Quantity:</strong> {donation.quantity} servings
                        </p>
                        
                        <p className="text-gray-600">
                          <strong>Donor:</strong> {donation.donor?.name || "Anonymous"}
                        </p>
                        
                        <p className="text-gray-500 text-sm">
                          Completed: {formatDate(donation.updatedAt || donation.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NGODashboard;
