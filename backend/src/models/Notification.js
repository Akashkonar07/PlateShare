const mongoose = require('mongoose');

// Check if the model already exists to prevent recompilation
let Notification;

try {
  // Try to get the model if it exists
  Notification = mongoose.model('Notification');
} catch (e) {
  // If it doesn't exist, define it
  const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
      type: String, 
      enum: ['DONATION_ASSIGNED', 'DONATION_AUTO_ACCEPTED', 'ASSIGNMENT_TIMEOUT', 'DONATION_FALLBACK_AVAILABLE', 'PICKUP_REMINDER', 'DELIVERY_REMINDER'],
      required: true 
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation' },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
  });

  Notification = mongoose.model('Notification', notificationSchema);
}

module.exports = Notification;