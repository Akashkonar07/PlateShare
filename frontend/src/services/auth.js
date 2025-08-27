import axios from "axios";

const API_URL = "http://localhost:5000/api"; // make sure this matches backend port

export const signupUser = async (userData) => {
  return axios.post(`${API_URL}/register`, userData); // changed from /signup to /register
};

export const loginUser = async (userData) => {
  return axios.post(`${API_URL}/login`, userData);
};

export const getUserProfile = async (token) => {
  return axios.get(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } });
};
