const express = require('express');
const router  = express.Router();
const path    = require('path');

const {
  createTicket, getAllTickets, getMyTickets, getTicketById,
  updateTicket, deleteTicket, forwardTicket,
  addFileAttachment, addLinkAttachment, removeAttachment,
  downloadAttachment,
} = require('../controllers/ticket.controller');

const { protect }    = require('../middleware/auth.middleware');
const { isManager }  = require('../middleware/rbac.middleware');
const { validateTicket, validateUpdateTicket } = require('../validations/ticket.validation');
const upload = require('../middleware/upload.middleware');

// Core CRUD
router.post('/',protect,validateTicket,createTicket);
router.get('/',protect,getAllTickets);
router.get('/mine',protect,getMyTickets);
router.get('/:id',protect,getTicketById);
router.put('/:id',protect,validateUpdateTicket,updateTicket);
router.delete('/:id',protect,isManager,deleteTicket);
router.post('/:id/forward',protect,forwardTicket);

// Attachments
router.post('/:id/attachments',protect,upload.single('file'),addFileAttachment);
router.post('/:id/attachments/link',protect,addLinkAttachment);
router.get('/:id/attachments/:attachmentId/download',protect,downloadAttachment);
router.delete('/:id/attachments/:attachmentId',protect,removeAttachment);

module.exports = router;
