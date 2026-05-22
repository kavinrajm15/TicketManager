const express = require('express');
const router  = express.Router();

const {
  addComment, getCommentsByTicket,
  updateComment, deleteComment, replyToComment,
} = require('../controllers/comment.controller');

const { protect } = require('../middleware/auth.middleware');

// Ticket-scoped comment routes
router.post('/tickets/:id/comments', protect, addComment);
router.get('/tickets/:id/comments',  protect, getCommentsByTicket);

// Comment-level routes
router.put('/comments/:id',          protect, updateComment);
router.delete('/comments/:id',       protect, deleteComment);
router.post('/comments/:id/reply',   protect, replyToComment);

module.exports = router;
