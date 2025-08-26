import api from './api';

export const createDonation = async (donationData, token) => {
  const { data } = await api.post('/donations', donationData, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const fetchDonations = async (token) => {
  const { data } = await api.get('/donations', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

export const updateDonationStatus = async (donationId, status, token) => {
  const { data } = await api.patch(`/donations/${donationId}`, { status }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};
