import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { 
  fetchDonations, 
  getAssignedDonations,
  confirmNGODonation, 
  updateDonationStatus,
  confirmNGOPickup,
  confirmNGODelivery
} from "../services/donation";
import UserProfile from "../components/UserProfile";
import "./NGODashboard.css";

const NGODashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("available");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [donations, setDonations] = useState([]);
  const [assignedDonations, setAssignedDonations] = useState([]);
  const [completedDonations, setCompletedDonations] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedDonations, setSelectedDonations] = useState([]);
  const [filterQuantity, setFilterQuantity] = useState("all");
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [currentDonation, setCurrentDonation] = useState(null);
  const [pickupPhoto, setPickupPhoto] = useState(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    recipientName: '',
    recipientType: 'Individual',
    recipientContact: '',
    numberOfPeopleServed: 1,
    notes: ''
  });
  const [deliveryPhoto, setDeliveryPhoto] = useState(null);

  useEffect(() => {
    if (user) {
      // Add a small delay to prevent race conditions with token storage
      const timer = setTimeout(() => {
        fetchAllDonations();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  const fetchAllDonations = async (retryCount = 0) => {
    // Don't try to fetch if we're offline and not retrying
    if (retryCount === 0 && !navigator.onLine) {
      setError({
        message: 'You appear to be offline. Please check your internet connection.',
        isOffline: true,
        retry: () => fetchAllDonations(0)
      });
      setLoading(false);
      return;
    }

    if (!user) return;
        
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all donations for bulk donations view
      const allResponse = await fetchDonations();
      const allDonations = allResponse.donations || [];
      
      // Fetch assigned donations separately
      const assignedResponse = await getAssignedDonations();
      const assignedDonations = assignedResponse.donations || [];
      
      // Filter donations for NGO view
      const availableDonations = allDonations.filter(d => 
        (d.status === "Pending" || d.status === "Assigned") && 
        d.quantity >= 10 && // NGOs handle bulk donations (10+ servings)
        (!d.assignedTo || d.assignedTo._id === user.id) // Either unassigned or assigned to this NGO
      );
      
      // Use assigned donations from dedicated endpoint
      const assigned = assignedDonations.filter(d => 
        ["Assigned", "PickedUp"].includes(d.status)
      );
      
      const completed = assignedDonations.filter(d => 
        d.status === "Delivered"
      );
      
      console.log('Available donations:', availableDonations);
      console.log('Assigned donations:', assigned);
      console.log('Completed donations:', completed);
      
      setDonations(availableDonations);
      setAssignedDonations(assigned);
      setCompletedDonations(completed);
      setLastUpdated(new Date());
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error("Error in fetchAllDonations:", {
        message: error.message,
        code: error.code,
        isNetworkError: error.isNetworkError,
        isOffline: error.isOffline,
        retryCount
      });
      
      let errorMessage = 'Failed to fetch donations';
      if (error.isOffline) {
        errorMessage = 'You appear to be offline. Please check your internet connection.';
      } else if (error.response?.status === 400) {
        errorMessage = 'Authentication error. Please try logging in again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.isNetworkError) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      setError({
        message: errorMessage,
        isNetworkError: error.isNetworkError,
        isOffline: error.isOffline,
        retry: () => fetchAllDonations(retryCount + 1)
      });
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
      // Accept all selected donations as NGO
      const results = await Promise.allSettled(
        selectedDonations.map(donationId => 
          confirmNGODonation(donationId, 'NGO has accepted the assignment')
        )
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      setSelectedDonations([]);
      fetchAllDonations();
      
      if (successful > 0) {
        alert(`Successfully accepted ${successful} donation(s)!`);
      }
      if (failed > 0) {
        alert(`Failed to accept ${failed} donation(s). Please try again.`);
      }
    } catch (error) {
      console.error("Error accepting donations:", error);
      alert("Error accepting donations. " + (error.response?.data?.message || "Please try again."));
    }
  };

  const handleStatusUpdate = async (donationId, newStatus) => {
    try {
      console.log(`Updating status to ${newStatus} for donation ${donationId}`);
      
      const donation = [...assignedDonations, ...donations].find(d => d._id === donationId);
      
      if (newStatus === 'PickedUp') {
        // For pickup, show the photo upload modal
        if (donation) {
          setCurrentDonation(donation);
          setShowPickupModal(true);
        }
        return;
      }
      
      if (newStatus === 'Delivered') {
        // For delivery, show the delivery confirmation form
        if (donation) {
          setCurrentDonation(donation);
          setDeliveryForm({
            recipientName: '',
            recipientType: 'Individual',
            recipientContact: '',
            numberOfPeopleServed: 1,
            notes: ''
          });
          setDeliveryPhoto(null);
          setShowDeliveryModal(true);
        }
        return;
      }
      
      // For other status updates
      await updateDonationStatus(donationId, { status: newStatus });
      fetchAllDonations();
      
      const statusMessages = {
        "Delivered": "Delivery completed! Thank you for your service!"
      };
      
      alert(statusMessages[newStatus] || "Status updated successfully!");
    } catch (error) {
      console.error("Error updating status:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(error.response?.data?.message || "Error updating status. Please try again.");
    }
  };
  
  const handlePickupPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPickupPhoto(file);
    }
  };
  
  const handleConfirmPickup = async () => {
    if (!currentDonation) return;
    
    try {
      await confirmNGOPickup(currentDonation._id, pickupPhoto);
      
      // Close modal and reset state
      setShowPickupModal(false);
      setCurrentDonation(null);
      setPickupPhoto(null);
      
      // Refresh data
      fetchAllDonations();
      alert("Pickup confirmed successfully!");
    } catch (error) {
      console.error("Error confirming pickup:", error);
      alert(error.response?.data?.message || "Error confirming pickup. Please try again.");
    }
  };

  const handleDeliveryFormChange = (e) => {
    const { name, value } = e.target;
    setDeliveryForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDeliveryPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDeliveryPhoto(file);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!currentDonation) return;
    
    try {
      if (!deliveryPhoto) {
        alert('Please upload a delivery photo');
        return;
      }
      
      if (!deliveryForm.recipientName) {
        alert('Please enter recipient name');
        return;
      }
      
      await confirmNGODelivery(currentDonation._id, deliveryForm, deliveryPhoto);
      
      // Close modal and reset state
      setShowDeliveryModal(false);
      setCurrentDonation(null);
      setDeliveryPhoto(null);
      
      // Refresh data
      fetchAllDonations();
      alert('Delivery confirmed successfully! A CSR report has been sent to the donor.');
    } catch (error) {
      console.error('Error confirming delivery:', error);
      alert(error.response?.data?.message || 'Error confirming delivery. Please try again.');
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
    <div className="ngo-dashboard">
      {/* Header */}
      <div className="dashboard-card ngo-header">
        <div className="header-content">
          <div className="header-main">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <h1 className="dashboard-title">NGO Dashboard</h1>
              <p className="welcome-message">Welcome back, {user.name}!</p>
            </div>
          </div>
          
          <div className="impact-stats">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <div className="stat-value">{assignedDonations.length}</div>
                <div className="stat-label">Active Assignments</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <div className="stat-value">{completedDonations.length}</div>
                <div className="stat-label">Completed</div>
              </div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-icon">🍽️</div>
              <div className="stat-info">
                <div className="stat-value">{getTotalServings(completedDonations)}</div>
                <div className="stat-label">Servings Delivered</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="dashboard-card">
        <div className="nav-tabs">
          <button
            onClick={() => setActiveTab("available")}
            className={`nav-tab ${activeTab === "available" ? "active" : ""}`}
          >
            Bulk Donations ({filteredDonations.length})
          </button>
          <button
            onClick={() => setActiveTab("assigned")}
            className={`nav-tab ${activeTab === "assigned" ? "active" : ""}`}
          >
            Active Assignments ({assignedDonations.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`nav-tab ${activeTab === "completed" ? "active" : ""}`}
          >
            Completed ({completedDonations.length})
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`nav-tab ${activeTab === "profile" ? "active" : ""}`}
          >
            Profile
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === "available" && (
            <div>
              <div className="section-header">
                <div className="section-title-container">
                  <h2 className="section-title">Bulk Donations Available</h2>
                  <span className="donation-count">{filteredDonations.length} items</span>
                </div>
                <div className="filter-section">
                  <div className="filter-group">
                    <label className="filter-label">Filter by size:</label>
                    <select
                      value={filterQuantity}
                      onChange={(e) => setFilterQuantity(e.target.value)}
                      className="dashboard-input"
                    >
                      <option value="all">All Sizes</option>
                      <option value="medium">Medium (10-49 servings)</option>
                      <option value="large">Large (50+ servings)</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="bulk-actions">
                <div className="selection-info">
                  <button
                    onClick={handleSelectAll}
                    className="dashboard-button"
                  >
                    {selectedDonations.length === filteredDonations.length ? "Deselect All" : "Select All"}
                  </button>
                  {selectedDonations.length > 0 && (
                    <span className="selected-count">
                      {selectedDonations.length} selected
                    </span>
                  )}
                </div>
                <div className="action-buttons">
                  {selectedDonations.length > 0 && (
                    <button
                      onClick={handleBulkAccept}
                      className="dashboard-button success"
                    >
                      Accept Selected ({selectedDonations.length})
                    </button>
                  )}
                  <button
                    onClick={fetchAllDonations}
                    className="dashboard-button primary"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p className="loading-text">Loading donations...</p>
                </div>
              ) : filteredDonations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <p className="empty-state-text">No bulk donations available at the moment.</p>
                  <p className="empty-state-subtext">NGOs handle donations with 10+ servings</p>
                </div>
              ) : (
                <div className="donations-grid">
                  {filteredDonations.map((donation) => (
                    <div key={donation._id} className={`donation-card ${selectedDonations.includes(donation._id) ? 'selected' : ''}`}>
                      <div className="donation-card-header">
                        <div className="donation-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedDonations.includes(donation._id)}
                            onChange={() => handleSelectDonation(donation._id)}
                            className="dashboard-input"
                          />
                        </div>
                        <div className="donation-type">
                          <h3 className="food-title">{donation.foodType}</h3>
                          <span className={`status-badge ${donation.status.toLowerCase()}`}>
                            {donation.status}
                          </span>
                        </div>
                        <div className="donation-quantity">
                          <div className="quantity-number">{donation.quantity}</div>
                          <div className="quantity-label">servings</div>
                        </div>
                      </div>
                      
                      <div className="donation-card-body">
                        {donation.photoUrl && (
                          <div className="donation-image-container">
                            <img
                              src={donation.photoUrl}
                              alt="Food"
                              className="donation-image"
                            />
                          </div>
                        )}
                        
                        <div className="donation-details">
                          <div className="detail-row">
                            <span className="detail-label">Best Before:</span>
                            <span className="detail-value">{formatDate(donation.bestBefore)}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Donor:</span>
                            <span className="detail-value">{donation.donor?.name || "Anonymous"}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Posted:</span>
                            <span className="detail-value">{formatDate(donation.createdAt)}</span>
                          </div>
                          {donation.description && (
                            <div className="detail-row full-width">
                              <span className="detail-label">Description:</span>
                              <span className="detail-value">{donation.description}</span>
                            </div>
                          )}
                          {donation.location && (
                            <div className="detail-row full-width">
                              <span className="detail-label">Location:</span>
                              <span className="detail-value">
                                {donation.location.latitude.toFixed(4)}, {donation.location.longitude.toFixed(4)}
                              </span>
                            </div>
                          )}
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
              <div className="section-header">
                <h2 className="section-title">Active Assignments</h2>
                <button
                  onClick={fetchAllDonations}
                  className="dashboard-button primary"
                >
                  Refresh
                </button>
              </div>

              {assignedDonations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <p className="empty-state-text">No active assignments. Check bulk donations to help!</p>
                </div>
              ) : (
                <div className="assignment-grid">
                  {assignedDonations.map((donation) => (
                    <div key={donation._id} className="assignment-card">
                      {donation.photoUrl && (
                        <img
                          src={donation.photoUrl}
                          alt="Food"
                          className="assignment-image"
                        />
                      )}
                      
                      <div className="assignment-content">
                        <div className="assignment-header">
                          <h3 className="assignment-title">{donation.foodType}</h3>
                          <span className={`status-badge ${donation.status.toLowerCase()}`}>
                            {donation.status}
                          </span>
                        </div>
                        
                        <div className="assignment-info">
                          <p><strong>Quantity:</strong> {donation.quantity} servings</p>
                          <p><strong>Best Before:</strong> {formatDate(donation.bestBefore)}</p>
                          <p><strong>Donor:</strong> {donation.donor?.name || "Anonymous"}</p>
                        </div>

                        <div className="assignment-actions">
                          {donation.status === "Assigned" && (
                            <button
                              onClick={() => handleStatusUpdate(donation._id, "PickedUp")}
                              className="dashboard-button primary"
                            >
                              📦 Confirm Pickup
                            </button>
                          )}
                          
                          {donation.status === "PickedUp" && (
                            <button
                              onClick={() => handleStatusUpdate(donation._id, "Delivered")}
                              className="dashboard-button success"
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
              <div className="section-header">
                <h2 className="section-title">Completed Deliveries</h2>
                <div className="impact-summary">
                  <p className="impact-text">
                    Total Impact: {getTotalServings(completedDonations)} servings delivered
                  </p>
                </div>
              </div>

              {completedDonations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🎯</div>
                  <p className="empty-state-text">No completed deliveries yet. Start accepting donations to make an impact!</p>
                </div>
              ) : (
                <div className="completed-grid">
                  {completedDonations.map((donation) => (
                    <div key={donation._id} className="completed-card">
                      {donation.photoUrl && (
                        <img
                          src={donation.photoUrl}
                          alt="Food"
                          className="completed-image"
                        />
                      )}
                      
                      <div className="completed-content">
                        <div className="completed-header">
                          <h3 className="completed-title">{donation.foodType}</h3>
                          <span className="status-badge delivered">
                            ✅ Delivered
                          </span>
                        </div>
                        
                        <div className="completed-info">
                          <p><strong>Quantity:</strong> {donation.quantity} servings</p>
                          <p><strong>Donor:</strong> {donation.donor?.name || "Anonymous"}</p>
                          <p className="text-sm">Completed: {formatDate(donation.updatedAt || donation.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div>
              <UserProfile />
            </div>
          )}
        </div>
      </div>
      
      {/* Pickup Confirmation Modal */}
      {showPickupModal && currentDonation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Pickup</h3>
              <p className="modal-description">Please upload a photo of the pickup location for {currentDonation.foodType}.</p>
            </div>
            
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label required">
                  Pickup Photo (Required)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePickupPhotoChange}
                  className="file-input"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setShowPickupModal(false)}
                className="dashboard-button"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPickup}
                disabled={!pickupPhoto}
                className={`dashboard-button success ${!pickupPhoto ? 'disabled' : ''}`}
              >
                Confirm Pickup
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeliveryModal && currentDonation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Delivery</h3>
              <p className="modal-description">Please provide delivery details for {currentDonation.foodType}.</p>
            </div>
            
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label required">
                  Recipient Name
                </label>
                <input
                  type="text"
                  name="recipientName"
                  value={deliveryForm.recipientName}
                  onChange={handleDeliveryFormChange}
                  className="form-input"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Recipient Type
                </label>
                <select
                  name="recipientType"
                  value={deliveryForm.recipientType}
                  onChange={handleDeliveryFormChange}
                  className="form-input"
                >
                  <option value="Individual">Individual</option>
                  <option value="NGO">NGO</option>
                  <option value="Shelter">Shelter</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Contact Information
                </label>
                <input
                  type="text"
                  name="recipientContact"
                  value={deliveryForm.recipientContact}
                  onChange={handleDeliveryFormChange}
                  className="form-input"
                  placeholder="Phone number or email"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Number of People Served
                </label>
                <input
                  type="number"
                  name="numberOfPeopleServed"
                  min="1"
                  value={deliveryForm.numberOfPeopleServed}
                  onChange={handleDeliveryFormChange}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={deliveryForm.notes}
                  onChange={handleDeliveryFormChange}
                  rows="3"
                  className="form-input form-textarea"
                  placeholder="Any additional notes about the delivery..."
                />
              </div>
              
              <div className="form-group">
                <label className="form-label required">
                  Delivery Photo (Required)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleDeliveryPhotoChange}
                  className="file-input"
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="dashboard-button"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelivery}
                disabled={!deliveryPhoto || !deliveryForm.recipientName}
                className={`dashboard-button success ${!deliveryPhoto || !deliveryForm.recipientName ? 'disabled' : ''}`}
              >
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NGODashboard;
