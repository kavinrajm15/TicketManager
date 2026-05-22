const express = require("express");
const router = express.Router();

const {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
} = require("../controllers/team.controller");

const { protect } = require("../middleware/auth.middleware");
const { isSuperAdmin, isManager } = require("../middleware/rbac.middleware");

router.get("/", protect, getTeams);
router.get("/:id", protect, getTeamById);
router.post("/", protect, isManager, createTeam);
router.put("/:id", protect, isManager, updateTeam);
router.delete("/:id", protect, isManager, deleteTeam);

module.exports = router;
