const chatbotService = require('../services/chatbotService');

class ChatbotController {
  // Process user message and return chatbot response
  async processMessage(req, res) {
    try {
      const { message, sessionId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Message is required and must be a string'
        });
      }

      if (message.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Message too long. Please keep it under 500 characters.'
        });
      }

      const userSessionId = sessionId || `user_${req.user?.id || 'anonymous'}_${Date.now()}`;
      const response = await chatbotService.processQuery(message, userSessionId);

      res.json({
        success: true,
        data: {
          ...response,
          sessionId: userSessionId,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Chatbot controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get conversation context for a session
  async getConversationContext(req, res) {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      const context = chatbotService.getConversationContext(sessionId);

      res.json({
        success: true,
        data: {
          sessionId,
          context,
          contextLength: context.length
        }
      });

    } catch (error) {
      console.error('Get context error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversation context'
      });
    }
  }

  // Clear conversation context for a session
  async clearConversationContext(req, res) {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }

      chatbotService.clearContext(sessionId);

      res.json({
        success: true,
        message: 'Conversation context cleared successfully',
        data: { sessionId }
      });

    } catch (error) {
      console.error('Clear context error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear conversation context'
      });
    }
  }

  // Get chatbot health status and available categories
  async getStatus(req, res) {
    try {
      const categories = Object.keys(chatbotService.knowledgeBase);
      
      res.json({
        success: true,
        data: {
          status: 'active',
          availableCategories: categories,
          version: '1.0.0',
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Chatbot status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get chatbot status'
      });
    }
  }

  // Get suggested questions for users
  async getSuggestions(req, res) {
    try {
      const suggestions = [
        "How do I donate food?",
        "How can I find NGOs near me?",
        "How do I become a volunteer?",
        "How do I track my donation?",
        "What types of food can I donate?",
        "How do I create an account?",
        "What if no one accepts my donation?",
        "How do you ensure food safety?",
        "How do I mark a donation as urgent?",
        "How can I see my donation impact?"
      ];

      res.json({
        success: true,
        data: {
          suggestions,
          categories: Object.keys(chatbotService.knowledgeBase)
        }
      });

    } catch (error) {
      console.error('Get suggestions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get suggestions'
      });
    }
  }
}

module.exports = new ChatbotController();
