import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeStatistics } from '../services/statistics';
import './Home.css';

const Home = () => {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState({
    totalMealsSaved: 0,
    activeDonors: 0,
    activeVolunteers: 0,
    activeNGOs: 0,
    pendingDonations: 0,
    activeAssignments: 0,
    todayDonations: 0,
    thisWeekDonations: 0,
    thisMonthDonations: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const response = await getHomeStatistics();
        if (response.success) {
          setStatistics(response.data);
        }
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError('Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatistics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <div className="home-container">
      {/* Enhanced Hero Section */}
      <section className="hero">
        <div className="hero-background">
          <div className="hero-pattern"></div>
          <div className="hero-glow"></div>
        </div>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">🌱</span>
            <span className="badge-text">Making a Difference, One Meal at a Time</span>
          </div>
          
          <h1 className="hero-title">
            Share Food, <span className="hero-accent">Save Lives</span>
          </h1>
          
          <p className="hero-subtitle">
            Join our mission to connect surplus food with those who need it most. 
            Together, we're reducing waste, fighting hunger, and building stronger communities.
          </p>
          
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-number">
                {loading ? '...' : formatNumber(statistics.totalMealsSaved)}+
              </span>
              <span className="hero-stat-label">Meals Saved</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">
                {loading ? '...' : formatNumber(statistics.totalUsers)}+
              </span>
              <span className="hero-stat-label">Community Members</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-number">
                {loading ? '...' : formatNumber(statistics.thisMonthDonations)}+
              </span>
              <span className="hero-stat-label">This Month</span>
            </div>
          </div>
          
          <div className="hero-buttons">
            <Link to="/signup" className="btn btn-primary">
              <span className="btn-icon">🚀</span>
              Get Started
            </Link>
            <Link to="/login" className="btn btn-secondary">
              <span className="btn-icon">👤</span>
              Sign In
            </Link>
          </div>
          
          <div className="hero-trust">
            <div className="trust-item">
              <span className="trust-icon">✓</span>
              <span className="trust-text">100% Free to Use</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">✓</span>
              <span className="trust-text">Verified Partners</span>
            </div>
            <div className="trust-item">
              <span className="trust-icon">✓</span>
              <span className="trust-text">Real Impact</span>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Stats Section */}
      <section className="section real-time-stats">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Live Impact</h2>
            <p className="section-subtitle">Real-time data from our community</p>
          </div>
          
          <div className="stats-grid-horizontal">
            <div className="stat-card featured">
              <div className="stat-icon">🍽️</div>
              <div className="stat-number">
                {loading ? '...' : formatNumber(statistics.totalMealsSaved)}
              </div>
              <div className="stat-label">Meals Saved</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🤝</div>
              <div className="stat-number">
                {loading ? '...' : formatNumber(statistics.activeDonors)}
              </div>
              <div className="stat-label">Active Donors</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🚚</div>
              <div className="stat-number">
                {loading ? '...' : formatNumber(statistics.activeVolunteers)}
              </div>
              <div className="stat-label">Volunteers</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🏢</div>
              <div className="stat-number">
                {loading ? '...' : formatNumber(statistics.activeNGOs)}
              </div>
              <div className="stat-label">Partner NGOs</div>
            </div>
          </div>
          
          {/* Section Divider */}
          <div className="section-divider"></div>
          
          {/* Current Activity Section */}
          <div className="activity-container">
            <h3 className="activity-title">Current Activity</h3>
            <div className="activity-grid-horizontal">
              <div className="activity-stat">
                <div className="activity-number">
                  {loading ? '...' : statistics.pendingDonations}
                </div>
                <div className="activity-label">Pending Donations</div>
              </div>
              
              <div className="activity-stat">
                <div className="activity-number">
                  {loading ? '...' : statistics.activeAssignments}
                </div>
                <div className="activity-label">Active Assignments</div>
              </div>
              
              <div className="activity-stat">
                <div className="activity-number">
                  {loading ? '...' : statistics.todayDonations}
                </div>
                <div className="activity-label">Today's Donations</div>
              </div>
              
              <div className="activity-stat">
                <div className="activity-number">
                  {loading ? '...' : statistics.thisWeekDonations}
                </div>
                <div className="activity-label">This Week</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section how-it-works">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How PlateShare Works</h2>
            <p className="section-subtitle">Join our community in three simple steps</p>
          </div>
          
          <div className="steps-container">
            <div className="steps-flow">
              <div className="step enhanced">
                <div className="step-icon-container">
                  <div className="step-icon">🍽️</div>
                  <div className="step-number">1</div>
                </div>
                <h3 className="step-title">Donate Food</h3>
                <p className="step-description">
                  Restaurants and individuals can donate excess food with just a few clicks
                </p>
                <div className="step-features">
                  <span className="feature-tag">Easy Upload</span>
                  <span className="feature-tag">Photo Verification</span>
                  <span className="feature-tag">Location Tracking</span>
                </div>
              </div>
              
              <div className="step-connector">
                <div className="connector-line"></div>
                <div className="connector-arrow">→</div>
              </div>
              
              <div className="step enhanced">
                <div className="step-icon-container">
                  <div className="step-icon">🚚</div>
                  <div className="step-number">2</div>
                </div>
                <h3 className="step-title">Volunteer Delivery</h3>
                <p className="step-description">
                  Volunteers pick up and deliver food to those in need
                </p>
                <div className="step-features">
                  <span className="feature-tag">Real-time Tracking</span>
                  <span className="feature-tag">Route Optimization</span>
                  <span className="feature-tag">Safety Verified</span>
                </div>
              </div>
              
              <div className="step-connector">
                <div className="connector-line"></div>
                <div className="connector-arrow">→</div>
              </div>
              
              <div className="step enhanced">
                <div className="step-icon-container">
                  <div className="step-icon">🌟</div>
                  <div className="step-number">3</div>
                </div>
                <h3 className="step-title">Make Impact</h3>
                <p className="step-description">
                  NGOs distribute food to communities, reducing waste and fighting hunger
                </p>
                <div className="step-features">
                  <span className="feature-tag">Community Impact</span>
                  <span className="feature-tag">Waste Reduction</span>
                  <span className="feature-tag">Hunger Relief</span>
                </div>
              </div>
            </div>
            
            <div className="steps-summary">
              <div className="summary-card">
                <div className="summary-icon">♻️</div>
                <div className="summary-content">
                  <h4 className="summary-title">Complete Cycle</h4>
                  <p className="summary-text">From surplus to solution, creating a sustainable food ecosystem</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced User Roles Section */}
      <section className="section roles enhanced">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Join as a</h2>
            <p className="section-subtitle">Choose your role and start making a difference</p>
          </div>
          
          <div className="roles-showcase">
            <div className="role-cards enhanced">
              <div className="role-card enhanced donor">
                <div className="role-header">
                  <div className="role-icon enhanced donor">
                    <div className="icon-emoji">🍽️</div>
                    <div className="icon-bg"></div>
                  </div>
                  <div className="role-badge">#1 Impact</div>
                </div>
                <h3 className="role-title">Food Donor</h3>
                <p className="role-description">
                  Restaurants, cafes, and individuals who want to donate excess food
                </p>
                <div className="role-features">
                  <div className="feature-item">
                    <span className="feature-icon">✨</span>
                    <span className="feature-text">Easy Donation</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📍</span>
                    <span className="feature-text">Location Tracking</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📸</span>
                    <span className="feature-text">Photo Verification</span>
                  </div>
                </div>
                <Link to="/signup?role=donor" className="btn btn-role enhanced donor">
                  <span className="btn-text">Join as Donor</span>
                  <span className="btn-arrow">→</span>
                </Link>
              </div>
              
              <div className="role-card enhanced volunteer">
                <div className="role-header">
                  <div className="role-icon enhanced volunteer">
                    <div className="icon-emoji">🚚</div>
                    <div className="icon-bg"></div>
                  </div>
                  <div className="role-badge">#1 Active</div>
                </div>
                <h3 className="role-title">Volunteer</h3>
                <p className="role-description">
                  Individuals who want to help deliver food and make a difference
                </p>
                <div className="role-features">
                  <div className="feature-item">
                    <span className="feature-icon">🏃</span>
                    <span className="feature-text">Flexible Schedule</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🎯</span>
                    <span className="feature-text">Gamification</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🏆</span>
                    <span className="feature-text">Achievement System</span>
                  </div>
                </div>
                <Link to="/signup?role=volunteer" className="btn btn-role enhanced volunteer">
                  <span className="btn-text">Join as Volunteer</span>
                  <span className="btn-arrow">→</span>
                </Link>
              </div>
              
              <div className="role-card enhanced ngo">
                <div className="role-header">
                  <div className="role-icon enhanced ngo">
                    <div className="icon-emoji">🏢</div>
                    <div className="icon-bg"></div>
                  </div>
                  <div className="role-badge">#1 Trusted</div>
                </div>
                <h3 className="role-title">NGO</h3>
                <p className="role-description">
                  Non-profit organizations that distribute food to communities
                </p>
                <div className="role-features">
                  <div className="feature-item">
                    <span className="feature-icon">📊</span>
                    <span className="feature-text">Bulk Management</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">🤝</span>
                    <span className="feature-text">Community Impact</span>
                  </div>
                  <div className="feature-item">
                    <span className="feature-icon">📈</span>
                    <span className="feature-text">Impact Analytics</span>
                  </div>
                </div>
                <Link to="/signup?role=ngo" className="btn btn-role enhanced ngo">
                  <span className="btn-text">Join as NGO</span>
                  <span className="btn-arrow">→</span>
                </Link>
              </div>
            </div>
            
            <div className="roles-impact">
              <div className="impact-card">
                <div className="impact-icon">🌍</div>
                <div className="impact-content">
                  <h4 className="impact-title">Together We Make Impact</h4>
                  <p className="impact-text">Every role plays a crucial part in reducing food waste and fighting hunger in our communities</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section cta">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Make a Difference?</h2>
            <p className="cta-description">
              Join our community today and help us fight hunger while reducing food waste.
            </p>
            <div className="cta-buttons">
              <Link to="/signup" className="btn btn-primary">
                Sign Up Now
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Login to Continue
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
