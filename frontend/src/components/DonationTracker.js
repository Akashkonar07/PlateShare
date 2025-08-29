import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const DonationTracker = ({ donationId, showFullHistory = false }) => {
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (donationId) {
      fetchTrackingData();
    }
  }, [donationId]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await api.get(`/donations/${donationId}/tracking`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setTracking(response.data.donation);
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      setError('Failed to load tracking information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending': return '⏳';
      case 'Assigned': return '👤';
      case 'PickedUp': return '📦';
      case 'Delivered': return '✅';
      case 'Rejected': return '❌';
      case 'Cancelled': return '🚫';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'text-yellow-600 bg-yellow-100';
      case 'Assigned': return 'text-blue-600 bg-blue-100';
      case 'PickedUp': return 'text-purple-600 bg-purple-100';
      case 'Delivered': return 'text-green-600 bg-green-100';
      case 'Rejected': return 'text-red-600 bg-red-100';
      case 'Cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressPercentage = (status) => {
    switch (status) {
      case 'Pending': return 25;
      case 'Assigned': return 50;
      case 'PickedUp': return 75;
      case 'Delivered': return 100;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading tracking...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600">No tracking information available</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Current Status Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getStatusIcon(tracking.status)}</span>
          <div>
            <h3 className="font-semibold text-lg">{tracking.foodType}</h3>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tracking.status)}`}>
              {tracking.status}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Quantity</p>
          <p className="font-semibold">{tracking.quantity} servings</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{getProgressPercentage(tracking.status)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage(tracking.status)}%` }}
          ></div>
        </div>
      </div>

      {/* Key Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Donor</p>
          <p className="font-medium">{tracking.donor?.name || 'Anonymous'}</p>
        </div>
        {tracking.assignedTo && (
          <div>
            <p className="text-sm text-gray-600">Assigned To</p>
            <p className="font-medium">
              {tracking.assignedTo.name} ({tracking.assignedTo.role})
            </p>
          </div>
        )}
      </div>

      {/* Timeline */}
      {showFullHistory && tracking.trackingHistory && tracking.trackingHistory.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-800 mb-3">Tracking History</h4>
          <div className="space-y-3">
            {tracking.trackingHistory
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map((entry, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(entry.status)}`}>
                    <span className="text-sm">{getStatusIcon(entry.status)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{entry.status}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(entry.timestamp)}</p>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Status-specific Actions */}
      {!showFullHistory && (
        <div className="border-t pt-4">
          {tracking.status === 'Pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">
                📋 This donation is waiting to be assigned to a volunteer or NGO
              </p>
            </div>
          )}
          
          {tracking.status === 'Assigned' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">
                👤 Assigned to {tracking.assignedTo?.name} - awaiting pickup
              </p>
            </div>
          )}
          
          {tracking.status === 'PickedUp' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-purple-800 text-sm">
                📦 Food has been picked up and is on the way for delivery
              </p>
            </div>
          )}
          
          {tracking.status === 'Delivered' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 text-sm">
                ✅ Successfully delivered! Thank you for helping reduce food waste.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DonationTracker;
