const express = require('express');
const router  = express.Router();

const {
  getPersonalMessages, sendPersonalMessage,
  getTeamMessages, sendTeamMessage,
  getConversations,
} = require('../controllers/chat.controller');

const { protect } = require('../middleware/auth.middleware');

router.get('/conversations',          protect, getConversations);
router.get('/personal/:userId',       protect, getPersonalMessages);
router.post('/personal/:userId',      protect, sendPersonalMessage);
router.get('/team/:teamId',           protect, getTeamMessages);
router.post('/team/:teamId',          protect, sendTeamMessage);

module.exports = router;
