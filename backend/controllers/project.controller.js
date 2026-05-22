const Project  = require('../models/Project');
const User     = require('../models/User');
const Team     = require('../models/Team');
const Notification = require('../models/Notification');
const { emitNotification } = require('../socket/socket');
const ApiError = require('../utils/ApiError');

// ── Shared populate config ────────────────────────────────────────────────
const POPULATE = [
  { path: 'owner',        select: 'userId name email avatar role' },
  { path: 'teams',        select: 'teamName teamLead members' },
  { path: 'members.user', select: 'userId name email avatar role' },
];

// ── POST /api/projects ────────────────────────────────────────────────────
const createProject = async (req, res, next) => {
  try {
    const { name, description, key, teamIds } = req.body;

    // Resolve provided teamIds to ObjectIds and validate they exist
    const resolvedTeamIds = [];
    if (teamIds && Array.isArray(teamIds) && teamIds.length) {
      const teams = await Team.find({ _id: { $in: teamIds } });
      resolvedTeamIds.push(...teams.map(t => t._id));
    }

    const project = await Project.create({
      name,
      description,
      key,
      owner:   req.user._id,
      teams:   resolvedTeamIds,
      members: [{ user: req.user._id, role: 'manager' }],
    });

    // Back-link project to each assigned team
    if (resolvedTeamIds.length) {
      await Team.updateMany(
        { _id: { $in: resolvedTeamIds } },
        { $addToSet: { projects: project._id } }
      );

      // Notify members of assigned teams
      const assignedTeams = await Team.find({ _id: { $in: resolvedTeamIds } }).populate('members teamLead');
      for (const team of assignedTeams) {
        const recipients = new Set();
        if (team.teamLead) recipients.add(team.teamLead._id.toString());
        team.members.forEach(m => recipients.add(m._id.toString()));

        for (const recipientId of recipients) {
          if (recipientId !== req.user._id.toString()) {
            const notif = await Notification.create({
              recipient: recipientId,
              type: 'project_assign',
              message: `Your team "${team.teamName}" has been assigned to a new project: "${project.name}"`,
              link: `/projects/${project.projectId}`,
              sender: req.user._id,
            });
            emitNotification(recipientId, notif);
          }
        }
      }
    }

    await project.populate(POPULATE);
    res.status(201).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/projects ─────────────────────────────────────────────────────
const getAllProjects = async (req, res, next) => {
  try {
    let query = {};

    // Role-based visibility
    if (req.user.role !== 'superadmin' && req.user.role !== 'manager') {
      const userTeams = await Team.find({
        $or: [{ teamLead: req.user._id }, { members: req.user._id }],
      }).select('projects');

      const teamProjectIds = userTeams.flatMap(t => t.projects);

      query = {
        $or: [
          { 'members.user': req.user._id },
          { _id: { $in: teamProjectIds } },
        ],
      };
    }

    const projects = await Project.find(query)
      .populate(POPULATE)
      .sort({ projectId: 1 });

    // Sync: if a team has this project in its projects[] but the project's
    // teams[] doesn't include that team, add it (migration from old single-team data)
    for (const p of projects) {
      const linkedTeams = await Team.find({ projects: p._id }).select('_id');
      const linkedIds = linkedTeams.map(t => t._id.toString());
      const currentIds = p.teams.map(t => (t._id || t).toString());
      const missing = linkedIds.filter(id => !currentIds.includes(id));
      if (missing.length) {
        await Project.updateOne(
          { _id: p._id },
          { $addToSet: { teams: { $each: missing } } }
        );
        p.teams.push(...missing);
      }
    }

    // Re-populate after potential sync
    const finalProjects = await Project.find(query)
      .populate(POPULATE)
      .sort({ projectId: 1 });

    res.status(200).json({ success: true, count: finalProjects.length, projects: finalProjects });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/projects/:id ─────────────────────────────────────────────────
const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findOne({ projectId: Number(req.params.id) })
      .populate(POPULATE);

    if (!project)
      return next(new ApiError(404, `Project #${req.params.id} not found`));

    // Sync legacy single-team field
    const linkedTeams = await Team.find({ projects: project._id }).select('_id');
    const linkedIds   = linkedTeams.map(t => t._id.toString());
    const currentIds  = project.teams.map(t => (t._id || t).toString());
    const missing     = linkedIds.filter(id => !currentIds.includes(id));
    if (missing.length) {
      await Project.updateOne(
        { _id: project._id },
        { $addToSet: { teams: { $each: missing } } }
      );
    }

    // Access check for non-admins
    if (req.user.role !== 'superadmin' && req.user.role !== 'manager') {
      const isMember = project.members.some(
        m => m.user._id.toString() === req.user._id.toString()
      );
      const userTeams = await Team.find({
        $or: [{ teamLead: req.user._id }, { members: req.user._id }],
      }).select('projects');
      const teamProjectIds = userTeams.flatMap(t => t.projects.map(p => p.toString()));
      const hasTeamAccess  = teamProjectIds.includes(project._id.toString());

      if (!isMember && !hasTeamAccess)
        return next(new ApiError(403, 'You do not have access to this project'));
    }

    res.status(200).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/projects/:id ─────────────────────────────────────────────────
const updateProject = async (req, res, next) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.role !== 'manager')
      return next(new ApiError(403, 'Only managers and admins can update projects'));

    const { name, description, key, teamIds, memberUserIds } = req.body;

    const project = await Project.findOne({ projectId: Number(req.params.id) });
    if (!project)
      return next(new ApiError(404, `Project #${req.params.id} not found`));

    // ── Basic fields ──────────────────────────────────────────────────────
    if (name        !== undefined) project.name        = name;
    if (description !== undefined) project.description = description;
    if (key         !== undefined) project.key         = key;

    // ── Teams update ──────────────────────────────────────────────────────
    if (teamIds !== undefined && Array.isArray(teamIds)) {
      const oldTeamIds = project.teams.map(id => id.toString());
      const newTeamIds = teamIds; // already ObjectId strings from the client

      // Validate all provided teamIds exist
      const validTeams = await Team.find({ _id: { $in: newTeamIds } });
      const validIds   = validTeams.map(t => t._id);

      // Teams removed → remove project from their projects[]
      const removedIds = oldTeamIds.filter(id => !newTeamIds.includes(id));
      if (removedIds.length) {
        await Team.updateMany(
          { _id: { $in: removedIds } },
          { $pull: { projects: project._id } }
        );
      }

      // Teams added → back-link project
      const addedIds = newTeamIds.filter(id => !oldTeamIds.includes(id));
      if (addedIds.length) {
        await Team.updateMany(
          { _id: { $in: addedIds } },
          { $addToSet: { projects: project._id } }
        );
      }

      project.teams = validIds;

      // Notify members of added teams
      if (addedIds && addedIds.length) {
        const addedTeams = await Team.find({ _id: { $in: addedIds } }).populate('members teamLead');
        for (const team of addedTeams) {
          const recipients = new Set();
          if (team.teamLead) recipients.add(team.teamLead._id.toString());
          team.members.forEach(m => recipients.add(m._id.toString()));

          for (const recipientId of recipients) {
            if (recipientId !== req.user._id.toString()) {
              const notif = await Notification.create({
                recipient: recipientId,
                type: 'project_assign',
                message: `Your team "${team.teamName}" has been assigned to project: "${project.name}"`,
                link: `/projects/${project.projectId}`,
                sender: req.user._id,
              });
              emitNotification(recipientId, notif);
            }
          }
        }
      }
    }

    // ── Members update ────────────────────────────────────────────────────
    if (memberUserIds !== undefined && Array.isArray(memberUserIds)) {
      const existingMemberIds = project.members.map(m => m.user.toString());
      
      // Always preserve the owner as manager
      const ownerEntry = { user: project.owner, role: 'manager' };

      // Resolve new member userIds to ObjectIds
      const newUsers = memberUserIds.length
        ? await User.find({ userId: { $in: memberUserIds } })
        : [];

      const newMembers = newUsers
        .filter(u => u._id.toString() !== project.owner.toString())
        .map(u => ({ user: u._id, role: 'member' }));

      const newlyAddedMemberUsers = newUsers.filter(u => 
        !existingMemberIds.includes(u._id.toString()) && 
        u._id.toString() !== project.owner.toString()
      );

      project.members = [ownerEntry, ...newMembers];

      // Notify new members
      for (const u of newlyAddedMemberUsers) {
        const notif = await Notification.create({
          recipient: u._id,
          type: 'project_assign',
          message: `You have been added to project: "${project.name}"`,
          link: `/projects/${project.projectId}`,
          sender: req.user._id,
        });
        emitNotification(u._id, notif);
      }
    }

    await project.save();
    await project.populate(POPULATE);

    res.status(200).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/projects/:id ──────────────────────────────────────────────
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ projectId: Number(req.params.id) });
    if (!project)
      return next(new ApiError(404, `Project #${req.params.id} not found`));

    if (req.user.role !== 'superadmin' && req.user.role !== 'manager')
      return next(new ApiError(403, 'Only managers and admins can delete projects'));

    // Remove project reference from all teams
    if (project.teams && project.teams.length) {
      await Team.updateMany(
        { _id: { $in: project.teams } },
        { $pull: { projects: project._id } }
      );
    }

    await project.deleteOne();
    res.status(200).json({ success: true, message: `Project #${req.params.id} deleted` });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/projects/:id/members ────────────────────────────────────────
const addMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;

    const project = await Project.findOne({ projectId: Number(req.params.id) });
    if (!project)
      return next(new ApiError(404, `Project #${req.params.id} not found`));

    const user = await User.findOne({ userId });
    if (!user)
      return next(new ApiError(404, `User #${userId} not found`));

    const alreadyMember = project.members.some(
      m => m.user.toString() === user._id.toString()
    );
    if (alreadyMember)
      return next(new ApiError(400, 'User is already a member of this project'));

    project.members.push({ user: user._id, role: role || 'member' });
    await project.save();
    await project.populate(POPULATE);

    // Notification
    const notif = await Notification.create({
      recipient: user._id,
      type: 'project_assign',
      message: `You have been added as a ${role || 'member'} to project: "${project.name}"`,
      link: `/projects/${project.projectId}`,
      sender: req.user._id,
    });
    emitNotification(user._id, notif);

    res.status(200).json({ success: true, project });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/projects/:id/members/:userId ──────────────────────────────
const removeMember = async (req, res, next) => {
  try {
    const project = await Project.findOne({ projectId: Number(req.params.id) });
    if (!project)
      return next(new ApiError(404, `Project #${req.params.id} not found`));

    const user = await User.findOne({ userId: Number(req.params.userId) });
    if (!user)
      return next(new ApiError(404, `User #${req.params.userId} not found`));

    project.members = project.members.filter(
      m => m.user.toString() !== user._id.toString()
    );
    await project.save();

    res.status(200).json({ success: true, message: 'Member removed', project });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createProject, getAllProjects, getProjectById,
  updateProject, deleteProject, addMember, removeMember,
};
