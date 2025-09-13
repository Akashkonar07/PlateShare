import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import useGeoLocation from "../hooks/useGeoLocation";
import { createDonation, getMyDonations } from "../services/donation";
import PhotoCapture from "../components/PhotoCapture";
import UserProfile from "../components/UserProfile";
import './DonorDashboard.css';

const DonorDashboard = () => 
{
  const { user, logout } = useAuth();
  const { location, error: locationError, getCurrentLocation } = useGeoLocation();
  
  const [activeTab, setActiveTab] = useState("create");
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    foodType: "",
    quantity: "",
    bestBefore: "",
    description: "",
    latitude: "",
    longitude: "",
  });
  

  useEffect(() => {
    if (user && activeTab === "donations") {
      fetchMyDonations();
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (donations.length > 0) {
      updateNotifications();
    }
  }, [donations]);

  useEffect(() => {
    if (location && location.latitude && location.longitude) {
      setFormData(prev => ({
        ...prev,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString()
      }));
    }
  }, [location]);

  // Real-time donation status updates
  useEffect(() => {
    if (activeTab === "donations" && donations.length > 0) {
      // Set up polling for real-time status updates
      const pollInterval = setInterval(() => {
        fetchMyDonations(); // Refresh donations every 30 seconds
      }, 30000);

      return () => clearInterval(pollInterval);
    }
  }, [activeTab, donations.length]);

  // Helper function to get status color with animation
  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Assigned': 'bg-blue-100 text-blue-800',
      'PickedUp': 'bg-purple-100 text-purple-800',
      'Delivered': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Helper function to check if status recently changed
  const isStatusRecentlyUpdated = (donation) => {
    if (!donation.updatedAt) return false;
    const updateThreshold = 5 * 60 * 1000; // 5 minutes
    const timeSinceUpdate = Date.now() - new Date(donation.updatedAt).getTime();
    return timeSinceUpdate < updateThreshold;
  };

  // Helper function to get status icon
  const getStatusIcon = (status) => {
    const icons = {
      'Pending': '⏳',
      'Assigned': '👤',
      'PickedUp': '🚚',
      'Delivered': '✅'
    };
    return icons[status] || '📋';
  };

  // Helper function to get status message
  const getStatusMessage = (status, donation) => {
    const messages = {
      'Pending': 'Waiting for volunteer assignment',
      'Assigned': `Assigned to ${donation.assignedTo?.name || 'volunteer'}`,
      'PickedUp': 'Food is on the way to those in need',
      'Delivered': 'Successfully delivered! Thank you for your contribution'
    };
    return messages[status] || 'Status updating...';
  };

  const fetchMyDonations = async () => {
    try {
      setLoading(true);
      const response = await getMyDonations();
      // Ensure donations is always an array
      setDonations(Array.isArray(response.donations) ? response.donations : []);
    } catch (error) {
      console.error("Error fetching donations:", error);
      setDonations([]); // Reset to empty array on error
      if (error.response?.status === 401) {
        // Handle unauthorized
        logout();
      } else if (error.response?.status === 403) {
        alert("You don't have permission to view donations.");
      } else if (error.response?.status >= 500) {
        alert("Server error. Please try again later.");
      } else if (!error.response) {
        alert("Network error. Please check your internet connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePhotoCapture = (file) => {
    if (!file) {
      setShowCamera(false);
      return;
    }
    
    try {
      setCapturedPhoto(file);
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
      setShowCamera(false);
    } catch (error) {
      console.error('Error handling captured photo:', error);
      alert('Failed to process the captured image. Please try again.');
      setPhotoPreview(null);
      setCapturedPhoto(null);
    }
  };

  const handleFileUpload = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, etc.)');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file is too large. Please choose a file smaller than 10MB.');
      return;
    }
    
    try {
      setCapturedPhoto(file);
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    } catch (error) {
      console.error('Error creating file preview:', error);
      alert('Failed to process the uploaded image. Please try another file.');
      setPhotoPreview(null);
      setCapturedPhoto(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitted(true);
    
    // Form validation
    if (!formData.foodType?.trim()) {
      return;
    }
    
    if (!formData.quantity || formData.quantity < 1) {
      return;
    }
    
    if (!formData.bestBefore) {
      return;
    }
    
    const bestBeforeDate = new Date(formData.bestBefore);
    const now = new Date();
    if (bestBeforeDate <= now) {
      return;
    }
    
    if (!location || !location.latitude || !location.longitude) {
      return;
    }

    try {
      setLoading(true);
      
      const formDataToSend = new FormData();
      
      // Append all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          formDataToSend.append(key, value);
        }
      });
      
      // Handle photo upload if available
      if (capturedPhoto) {
        let fileToUpload;
        
        // If it's a Blob (from camera), convert to File
        if (capturedPhoto instanceof Blob) {
          fileToUpload = new File([capturedPhoto], 'donation-photo.jpg', { 
            type: 'image/jpeg',
            lastModified: new Date().getTime()
          });
        } else if (capturedPhoto instanceof File) {
          fileToUpload = capturedPhoto;
        } else {
          // Handle case where capturedPhoto is a base64 string
          const response = await fetch(capturedPhoto);
          const blob = await response.blob();
          fileToUpload = new File([blob], 'donation-photo.jpg', { 
            type: 'image/jpeg',
            lastModified: new Date().getTime()
          });
        }
        
        // Ensure the field name matches what multer expects
        formDataToSend.append('photo', fileToUpload);
        
        // Log the file details for debugging
        console.log('Appending file:', {
          name: fileToUpload.name,
          type: fileToUpload.type,
          size: fileToUpload.size,
          fieldName: 'photo'
        });
      }

      const response = await createDonation(formDataToSend);
      
      // Reset form
      setFormData({
        foodType: "",
        quantity: "",
        bestBefore: "",
        description: "",
        latitude: location?.latitude?.toString() || "",
        longitude: location?.longitude?.toString() || "",
      });
      setCapturedPhoto(null);
      setPhotoPreview(null);
      
      // Show success message
      alert("Donation created successfully!");
      
      // Refresh donations list
      fetchMyDonations();
      
    } catch (error) {
      console.error("Error creating donation:", error);
      
      if (error.isNetworkError) {
        alert("Network error: Please check your internet connection and try again.");
      } else if (error.response?.status === 401) {
        logout();
      } else {
        alert(error.message || "Failed to create donation. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Invalid date";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Enhanced form helper functions
  const [activeStep, setActiveStep] = useState(1);

  const calculateProgress = () => {
    const steps = [
      formData.foodType && formData.quantity,
      formData.bestBefore,
      location,
      photoPreview
    ];
    const completedSteps = steps.filter(Boolean).length;
    return (completedSteps / steps.length) * 100;
  };

  const isFormValid = () => {
    return formData.foodType?.trim() && 
           formData.quantity && 
           parseInt(formData.quantity) >= 1 && 
           formData.bestBefore && 
           new Date(formData.bestBefore) > new Date() &&
           location && location.latitude && location.longitude;
  };

  const getFieldValidation = (fieldName) => {
    const value = formData[fieldName];
    
    switch (fieldName) {
      case 'foodType':
        return value?.trim() ? 'valid' : (formSubmitted ? 'invalid' : '');
      case 'quantity':
        return value && parseInt(value) >= 1 ? 'valid' : (formSubmitted ? 'invalid' : '');
      case 'bestBefore':
        return value ? 'valid' : (formSubmitted ? 'invalid' : '');
      default:
        return '';
    }
  };

  const getValidationMessage = (fieldName) => {
    const validation = getFieldValidation(fieldName);
    
    switch (fieldName) {
      case 'foodType':
        return validation === 'invalid' ? 'Please specify the food type' : '';
      case 'quantity':
        return validation === 'invalid' ? 'Minimum 1 serving required' : '';
      case 'bestBefore':
        return validation === 'invalid' ? 'Must be a future date' : '';
      default:
        return '';
    }
  };

  const handleResetForm = () => {
    setFormData({
      foodType: "",
      quantity: "",
      bestBefore: "",
      description: "",
      latitude: location?.latitude?.toString() || "",
      longitude: location?.longitude?.toString() || "",
    });
    setCapturedPhoto(null);
    setPhotoPreview(null);
    setActiveStep(1);
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      foodType: suggestion
    }));
  };

  const handleQuantityChange = (change) => {
    const currentQuantity = parseInt(formData.quantity) || 0;
    const newQuantity = Math.max(1, currentQuantity + change);
    setFormData(prev => ({
      ...prev,
      quantity: newQuantity.toString()
    }));
  };

  const handlePresetQuantity = (preset) => {
    setFormData(prev => ({
      ...prev,
      quantity: preset.toString()
    }));
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const getTimeUrgencyIndicator = (bestBefore) => {
    const bestBeforeDate = new Date(bestBefore);
    const now = new Date();
    const hoursDiff = (bestBeforeDate - now) / (1000 * 60 * 60);
    
    if (hoursDiff < 6) {
      return (
        <div className="urgency-indicator critical">
          <span className="urgency-icon">⚠️</span>
          <span className="urgency-text">Critical: Less than 6 hours remaining</span>
        </div>
      );
    } else if (hoursDiff < 12) {
      return (
        <div className="urgency-indicator warning">
          <span className="urgency-icon">⏰</span>
          <span className="urgency-text">Urgent: Less than 12 hours remaining</span>
        </div>
      );
    } else if (hoursDiff < 24) {
      return (
        <div className="urgency-indicator moderate">
          <span className="urgency-icon">📅</span>
          <span className="urgency-text">Moderate: Less than 24 hours remaining</span>
        </div>
      );
    } else {
      return (
        <div className="urgency-indicator good">
          <span className="urgency-icon">✅</span>
          <span className="urgency-text">Good: Plenty of time remaining</span>
        </div>
      );
    }
  };

  const handleTimePreset = (hours) => {
    const targetDate = new Date();
    targetDate.setHours(targetDate.getHours() + hours);
    targetDate.setMinutes(targetDate.getMinutes() - targetDate.getTimezoneOffset());
    setFormData(prev => ({
      ...prev,
      bestBefore: targetDate.toISOString().slice(0, 16)
    }));
  };

  const calculateTotalPeopleHelped = () => {
    return donations.reduce((total, donation) => {
      return total + (donation.peopleHelped || Math.floor(donation.quantity / 2));
    }, 0);
  };

  const calculateFoodWasteSaved = () => {
    return donations.reduce((total, donation) => {
      // Estimate food waste saved based on quantity (assuming 1 unit = 1kg)
      return total + (donation.quantity || 0);
    }, 0);
  };

  const calculateWasteReductionPercentage = () => {
    const totalSaved = parseFloat(calculateFoodWasteSaved());
    // Target: 100kg waste reduction for 100%
    return Math.min((totalSaved / 100) * 100, 100);
  };

  const getUserAchievementLevel = () => {
    const points = user.points || 0;
    if (points >= 1000) return "Food Hero";
    if (points >= 500) return "Community Champion";
    if (points >= 200) return "Food Saver";
    if (points >= 50) return "Helper";
    return "Beginner";
  };

  const renderAchievementStars = () => {
    const points = user.points || 0;
    const stars = Math.min(Math.floor(points / 100), 5);
    return Array.from({ length: 5 }, (_, index) => (
      <span key={index} className={`star ${index < stars ? 'filled' : ''}`}>⭐</span>
    ));
  };

  // Real-time notification management functions
  const generateNotifications = () => {
    const newNotifications = [];
    const now = new Date();
    
    // Check for status changes in donations
    donations.forEach(donation => {
      if (donation.status === 'Assigned' && !donation.notifiedAssigned) {
        newNotifications.push({
          id: `assigned-${donation._id}`,
          type: 'assignment',
          title: 'New Donation Assigned',
          message: `Your ${donation.foodType} donation has been assigned to ${donation.assignedTo?.name || 'a volunteer'}`,
          time: 'Just now',
          timestamp: now,
          read: false
        });
      }
      
      if (donation.status === 'PickedUp' && !donation.notifiedPickedUp) {
        newNotifications.push({
          id: `pickedup-${donation._id}`,
          type: 'pickup',
          title: 'Donation Picked Up',
          message: `Your ${donation.foodType} donation has been picked up successfully`,
          time: 'Just now',
          timestamp: now,
          read: false
        });
      }
      
      if (donation.status === 'Delivered' && !donation.notifiedDelivered) {
        newNotifications.push({
          id: `delivered-${donation._id}`,
          type: 'delivery',
          title: 'Donation Delivered',
          message: `Your ${donation.foodType} donation has been delivered and helped ${donation.peopleHelped || Math.floor(donation.quantity / 2)} people`,
          time: 'Just now',
          timestamp: now,
          read: false
        });
      }
    });
    
    // Check for achievements
    const totalDonations = donations.length;
    if (totalDonations === 5) {
      newNotifications.push({
        id: 'achievement-5',
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: 'Congratulations! You\'ve made 5 donations! 🎉',
        time: 'Just now',
        timestamp: now,
        read: false
      });
    }
    
    if (totalDonations === 10) {
      newNotifications.push({
        id: 'achievement-10',
        type: 'achievement',
        title: 'Milestone Reached!',
        message: 'Amazing! You\'ve made 10 donations and are making a huge difference! 🌟',
        time: 'Just now',
        timestamp: now,
        read: false
      });
    }
    
    // Check for environmental impact milestones
    const wasteSaved = calculateFoodWasteSaved();
    if (wasteSaved >= 50 && wasteSaved < 51) {
      newNotifications.push({
        id: 'impact-50',
        type: 'impact',
        title: 'Environmental Hero!',
        message: `You've saved ${wasteSaved}kg of food waste! 🌍`,
        time: 'Just now',
        timestamp: now,
        read: false
      });
    }
    
    return newNotifications;
  };
  
  const updateNotifications = () => {
    const newNotifications = generateNotifications();
    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev]);
      setUnreadCount(prev => prev + newNotifications.length);
    }
  };
  
  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true } 
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };
  
  const markAllNotificationsAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };
  
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'assignment': return '📋';
      case 'pickup': return '🚚';
      case 'delivery': return '✅';
      case 'achievement': return '🏆';
      case 'impact': return '🌍';
      default: return '🔔';
    }
  };

  // Counter animation and real-time updates
  useEffect(() => {
    // Animate counters
    const animateCounters = () => {
      const counters = document.querySelectorAll('.counter');
      counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const increment = target / (duration / 16); // 60fps
        let current = 0;
        
        const updateCounter = () => {
          current += increment;
          if (current < target) {
            counter.textContent = Math.floor(current);
            requestAnimationFrame(updateCounter);
          } else {
            counter.textContent = target;
          }
        };
        
        updateCounter();
      });
    };
    
    // Start animation when component mounts
    const timer = setTimeout(animateCounters, 500);
    
    // Simulate real-time updates
    const updateInterval = setInterval(() => {
      // Update daily points change
      const statChangeElements = document.querySelectorAll('.stat-change');
      statChangeElements.forEach(element => {
        if (element.classList.contains('positive')) {
          const change = Math.floor(Math.random() * 5) + 1;
          element.textContent = `+${change} today`;
        }
      });
    }, 30000); // Update every 30 seconds
    
    return () => {
      clearTimeout(timer);
      clearInterval(updateInterval);
    };
  }, [donations, user]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto mt-20 p-4 bg-white shadow rounded">
        <p>Please login to access your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="donor-dashboard">
      <div className="max-w-6xl mx-auto">
        {/* Enhanced Header */}
        <div className="dashboard-card donor-header enhanced">
          <div className="header-top">
            <div className="user-info enhanced">
              <div className="user-avatar enhanced">
                <span>🍱</span>
                <div className="avatar-ring"></div>
              </div>
              <div className="user-details enhanced">
                <h2>Donor Dashboard</h2>
                <p className="welcome-message">Welcome back, <span className="user-name">{user.name}</span>! 👋</p>
                <div className="user-status">
                  <span className="status-dot"></span>
                  <span className="status-text">Active Contributor</span>
                </div>
              </div>
            </div>
            
            <div className="real-time-stats">
              <div className="stat-item enhanced animated">
                <div className="stat-icon-wrapper pulse">
                  <span className="stat-icon">🏆</span>
                  <div className="stat-pulse"></div>
                </div>
                <div className="stat-content">
                  <span className="stat-value counter" data-target={user.points || 0}>0</span>
                  <span className="stat-label">Points</span>
                  <div className="stat-change positive">+{Math.floor(Math.random() * 10) + 1} today</div>
                </div>
              </div>
              <div className="stat-item enhanced animated">
                <div className="stat-icon-wrapper pulse">
                  <span className="stat-icon">🍽️</span>
                  <div className="stat-pulse"></div>
                </div>
                <div className="stat-content">
                  <span className="stat-value counter" data-target={donations.length}>0</span>
                  <span className="stat-label">Donations</span>
                  <div className="stat-trend">{donations.filter(d => d.status === 'Delivered').length} completed</div>
                </div>
              </div>
              <div className="stat-item enhanced animated highlight">
                <div className="stat-icon-wrapper pulse">
                  <span className="stat-icon">❤️</span>
                  <div className="stat-pulse"></div>
                </div>
                <div className="stat-content">
                  <span className="stat-value counter" data-target={calculateTotalPeopleHelped()}>0</span>
                  <span className="stat-label">People Helped</span>
                  <div className="stat-impact">Making a difference!</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced Impact Metrics */}
          <div className="impact-metrics enhanced">
            <div className="metric-card environmental">
              <div className="metric-header">
                <div className="metric-icon large">🌍</div>
                <div className="metric-title">
                  <h4>Environmental Impact</h4>
                  <p className="metric-subtitle">Your contribution to reducing food waste</p>
                </div>
              </div>
              <div className="metric-content enhanced">
                <div className="metric-main">
                  <span className="metric-value counter" data-target={calculateFoodWasteSaved()}>0</span>
                  <span className="metric-unit">kg saved</span>
                </div>
                <div className="metric-progress enhanced">
                  <div className="progress-info">
                    <span className="progress-text">Progress to next milestone</span>
                    <span className="progress-percentage">{Math.min(calculateWasteReductionPercentage(), 100).toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar animated" 
                      style={{width: `${Math.min(calculateWasteReductionPercentage(), 100)}%`}}
                    ></div>
                  </div>
                  <div className="progress-milestones">
                    <span className="milestone">50kg 🌱</span>
                    <span className="milestone">100kg 🌳</span>
                    <span className="milestone">500kg 🌍</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="metric-card achievement">
              <div className="metric-header">
                <div className="metric-icon large">⭐</div>
                <div className="metric-title">
                  <h4>Achievement Level</h4>
                  <p className="metric-subtitle">Your journey as a food hero</p>
                </div>
              </div>
              <div className="metric-content enhanced">
                <div className="achievement-level">
                  <span className="level-name">{getUserAchievementLevel()}</span>
                  <div className="achievement-stars enhanced">
                    {renderAchievementStars()}
                  </div>
                </div>
                <div className="achievement-progress">
                  <div className="progress-info">
                    <span className="progress-text">Next level progress</span>
                    <span className="progress-percentage">{((user.points || 0) % 100)}%</span>
                  </div>
                  <div className="progress-bar-container small">
                    <div 
                      className="progress-bar achievement" 
                      style={{width: `${((user.points || 0) % 100)}%`}}
                    ></div>
                  </div>
                  <div className="next-achievement">
                    <span className="next-text">Next: {Math.floor(((user.points || 0) + 100) / 100) * 100} points</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="metric-card activity">
              <div className="metric-header">
                <div className="metric-icon large">📈</div>
                <div className="metric-title">
                  <h4>Recent Activity</h4>
                  <p className="metric-subtitle">Your latest contributions</p>
                </div>
              </div>
              <div className="metric-content enhanced">
                <div className="activity-feed">
                  {donations.slice(0, 3).map((donation, index) => (
                    <div key={donation._id} className="activity-item">
                      <div className="activity-icon">{getStatusIcon(donation.status)}</div>
                      <div className="activity-details">
                        <span className="activity-text">{donation.foodType}</span>
                        <span className="activity-status">{donation.status}</span>
                      </div>
                      <div className="activity-time">{formatDate(donation.createdAt)}</div>
                    </div>
                  ))}
                  {donations.length === 0 && (
                    <div className="activity-empty">
                      <p>No donations yet. Start making a difference!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button
            onClick={() => setActiveTab("create")}
            className={`nav-tab ${activeTab === "create" ? "active" : ""}`}
          >
            <span>🍽️</span>
            <span>Create Donation</span>
          </button>
          
          <button
            onClick={() => setActiveTab("donations")}
            className={`nav-tab ${activeTab === "donations" ? "active" : ""}`}
          >
            <span>📋</span>
            <span>My Donations</span>
          </button>
          
          <button
            onClick={() => setActiveTab("profile")}
            className={`nav-tab ${activeTab === "profile" ? "active" : ""}`}
          >
            <span>👤</span>
            <span>Profile</span>
          </button>
          
          {/* Notification Button */}
          <div className="nav-notification-container">
            <button 
              className={`notification-btn nav-enhanced ${unreadCount > 0 ? 'has-notifications' : ''}`}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <span className="notification-icon">🔔</span>
              <span className="notification-badge">{unreadCount}</span>
              <span className="notification-indicator"></span>
            </button>
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <span>Notifications</span>
                  <button onClick={() => setShowNotifications(false)}>✕</button>
                </div>
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <div className="notification-title">
                        <span className="notification-type-icon">{getNotificationIcon(notification.type)}</span>
                        {notification.title}
                      </div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">{notification.time}</div>
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">
                    <p>No new notifications</p>
                  </div>
                )}
                {notifications.length > 0 && (
                  <div className="notification-footer">
                    <button onClick={markAllNotificationsAsRead} className="mark-all-read-btn">
                      Mark all as read
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="tab-content">
          {activeTab === "create" && (
            <div className="space-y-6">
              <div className="section-header text-center">
                <div className="section-title">
                  <span>🍽️</span>
                  <span>Create New Donation</span>
                </div>
                <p className="section-subtitle">Share your food and help reduce waste</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Progress Indicator */}
                <div className="form-progress-indicator">
                  <div className="progress-steps">
                    <div className={`progress-step ${formData.foodType && formData.quantity ? 'completed' : ''} ${activeStep >= 1 ? 'active' : ''}`}>
                      <div className="step-number">1</div>
                      <div className="step-label">Basic Info</div>
                    </div>
                    <div className={`progress-step ${formData.bestBefore ? 'completed' : ''} ${activeStep >= 2 ? 'active' : ''}`}>
                      <div className="step-number">2</div>
                      <div className="step-label">Timing</div>
                    </div>
                    <div className={`progress-step ${location ? 'completed' : ''} ${activeStep >= 3 ? 'active' : ''}`}>
                      <div className="step-number">3</div>
                      <div className="step-label">Location</div>
                    </div>
                    <div className={`progress-step ${photoPreview ? 'completed' : ''} ${activeStep >= 4 ? 'active' : ''}`}>
                      <div className="step-number">4</div>
                      <div className="step-label">Photo</div>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${calculateProgress()}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Food Type Card */}
                  <div className="form-card enhanced">
                    <div className="form-card-header">
                      <div className="form-card-icon">🍱</div>
                      <div className="form-card-title">
                        <h3>Food Type</h3>
                        <p className="form-card-subtitle">What type of food are you donating?</p>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        <span>Food Name *</span>
                        <span className="field-hint">Be specific about the dish</span>
                      </label>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          name="foodType"
                          value={formData.foodType}
                          onChange={handleInputChange}
                          onFocus={() => setActiveStep(1)}
                          required
                          className={`dashboard-input enhanced ${getFieldValidation('foodType')}`}
                          placeholder="e.g., Vegetable Biryani, Butter Chicken, Fresh Salad"
                        />
                        <div className="validation-indicator">
                          {getFieldValidation('foodType') === 'valid' && (
                            <span className="validation-icon valid">✓</span>
                          )}
                          {getFieldValidation('foodType') === 'invalid' && formData.foodType && (
                            <span className="validation-icon invalid">✗</span>
                          )}
                        </div>
                      </div>
                      {getValidationMessage('foodType') && (
                        <div className="validation-message">
                          {getValidationMessage('foodType')}
                        </div>
                      )}
                      <div className="input-suggestions">
                        <button
                          type="button"
                          className="suggestion-tag"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSuggestionClick('Rice');
                          }}
                        >
                          Rice
                        </button>
                        <button
                          type="button"
                          className="suggestion-tag"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSuggestionClick('Curry');
                          }}
                        >
                          Curry
                        </button>
                        <button
                          type="button"
                          className="suggestion-tag"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSuggestionClick('Bread');
                          }}
                        >
                          Bread
                        </button>
                        <button
                          type="button"
                          className="suggestion-tag"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSuggestionClick('Vegetables');
                          }}
                        >
                          Vegetables
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Card */}
                  <div className="form-card enhanced">
                    <div className="form-card-header">
                      <div className="form-card-icon">📊</div>
                      <div className="form-card-title">
                        <h3>Quantity</h3>
                        <p className="form-card-subtitle">How many servings can you provide?</p>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        <span>Number of Servings *</span>
                        <span className="field-hint">Estimate portion sizes generously</span>
                      </label>
                      <div className="quantity-input-group">
                        <button 
                          type="button" 
                          className="quantity-btn" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleQuantityChange(-1);
                          }}
                          disabled={!formData.quantity || formData.quantity <= 1}
                        >
                          −
                        </button>
                        <div className="input-wrapper">
                          <input
                            type="number"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleInputChange}
                            onFocus={() => setActiveStep(1)}
                            required
                            min="1"
                            className={`dashboard-input enhanced quantity-input ${getFieldValidation('quantity')}`}
                            placeholder="0"
                          />
                          <div className="validation-indicator">
                            {getFieldValidation('quantity') === 'valid' && (
                              <span className="validation-icon valid">✓</span>
                            )}
                            {getFieldValidation('quantity') === 'invalid' && formData.quantity && (
                              <span className="validation-icon invalid">✗</span>
                            )}
                          </div>
                        </div>
                        <button 
                          type="button" 
                          className="quantity-btn" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleQuantityChange(1);
                          }}
                        >
                          +
                        </button>
                      </div>
                      {getValidationMessage('quantity') && (
                        <div className="validation-message">
                          {getValidationMessage('quantity')}
                        </div>
                      )}
                      <div className="quantity-presets">
                        <button
                          type="button"
                          className="preset-tag"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePresetQuantity(5);
                          }}
                        >
                          5 servings
                        </button>
                        <button
                          type="button"
                          className="preset-tag"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePresetQuantity(10);
                          }}
                        >
                          10 servings
                        </button>
                        <button
                          type="button"
                          className="preset-tag"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePresetQuantity(20);
                          }}
                        >
                          20 servings
                        </button>
                        <button
                          type="button"
                          className="preset-tag"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePresetQuantity(50);
                          }}
                        >
                          50+ servings
                        </button>
                      </div>
                      {formData.quantity && (
                        <div className="impact-indicator">
                          <span className="impact-icon">🌟</span>
                          <span className="impact-text">
                            You could help feed {formData.quantity} people!
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Best Before Card */}
                  <div className="form-card enhanced">
                    <div className="form-card-header">
                      <div className="form-card-icon">⏰</div>
                      <div className="form-card-title">
                        <h3>Best Before</h3>
                        <p className="form-card-subtitle">When should this food be consumed by?</p>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        <span>Expiration Date & Time *</span>
                        <span className="field-hint">Be conservative to ensure food safety</span>
                      </label>
                      <div className="input-wrapper">
                        <input
                          type="datetime-local"
                          name="bestBefore"
                          value={formData.bestBefore}
                          onChange={handleInputChange}
                          onFocus={() => setActiveStep(2)}
                          required
                          className={`dashboard-input enhanced ${getFieldValidation('bestBefore')}`}
                          min={getMinDateTime()}
                        />
                        <div className="validation-indicator">
                          {getFieldValidation('bestBefore') === 'valid' && (
                            <span className="validation-icon valid">✓</span>
                          )}
                          {getFieldValidation('bestBefore') === 'invalid' && formData.bestBefore && (
                            <span className="validation-icon invalid">✗</span>
                          )}
                        </div>
                      </div>
                      {getValidationMessage('bestBefore') && (
                        <div className="validation-message">
                          {getValidationMessage('bestBefore')}
                        </div>
                      )}
                      {formData.bestBefore && (
                        <div className="time-urgency-indicator">
                          {getTimeUrgencyIndicator(formData.bestBefore)}
                        </div>
                      )}
                      <div className="time-presets">
                        <button
                          type="button"
                          className="preset-tag"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleTimePreset(6);
                          }}
                        >
                          6 hours
                        </button>
                        <button
                          type="button"
                          className="preset-tag"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleTimePreset(12);
                          }}
                        >
                          12 hours
                        </button>
                        <button
                          type="button"
                          className="preset-tag"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleTimePreset(24);
                          }}
                        >
                          24 hours
                        </button>
                        <button
                          type="button"
                          className="preset-tag"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleTimePreset(48);
                          }}
                        >
                          2 days
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Location Section Card */}
                  <div className="form-card enhanced">
                    <div className="form-card-header">
                      <div className="form-card-icon">📍</div>
                      <div className="form-card-title">
                        <h3>Pickup Location</h3>
                        <p className="form-card-subtitle">Where can volunteers collect this donation?</p>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        <span>GPS Location *</span>
                        <span className="field-hint">Required for volunteer coordination</span>
                      </label>
                      <div className="location-input-group">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            getCurrentLocation();
                          }}
                          onFocus={() => setActiveStep(3)}
                          className={`dashboard-button enhanced ${location ? 'success' : 'secondary'}`}
                        >
                          <span className="location-icon">{location ? '✓' : '📍'}</span>
                          <div className="location-text">
                            <span className="location-main">{location ? 'Location Captured' : 'Get Current Location'}</span>
                            <span className="location-sub">{location ? 'Tap to refresh' : 'Tap to enable GPS'}</span>
                          </div>
                        </button>
                      </div>
                      
                      {locationError && (
                        <div className="location-status error">
                          <span className="status-icon">⚠️</span>
                          <div className="status-content">
                            <p className="status-title">Location Access Required</p>
                            <p className="status-message">{locationError}</p>
                            <p className="status-help">
                              Please enable location access in your browser settings to create donations. 
                              This ensures transparency and helps volunteers find your donation quickly.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {location && (
                        <div className="location-status success">
                          <span className="status-icon">✓</span>
                          <div className="status-content">
                            <p className="status-title">Location Verified</p>
                            <p className="status-coords">
                              📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                            </p>
                            <div className="location-map-preview">
                              <span className="map-icon">🗺️</span>
                              <span className="map-text">Map preview available for volunteers</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description Card */}
                <div className="form-card enhanced">
                  <div className="form-card-header">
                    <div className="form-card-icon">📝</div>
                    <div className="form-card-title">
                      <h3>Additional Details</h3>
                      <p className="form-card-subtitle">Help volunteers understand what you're offering</p>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <span>Description</span>
                      <span className="field-hint">Optional but helpful for volunteers</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows="4"
                      className="dashboard-input enhanced"
                      placeholder="e.g., 'Fresh homemade vegetable curry with rice, contains nuts, suitable for 4-6 people. Packaged in reusable containers.'"
                    />
                    <div className="char-counter">
                      <span className="char-count">{formData.description.length}</span>
                      <span className="char-max">/300</span>
                    </div>
                    <div className="description-tips">
                      <span className="tip-tag">🥗 Mention dietary info</span>
                      <span className="tip-tag">📦 Packaging details</span>
                      <span className="tip-tag">🌡️ Storage instructions</span>
                    </div>
                  </div>
                </div>

                {/* Photo Capture Section */}
                <div className="form-card enhanced">
                  <div className="form-card-header">
                    <div className="form-card-icon">📸</div>
                    <div className="form-card-title">
                      <h3>Food Photo</h3>
                      <p className="form-card-subtitle">A photo helps build trust and shows food quality</p>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <span>Upload or Capture Photo</span>
                      <span className="field-hint">Recommended for faster donations</span>
                    </label>
                    
                    {!photoPreview ? (
                      <div className="photo-upload-options">
                        <button
                          type="button"
                          className="photo-option-card"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowCamera(true);
                          }}
                        >
                          <div className="option-icon">📷</div>
                          <div className="option-content">
                            <h4>Capture Photo</h4>
                            <p>Take a photo with your camera</p>
                          </div>
                          <div className="option-arrow">→</div>
                        </button>
                        
                        <label className="photo-option-card">
                          <div className="option-icon">📁</div>
                          <div className="option-content">
                            <h4>Upload Photo</h4>
                            <p>Choose from your device</p>
                          </div>
                          <div className="option-arrow">→</div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="photo-preview-container">
                        <div className="photo-preview-card">
                          <div className="preview-image">
                            <img
                              src={photoPreview}
                              alt="Food preview"
                              className="preview-img"
                            />
                            <div className="preview-overlay">
                              <div className="overlay-actions">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowCamera(true);
                                  }}
                                  className="overlay-btn retake"
                                >
                                  📷 Retake
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setCapturedPhoto(null);
                                    setPhotoPreview(null);
                                  }}
                                  className="overlay-btn remove"
                                >
                                  🗑️ Remove
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="preview-info">
                            <div className="info-status">
                              <span className="status-icon">✓</span>
                              <span className="status-text">Photo captured successfully</span>
                            </div>
                            <div className="info-tips">
                              <span className="tip-text">💡 Good lighting and clear focus help volunteers</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="photo-guidelines">
                      <h4>Photo Guidelines:</h4>
                      <div className="guideline-items">
                        <div className="guideline-item">
                          <span className="guideline-icon">🌟</span>
                          <span>Show the food clearly</span>
                        </div>
                        <div className="guideline-item">
                          <span className="guideline-icon">📦</span>
                          <span>Include packaging if relevant</span>
                        </div>
                        <div className="guideline-item">
                          <span className="guideline-icon">💡</span>
                          <span>Good lighting helps</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Validation Summary */}
                <div className="form-validation-summary">
                  <div className="validation-header">
                    <h4>Ready to Share?</h4>
                    <p>Review your donation details before submitting</p>
                  </div>
                  <div className="validation-checklist">
                    <div className={`validation-item ${formData.foodType ? 'valid' : 'invalid'}`}>
                      <span className="validation-icon">{formData.foodType ? '✓' : '○'}</span>
                      <span className="validation-text">Food type specified</span>
                    </div>
                    <div className={`validation-item ${formData.quantity ? 'valid' : 'invalid'}`}>
                      <span className="validation-icon">{formData.quantity ? '✓' : '○'}</span>
                      <span className="validation-text">Quantity set</span>
                    </div>
                    <div className={`validation-item ${formData.bestBefore ? 'valid' : 'invalid'}`}>
                      <span className="validation-icon">{formData.bestBefore ? '✓' : '○'}</span>
                      <span className="validation-text">Expiration time set</span>
                    </div>
                    <div className={`validation-item ${location ? 'valid' : 'invalid'}`}>
                      <span className="validation-icon">{location ? '✓' : '○'}</span>
                      <span className="validation-text">Location captured</span>
                    </div>
                    <div className={`validation-item ${photoPreview ? 'valid' : 'optional'}`}>
                      <span className="validation-icon">{photoPreview ? '✓' : '○'}</span>
                      <span className="validation-text">Photo added (optional)</span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="form-submit-section">
                  <div className="submit-actions">
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="dashboard-button secondary"
                    >
                      <span>🔄</span>
                      <span>Reset Form</span>
                    </button>
                    
                    <button
                      type="submit"
                      disabled={loading || !isFormValid()}
                      className={`dashboard-button primary ${isFormValid() ? 'ready' : 'disabled'}`}
                    >
                      {loading ? (
                        <>
                          <div className="submit-spinner"></div>
                          <span>Creating Donation...</span>
                        </>
                      ) : (
                        <>
                          <span className="submit-icon">🍱</span>
                          <span className="submit-text">Create Donation</span>
                          <span className="submit-sparkle">✨</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="submit-disclaimer">
                    <p>
                      <span className="disclaimer-icon">ℹ️</span>
                      By creating this donation, you agree to share your food with volunteers who will distribute it to those in need. 
                      Please ensure the food is safe and fresh for consumption.
                    </p>
                  </div>
                </div>
            </form>
            
            {/* Camera Modal - Moved outside form to prevent auto-submission */}
            {showCamera && (
              <PhotoCapture 
                onCapture={handlePhotoCapture} 
                onClose={() => setShowCamera(false)} 
              />
            )}
          </div>
        )}

        {activeTab === "donations" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-center sm:text-left">
                <div className="section-header">
                  <div className="section-title">
                    <span>📋</span>
                    <span>My Donations</span>
                  </div>
                  <p className="section-subtitle">Track your food donations and their impact</p>
                </div>
              </div>
              <button
                onClick={fetchMyDonations}
                className="dashboard-button-secondary"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="loading-container">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-green-500 mx-auto mb-4"></div>
                <p className="text-lg font-medium">Loading your donations...</p>
                <p className="text-sm mt-2">This will only take a moment</p>
              </div>
            ) : donations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <span>🍱</span>
                </div>
                <h3 className="text-xl font-bold mb-3">No donations yet</h3>
                <p className="mb-6">Start making a difference by creating your first donation!</p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="dashboard-button"
                >
                  Create Your First Donation
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {donations.map((donation) => (
                  <div key={donation._id} className="donation-card">
                    {donation.photoUrl && (
                      <div className="card-image">
                        <img
                          src={donation.photoUrl}
                          alt="Food"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold mb-1">{donation.foodType}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>📅</span>
                            <span>{formatDate(donation.createdAt)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`status-badge ${getStatusColor(donation.status)} ${isStatusRecentlyUpdated(donation) ? 'status-updated' : ''}`}>
                            <span className="status-icon">{getStatusIcon(donation.status)}</span>
                            {donation.status}
                          </span>
                          {isStatusRecentlyUpdated(donation) && (
                            <div className="status-update-indicator mt-1">
                              <span className="update-pulse">●</span>
                              <span className="update-text text-xs">Just updated</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="status-message">
                        <p className="text-sm text-gray-600 italic">
                          {getStatusMessage(donation.status, donation)}
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-gray-700">
                          <span>📊</span>
                          <span className="font-medium">{donation.quantity} servings</span>
                          <span className="impact-badge">Helps {donation.quantity} people</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-gray-700">
                          <span>⏰</span>
                          <span className="font-medium">Best before: {formatDate(donation.bestBefore)}</span>
                        </div>
                        
                        {donation.description && (
                          <div className="flex items-start space-x-2 text-gray-700">
                            <span className="mt-1">📝</span>
                            <p className="text-sm">{donation.description}</p>
                          </div>
                        )}
                        
                        {/* Donation Progress Indicator */}
                        <div className="status-progress">
                          <div className={`status-step ${donation.status === 'Pending' ? 'active' : 'completed'}`}>
                            <div className="status-step-icon">⏳</div>
                            <span className="status-step-label">Pending</span>
                          </div>
                          <div className={`status-step ${donation.status === 'Assigned' ? 'active' : donation.status === 'PickedUp' || donation.status === 'Delivered' ? 'completed' : ''}`}>
                            <div className="status-step-icon">👤</div>
                            <span className="status-step-label">Assigned</span>
                          </div>
                          <div className={`status-step ${donation.status === 'PickedUp' ? 'active' : donation.status === 'Delivered' ? 'completed' : ''}`}>
                            <div className="status-step-icon">🚚</div>
                            <span className="status-step-label">Picked Up</span>
                          </div>
                          <div className={`status-step ${donation.status === 'Delivered' ? 'active' : ''}`}>
                            <div className="status-step-icon">✅</div>
                            <span className="status-step-label">Delivered</span>
                          </div>
                        </div>
                        
                        {donation.assignedTo?.name && (
                          <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                            <span>👤</span>
                            <div>
                              <p className="text-sm font-medium text-green-800">Assigned to {donation.assignedTo.name}</p>
                              <p className="text-xs text-green-600">{donation.assignedTo.role || 'Volunteer/NGO'}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={() => window.open(`tel:${donation.assignedTo?.phone || ''}`, '_blank')}
                            className="flex-1 dashboard-button-secondary text-sm"
                            disabled={!donation.assignedTo}
                          >
                            <span>📞</span>
                            <span>Contact</span>
                          </button>
                          <button 
                            onClick={() => {
                              if (donation.location?.coordinates) {
                                const [lat, lng] = donation.location.coordinates;
                                window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
                              }
                            }}
                            className="flex-1 dashboard-button-secondary text-sm"
                          >
                            <span>🗺️</span>
                            <span>View Map</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="section-header">
                <div className="section-title">
                  <span>👤</span>
                  <span>Profile</span>
                </div>
                <p className="section-subtitle">Manage your account settings and preferences</p>
              </div>
            </div>
            <div className="profile-section">
              <UserProfile />
            </div>
          </div>
        )}
        </div>  {/* Close tab-content */}
      </div>
    </div>
  );
};
export default DonorDashboard;
