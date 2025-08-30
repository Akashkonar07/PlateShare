import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Leaderboard = ({ type = 'monthly', limit = 10 }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(type);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    getCurrentUser();
  }, [selectedType]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await api.get(`/volunteers/leaderboard?type=${selectedType}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        // Ensure we always have an array, even if empty
        setLeaderboard(Array.isArray(response.data.leaderboard) ? response.data.leaderboard : []);
      } else {
        console.error('Unexpected response format:', response.data);
        setLeaderboard([]);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUser = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  };

  const getPointsForType = (profile) => {
    // Handle cases where points might be undefined
    const points = {
      weekly: profile.weeklyPoints || 0,
      monthly: profile.monthlyPoints || 0,
      alltime: profile.totalPoints || 0
    };
    
    return points[selectedType] || points.monthly;
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getTypeLabel = () => {
    switch (selectedType) {
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      case 'alltime': return 'All Time';
      default: return 'This Month';
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600">Loading leaderboard...</span>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-6">
          <h2 className="text-2xl font-bold flex items-center">
            🏆 Leaderboard
          </h2>
          <p className="text-yellow-100">Top volunteers {getTypeLabel().toLowerCase()}</p>
        </div>
        <div className="p-8 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No volunteers on the leaderboard yet</h3>
          <p className="text-gray-600 mb-4">Complete deliveries to earn points and climb the ranks!</p>
          <p className="text-sm text-gray-500">
            The leaderboard updates automatically when volunteers start completing deliveries.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              🏆 Leaderboard
            </h2>
            <p className="text-yellow-100">Top volunteers {getTypeLabel().toLowerCase()}</p>
          </div>
          
          {/* Type Selector */}
          <div className="flex space-x-1 bg-white bg-opacity-20 rounded-lg p-1">
            {['weekly', 'monthly', 'alltime'].map((typeOption) => (
              <button
                key={typeOption}
                onClick={() => setSelectedType(typeOption)}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  selectedType === typeOption
                    ? 'bg-white text-orange-600'
                    : 'text-white hover:bg-white hover:bg-opacity-10'
                }`}
              >
                {typeOption === 'alltime' ? 'All Time' : typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="divide-y divide-gray-200">
        {leaderboard.map((profile, index) => {
            const rank = index + 1;
            const points = getPointsForType(profile);
            const isCurrentUser = currentUser && profile.user._id === currentUser.id;
            
            return (
              <div 
                key={profile._id} 
                className={`p-4 flex items-center space-x-4 transition-colors ${
                  isCurrentUser ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-12 text-center">
                  <div className={`text-lg font-bold ${
                    rank <= 3 ? 'text-2xl' : 'text-gray-600'
                  }`}>
                    {getRankIcon(rank)}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className={`font-semibold truncate ${
                      isCurrentUser ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {profile.user.name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          You
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-gray-500">Level</span>
                      <span className={`text-sm font-medium ${
                        isCurrentUser ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {profile.level}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span>🚚 {profile.stats.totalDeliveries} deliveries</span>
                    <span>🍽️ {profile.stats.totalServingsDelivered} servings</span>
                    {profile.achievements && profile.achievements.length > 0 && (
                      <span>🏅 {profile.achievements.length} badges</span>
                    )}
                  </div>
                </div>

                {/* Points */}
                <div className="flex-shrink-0 text-right">
                  <div className={`text-xl font-bold ${
                    isCurrentUser ? 'text-blue-700' : 'text-gray-900'
                  }`}>
                    {(points || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">points</div>
                </div>

                {/* Top 3 Special Styling */}
                {rank <= 3 && (
                  <div className="flex-shrink-0">
                    <div className={`w-2 h-12 rounded-full ${
                      rank === 1 ? 'bg-yellow-400' :
                      rank === 2 ? 'bg-gray-400' :
                      'bg-orange-400'
                    }`}></div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 text-center">
        <p className="text-sm text-gray-600">
          Rankings update in real-time • Showing top {limit} volunteers
        </p>
      </div>
    </div>
  );
};

export default Leaderboard;
