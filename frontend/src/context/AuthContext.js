import { createContext, useState, useEffect, useCallback, useContext } from "react";
import { getUserProfile, updateUserProfile } from "../services/auth";

export const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user data from token on app start
  useEffect(() => {
    const loadUserData = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          setLoading(true);
          const response = await getUserProfile(token);
          setUser(response.data.user);
          setError(null);
        } catch (err) {
          console.error('Failed to load user profile:', err);
          localStorage.removeItem("token");
          setUser(null);
          setError('Failed to load user profile');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Login function that sets complete user data
  const login = useCallback((userData, token) => {
    localStorage.setItem("token", token);
    setUser(userData);
    setError(null);
  }, []);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    setError(null);
  }, []);

  // Update user profile function
  const updateProfile = useCallback(async (profileData) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error('No authentication token');
      
      const response = await updateUserProfile(profileData, token);
      setUser(response.data.user);
      setError(null);
      return response.data.user;
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile');
      throw err;
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const response = await getUserProfile(token);
        setUser(response.data.user);
        setError(null);
        return response.data.user;
      } catch (err) {
        console.error('Failed to refresh user data:', err);
        setError('Failed to refresh user data');
        throw err;
      }
    }
  }, []);

  const contextValue = {
    user,
    loading,
    error,
    login,
    logout,
    updateProfile,
    refreshUser,
    setUser,
    isAuthenticated: !!user,
    isVolunteer: user?.role === 'Volunteer',
    isNGO: user?.role === 'NGO',
    isDonor: user?.role === 'Donor',
    isAdmin: user?.role === 'Admin'
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
