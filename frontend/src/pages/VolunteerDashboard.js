import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { fetchDonations, getAssignedDonations, acceptDonation, confirmPickup, confirmDelivery } from "../services/donation";
import VolunteerStats from "../components/VolunteerStats";
import Leaderboard from "../components/Leaderboard";
import "./VolunteerDashboard.css";

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

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('all');
  const [userPosition, setUserPosition] = useState(null);

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

  const fetchLeaderboardData = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingLeaderboard(true);
      
      // Map frontend period to backend type
      const periodMap = {
        'alltime': 'alltime',
        'month': 'monthly', 
        'week': 'weekly'
      };
      
      const type = periodMap[leaderboardPeriod] || 'alltime';
      
      const response = await api.get(`/volunteers/leaderboard?type=${type}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        const leaderboardData = Array.isArray(response.data.leaderboard) ? response.data.leaderboard : [];
        
        // Transform backend data to match frontend format
        const transformedData = leaderboardData.map((volunteer, index) => ({
          _id: volunteer.user._id,
          name: volunteer.user.name,
          totalDeliveries: volunteer.stats?.totalDeliveries || 0,
          totalServings: volunteer.stats?.totalServingsDelivered || 0,
          peopleHelped: Math.floor((volunteer.stats?.totalServingsDelivered || 0) * 0.8), // Estimate based on servings
          score: volunteer.totalPoints || 0
        }));
        
        setLeaderboardData(transformedData);
        
        // Check if current user is in leaderboard
        const userData = localStorage.getItem('user');
        if (userData) {
          const currentUser = JSON.parse(userData);
          const userInLeaderboard = transformedData.find(v => v._id === currentUser._id);
          
          if (!userInLeaderboard) {
            // Fetch user's profile to get their stats if not in top 20
            try {
              const profileResponse = await api.get('/volunteers/profile', {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (profileResponse.data && profileResponse.data.success && profileResponse.data.profile) {
                const profile = profileResponse.data.profile;
                const userPoints = {
                  alltime: profile.totalPoints || 0,
                  monthly: profile.monthlyPoints || 0,
                  weekly: profile.weeklyPoints || 0
                };
                
                // Estimate user's rank (they're not in top 20)
                const estimatedRank = Math.max(21, transformedData.length + 1);
                
                setUserPosition({
                  rank: estimatedRank,
                  totalDeliveries: profile.stats?.totalDeliveries || 0,
                  totalServings: profile.stats?.totalServingsDelivered || 0,
                  peopleHelped: Math.floor((profile.stats?.totalServingsDelivered || 0) * 0.8),
                  score: userPoints[type] || 0
                });
              }
            } catch (profileError) {
              console.error('Error fetching user profile:', profileError);
            }
          } else {
            // User is in leaderboard, clear user position
            setUserPosition(null);
          }
        }
      } else {
        console.error('Unexpected response format:', response.data);
        setLeaderboardData([]);
        setUserPosition(null);
      }
    } catch (err) {
      console.error("Error fetching leaderboard data:", err);
      setError('Failed to fetch leaderboard data');
      setLeaderboardData([]);
      setUserPosition(null);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [token, leaderboardPeriod]);

  useEffect(() => {
    if (user && activeTab === 'leaderboard') {
      fetchLeaderboardData();
    }
  }, [user, activeTab, fetchLeaderboardData, leaderboardPeriod]);

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
      <div className="delivery-form-card">
        <div className="delivery-form-header">
          <div className="delivery-form-title-section">
            <span className="delivery-form-icon">📋</span>
            <h3 className="delivery-form-title">Delivery Confirmation</h3>
          </div>
          <div className="delivery-form-subtitle">
            Complete the delivery details for {donation.foodType}
          </div>
        </div>
        
        <div className="delivery-form-grid">
          <div className="delivery-form-group">
            <label className="delivery-form-label">
              <span className="label-icon">👤</span>
              Recipient Name *
            </label>
            <input
              type="text"
              value={formData.recipientName}
              onChange={(e) => updateDeliveryForm(donation._id, { recipientName: e.target.value })}
              className="delivery-form-input"
              placeholder="Enter recipient name"
              required
            />
          </div>
          
          <div className="delivery-form-group">
            <label className="delivery-form-label">
              <span className="label-icon">🏠</span>
              Recipient Type *
            </label>
            <select
              value={formData.recipientType}
              onChange={(e) => updateDeliveryForm(donation._id, { recipientType: e.target.value })}
              className="delivery-form-select"
              required
            >
              <option value="individual">Individual</option>
              <option value="family">Family</option>
              <option value="shelter">Shelter</option>
              <option value="ngo">NGO</option>
            </select>
          </div>
          
          <div className="delivery-form-group">
            <label className="delivery-form-label">
              <span className="label-icon">👥</span>
              People Served
            </label>
            <input
              type="number"
              min="1"
              value={formData.numberOfPeopleServed}
              onChange={(e) => updateDeliveryForm(donation._id, { numberOfPeopleServed: e.target.value })}
              className="delivery-form-input"
              placeholder="Number of people served"
            />
          </div>
          
          <div className="delivery-form-group">
            <label className="delivery-form-label">
              <span className="label-icon">📸</span>
              Delivery Photo *
            </label>
            <div className="photo-upload-container">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handleDeliveryPhoto(e, donation._id)}
                className="photo-upload-input"
                required
                id={`photo-upload-${donation._id}`}
              />
              <label htmlFor={`photo-upload-${donation._id}`} className="photo-upload-label">
                <span className="photo-upload-icon">📷</span>
                <span className="photo-upload-text">
                  {formData.photo ? "Change Photo" : "Take Photo"}
                </span>
              </label>
              {formData.photo && (
                <div className="photo-upload-status">
                  <span className="photo-upload-success-icon">✓</span>
                  <span className="photo-upload-success-text">Photo ready</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="delivery-form-group full-width">
            <label className="delivery-form-label">
              <span className="label-icon">📝</span>
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateDeliveryForm(donation._id, { notes: e.target.value })}
              className="delivery-form-textarea"
              rows="3"
              placeholder="Any additional notes about the delivery..."
            />
          </div>
        </div>
        
        <div className="delivery-form-actions">
          <button
            onClick={() => setActiveDonation(null)}
            className="dashboard-button secondary"
          >
            <span className="button-icon">✖</span>
            Cancel
          </button>
          <button
            onClick={() => handleDeliverySubmit(donation._id)}
            className="dashboard-button primary"
            disabled={!formData.recipientName || !formData.photo}
          >
            <span className="button-icon">✓</span>
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

  if (!user) return <div className="auth-check">Please login to access your dashboard.</div>;

  return (
    <div className="volunteer-dashboard">
      {/* Enhanced Header */}
      <div className="dashboard-card volunteer-header">
        <div className="user-info">
          <div className="user-avatar">
            {user.name ? user.name.charAt(0).toUpperCase() : 'V'}
            <div className="avatar-ring"></div>
          </div>
          <div className="user-details">
            <div className="dashboard-title-section">
              <h2 className="dashboard-title">Volunteer Dashboard</h2>
              <div className="welcome-message">
                <span className="welcome-text">Welcome back,</span>
                <span className="user-name">{user.name}!</span>
              </div>
            </div>
            <div className="user-status">
              <span className="status-badge active">
                <span className="status-dot"></span>
                Active
              </span>
              <div className="member-info">
                <span className="member-since">Member since {new Date(user.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                <span className="member-separator">•</span>
                <span className="member-level">Level {user.level || 1} Volunteer</span>
              </div>
            </div>
          </div>
        </div>
        <div className="user-stats enhanced">
          <div className="stat-item primary">
            <div className="stat-icon-wrapper">
              <span className="stat-icon">⭐</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{user.points || 0}</span>
              <span className="stat-label">Points</span>
            </div>
          </div>
          <div className="stat-item success">
            <div className="stat-icon-wrapper">
              <span className="stat-icon">✓</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{user.completedDeliveries || 0}</span>
              <span className="stat-label">Deliveries</span>
            </div>
          </div>
          <div className="stat-item info">
            <div className="stat-icon-wrapper">
              <span className="stat-icon">🍽️</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{user.totalServings || 0}</span>
              <span className="stat-label">Servings</span>
            </div>
          </div>
          <div className="stat-item warning">
            <div className="stat-icon-wrapper">
              <span className="stat-icon">👥</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{user.peopleHelped || 0}</span>
              <span className="stat-label">People Helped</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-card">
        <div className="nav-tabs">
          {["available", "assignments", "completed", "stats", "leaderboard"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`nav-tab ${activeTab === tab ? "active" : ""}`}
            >
              {tab === "available" && `Available Donations (${donations.length})`}
              {tab === "assignments" && `My Assignments (${myAssignments.length})`}
              {tab === "completed" && `Completed Deliveries (${completedDeliveries.length})`}
              {tab === "stats" && `My Stats & Achievements`}
              {tab === "leaderboard" && `Leaderboard`}
            </button>
          ))}
        </div>

        <div className="dashboard-content">
          {activeTab === "available" && (
            <div>
              <div className="section-header">
                <h2 className="section-title">Available Donations</h2>
                <button 
                  onClick={fetchAvailableDonations} 
                  className="dashboard-button primary"
                >
                  Refresh
                </button>
              </div>
              {loadingDonations ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p className="loading-text">Loading donations...</p>
                </div>
              ) : donations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📦</div>
                  <p className="empty-state-text">No available donations at the moment.</p>
                </div>
              ) : (
                <div className="donation-grid">
                  {donations.map(donation => (
                    <div key={donation._id} className="donation-card">
                      <div className="donation-card-header">
                        <h3 className="donation-card-title">{donation.foodType}</h3>
                        <span className={`donation-card-status status-${donation.status.toLowerCase()}`}>{donation.status}</span>
                      </div>
                      {donation.photoUrl && <img src={donation.photoUrl} alt="Food" className="donation-card-image" />}
                      <div className="donation-card-content">
                        <div className="donation-card-detail">
                          <strong>Quantity:</strong> {donation.quantity} servings
                        </div>
                        <div className="donation-card-detail">
                          <strong>Best Before:</strong> {formatDate(donation.bestBefore)}
                        </div>
                        {donation.location && (
                          <div className="donation-card-detail">
                            <strong>Location:</strong> {donation.location.address || `${donation.location.latitude}, ${donation.location.longitude}`}
                          </div>
                        )}
                        {donation.description && (
                          <div className="donation-card-detail">
                            <strong>Description:</strong> {donation.description}
                          </div>
                        )}
                      </div>
                      <div className="donation-card-actions">
                        <button 
                          onClick={() => handleAcceptDonation(donation._id)}
                          className="dashboard-button primary"
                        >
                          Accept Donation
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
              <div className="section-header">
                <h2 className="section-title">My Assignments</h2>
                <button 
                  onClick={fetchMyAssignments} 
                  className="dashboard-button primary"
                >
                  <span className="button-icon">🔄</span>
                  Refresh
                </button>
              </div>
              {loadingAssignments ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p className="loading-text">Loading assignments...</p>
                </div>
              ) : myAssignments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <p className="empty-state-text">No active assignments. Check available donations to help!</p>
                </div>
              ) : (
                <div className="assignments-grid">
                  {myAssignments.map(donation => (
                    <div key={donation._id} className="assignment-card">
                      <div className="assignment-card-header">
                        <div className="assignment-title-section">
                          <h3 className="assignment-card-title">{donation.foodType}</h3>
                          <div className="assignment-meta">
                            <span className="assignment-quantity">{donation.quantity} servings</span>
                            <span className="assignment-separator">•</span>
                            <span className="assignment-donor">{donation.donor?.name || "Anonymous"}</span>
                          </div>
                        </div>
                        <div className="assignment-status-section">
                          <span className={`assignment-status status-${donation.status.toLowerCase()}`}>
                            <span className="status-icon">{donation.status === "Assigned" ? "📦" : "🚚"}</span>
                            {donation.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="assignment-card-content">
                        <div className="assignment-details-grid">
                          <div className="assignment-detail-item">
                            <span className="detail-icon">⏰</span>
                            <div className="detail-content">
                              <span className="detail-label">Best Before</span>
                              <span className="detail-value">{formatDate(donation.bestBefore)}</span>
                            </div>
                          </div>
                          
                          <div className="assignment-detail-item">
                            <span className="detail-icon">📍</span>
                            <div className="detail-content">
                              <span className="detail-label">Location</span>
                              <span className="detail-value">{donation.location.latitude.toFixed(4)}, {donation.location.longitude.toFixed(4)}</span>
                            </div>
                          </div>
                        </div>
                        
                        {donation.photoUrl && (
                          <div className="assignment-photo-section">
                            <img src={donation.photoUrl} alt="Food" className="assignment-photo" />
                          </div>
                        )}
                      </div>
                      
                      <div className="assignment-card-actions">
                        {donation.status === "Assigned" && (
                          <button 
                            onClick={() => handlePickupComplete(donation._id)}
                            className="dashboard-button primary"
                          >
                            <span className="button-icon">📦</span>
                            Confirm Pickup
                          </button>
                        )}
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
              <div className="section-header">
                <h2 className="section-title">Completed Deliveries</h2>
                <div className="impact-summary">
                  <p className="impact-text">
                    Total Impact: {completedDeliveries.reduce((sum, d) => sum + (d.quantity || 0), 0)} servings delivered
                  </p>
                </div>
              </div>

              {loadingCompleted ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p className="loading-text">Loading completed deliveries...</p>
                </div>
              ) : completedDeliveries.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🏆</div>
                  <p className="empty-state-text">No completed deliveries yet. Start accepting donations to make an impact!</p>
                </div>
              ) : (
                <div className="donation-grid">
                  {completedDeliveries.map((donation) => (
                    <div key={donation._id} className="donation-card">
                      <div className="donation-card-header">
                        <h3 className="donation-card-title">{donation.foodType}</h3>
                        <span className="donation-card-status status-delivered">✅ Delivered</span>
                      </div>
                      {donation.photoUrl && (
                        <img
                          src={donation.photoUrl}
                          alt="Food"
                          className="donation-card-image"
                        />
                      )}
                      
                      <div className="donation-card-content">
                        <div className="donation-card-detail">
                          <strong>Quantity:</strong> {donation.quantity} servings
                        </div>
                        <div className="donation-card-detail">
                          <strong>Donor:</strong> {donation.donor?.name || "Anonymous"}
                        </div>
                        <div className="donation-card-detail">
                          <strong>Completed:</strong> {formatDate(donation.deliveryDetails?.deliveredAt || donation.updatedAt)}
                        </div>
                        
                        {donation.deliveryDetails && (
                          <div className="delivery-details">
                            <div className="donation-card-detail">
                              <strong>Delivered to:</strong> {donation.deliveryDetails.recipientName}
                            </div>
                            <div className="donation-card-detail">
                              <strong>People served:</strong> {donation.deliveryDetails.numberOfPeopleServed}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "stats" && (
            <div>
              <h2 className="section-title mb-6">Your Impact Statistics</h2>
              
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📦</div>
                  <div className="stat-content">
                    <div className="stat-value">{completedDeliveries.length}</div>
                    <div className="stat-label">Total Deliveries</div>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">🍽️</div>
                  <div className="stat-content">
                    <div className="stat-value">{completedDeliveries.reduce((sum, d) => sum + (d.quantity || 0), 0)}</div>
                    <div className="stat-label">Servings Delivered</div>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-content">
                    <div className="stat-value">
                      {completedDeliveries.reduce((sum, d) => sum + (d.deliveryDetails?.numberOfPeopleServed || 0), 0)}
                    </div>
                    <div className="stat-label">People Helped</div>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">⭐</div>
                  <div className="stat-content">
                    <div className="stat-value">
                      {completedDeliveries.length > 0 
                        ? (completedDeliveries.reduce((sum, d) => sum + (d.quantity || 0), 0) / completedDeliveries.length).toFixed(1)
                        : '0'
                      }
                    </div>
                    <div className="stat-label">Avg. Servings/Delivery</div>
                  </div>
                </div>
              </div>
              
              <div className="stats-section">
                <h3 className="stats-subtitle">Monthly Breakdown</h3>
                <div className="form-card">
                  <p className="placeholder-text">Monthly statistics chart would be displayed here</p>
                </div>
              </div>
            </div>
          )}
          {activeTab === "leaderboard" && (
            <div>
              <div className="section-header">
                <h2 className="section-title">Volunteer Leaderboard</h2>
                <div className="leaderboard-controls">
                  <select 
                    value={leaderboardPeriod}
                    onChange={(e) => {
                      setLeaderboardPeriod(e.target.value);
                      fetchLeaderboardData();
                    }}
                    className="dashboard-select"
                  >
                    <option value="all">All Time</option>
                    <option value="month">This Month</option>
                    <option value="week">This Week</option>
                  </select>
                </div>
              </div>
              
              {loadingLeaderboard ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p className="loading-text">Loading leaderboard...</p>
                </div>
              ) : (
                <div className="leaderboard-container">
                  {/* Top 3 Winners */}
                  <div className="leaderboard-winners">
                    {leaderboardData.slice(0, 3).map((volunteer, index) => (
                      <div key={volunteer._id} className={`winner-card winner-${index + 1}`}>
                        <div className="winner-position">
                          <span className="position-number">{index + 1}</span>
                          <span className="position-icon">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                          </span>
                        </div>
                        <div className="winner-avatar">
                          <div className="avatar-placeholder">
                            {volunteer.name?.charAt(0).toUpperCase() || "V"}
                          </div>
                        </div>
                        <div className="winner-info">
                          <h3 className="winner-name">{volunteer.name || "Anonymous Volunteer"}</h3>
                          <p className="winner-stats">
                            <span className="stat-highlight">{volunteer.totalDeliveries || 0}</span> deliveries • 
                            <span className="stat-highlight">{volunteer.totalServings || 0}</span> servings
                          </p>
                        </div>
                        <div className="winner-score">
                          <div className="score-value">{volunteer.score || 0}</div>
                          <div className="score-label">points</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Rest of the Leaderboard */}
                  {leaderboardData.length > 3 && (
                    <div className="leaderboard-list">
                      <div className="leaderboard-header">
                        <div className="header-rank">Rank</div>
                        <div className="header-volunteer">Volunteer</div>
                        <div className="header-stats">Stats</div>
                        <div className="header-score">Score</div>
                      </div>
                      
                      {leaderboardData.slice(3).map((volunteer, index) => (
                        <div key={volunteer._id} className="leaderboard-row">
                          <div className="rank-cell">
                            <span className="rank-number">{index + 4}</span>
                          </div>
                          <div className="volunteer-cell">
                            <div className="volunteer-avatar">
                              <div className="avatar-small">
                                {volunteer.name?.charAt(0).toUpperCase() || "V"}
                              </div>
                            </div>
                            <div className="volunteer-name">{volunteer.name || "Anonymous Volunteer"}</div>
                          </div>
                          <div className="stats-cell">
                            <div className="stats-grid">
                              <div className="stat-item">
                                <span className="stat-value">{volunteer.totalDeliveries || 0}</span>
                                <span className="stat-label">deliveries</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-value">{volunteer.totalServings || 0}</span>
                                <span className="stat-label">servings</span>
                              </div>
                              <div className="stat-item">
                                <span className="stat-value">{volunteer.peopleHelped || 0}</span>
                                <span className="stat-label">helped</span>
                              </div>
                            </div>
                          </div>
                          <div className="score-cell">
                            <div className="score-badge">{volunteer.score || 0}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* User's Position */}
                  {userPosition && userPosition.rank > 10 && (
                    <div className="user-position-card">
                      <div className="user-position-header">
                        <span className="user-position-badge">Your Position</span>
                      </div>
                      <div className="user-position-content">
                        <div className="user-rank">#{userPosition.rank}</div>
                        <div className="user-stats">
                          <div className="user-name">You</div>
                          <div className="user-stats-grid">
                            <span>{userPosition.totalDeliveries} deliveries</span>
                            <span>•</span>
                            <span>{userPosition.totalServings} servings</span>
                            <span>•</span>
                            <span>{userPosition.score} points</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {leaderboardData.length === 0 && (
                    <div className="empty-leaderboard">
                      <div className="empty-leaderboard-icon">🏆</div>
                      <h3 className="empty-leaderboard-title">No leaderboard data yet</h3>
                      <p className="empty-leaderboard-text">Complete deliveries to appear on the leaderboard!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pickup Photo Modal */}
      {showPickupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Confirm Pickup</h3>
            <p className="modal-description">Please take a photo to confirm the pickup:</p>
            
            <input
              type="file"
              accept="image/*"
              capture="camera"
              onChange={(e) => setPickupPhoto(e.target.files[0])}
              className="form-input"
            />
            
            {pickupPhoto && (
              <div className="modal-preview">
                <img
                  src={URL.createObjectURL(pickupPhoto)}
                  alt="Pickup preview"
                  className="modal-image"
                />
              </div>
            )}
            
            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowPickupModal(false);
                  setCurrentDonation(null);
                  setPickupPhoto(null);
                }}
                className="dashboard-button secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmPickupWithPhoto}
                disabled={!pickupPhoto}
                className="dashboard-button primary"
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
