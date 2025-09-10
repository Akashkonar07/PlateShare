import api from './api';

export const createDonation = async (donationData) => {
  const response = await api.post('/donations', donationData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Check if browser is online
const isOnline = () => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

export const fetchDonations = async (retryCount = 0) => {
  // Check if we're offline before making the request
  if (!isOnline()) {
    const error = new Error('You appear to be offline. Please check your internet connection.');
    error.isOffline = true;
    error.isNetworkError = true;
    throw error;
  }

  try {
    const token = localStorage.getItem('token');
    console.log('Fetching donations with token:', token ? 'Token exists' : 'No token found');
    
    const response = await api.get('/donations', {
      timeout: 10000, // 10 seconds timeout
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      validateStatus: (status) => status < 500 // Don't throw for 4xx errors
    });
    
    // Handle 4xx errors
    if (response.status >= 400) {
      const error = new Error(response.data?.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }
    
    console.log('Donations fetched successfully');
    return response.data;
  } catch (error) {
    // If it's a network error and we haven't exceeded max retries, retry
    if ((!error.response || error.code === 'ECONNABORTED') && retryCount < MAX_RETRIES) {
      console.log(`Retrying fetch (${retryCount + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return fetchDonations(retryCount + 1);
    }
    
    // Create a more user-friendly error
    let errorMessage = 'An unexpected error occurred';
    
    if (error.isOffline) {
      errorMessage = 'You appear to be offline. Please check your internet connection.';
    } else if (error.response) {
      // Handle HTTP error responses
      errorMessage = error.response.data?.message || `Request failed with status ${error.response.status}`;
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. Please check your internet connection and try again.';
    } else if (error.code === 'ERR_NETWORK') {
      errorMessage = 'Network error. Please check your internet connection and try again.';
    }
    
    const enhancedError = new Error(errorMessage);
    enhancedError.isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
    enhancedError.isOffline = error.isOffline || !isOnline();
    enhancedError.response = error.response;
    enhancedError.code = error.code;
    
    console.error('Enhanced error:', enhancedError);
    throw enhancedError;
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
        const file = new File([photo], 'delivery-photo.jpg', { type: 'image/jpeg' });
        formData.append('deliveryPhoto', file);
      } else if (photo instanceof File) {
        formData.append('deliveryPhoto', photo);
      } else {
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
  // First validate required fields before processing the photo
  if (!data || !data.recipientName || !data.recipientType) {
    throw new Error('Recipient name and type are required');
  }

  try {
    console.log('Starting NGO delivery confirmation with:', { 
      donationId, 
      hasPhoto: !!photo,
      data: { ...data } // Log a copy to avoid potential side effects
    });
    
    const formData = new FormData();
    
    // Add photo if provided
    if (photo) {
      console.log('Processing delivery photo...');
      try {
        let fileToUpload;
        
        if (photo instanceof Blob) {
          // Ensure we have a proper File object with correct MIME type
          fileToUpload = new File([photo], `delivery-${Date.now()}.jpg`, { 
            type: photo.type || 'image/jpeg',
            lastModified: new Date().getTime()
          });
        } else if (typeof photo === 'string') {
          // Handle base64 or URL
          const response = await fetch(photo);
          if (!response.ok) throw new Error(`Failed to fetch photo: ${response.status} ${response.statusText}`);
          const blob = await response.blob();
          fileToUpload = new File([blob], `delivery-${Date.now()}.jpg`, {
            type: blob.type || 'image/jpeg',
            lastModified: new Date().getTime()
          });
        } else if (photo instanceof File) {
          fileToUpload = photo;
        }
        
        if (fileToUpload) {
          // Ensure the field name matches exactly what Multer expects
          formData.append('deliveryPhoto', fileToUpload);
          
          // Log file info for debugging
          console.log('Added file to form data:', {
            fieldName: 'deliveryPhoto',
            fileName: fileToUpload.name,
            fileType: fileToUpload.type,
            fileSize: fileToUpload.size,
            isFile: fileToUpload instanceof File,
            isBlob: fileToUpload instanceof Blob
          });
        } else {
          throw new Error('Could not process the provided photo');
        }
      } catch (photoError) {
        console.error('Error processing photo:', {
          message: photoError.message,
          stack: photoError.stack,
          photoType: typeof photo,
          isFile: photo instanceof File,
          isBlob: photo instanceof Blob
        });
        throw new Error('Failed to process delivery photo: ' + photoError.message);
      }
    } else {
      console.warn('No photo provided for delivery confirmation');
      throw new Error('Delivery photo is required');
    }
    
    // Add other form data
    if (data) {
      console.log('Adding form data:', data);
      // Explicitly append each field to ensure consistent field names
      const formFields = {
        recipientName: data.recipientName,
        recipientType: data.recipientType,
        recipientContact: data.recipientContact || '',
        numberOfPeopleServed: data.numberOfPeopleServed || 1,
        notes: data.notes || ''
      };
      
      Object.entries(formFields).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
    }

    // Log form data for debugging (without logging the actual file content)
    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(key, value instanceof File ? 
        `${value.name} (${value.size} bytes, ${value.type})` : 
        value
      );
    }

    console.log('Sending NGO delivery confirmation to server...');
    const response = await api.post(
      `/donations/${donationId}/ngo-deliver`,
      formData,
      {
        headers: {
          // Let the browser set the Content-Type with the correct boundary
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // Increased timeout to 60 seconds
        maxBodyLength: Infinity, // Required for large file uploads
        maxContentLength: Infinity // Required for large file uploads
      }
    );
    
    console.log('NGO delivery confirmed:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in confirmNGODelivery:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    
    // Create a more user-friendly error message
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Failed to confirm delivery. Please try again.';
    
    const enhancedError = new Error(errorMessage);
    enhancedError.response = error.response;
    throw enhancedError;
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
