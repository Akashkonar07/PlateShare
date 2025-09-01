const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbotController");

// Process user message and get chatbot response (no auth required)
router.post("/message", chatbotController.processMessage);

// Get conversation context for a session (no auth required)
router.get("/context/:sessionId", chatbotController.getConversationContext);

// Clear conversation context for a session (no auth required)
router.delete("/context/:sessionId", chatbotController.clearConversationContext);

// Get chatbot status and available categories (no auth required)
router.get("/status", chatbotController.getStatus);

// Get suggested questions (no auth required)
router.get("/suggestions", chatbotController.getSuggestions);

module.exports = router;
