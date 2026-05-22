const express = require('express');
const router  = express.Router();

const {
  createProject, getAllProjects, getProjectById,
  updateProject, deleteProject, addMember, removeMember,
} = require('../controllers/project.controller');

const { getTicketsByProject } = require('../controllers/ticket.controller');

const { protect } = require('../middleware/auth.middleware');
const { isManager } = require('../middleware/rbac.middleware');

const { validateProject, validateUpdateProject, validateAddMember } =
  require('../validations/project.validation');

router.post('/',protect, isManager,validateProject,createProject);
router.get('/',protect,getAllProjects);
router.get('/:id',protect,getProjectById);
router.put('/:id',protect,isManager,validateUpdateProject,updateProject);
router.delete('/:id',protect,isManager,deleteProject);

// Member management
router.post('/:id/members',protect,isManager,validateAddMember,addMember);
router.delete('/:id/members/:userId',protect,isManager,removeMember);

// Get tickets for a project
router.get('/:id/tickets',protect,getTicketsByProject);

module.exports = router;
