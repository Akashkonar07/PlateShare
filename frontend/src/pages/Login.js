import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/auth";
import { useAuth } from "../hooks/useAuth";
import "./Login.css";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await loginUser({ email: form.email, password: form.password });
      
      // Use the enhanced login function from AuthContext
      login(response.data.user, response.data.token);
      
      console.log('User logged in with complete profile:', response.data.user);
      navigate(`/${response.data.user.role.toLowerCase()}`);
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.response?.data?.message || "Login failed. Try again.");
    } finally { setLoading(false); }
  };


  return (
    <div className="login-container">
      <div className="login-card">
        {/* Brand Section */}
        <div className="login-brand">
          <img 
            src="/assets/PlateShare.png" 
            alt="PlateShare Logo" 
            className="login-logo"
          />
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">Sign in to continue to PlateShare</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="login-error">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 0 8 8A8 8 0 0 0 8 0zM7 3h2v6H7zm0 8h2v2H7z"/>
            </svg>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label htmlFor="email" className="login-label">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
              className="login-input"
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password" className="login-label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              required
              className="login-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`login-submit ${loading ? 'loading' : ''}`}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {/* Links Section */}
        <div className="login-links">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="login-link">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
