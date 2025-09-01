const fs = require('fs');
const path = require('path');

class ChatbotService {
  constructor() {
    this.knowledgeBase = this.loadKnowledgeBase();
    this.conversationContext = new Map(); // Store conversation context by session
  }

  loadKnowledgeBase() {
    // Knowledge base derived from FAQ
    return {
      donation_process: {
        keywords: ['donate', 'donation', 'how to donate', 'create donation', 'give food'],
        responses: [
          "To donate food on PlateShare:\n1. Register as a Donor\n2. Create a donation with food details, location, and photo\n3. Wait for automatic assignment to nearby NGOs/volunteers\n4. Coordinate pickup\n5. Track delivery in real-time",
          "You can donate fresh cooked meals (within 2-4 hours), packaged food (unopened), fresh fruits/vegetables, and baked goods. We don't accept expired food, opened items, or improperly stored food."
        ]
      },
      find_ngos: {
        keywords: ['ngo', 'find ngo', 'nearby ngo', 'organization', 'charity'],
        responses: [
          "To find NGOs near you:\n1. Use the Map View feature in the app\n2. Filter by distance, specialization, and availability\n3. View NGO profiles with ratings and reviews\n\nYou can also browse all available NGOs in the NGO directory section."
        ]
      },
      volunteer: {
        keywords: ['volunteer', 'become volunteer', 'help', 'join', 'pickup'],
        responses: [
          "To become a volunteer:\n1. Register with 'Volunteer' role\n2. Complete verification process\n3. Set your availability and preferred areas\n4. Start accepting donation pickup requests\n5. Build your reputation through successful deliveries"
        ]
      },
      tracking: {
        keywords: ['track', 'tracking', 'status', 'where is my donation', 'delivery status'],
        responses: [
          "Track your donation easily:\n1. Go to 'My Donations' section\n2. Click on specific donation for details\n3. See real-time status: Posted → Assigned → Picked Up → In Transit → Delivered\n\nYou'll receive notifications at each step!"
        ]
      },
      account: {
        keywords: ['account', 'register', 'sign up', 'create account', 'login', 'password'],
        responses: [
          "Creating an account is simple:\n1. Visit PlateShare website/app\n2. Click 'Sign Up'\n3. Choose your role: Donor, Volunteer, or NGO\n4. Complete profile information\n5. Verify email address\n\nFor password reset, use 'Forgot Password' on the login page."
        ]
      },
      safety: {
        keywords: ['safety', 'food safety', 'quality', 'safe', 'hygiene', 'temperature'],
        responses: [
          "We ensure food safety through:\n• Time limits (max 4 hours for cooked food)\n• Photo verification for all donations\n• Temperature guidelines\n• Volunteer training on food safety\n• Rating system for quality feedback\n\nReport any quality issues immediately through the app."
        ]
      },
      urgent: {
        keywords: ['urgent', 'emergency', 'immediate', 'quick', 'fast', 'asap'],
        responses: [
          "For urgent donations:\n1. Select 'Urgent' when creating donation\n2. Provide reason for urgency\n3. System prioritizes to available volunteers\n4. Use 'Emergency Pickup' for immediate needs\n\nCall our 24/7 hotline for true emergencies!"
        ]
      },
      support: {
        keywords: ['help', 'support', 'contact', 'problem', 'issue', 'bug', 'error'],
        responses: [
          "Need help? Contact us:\n• Email: support@plateShare.com\n• Live Chat: Available in app during business hours\n• Phone Support: Available 24/7 for urgent issues\n\nFor technical issues, try updating the app or clearing cache first."
        ]
      },
      impact: {
        keywords: ['impact', 'statistics', 'dashboard', 'metrics', 'leaderboard'],
        responses: [
          "See your impact:\n• Personal dashboard shows donation statistics\n• Impact metrics: meals provided, people helped\n• Community leaderboard recognition\n• Thank you messages from beneficiaries\n\nEvery donation makes a difference!"
        ]
      }
    };
  }

  // Main method to process user queries
  async processQuery(message, sessionId = 'default') {
    try {
      const cleanMessage = message.toLowerCase().trim();
      
      // Handle greetings
      if (this.isGreeting(cleanMessage)) {
        return this.getGreetingResponse();
      }

      // Handle goodbyes
      if (this.isGoodbye(cleanMessage)) {
        return this.getGoodbyeResponse();
      }

      // Find best matching category
      const matchedCategory = this.findBestMatch(cleanMessage);
      
      if (matchedCategory) {
        const response = this.getRandomResponse(matchedCategory);
        this.updateContext(sessionId, matchedCategory.category, message);
        return {
          response,
          category: matchedCategory.category,
          confidence: matchedCategory.confidence,
          suggestions: this.getSuggestions(matchedCategory.category)
        };
      }

      // Fallback response
      return this.getFallbackResponse();
    } catch (error) {
      console.error('Chatbot processing error:', error);
      return this.getErrorResponse();
    }
  }

  findBestMatch(message) {
    let bestMatch = null;
    let highestScore = 0;

    for (const [category, data] of Object.entries(this.knowledgeBase)) {
      const score = this.calculateMatchScore(message, data.keywords);
      if (score > highestScore && score > 0.3) { // Minimum confidence threshold
        highestScore = score;
        bestMatch = { category, data, confidence: score };
      }
    }

    return bestMatch;
  }

  calculateMatchScore(message, keywords) {
    let score = 0;
    const messageWords = message.split(/\s+/);
    
    for (const keyword of keywords) {
      const keywordWords = keyword.toLowerCase().split(/\s+/);
      
      // Exact phrase match gets highest score
      if (message.includes(keyword.toLowerCase())) {
        score += 1.0;
        continue;
      }
      
      // Partial word matches
      let partialScore = 0;
      for (const keywordWord of keywordWords) {
        for (const messageWord of messageWords) {
          if (messageWord.includes(keywordWord) || keywordWord.includes(messageWord)) {
            partialScore += 0.5;
          }
        }
      }
      score += partialScore / keywordWords.length;
    }
    
    return score / keywords.length;
  }

  getRandomResponse(matchedCategory) {
    const responses = matchedCategory.data.responses;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  getSuggestions(category) {
    const suggestions = {
      donation_process: [
        "What types of food can I donate?",
        "How quickly will my donation be picked up?",
        "How do I track my donation?"
      ],
      find_ngos: [
        "How do I become a volunteer?",
        "What areas do you serve?",
        "How do I contact an NGO?"
      ],
      volunteer: [
        "How do I find NGOs near me?",
        "What is the verification process?",
        "How do I track donations?"
      ],
      tracking: [
        "What if no one accepts my donation?",
        "Can I cancel a donation?",
        "How do I contact support?"
      ],
      account: [
        "How do I reset my password?",
        "What information do I need to provide?",
        "How do I update my profile?"
      ],
      safety: [
        "What types of food can I donate?",
        "How do you verify volunteers?",
        "How do I report quality issues?"
      ],
      urgent: [
        "How do I donate food?",
        "How can I find volunteers quickly?",
        "What is emergency pickup?"
      ],
      support: [
        "How do I reset my password?",
        "The app isn't working properly",
        "How do I report issues?"
      ],
      impact: [
        "How do I see my donation statistics?",
        "What is the community leaderboard?",
        "How do I schedule regular donations?"
      ]
    };
    
    return suggestions[category] || [
      "How do I donate food?",
      "How can I find NGOs near me?",
      "How do I become a volunteer?"
    ];
  }

  isGreeting(message) {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(greeting => message.includes(greeting));
  }

  isGoodbye(message) {
    const goodbyes = ['bye', 'goodbye', 'see you', 'thanks', 'thank you'];
    return goodbyes.some(goodbye => message.includes(goodbye));
  }

  getGreetingResponse() {
    const greetings = [
      "Hello! I'm here to help you with PlateShare. How can I assist you today?",
      "Hi there! Welcome to PlateShare. What would you like to know?",
      "Hey! I'm your PlateShare assistant. Ask me anything about food donation!"
    ];
    
    return {
      response: greetings[Math.floor(Math.random() * greetings.length)],
      category: 'greeting',
      confidence: 1.0,
      suggestions: [
        "How do I donate food?",
        "How can I find NGOs near me?",
        "How do I become a volunteer?"
      ]
    };
  }

  getGoodbyeResponse() {
    const goodbyes = [
      "Thank you for using PlateShare! Have a great day and keep making a difference! 🍽️",
      "Goodbye! Remember, every donation counts. See you next time!",
      "Thanks for helping fight food waste! Take care! 👋"
    ];
    
    return {
      response: goodbyes[Math.floor(Math.random() * goodbyes.length)],
      category: 'goodbye',
      confidence: 1.0,
      suggestions: []
    };
  }

  getFallbackResponse() {
    return {
      response: "I'm not sure I understand that question. Could you try rephrasing it? I can help you with:\n• Food donation process\n• Finding NGOs and volunteers\n• Account management\n• Tracking donations\n• Safety guidelines\n• Technical support",
      category: 'fallback',
      confidence: 0.0,
      suggestions: [
        "How do I donate food?",
        "How can I find NGOs near me?",
        "How do I become a volunteer?",
        "How do I track my donation?",
        "How do I create an account?"
      ]
    };
  }

  getErrorResponse() {
    return {
      response: "I'm experiencing some technical difficulties. Please try again or contact our support team at support@plateShare.com for immediate assistance.",
      category: 'error',
      confidence: 0.0,
      suggestions: ["Contact support", "Try again later"]
    };
  }

  updateContext(sessionId, category, message) {
    if (!this.conversationContext.has(sessionId)) {
      this.conversationContext.set(sessionId, []);
    }
    
    const context = this.conversationContext.get(sessionId);
    context.push({
      timestamp: new Date(),
      category,
      message: message.substring(0, 100) // Store truncated message
    });
    
    // Keep only last 5 interactions
    if (context.length > 5) {
      context.shift();
    }
  }

  getConversationContext(sessionId) {
    return this.conversationContext.get(sessionId) || [];
  }

  clearContext(sessionId) {
    this.conversationContext.delete(sessionId);
  }
}

module.exports = new ChatbotService();
