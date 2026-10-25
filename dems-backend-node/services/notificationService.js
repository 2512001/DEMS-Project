const Notification = require('../model/notificationModel');
const User = require('../model/userModel');
const Organization = require('../model/organizationModel');

async function createNotification({
  recipientId,
  organizationId,
  type,
  title,
  message,
  actionUrl = null,
  metadata = {}
}) {
  try {
    // Check if a similar notification already exists (prevent duplicates)
    const existing = await Notification.findOne({
      recipientId,
      organizationId,
      type,
      read: false,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
    });

    if (existing) {
      console.log('[NOTIFICATION] Duplicate notification prevented:', type);
      return existing;
    }

    const notification = await Notification.create({
      recipientId,
      organizationId,
      type,
      title,
      message,
      actionUrl,
      metadata
    });

    console.log('[NOTIFICATION] Created notification:', notification._id, 'for recipient:', recipientId);
    return notification;
  } catch (err) {
    console.error('[NOTIFICATION] Failed to create notification:', err);
    throw err;
  }
}

async function getNotificationsForUser(userId, organizationId) {
  try {
    const notifications = await Notification.find({
      recipientId: userId,
      organizationId
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      organizationId,
      read: false
    });

    return {
      notifications,
      unreadCount
    };
  } catch (err) {
    console.error('[NOTIFICATION] Failed to fetch notifications:', err);
    throw err;
  }
}

async function markNotificationAsRead(notificationId, userId) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    return notification;
  } catch (err) {
    console.error('[NOTIFICATION] Failed to mark as read:', err);
    throw err;
  }
}

async function markAllAsRead(userId, organizationId) {
  try {
    const result = await Notification.updateMany(
      { recipientId: userId, organizationId, read: false },
      { read: true, readAt: new Date() }
    );

    console.log('[NOTIFICATION] Marked', result.modifiedCount, 'notifications as read');
    return result;
  } catch (err) {
    console.error('[NOTIFICATION] Failed to mark all as read:', err);
    throw err;
  }
}

async function notifyOrganizationAdmins({
  organizationId,
  type,
  title,
  message,
  actionUrl = null,
  metadata = {},
  excludeUserId = null
}) {
  try {
    // Find all admins for the organization
    const admins = await User.find({
      organizationId,
      role: 'admin',
      accountStatus: 'active'
    }).select('_id');

    console.log('[NOTIFICATION] Found', admins.length, 'admins to notify');

    const notifications = await Promise.all(
      admins.map((admin) => {
        if (excludeUserId && admin._id.toString() === excludeUserId.toString()) {
          return null;
        }
        return createNotification({
          recipientId: admin._id,
          organizationId,
          type,
          title,
          message,
          actionUrl,
          metadata
        });
      })
    );

    return notifications.filter(n => n !== null);
  } catch (err) {
    console.error('[NOTIFICATION] Failed to notify organization admins:', err);
    throw err;
  }
}

module.exports = {
  createNotification,
  getNotificationsForUser,
  markNotificationAsRead,
  markAllAsRead,
  notifyOrganizationAdmins
};
