const Notification = require('../models/Notification');
const ApiError     = require('../utils/ApiError');

// ── GET /api/notifications ───────────────
const getNotifications = async (req, res, next) => {
  try {
    const filter = { recipient: req.user._id };
    if (req.query.unread === 'true') filter.read = false;

    const notifications = await Notification.find(filter)
      .populate('sender', 'userId name email avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.status(200).json({ success: true, unreadCount, count: notifications.length, notifications });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/notifications/:id/read ──────────────────────────────────────
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      notificationId: Number(req.params.id),
      recipient: req.user._id,
    });
    if (!notification) return next(new ApiError(404, `Notification #${req.params.id} not found`));

    notification.read = true;
    await notification.save();

    res.status(200).json({ success: true, notification });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/notifications/read-all ───────────────────────────────────────
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/notifications/:id ─────────────────────────────────────────
const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      notificationId: Number(req.params.id),
      recipient: req.user._id,
    });
    if (!notification) return next(new ApiError(404, `Notification #${req.params.id} not found`));

    res.status(200).json({ success: true, message: `Notification #${req.params.id} deleted` });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/notifications/vapid-public-key ─────────────────────────────
const getVapidPublicKey = (req, res) => {
  res.status(200).json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY,
  });
};

// ── POST /api/notifications/subscribe ─────────────────────────────────────
const subscribeWebPush = async (req, res, next) => {
  try {
    const subscription = req.body;
    const user = req.user;

    // Check if subscription already exists for this user
    const exists = user.webPushSubscriptions.some(
      (sub) => sub.endpoint === subscription.endpoint
    );

    if (!exists) {
      user.webPushSubscriptions.push(subscription);
      await user.save();
    }

    res.status(201).json({ success: true, message: 'Subscription added.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification, getVapidPublicKey, subscribeWebPush };
