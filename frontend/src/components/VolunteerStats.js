import React, { useState, useEffect } from 'react';
import api from '../services/api';

const VolunteerStats = ({ userId, showDetailed = true }) => {
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchVolunteerData();
  }, [userId]);

  const fetchVolunteerData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [profileResponse, achievementsResponse] = await Promise.all([
        api.get('/volunteers/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        api.get('/volunteers/achievements', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (profileResponse.data.success) {
        setProfile(profileResponse.data.profile);
      }
      
      if (achievementsResponse.data.success) {
        setAchievements(achievementsResponse.data.achievements);
      }
    } catch (error) {
      console.error('Error fetching volunteer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressToNextLevel = () => {
    if (!profile) return 0;
    const currentXP = profile.experiencePoints;
    const nextLevelXP = profile.nextLevelPoints;
    const prevLevelXP = nextLevelXP - Math.floor(100 * Math.pow(1.5, profile.level - 1));
    return ((currentXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100;
  };

  const getRecentAchievements = () => {
    return achievements
      .filter(a => a.earned)
      .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
      .slice(0, 3);
  };

  const getAchievementsByCategory = () => {
    const categories = {};
    achievements.forEach(achievement => {
      if (!categories[achievement.category]) {
        categories[achievement.category] = [];
      }
      categories[achievement.category].push(achievement);
    });
    return categories;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading stats...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">Volunteer profile not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header with Level and Points */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Level {profile.level}</h2>
            <p className="text-blue-100">{profile.user?.name}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{profile.totalPoints}</div>
            <div className="text-blue-100 text-sm">Total Points</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-blue-100 mb-1">
            <span>Progress to Level {profile.level + 1}</span>
            <span>{Math.round(getProgressToNextLevel())}%</span>
          </div>
          <div className="w-full bg-blue-400 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressToNextLevel()}%` }}
            ></div>
          </div>
          <div className="text-xs text-blue-100 mt-1">
            {profile.experiencePoints} / {profile.nextLevelPoints} XP
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      {showDetailed && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`py-3 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'achievements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Achievements ({achievements.filter(a => a.earned).length})
            </button>
          </nav>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {(!showDetailed || activeTab === 'overview') && (
          <div>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {profile.stats.totalDeliveries}
                </div>
                <div className="text-sm text-green-700">Deliveries</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {profile.stats.totalServingsDelivered}
                </div>
                <div className="text-sm text-orange-700">Servings</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {profile.stats.streakDays}
                </div>
                <div className="text-sm text-purple-700">Current Streak</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {profile.stats.longestStreak}
                </div>
                <div className="text-sm text-blue-700">Best Streak</div>
              </div>
            </div>

            {/* Recent Achievements */}
            {getRecentAchievements().length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Recent Achievements</h3>
                <div className="space-y-2">
                  {getRecentAchievements().map((achievement, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <span className="text-2xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{achievement.name}</h4>
                        <p className="text-sm text-gray-600">{achievement.description}</p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(achievement.earnedAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Points Breakdown */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-lg font-semibold text-gray-900">
                  {profile.weeklyPoints}
                </div>
                <div className="text-sm text-gray-600">This Week</div>
              </div>
              
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-lg font-semibold text-gray-900">
                  {profile.monthlyPoints}
                </div>
                <div className="text-sm text-gray-600">This Month</div>
              </div>
              
              <div className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-lg font-semibold text-gray-900">
                  {profile.totalPoints}
                </div>
                <div className="text-sm text-gray-600">All Time</div>
              </div>
            </div>
          </div>
        )}

        {showDetailed && activeTab === 'achievements' && (
          <div>
            {Object.entries(getAchievementsByCategory()).map(([category, categoryAchievements]) => (
              <div key={category} className="mb-8">
                <h3 className="font-semibold text-gray-800 mb-4 capitalize">{category} Achievements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryAchievements.map((achievement, index) => (
                    <div 
                      key={index} 
                      className={`p-4 border rounded-lg transition-all ${
                        achievement.earned 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">{achievement.icon}</span>
                        <div className="flex-1">
                          <h4 className={`font-medium ${
                            achievement.earned ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {achievement.name}
                          </h4>
                          <p className={`text-sm ${
                            achievement.earned ? 'text-gray-600' : 'text-gray-400'
                          }`}>
                            {achievement.description}
                          </p>
                          {achievement.earned && achievement.earnedAt && (
                            <p className="text-xs text-green-600 mt-1">
                              Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {achievement.earned && (
                          <div className="text-green-500">
                            ✅
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerStats;
