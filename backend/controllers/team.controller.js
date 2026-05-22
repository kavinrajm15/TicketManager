const Team = require("../models/Team");
const User = require("../models/User");
const Project = require("../models/Project");
const ApiError = require("../utils/ApiError");

const POPULATE = [
  { path: "teamLead", select: "userId name email avatar role" },
  { path: "members", select: "userId name email avatar role" },
  { path: "projects", select: "projectId name key" },
];

// ── GET /api/teams ─────────────
const getTeams = async (req, res, next) => {
  try {
    let filter = {};

    // Role-based filtering: members and teamleads only see their own teams
    if (req.user.role === "teamlead") {
      filter = { teamLead: req.user._id };
    } else if (req.user.role === "member") {
      filter = { members: req.user._id };
    }
    // superadmin and manager see all teams (no filter)

    const teams = await Team.find(filter)
      .populate(POPULATE)
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: teams.length, teams });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/teams/:id ─────────────
const getTeamById = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id).populate(POPULATE);
    if (!team) return next(new ApiError(404, `Team not found`));
    res.status(200).json({ success: true, team });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/teams  (SuperAdmin) ─────────────
const createTeam = async (req, res, next) => {
  try {
    const { teamName, teamLead, members, projects } = req.body;

    if (!teamName || !teamLead) {
      return next(new ApiError(400, "Team name and Team Lead are required"));
    }

    const leadUser = await User.findOne({ userId: teamLead });
    if (!leadUser)
      return next(new ApiError(404, `Team lead #${teamLead} not found`));

    const memberObjectIds = [];
    if (members && Array.isArray(members)) {
      const memberUsers = await User.find({ userId: { $in: members } });
      memberObjectIds.push(...memberUsers.map((u) => u._id));
    }

    const projectObjectIds = [];
    if (projects && Array.isArray(projects)) {
      const projs = await Project.find({ projectId: { $in: projects } });
      projectObjectIds.push(...projs.map((p) => p._id));
    }

    const team = await Team.create({
      teamName,
      teamLead: leadUser._id,
      members: memberObjectIds,
      projects: projectObjectIds,
    });

    await team.populate(POPULATE);

    res.status(201).json({ success: true, team });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/teams/:id  (SuperAdmin) ─────────────
const updateTeam = async (req, res, next) => {
  try {
    const { teamName, teamLead, members, projects } = req.body;
    const team = await Team.findById(req.params.id);

    if (!team) return next(new ApiError(404, `Team not found`));

    if (teamName !== undefined) team.teamName = teamName;

    if (teamLead !== undefined) {
      const leadUser = await User.findOne({ userId: teamLead });
      if (!leadUser)
        return next(new ApiError(404, `Team lead #${teamLead} not found`));
      team.teamLead = leadUser._id;
    }

    if (members !== undefined && Array.isArray(members)) {
      const memberUsers = await User.find({ userId: { $in: members } });
      team.members = memberUsers.map((u) => u._id);
    }

    if (projects !== undefined && Array.isArray(projects)) {
      const projs = await Project.find({ projectId: { $in: projects } });
      team.projects = projs.map((p) => p._id);
    }

    await team.save();
    await team.populate(POPULATE);

    res.status(200).json({ success: true, team });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/teams/:id  (SuperAdmin) ───────────────────────────────────
const deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return next(new ApiError(404, `Team not found`));
    res.status(200).json({ success: true, message: `Team deleted` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
};
