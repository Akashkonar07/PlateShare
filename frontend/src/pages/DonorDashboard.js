import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import useGeoLocation from "../hooks/useGeoLocation";
import { createDonation, getMyDonations } from "../services/donation";
import PhotoCapture from "../components/PhotoCapture";

const DonorDashboard = () => {
  const { user, logout } = useAuth();
  const { location, error: locationError, getCurrentLocation } = useGeoLocation();
  
  const [activeTab, setActiveTab] = useState("create");
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  
  const [formData, setFormData] = useState({
    foodType: "",
    quantity: "",
    bestBefore: "",
    description: "",
    latitude: "",
    longitude: ""
  });
  

  useEffect(() => {
    if (user && activeTab === "donations") {
      fetchMyDonations();
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (location) {
      setFormData(prev => ({
        ...prev,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString()
      }));
    }
  }, [location]);

  const fetchMyDonations = async () => {
    try {
      setLoading(true);
      const response = await getMyDonations();
      setDonations(response.donations || []);
    } catch (error) {
      console.error("Error fetching donations:", error);
      if (error.response?.status === 401) {
        // Handle unauthorized
        logout();
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
    
    if (!formData.latitude || !formData.longitude) {
      alert("Please enable GPS location access to create a donation. Location verification is required for transparency.");
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
        longitude: location?.longitude?.toString() || ""
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

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "Assigned": return "bg-blue-100 text-blue-800";
      case "PickedUp": return "bg-purple-100 text-purple-800";
      case "Delivered": return "bg-green-100 text-green-800";
      case "Rejected": return "bg-red-100 text-red-800";
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

  return (
    <div className="max-w-6xl mx-auto mt-20 p-4">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Donor Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user.name}!</p>
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
              onClick={() => setActiveTab("create")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "create"
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Create Donation
            </button>
            <button
              onClick={() => setActiveTab("donations")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "donations"
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              My Donations
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "create" && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Create New Donation</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Food Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Food Type *
                    </label>
                    <input
                      type="text"
                      name="foodType"
                      value={formData.foodType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Rice, Curry, Bread"
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity (servings) *
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Number of servings"
                    />
                  </div>

                  {/* Best Before */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Best Before *
                    </label>
                    <input
                      type="datetime-local"
                      name="bestBefore"
                      value={formData.bestBefore}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Location Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location * (GPS Required)
                    </label>
                    
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        {location ? "✓ Location Captured" : "📍 Get Current Location"}
                      </button>
                      
                      {locationError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-red-600 text-sm font-medium mb-1">Location Access Required</p>
                          <p className="text-red-500 text-sm">{locationError}</p>
                          <p className="text-red-500 text-xs mt-2">
                            Please enable location access in your browser settings to create donations. 
                            This ensures transparency and helps volunteers find your donation.
                          </p>
                        </div>
                      )}
                      
                      {location && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-green-600 text-sm font-medium">Location Verified ✓</p>
                          <p className="text-green-500 text-xs">
                            Coordinates: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Additional details about the food..."
                  />
                </div>

                {/* Photo Capture Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Food Photo
                  </label>
                  
                  <div className="space-y-4">
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => setShowCamera(true)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        📷 Capture Photo
                      </button>
                      
                      <label className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors">
                        📁 Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Photo Preview */}
                    {photoPreview && (
                      <div className="relative">
                        <img
                          src={photoPreview}
                          alt="Food preview"
                          className="w-64 h-48 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCapturedPhoto(null);
                            setPhotoPreview(null);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    
                    {/* Camera Modal */}
                    {showCamera && (
                      <PhotoCapture 
                        onCapture={handlePhotoCapture} 
                        onClose={() => setShowCamera(false)} 
                      />
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    {loading ? "Creating Donation..." : "Create Donation"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "donations" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">My Donations</h2>
                <button
                  onClick={fetchMyDonations}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading donations...</p>
                </div>
              ) : donations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No donations found. Create your first donation!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {donations.map((donation) => (
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
                        
                        {donation.description && (
                          <p className="text-gray-600">
                            <strong>Description:</strong> {donation.description}
                          </p>
                        )}
                        
                        {donation.assignedTo && (
                          <p className="text-gray-600">
                            <strong>Assigned to:</strong> {donation.assignedTo.name} ({donation.assignedTo.role})
                          </p>
                        )}
                        
                        <p className="text-gray-500 text-sm">
                          Created: {formatDate(donation.createdAt)}
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

export default DonorDashboard;
