import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const UserProfile = () => {
  const { user, updateProfile, loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [profileData, setProfileData] = useState({
    profile: {
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        coordinates: {
          latitude: null,
          longitude: null
        }
      },
      bio: '',
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: false
        },
        privacy: {
          showProfile: true,
          showLocation: true,
          showStats: true
        }
      }
    },
    ngoCapacity: {
      dailyCapacity: 0,
      maxBulkSize: 100,
      operatingHours: {
        start: '09:00',
        end: '18:00'
      },
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      foodPreferences: [],
      serviceRadius: 10
    },
    volunteerPreferences: {
      maxDistance: 15,
      availableHours: {
        start: '09:00',
        end: '18:00'
      },
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      vehicleType: 'Car',
      maxCapacity: 5
    }
  });

  // Load user data into form when user changes
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          ...user.profile,
          address: {
            ...prev.profile.address,
            ...user.profile?.address
          },
          preferences: {
            notifications: {
              ...prev.profile.preferences.notifications,
              ...user.profile?.preferences?.notifications
            },
            privacy: {
              ...prev.profile.preferences.privacy,
              ...user.profile?.preferences?.privacy
            }
          }
        },
        ngoCapacity: {
          ...prev.ngoCapacity,
          ...user.ngoCapacity
        },
        volunteerPreferences: {
          ...prev.volunteerPreferences,
          ...user.volunteerPreferences
        }
      }));
    }
  }, [user]);

  const handleInputChange = (section, field, value, subField = null) => {
    setProfileData(prev => {
      const newData = { ...prev };
      if (subField) {
        if (!newData[section][field]) newData[section][field] = {};
        newData[section][field][subField] = value;
      } else {
        newData[section][field] = value;
      }
      return newData;
    });
  };

  const handleArrayChange = (section, field, value) => {
    setProfileData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: Array.isArray(value) ? value : value.split(',').map(item => item.trim())
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile(profileData);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Profile update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleInputChange('profile', 'address', position.coords.latitude, 'coordinates.latitude');
          handleInputChange('profile', 'address', position.coords.longitude, 'coordinates.longitude');
          setSuccess('Location updated successfully!');
        },
        (error) => {
          setError('Failed to get current location');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">User Profile</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={user.name}
                disabled
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <input
                type="text"
                value={user.role}
                disabled
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={profileData.profile.phone || ''}
                onChange={(e) => handleInputChange('profile', 'phone', e.target.value)}
                disabled={!isEditing}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Enter phone number"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
            <textarea
              value={profileData.profile.bio || ''}
              onChange={(e) => handleInputChange('profile', 'bio', e.target.value)}
              disabled={!isEditing}
              rows="3"
              className="w-full p-3 border border-gray-300 rounded-md"
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-700">Address Information</h3>
            {isEditing && (
              <button
                type="button"
                onClick={getCurrentLocation}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
              >
                Get Current Location
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
              <input
                type="text"
                value={profileData.profile.address.street || ''}
                onChange={(e) => handleInputChange('profile', 'address', e.target.value, 'street')}
                disabled={!isEditing}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Enter street address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                value={profileData.profile.address.city || ''}
                onChange={(e) => handleInputChange('profile', 'address', e.target.value, 'city')}
                disabled={!isEditing}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input
                type="text"
                value={profileData.profile.address.state || ''}
                onChange={(e) => handleInputChange('profile', 'address', e.target.value, 'state')}
                disabled={!isEditing}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="Enter state"
              />
            </div>
          </div>
        </div>

        {/* Role-specific sections */}
        {user.role === 'NGO' && (
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">NGO Capacity Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Daily Capacity</label>
                <input
                  type="number"
                  value={profileData.ngoCapacity.dailyCapacity || 0}
                  onChange={(e) => handleInputChange('ngoCapacity', 'dailyCapacity', parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-md"
                  placeholder="Maximum servings per day"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Radius (km)</label>
                <input
                  type="number"
                  value={profileData.ngoCapacity.serviceRadius || 10}
                  onChange={(e) => handleInputChange('ngoCapacity', 'serviceRadius', parseInt(e.target.value) || 10)}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Operating Hours Start</label>
                <input
                  type="time"
                  value={profileData.ngoCapacity.operatingHours.start || '09:00'}
                  onChange={(e) => handleInputChange('ngoCapacity', 'operatingHours', e.target.value, 'start')}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Operating Hours End</label>
                <input
                  type="time"
                  value={profileData.ngoCapacity.operatingHours.end || '18:00'}
                  onChange={(e) => handleInputChange('ngoCapacity', 'operatingHours', e.target.value, 'end')}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Food Preferences (comma-separated)</label>
              <input
                type="text"
                value={profileData.ngoCapacity.foodPreferences?.join(', ') || ''}
                onChange={(e) => handleArrayChange('ngoCapacity', 'foodPreferences', e.target.value)}
                disabled={!isEditing}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="e.g., Vegetarian, Non-Vegetarian, Vegan"
              />
            </div>
          </div>
        )}

        {user.role === 'Volunteer' && (
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Volunteer Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Distance (km)</label>
                <input
                  type="number"
                  value={profileData.volunteerPreferences.maxDistance || 15}
                  onChange={(e) => handleInputChange('volunteerPreferences', 'maxDistance', parseInt(e.target.value) || 15)}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
                <select
                  value={profileData.volunteerPreferences.vehicleType || 'Car'}
                  onChange={(e) => handleInputChange('volunteerPreferences', 'vehicleType', e.target.value)}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-md"
                >
                  <option value="Walking">Walking</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Car">Car</option>
                  <option value="Van">Van</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Hours Start</label>
                <input
                  type="time"
                  value={profileData.volunteerPreferences.availableHours.start || '09:00'}
                  onChange={(e) => handleInputChange('volunteerPreferences', 'availableHours', e.target.value, 'start')}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Hours End</label>
                <input
                  type="time"
                  value={profileData.volunteerPreferences.availableHours.end || '18:00'}
                  onChange={(e) => handleInputChange('volunteerPreferences', 'availableHours', e.target.value, 'end')}
                  disabled={!isEditing}
                  className="w-full p-3 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        )}

        {/* Privacy & Notification Preferences */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Notification Preferences</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={profileData.profile.preferences.notifications.email}
                    onChange={(e) => handleInputChange('profile', 'preferences', e.target.checked, 'notifications.email')}
                    disabled={!isEditing}
                    className="mr-2"
                  />
                  <span className="text-sm">Email notifications</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={profileData.profile.preferences.notifications.push}
                    onChange={(e) => handleInputChange('profile', 'preferences', e.target.checked, 'notifications.push')}
                    disabled={!isEditing}
                    className="mr-2"
                  />
                  <span className="text-sm">Push notifications</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={profileData.profile.preferences.notifications.sms}
                    onChange={(e) => handleInputChange('profile', 'preferences', e.target.checked, 'notifications.sms')}
                    disabled={!isEditing}
                    className="mr-2"
                  />
                  <span className="text-sm">SMS notifications</span>
                </label>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Privacy Settings</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={profileData.profile.preferences.privacy.showProfile}
                    onChange={(e) => handleInputChange('profile', 'preferences', e.target.checked, 'privacy.showProfile')}
                    disabled={!isEditing}
                    className="mr-2"
                  />
                  <span className="text-sm">Show profile publicly</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={profileData.profile.preferences.privacy.showLocation}
                    onChange={(e) => handleInputChange('profile', 'preferences', e.target.checked, 'privacy.showLocation')}
                    disabled={!isEditing}
                    className="mr-2"
                  />
                  <span className="text-sm">Show location</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={profileData.profile.preferences.privacy.showStats}
                    onChange={(e) => handleInputChange('profile', 'preferences', e.target.checked, 'privacy.showStats')}
                    disabled={!isEditing}
                    className="mr-2"
                  />
                  <span className="text-sm">Show statistics</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Account Statistics */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-700">Account Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{user.points || 0}</div>
              <div className="text-sm text-gray-600">Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{user.loginCount || 0}</div>
              <div className="text-sm text-gray-600">Logins</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{user.unreadNotifications || 0}</div>
              <div className="text-sm text-gray-600">Unread Notifications</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {user.volunteerProfile?.stats?.totalDeliveries || 0}
              </div>
              <div className="text-sm text-gray-600">Deliveries</div>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default UserProfile;
