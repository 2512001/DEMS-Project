const express = require('express');
const {
  getNotificationsForUser,
  markNotificationAsRead,
  markAllAsRead
} = require('../services/notificationService');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const { notifications, unreadCount } = await getNotificationsForUser(req.user.id, req.user.organizationId);
    res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:notificationId/read', protect, async (req, res, next) => {
  try {
    const notification = await markNotificationAsRead(req.params.notificationId, req.user.id);
    res.json({
      success: true,
      data: notification
    });
  } catch (err) {
    if (err.message === 'Notification not found or access denied') {
      return res.status(404).json({ success: false, message: err.message });
    }
    next(err);
  }
});

router.put('/read-all', protect, async (req, res, next) => {
  try {
    await markAllAsRead(req.user.id, req.user.organizationId);
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
