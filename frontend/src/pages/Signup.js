import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupUser } from "../services/auth";
import { useAuth } from "../hooks/useAuth";
import "./Signup.css";

const Signup = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "donor",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: formData.role.charAt(0).toUpperCase() + formData.role.slice(1),
    };

    console.log("Signup payload:", payload);

    try {
      const signupResponse = await signupUser(payload);
      console.log("Signup response:", signupResponse.data);
      
      // Use the enhanced login function from AuthContext
      login(signupResponse.data.user, signupResponse.data.token);
      
      console.log('User signed up with complete profile:', signupResponse.data.user);
      const redirectPath = `/${signupResponse.data.user.role.toLowerCase()}`;
      console.log("Redirecting to:", redirectPath);
      navigate(redirectPath);
    } catch (err) {
      console.error("Signup Error:", err);
      console.error("Error response:", err.response?.data);
      setError(err.response?.data?.message || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="signup-container">
      <div className="signup-card">
        {/* Brand Section */}
        <div className="signup-brand">
          <img 
            src="/assets/PlateShare.png" 
            alt="PlateShare Logo" 
            className="signup-logo"
          />
          <h1 className="signup-title">Create Account</h1>
          <p className="signup-subtitle">Join PlateShare to make a difference</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="signup-error">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 0 8 8A8 8 0 0 0 8 0zM7 3h2v6H7zm0 8h2v2H7z"/>
            </svg>
            {error}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="signup-form">
          <div className="signup-form-group">
            <label htmlFor="name" className="signup-label">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Enter your full name"
              autoComplete="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="signup-input"
            />
          </div>

          <div className="signup-form-group">
            <label htmlFor="email" className="signup-label">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="signup-input"
            />
          </div>

          <div className="signup-form-group">
            <label htmlFor="password" className="signup-label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Create a password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              required
              className="signup-input"
            />
          </div>

          <div className="signup-form-group">
            <label htmlFor="role" className="signup-label">I am a</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="signup-select"
            >
              <option value="donor">Food Donor</option>
              <option value="volunteer">Volunteer</option>
              <option value="ngo">NGO Representative</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`signup-submit ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {/* Links Section */}
        <div className="signup-links">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="signup-link">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
