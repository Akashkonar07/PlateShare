import React, { useState, useEffect, useRef } from 'react';
import './Chatbot.css';
import apiService from '../services/api';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  // Initialize chatbot
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    
    // Add welcome message
    setMessages([{
      id: 1,
      text: "Hello! I'm your PlateShare assistant. I can help you with food donations, finding NGOs, becoming a volunteer, and more. How can I assist you today?",
      sender: 'bot',
      timestamp: new Date(),
      suggestions: [
        "How do I donate food?",
        "How can I find NGOs near me?",
        "How do I become a volunteer?"
      ]
    }]);

    // Load initial suggestions
    loadSuggestions();
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSuggestions = async () => {
    try {
      const data = await apiService.getChatSuggestions();
      if (data.success) {
        setSuggestions(data.data.suggestions);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const sendMessage = async (messageText = null) => {
    const text = messageText || inputMessage.trim();
    if (!text || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const data = await apiService.sendChatMessage(text, sessionId);

      if (data.success) {
        const botMessage = {
          id: Date.now() + 1,
          text: data.data.response,
          sender: 'bot',
          timestamp: new Date(),
          category: data.data.category,
          confidence: data.data.confidence,
          suggestions: data.data.suggestions || []
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm sorry, I'm having trouble responding right now. Please try again or contact support if the issue persists.",
        sender: 'bot',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  const clearChat = () => {
    setMessages([{
      id: 1,
      text: "Chat cleared! How can I help you?",
      sender: 'bot',
      timestamp: new Date(),
      suggestions: [
        "How do I donate food?",
        "How can I find NGOs near me?",
        "How do I become a volunteer?"
      ]
    }]);
  };

  const formatMessage = (text) => {
    // Convert newlines to <br> and format bullet points
    return text
      .replace(/\n/g, '<br>')
      .replace(/•/g, '•')
      .replace(/(\d+\.)/g, '<strong>$1</strong>');
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button 
        className={`chat-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle chat"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <div className="header-info">
              <h3>PlateShare Assistant</h3>
              <span className="status-indicator">Online</span>
            </div>
            <div className="header-actions">
              <button onClick={clearChat} className="clear-btn" title="Clear chat">
                🗑️
              </button>
              <button onClick={() => setIsOpen(false)} className="close-btn" title="Close chat">
                ✕
              </button>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-content">
                  <div 
                    className={`message-bubble ${message.isError ? 'error' : ''}`}
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
                  />
                  <div className="message-time">
                    {formatTime(message.timestamp)}
                    {message.confidence && (
                      <span className="confidence">
                        {Math.round(message.confidence * 100)}% confident
                      </span>
                    )}
                  </div>
                </div>

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="suggestions">
                    <p className="suggestions-label">You might also ask:</p>
                    <div className="suggestion-buttons">
                      {message.suggestions.slice(0, 3).map((suggestion, index) => (
                        <button
                          key={index}
                          className="suggestion-btn"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="message bot">
                <div className="message-content">
                  <div className="message-bubble loading">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input">
            <form onSubmit={handleSubmit}>
              <div className="input-container">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me anything about PlateShare..."
                  disabled={isLoading}
                  maxLength={500}
                />
                <button 
                  type="submit" 
                  disabled={!inputMessage.trim() || isLoading}
                  className="send-btn"
                >
                  {isLoading ? '⏳' : '➤'}
                </button>
              </div>
            </form>
            
            {/* Quick suggestions */}
            {messages.length === 1 && suggestions.length > 0 && (
              <div className="quick-suggestions">
                <p>Popular questions:</p>
                <div className="suggestion-buttons">
                  {suggestions.slice(0, 4).map((suggestion, index) => (
                    <button
                      key={index}
                      className="suggestion-btn small"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
