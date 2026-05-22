const express = require('express');
const router  = express.Router();

const {
  getNotifications, markAsRead, markAllAsRead, deleteNotification, getVapidPublicKey, subscribeWebPush
} = require('../controllers/notification.controller');

const { protect } = require('../middleware/auth.middleware');

router.get('/vapid-public-key', protect, getVapidPublicKey);
router.post('/subscribe',       protect, subscribeWebPush);
router.get('/',              protect, getNotifications);
router.put('/read-all',      protect, markAllAsRead);
router.put('/:id/read',      protect, markAsRead);
router.delete('/:id',        protect, deleteNotification);

module.exports = router;
