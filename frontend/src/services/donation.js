import api from './api';

export const createDonation = async (donationData) => {
  const response = await api.post('/donations', donationData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const fetchDonations = async () => {
  const response = await api.get('/donations');
  return response.data;
};

export const getMyDonations = async () => {
  const response = await api.get('/donations/me');
  return response.data;
};

export const getAssignedDonations = async () => {
  const response = await api.get('/donations/assigned');
  return response.data;
};

export const acceptDonation = async (donationId) => {
  const response = await api.post(`/donations/${donationId}/accept`, {});
  return response.data;
};

export const confirmPickup = async (donationId, photo) => {
  const formData = new FormData();
  if (photo) {
    formData.append('photo', photo);
  }
  const response = await api.post(`/donations/${donationId}/pickup`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const confirmDelivery = async (donationId, data, photo) => {
  console.log('Starting confirmDelivery with:', { donationId, data, photo });
  const formData = new FormData();
  
  // Add photo if provided
  if (photo) {
    console.log('Processing photo...');
    try {
      // If it's a blob, create a file with a proper name
      if (photo instanceof Blob) {
        const fileName = `delivery-${Date.now()}.jpg`;
        console.log('Appending Blob photo with filename:', fileName);
        formData.append('deliveryPhoto', photo, fileName);
      } else if (typeof photo === 'string') {
        // If it's a data URL, convert to blob first
        console.log('Converting data URL to Blob...');
        const response = await fetch(photo);
        const blob = await response.blob();
        const fileName = `delivery-${Date.now()}.jpg`;
        console.log('Appending converted Blob with filename:', fileName);
        formData.append('deliveryPhoto', blob, fileName);
      }
      console.log('Photo processed successfully');
    } catch (photoError) {
      console.error('Error processing photo:', photoError);
      throw new Error('Failed to process delivery photo');
    }
  } else {
    console.warn('No photo provided for delivery confirmation');
  }
  
  // Add all other form data
  if (data) {
    console.log('Adding form data:', data);
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        console.log(`Appending field: ${key} =`, value);
        formData.append(key, value);
      }
    });
  } else {
    console.warn('No additional form data provided');
  }
  
  // Log form data keys for debugging
  console.log('FormData entries:');
  for (let [key, value] of formData.entries()) {
    console.log(key, value instanceof File ? `${value.name} (${value.size} bytes)` : value);
  }
  
  try {
    console.log('Sending delivery confirmation request...');
    const response = await api.post(`/donations/${donationId}/deliver`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('Delivery confirmed successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in confirmDelivery:', error);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
    throw error; // Re-throw to be handled by the component
  }
};

export const declineDonation = async (donationId) => {
  const response = await api.post(`/donations/${donationId}/decline`, {});
  return response.data;
};

export const confirmNGODonation = async (donationId, notes = '') => {
  // First assign the donation to the NGO
  await api.post(`/donations/${donationId}/assign`, {});

  // Then confirm the assignment
  const response = await api.post(
    `/donations/${donationId}/confirm-assignment`,
    { notes }
  );
  return response.data;
};

export const updateDonationStatus = async (donationId, status, notes = '') => {
  const response = await api.patch(
    `/donations/${donationId}/status`,
    { status, notes }
  );
  return response.data;
};

export const getDonationTracking = async (donationId) => {
  const response = await api.get(`/donations/${donationId}/tracking`);
  return response.data;
};

export const deleteDonation = async (donationId) => {
  const response = await api.delete(`/donations/${donationId}`);
  return response.data;
};
