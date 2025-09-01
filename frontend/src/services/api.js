// API configuration for backend communication
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get authorization headers if token exists
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Generic API call method
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Chatbot specific methods
  async sendChatMessage(message, sessionId) {
    return this.makeRequest('/api/chatbot/message', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId })
    });
  }

  async getChatSuggestions() {
    return this.makeRequest('/api/chatbot/suggestions');
  }

  async getChatStatus() {
    return this.makeRequest('/api/chatbot/status');
  }

  async getChatContext(sessionId) {
    return this.makeRequest(`/api/chatbot/context/${sessionId}`);
  }

  async clearChatContext(sessionId) {
    return this.makeRequest(`/api/chatbot/context/${sessionId}`, {
      method: 'DELETE'
    });
  }
}

export default new ApiService();
