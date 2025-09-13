import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Share Food, <span className="hero-accent">Save Lives</span>
          </h1>
          <p className="hero-subtitle">
            Connect food donors with volunteers and NGOs to reduce waste and fight hunger.
          </p>
          <div className="hero-buttons">
            <Link to="/signup" className="btn btn-primary">
              Get Started
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Sign In
            </Link>
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
          
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3 className="step-title">Donate Food</h3>
              <p className="step-description">
                Restaurants and individuals can donate excess food with just a few clicks
              </p>
            </div>
            
            <div className="step">
              <div className="step-number">2</div>
              <h3 className="step-title">Volunteer Delivery</h3>
              <p className="step-description">
                Volunteers pick up and deliver food to those in need
              </p>
            </div>
            
            <div className="step">
              <div className="step-number">3</div>
              <h3 className="step-title">Make Impact</h3>
              <p className="step-description">
                NGOs distribute food to communities, reducing waste and fighting hunger
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section className="section roles">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Join as a</h2>
            <p className="section-subtitle">Choose your role and start making a difference</p>
          </div>
          
          <div className="role-cards">
            <div className="role-card">
              <div className="role-icon donor">
                <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="role-title">Food Donor</h3>
              <p className="role-description">
                Restaurants, cafes, and individuals who want to donate excess food
              </p>
              <Link to="/signup?role=donor" className="btn btn-role donor">
                Join as Donor
              </Link>
            </div>
            
            <div className="role-card">
              <div className="role-icon volunteer">
                <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="role-title">Volunteer</h3>
              <p className="role-description">
                Individuals who want to help deliver food and make a difference
              </p>
              <Link to="/signup?role=volunteer" className="btn btn-role volunteer">
                Join as Volunteer
              </Link>
            </div>
            
            <div className="role-card">
              <div className="role-icon ngo">
                <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="role-title">NGO</h3>
              <p className="role-description">
                Non-profit organizations that distribute food to communities
              </p>
              <Link to="/signup?role=ngo" className="btn btn-role ngo">
                Join as NGO
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat">
              <div className="stat-number">10,000+</div>
              <div className="stat-label">Meals Saved</div>
            </div>
            <div className="stat">
              <div className="stat-number">500+</div>
              <div className="stat-label">Active Donors</div>
            </div>
            <div className="stat">
              <div className="stat-number">200+</div>
              <div className="stat-label">Volunteers</div>
            </div>
            <div className="stat">
              <div className="stat-number">50+</div>
              <div className="stat-label">Partner NGOs</div>
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
