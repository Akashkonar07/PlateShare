import api from './api';

export const createDonation = async (donationData, token) => {
  const response = await api.post('/donations', donationData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const fetchDonations = async (token) => {
  const response = await api.get('/donations', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getMyDonations = async (token) => {
  const response = await api.get('/donations/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getAssignedDonations = async (token) => {
  const response = await api.get('/donations/assigned', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

export const acceptDonation = async (donationId, token) => {
  const response = await api.post(`/donations/${donationId}/accept`, {}, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

export const confirmPickup = async (donationId, token) => {
  const response = await api.post(`/donations/${donationId}/pickup`, {}, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

export const confirmDelivery = async (donationId, token) => {
  const response = await api.post(`/donations/${donationId}/deliver`, {}, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

export const declineDonation = async (donationId, token) => {
  const response = await api.post(`/donations/${donationId}/decline`, {}, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

export const updateDonationStatus = async (donationId, status, token, notes = '') => {
  const response = await api.patch(`/donations/${donationId}/status`, 
    { status, notes }, 
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const getDonationTracking = async (donationId, token) => {
  const response = await api.get(`/donations/${donationId}/tracking`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};

export const deleteDonation = async (donationId, token) => {
  const response = await api.delete(`/donations/${donationId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.data;
};
