import api from './api';

// Get home page statistics
export const getHomeStatistics = async () => {
  try {
    const response = await api.get('/reports/home');
    return response.data;
  } catch (error) {
    console.error('Error fetching home statistics:', error);
    throw error;
  }
};

// Get detailed statistics (admin only)
export const getDetailedStatistics = async () => {
  try {
    const response = await api.get('/reports/detailed');
    return response.data;
  } catch (error) {
    console.error('Error fetching detailed statistics:', error);
    throw error;
  }
};
