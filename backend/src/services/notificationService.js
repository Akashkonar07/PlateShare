const Notification = require('../models/Notification');

class NotificationService {
  
  // Send notification to user
  static async sendNotification(userId, notificationData) {
    try {
      const notification = new Notification({
        userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {},
        priority: notificationData.priority || 'medium',
        donationId: notificationData.donationId
      });
      
      await notification.save();
      
      // In a real app, you'd also send push notifications, emails, etc.
      console.log(`📧 Notification sent to ${userId}: ${notificationData.title}`);
      
      return { success: true, notification };
    } catch (error) {
      console.error('Notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user notifications
  static async getUserNotifications(userId, limit = 20) {
    try {
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('donationId', 'foodType quantity status');
        
      return { success: true, notifications };
    } catch (error) {
      console.error('Get notifications error:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );
      
      return { success: true, notification };
    } catch (error) {
      console.error('Mark read error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export the sendNotification function for backward compatibility
const sendNotification = NotificationService.sendNotification;

module.exports = { NotificationService, sendNotification };