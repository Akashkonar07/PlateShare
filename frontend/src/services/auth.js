import api from './api';

export const loginUser = async (credentials) => {
  const { data } = await api.post('/auth/login', credentials);
  return data; // should include JWT token and user info
};

export const signupUser = async (userInfo) => {
  const { data } = await api.post('/auth/signup', userInfo);
  return data;
};

export const getUserProfile = async (token) => {
  const { data } = await api.get('/auth/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};
