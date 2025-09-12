import axios from "axios";

const API_URL = "http://localhost:5000/api/auth";

// Configure axios defaults
const authAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Standard signup
export const signupUser = async (userData) => {
  console.log("Sending signup request to backend:", userData);
  return authAPI.post("/register", userData);
};

// Standard login
export const loginUser = async (userData) => {
  console.log("Sending login request to backend:", userData);
  return authAPI.post("/login", userData);
};

// Get user profile (requires auth token)
export const getUserProfile = async (token) => {
  return authAPI.get("/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Update user profile (requires auth token)
export const updateUserProfile = async (profileData, token) => {
  console.log("Updating user profile:", profileData);
  return authAPI.put("/profile", profileData, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};
