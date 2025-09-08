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
  try {
    const token = localStorage.getItem('token');
    console.log('Fetching donations with token:', token ? 'Token exists' : 'No token found');
    
    const response = await api.get('/donations');
    console.log('Donations fetched successfully');
    return response.data;
  } catch (error) {
    console.error('Error fetching donations:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers
    });
    throw error;
  }
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
  try {
    console.log(`Initiating NGO assignment for donation ${donationId}`);
    
    // First, assign the donation to the NGO
    console.log(`Assigning donation ${donationId} to NGO`);
    const assignResponse = await api.post(`/donations/${donationId}/assign-ngo`, { notes });
    
    // Check if assignment was successful or already assigned
    const isAlreadyAssigned = assignResponse.data.message?.includes('already assigned');
    console.log(isAlreadyAssigned ? 'NGO was already assigned' : 'Assignment successful');
    
    // Confirm the assignment
    console.log('Confirming assignment...');
    const confirmResponse = await api.post(
      `/donations/${donationId}/confirm-assignment`,
      { notes }
    );
    
    console.log('Assignment confirmed:', confirmResponse.data);
    return {
      ...confirmResponse.data,
      // Indicate that this was an assignment + confirmation
      isNewAssignment: !isAlreadyAssigned
    };
  } catch (error) {
    console.error('Error in confirmNGODonation:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      }
    });
    throw error;
  }
};

export const confirmNGOPickup = async (donationId, photo) => {
  try {
    console.log(`Confirming NGO pickup for donation ${donationId}`);
    const formData = new FormData();
    
    if (photo) {
      console.log('Processing pickup photo...');
      if (photo instanceof Blob) {
        const fileName = `pickup-${Date.now()}.jpg`;
        formData.append('pickupPhoto', photo, fileName);
      } else if (typeof photo === 'string') {
        const response = await fetch(photo);
        const blob = await response.blob();
        const fileName = `pickup-${Date.now()}.jpg`;
        formData.append('pickupPhoto', blob, fileName);
      }
    }

    const response = await api.post(
      `/donations/${donationId}/ngo-pickup`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    console.log('NGO pickup confirmed:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in confirmNGOPickup:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const confirmNGODelivery = async (donationId, data, photo) => {
  try {
    console.log('Starting NGO delivery confirmation with:', { donationId, data, photo });
    const formData = new FormData();
    
    // Add photo if provided
    if (photo) {
      console.log('Processing delivery photo...');
      if (photo instanceof Blob) {
        const fileName = `delivery-${Date.now()}.jpg`;
        formData.append('deliveryPhoto', photo, fileName);
      } else if (typeof photo === 'string') {
        const response = await fetch(photo);
        const blob = await response.blob();
        const fileName = `delivery-${Date.now()}.jpg`;
        formData.append('deliveryPhoto', blob, fileName);
      }
    }
    
    // Add other form data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });

    const response = await api.post(
      `/donations/${donationId}/ngo-deliver`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    console.log('NGO delivery confirmed:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in confirmNGODelivery:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const updateDonationStatus = async (donationId, updateData) => {
  try {
    console.log(`Updating donation ${donationId} with:`, updateData);
    const response = await api.patch(`/donations/${donationId}/status`, updateData);
    console.log('Status update successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating donation status:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

export const getDonationTracking = async (donationId) => {
  const response = await api.get(`/donations/${donationId}/tracking`);
  return response.data;
};

export const deleteDonation = async (donationId) => {
  const response = await api.delete(`/donations/${donationId}`);
  return response.data;
};
