import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { fetchDonations, getAssignedDonations, acceptDonation, confirmPickup, confirmDelivery } from "../services/donation";
import VolunteerStats from "../components/VolunteerStats";
import Leaderboard from "../components/Leaderboard";

const VolunteerDashboard = () => {
  const { user, logout } = useAuth();
  const [donations, setDonations] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingCompleted, setLoadingCompleted] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const [deliveryForms, setDeliveryForms] = useState({});
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [currentDonation, setCurrentDonation] = useState(null);
  const [pickupPhoto, setPickupPhoto] = useState(null);

  const token = localStorage.getItem("token");

  const fetchAvailableDonations = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingDonations(true);
      const response = await fetchDonations(token);
      const availableDonations = response.donations?.filter(d => d.status === "Pending") || [];
      setDonations(availableDonations);
    } catch (err) {
      console.error("Error fetching donations:", err);
      
      // Handle specific error types
      let errorMessage = 'Failed to fetch donations';
      if (err.isOffline) {
        errorMessage = 'You appear to be offline. Please check your internet connection.';
      } else if (err.response?.status === 400) {
        errorMessage = 'Authentication error. Please try logging in again.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (err.isNetworkError) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoadingDonations(false);
    }
  }, [token]);

  const fetchMyAssignments = useCallback(async () => {
    if (!token || !user) return;
    try {
      setLoadingAssignments(true);
      const response = await getAssignedDonations();
      const myDonations = response.donations?.filter(d => 
        ["Assigned", "PickedUp"].includes(d.status)
      ) || [];
      setMyAssignments(myDonations);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      
      // Handle specific error types
      let errorMessage = 'Failed to fetch assignments';
      if (err.isOffline) {
        errorMessage = 'You appear to be offline. Please check your internet connection.';
      } else if (err.response?.status === 400) {
        errorMessage = 'Authentication error. Please try logging in again.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (err.isNetworkError) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoadingAssignments(false);
    }
  }, [token, user]);

  const fetchCompletedDeliveries = useCallback(async () => {
    if (!token || !user) return;
    try {
      setLoadingCompleted(true);
      const response = await getAssignedDonations();
      const completed = response.donations?.filter(d => 
        d.status === "Delivered"
      ) || [];
      setCompletedDeliveries(completed);
    } catch (err) {
      console.error("Error fetching completed deliveries:", err);
      
      // Handle specific error types
      let errorMessage = 'Failed to fetch completed deliveries';
      if (err.isOffline) {
        errorMessage = 'You appear to be offline. Please check your internet connection.';
      } else if (err.response?.status === 400) {
        errorMessage = 'Authentication error. Please try logging in again.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (err.isNetworkError) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoadingCompleted(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (user) {
      // Add a small delay to prevent race conditions with token storage
      const timer = setTimeout(() => {
        fetchAvailableDonations();
        fetchMyAssignments();
        fetchCompletedDeliveries();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleAcceptDonation = async (donationId) => {
    if (!token) return;
    try {
      const result = await acceptDonation(donationId, token);
      alert("Donation accepted successfully!");
      fetchAvailableDonations();
      fetchMyAssignments();
    } catch (err) {
      console.error("Error accepting donation:", err);
      alert("Failed to accept donation. Please try again.");
    }
  };

  const handlePickupComplete = async (donationId) => {
    setCurrentDonation(donationId);
    setShowPickupModal(true);
  };

  const confirmPickupWithPhoto = async () => {
    if (!currentDonation || !pickupPhoto) {
      alert("Please select a photo before confirming pickup.");
      return;
    }
    
    try {
      await confirmPickup(currentDonation, pickupPhoto);
      alert("Pickup confirmed!");
      setShowPickupModal(false);
      setCurrentDonation(null);
      setPickupPhoto(null);
      await fetchMyAssignments();
      await fetchCompletedDeliveries();
    } catch (err) {
      console.error("Error confirming pickup:", err);
      alert("Error confirming pickup. Please try again.");
    }
  };

  const updateDeliveryForm = (donationId, updates) => {
    setDeliveryForms(prev => ({
      ...prev,
      [donationId]: {
        ...(prev[donationId] || {
          recipientName: '',
          recipientType: 'individual',
          recipientContact: '',
          numberOfPeopleServed: 1,
          notes: '',
          photo: null
        }),
        ...updates
      }
    }));
  };

  const handleDeliverySubmit = async (donationId) => {
    if (!token) return;

    const formData = deliveryForms[donationId] || {};
    
    if (!formData.photo) return alert('Please upload a delivery photo');
    if (!formData.recipientName || !formData.recipientType) return alert('Please fill all required fields');

    try {
      // Prepare the delivery data object
      const deliveryInfo = {
        recipientName: formData.recipientName,
        recipientType: formData.recipientType,
        numberOfPeopleServed: formData.numberOfPeopleServed || 1,
        notes: formData.notes || ''
      };

      // Optimistically update the UI by removing the donation from the list
      setMyAssignments(prev => prev.filter(donation => donation._id !== donationId));
      
      // Call confirmDelivery with the photo
      await confirmDelivery(donationId, deliveryInfo, formData.photo);
      
      // Show success message
      alert('Delivery confirmed successfully!');
      
      // Remove the form data for this donation
      setDeliveryForms(prev => {
        const newForms = { ...prev };
        delete newForms[donationId];
        return newForms;
      });

      // Refresh the assignments and completed deliveries lists to ensure data consistency
      await fetchMyAssignments();
      await fetchCompletedDeliveries();
    } catch (err) {
      console.error("Error confirming delivery:", err);
      const errorMessage = err.response?.data?.message || 'Please try again';
      alert(`Failed to confirm delivery: ${errorMessage}`);
    }
  };

  const handleDeliveryPhoto = (e, donationId) => {
    const file = e.target.files[0];
    if (file) {
      updateDeliveryForm(donationId, { photo: file });
    }
  };

  const renderDeliveryForm = (donation) => {
    const formData = deliveryForms[donation._id] || {
      recipientName: '',
      recipientType: 'individual',
      recipientContact: '',
      numberOfPeopleServed: 1,
      notes: '',
      photo: null
    };

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-3">Delivery Confirmation</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Name *</label>
            <input
              type="text"
              value={formData.recipientName}
              onChange={(e) => updateDeliveryForm(donation._id, { recipientName: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="Enter recipient name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Type *</label>
            <select
              value={formData.recipientType}
              onChange={(e) => updateDeliveryForm(donation._id, { recipientType: e.target.value })}
              className="w-full p-2 border rounded"
              required
            >
              <option value="individual">Individual</option>
              <option value="family">Family</option>
              <option value="shelter">Shelter</option>
              <option value="ngo">NGO</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">People Served</label>
            <input
              type="number"
              min="1"
              value={formData.numberOfPeopleServed}
              onChange={(e) => updateDeliveryForm(donation._id, { numberOfPeopleServed: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Photo *</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleDeliveryPhoto(e, donation._id)}
              className="w-full p-2 border rounded"
              required
            />
            {formData.photo && (
              <p className="text-xs text-green-600 mt-1">Photo ready for upload</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateDeliveryForm(donation._id, { notes: e.target.value })}
              className="w-full p-2 border rounded"
              rows="2"
              placeholder="Any additional notes about the delivery"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={() => setActiveDonation(null)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => handleDeliverySubmit(donation._id)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Confirm Delivery
          </button>
        </div>
      </div>
    );
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

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });

  if (!user) return <div className="max-w-3xl mx-auto mt-20 p-4 bg-white shadow rounded">Please login to access your dashboard.</div>;

  return (
    <div className="max-w-6xl mx-auto mt-20 p-4 space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Volunteer Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.name}!</p>
          <div className="flex space-x-4 mt-2">
            <div className="flex items-center"><span className="text-yellow-500">⭐</span><span className="ml-1 font-medium">{user.points || 0} Points</span></div>
            <div className="flex items-center"><span className="text-green-500">✓</span><span className="ml-1 text-sm text-gray-600">{user.completedDeliveries || 0} Deliveries</span></div>
          </div>
        </div>
        <button onClick={logout} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Logout</button>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {["available", "assignments", "completed", "stats", "leaderboard"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "available" && `Available Donations (${donations.length})`}
                {tab === "assignments" && `My Assignments (${myAssignments.length})`}
                {tab === "completed" && `Completed Deliveries (${completedDeliveries.length})`}
                {tab === "stats" && `My Stats & Achievements`}
                {tab === "leaderboard" && `Leaderboard`}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "available" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Available Donations</h2>
                <button onClick={fetchAvailableDonations} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">Refresh</button>
              </div>
              {loadingDonations ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading donations...</p>
                </div>
              ) : donations.length === 0 ? (
                <p className="text-center text-gray-600 py-8">No available donations at the moment.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {donations.map(donation => (
                    <div key={donation._id} className="bg-gray-50 rounded-lg p-4 border hover:shadow-md transition-shadow">
                      {donation.photoUrl && <img src={donation.photoUrl} alt="Food" className="w-full h-48 object-cover rounded-lg mb-4" />}
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-lg">{donation.foodType}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>{donation.status}</span>
                        </div>
                        <p className="text-gray-600"><strong>Quantity:</strong> {donation.quantity} servings</p>
                        <p className="text-gray-600"><strong>Best Before:</strong> {formatDate(donation.bestBefore)}</p>
                        <p className="text-gray-600"><strong>Donor:</strong> {donation.donor?.name || "Anonymous"}</p>
                        {donation.location && <p className="text-gray-600"><strong>Location:</strong> {donation.location.latitude.toFixed(4)}, {donation.location.longitude.toFixed(4)}</p>}
                        <p className="text-gray-500 text-sm">Posted: {formatDate(donation.createdAt)}</p>
                        <button onClick={() => handleAcceptDonation(donation._id)} className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors mt-4">🤝 Accept Donation</button>
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
                <button onClick={fetchMyAssignments} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">Refresh</button>
              </div>
              {loadingAssignments ? (
                <p className="text-center text-gray-600 py-8">Loading assignments...</p>
              ) : myAssignments.length === 0 ? (
                <p className="text-center text-gray-600 py-8">No active assignments. Check available donations to help!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myAssignments.map(donation => (
                    <div key={donation._id} className="bg-gray-50 rounded-lg p-4 border">
                      {donation.photoUrl && <img src={donation.photoUrl} alt="Food" className="w-full h-48 object-cover rounded-lg mb-4" />}
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-lg">{donation.foodType}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>{donation.status}</span>
                        </div>
                        <p className="text-gray-600"><strong>Quantity:</strong> {donation.quantity} servings</p>
                        <p className="text-gray-600"><strong>Best Before:</strong> {formatDate(donation.bestBefore)}</p>
                        <p className="text-gray-600"><strong>Donor:</strong> {donation.donor?.name || "Anonymous"}</p>
                        {donation.location && <p className="text-gray-600"><strong>Location:</strong> {donation.location.latitude.toFixed(4)}, {donation.location.longitude.toFixed(4)}</p>}

                        {donation.status === "Assigned" && <button onClick={() => handlePickupComplete(donation._id)} className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg">📦 Confirm Pickup</button>}

                        {donation.status === "PickedUp" && renderDeliveryForm(donation)}
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
                    Total Impact: {completedDeliveries.reduce((sum, d) => sum + (d.quantity || 0), 0)} servings delivered
                  </p>
                </div>
              </div>

              {loadingCompleted ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading completed deliveries...</p>
                </div>
              ) : completedDeliveries.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No completed deliveries yet. Start accepting donations to make an impact!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedDeliveries.map((donation) => (
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
                          Completed: {formatDate(donation.deliveryDetails?.deliveredAt || donation.updatedAt)}
                        </p>
                        
                        {donation.deliveryDetails && (
                          <div className="mt-3 p-2 bg-white rounded border">
                            <p className="text-sm text-gray-600">
                              <strong>Delivered to:</strong> {donation.deliveryDetails.recipientName}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>People served:</strong> {donation.deliveryDetails.numberOfPeopleServed}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "stats" && <VolunteerStats userId={user.id} showDetailed={true} />}
          {activeTab === "leaderboard" && <Leaderboard type="monthly" limit={20} />}
        </div>
      </div>

      {/* Pickup Photo Modal */}
      {showPickupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Pickup</h3>
            <p className="text-gray-600 mb-4">Please take a photo to confirm the pickup:</p>
            
            <input
              type="file"
              accept="image/*"
              capture="camera"
              onChange={(e) => setPickupPhoto(e.target.files[0])}
              className="w-full mb-4 p-2 border rounded"
            />
            
            {pickupPhoto && (
              <div className="mb-4">
                <img
                  src={URL.createObjectURL(pickupPhoto)}
                  alt="Pickup preview"
                  className="w-full h-32 object-cover rounded"
                />
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPickupModal(false);
                  setCurrentDonation(null);
                  setPickupPhoto(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmPickupWithPhoto}
                disabled={!pickupPhoto}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
              >
                Confirm Pickup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;
