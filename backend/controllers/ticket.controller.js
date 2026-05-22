const Ticket       = require("../models/Ticket");
const Project      = require("../models/Project");
const User         = require("../models/User");
const Team         = require("../models/Team");
const Notification = require("../models/Notification");
const { emitNotification } = require("../socket/socket");
const ApiError     = require("../utils/ApiError");
const path         = require("path");
const fs           = require("fs");

const POPULATE = [
  { path: "project",  select: "projectId name key members" },
  { path: "assignees", select: "userId name email avatar role" },
  { path: "reporter",  select: "userId name email avatar role" },
  { path: "attachments.uploadedBy", select: "userId name avatar" },
  { path: "forwardHistory.fromUser", select: "userId name email avatar role" },
  { path: "forwardHistory.toUsers", select: "userId name email avatar role" },
  { path: "forwardHistory.toTeams", select: "teamName" },
  { path: "forwardHistory.previouslyAssignedTo", select: "userId name email avatar role" },
  { path: "teams", select: "teamName members teamLead" },
];

// ── Helpers ───────────────────────────────────────────────────────────────

async function hasProjectAccess(userId, project) {
  const isMember = project.members.some(
    (m) => m.user.toString() === userId.toString(),
  );
  if (isMember) return true;

  const userTeams = await Team.find({
    $or: [{ teamLead: userId }, { members: userId }],
  }).select("projects");
  const teamProjectIds = userTeams.flatMap((t) =>
    t.projects.map((p) => p.toString()),
  );
  return teamProjectIds.includes(project._id.toString());
}


function hasGlobalTicketAccess(user, ticket) {
  if (user.role === "superadmin" || user.role === "manager") return true;
  return ticket.assignees.some(
    (a) => a.toString() === user._id.toString(),
  );
}

// ── POST /api/tickets ─────────────────────────────────────────────────────
const createTicket = async (req, res, next) => {
  try {
    const {
      title, description, status, priority,
      projectId, assigneeIds, teamIds, tags, startDate, endDate,
    } = req.body;

    let projectDoc = null;

    if (projectId) {
      // ── Project-scoped ticket ───────────────────────────────────────
      projectDoc = await Project.findOne({ projectId });
      if (!projectDoc)
        return next(new ApiError(404, `Project #${projectId} not found`));

      // Role-based access check
      if (req.user.role !== "superadmin" && req.user.role !== "manager") {
        const ok = await hasProjectAccess(req.user._id, projectDoc);
        if (!ok)
          return next(
            new ApiError(403, "You do not have access to create tickets in this project"),
          );
      }
    }
    // No projectId → global ticket, any authenticated user may create

    // Resolve assignee ObjectIds
    const assigneeObjectIds = [];
    const assigneeUsers     = [];
    const assigneeUserIdsStr = [];

    if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length) {
      const users = await User.find({ userId: { $in: assigneeIds } });
      for (const u of users) {
        if (!assigneeUserIdsStr.includes(u._id.toString())) {
          assigneeObjectIds.push(u._id);
          assigneeUsers.push(u);
          assigneeUserIdsStr.push(u._id.toString());
        }
      }
    }

    const ticket = await Ticket.create({
      title,
      description,
      status,
      priority,
      tags,
      startDate: startDate || null,
      endDate:   endDate || null,
      project:  projectDoc ? projectDoc._id : null,
      assignees: assigneeObjectIds,
      teams: teamIds || [],
      reporter:  req.user._id,
    });

    await ticket.populate(POPULATE);

    // Collect all unique users to notify (both individual assignees and team members)
    const notifyUsersMap = new Map();
    for (const u of assigneeUsers) {
      notifyUsersMap.set(u._id.toString(), u);
    }

    if (teamIds && Array.isArray(teamIds) && teamIds.length) {
      const teams = await Team.find({ _id: { $in: teamIds } }).populate('members teamLead');
      for (const t of teams) {
        if (t.teamLead) {
          notifyUsersMap.set(t.teamLead._id.toString(), t.teamLead);
        }
        for (const m of t.members) {
          notifyUsersMap.set(m._id.toString(), m);
        }
      }
    }

    // Send assignment notifications
    for (const [uidStr, u] of notifyUsersMap.entries()) {
      if (uidStr !== req.user._id.toString()) {
        const notif = await Notification.create({
          recipient: u._id,
          type:      "ticket_assigned",
          message:   `You were assigned to ticket #${ticket.ticketNumber}: "${ticket.title}"`,
          link:      `/tickets/${ticket.ticketNumber}`,
          sender:    req.user._id,
        });
        emitNotification(u._id, notif);
      }
    }

    res.status(201).json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tickets ──────────────────────────────────────────────────────
const getAllTickets = async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role !== "superadmin" && req.user.role !== "manager") {
      // Projects the user belongs to directly
      const userProjects = await Project.find({
        "members.user": req.user._id,
      }).select("_id");
      const projectIds = userProjects.map((p) => p._id);

      // Projects and Teams via membership
      const userTeams = await Team.find({
        $or: [{ teamLead: req.user._id }, { members: req.user._id }],
      }).select("projects _id");
      const teamProjectIds = userTeams.flatMap((t) => t.projects);
      const userTeamIds = userTeams.map((t) => t._id);

      const allAccessibleProjectIds = [
        ...new Set([...projectIds, ...teamProjectIds]),
      ];

      // Tickets in accessible projects, or assigned/reported/team-assigned to the user
      filter = {
        $or: [
          { project: { $in: allAccessibleProjectIds } },
          { assignees: req.user._id },
          { reporter: req.user._id },
          { teams: { $in: userTeamIds } },
        ],
      };
    }

    // ── Pagination & Sorting ──────────────────────────────────────
    const page   = Number(req.query.page)  || 1;
    const limit  = Number(req.query.limit) || 1000;
    const skip   = (page - 1) * limit;
    const sortBy = req.query.sortBy        || 'createdAt';
    const order  = req.query.order === 'asc' ? 1 : -1;

    const total = await Ticket.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    let tickets;
    if (sortBy === 'priority') {
      // Custom sort: High(1) > Medium(2) > Low(3)
      tickets = await Ticket.aggregate([
        { $match: filter },
        {
          $addFields: {
            priorityScore: {
              $switch: {
                branches: [
                  { case: { $eq: ["$priority", "high"] },   then: 1 },
                  { case: { $eq: ["$priority", "medium"] }, then: 2 },
                  { case: { $eq: ["$priority", "low"] },    then: 3 },
                ],
                default: 4
              }
            }
          }
        },
        { $sort: { priorityScore: 1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);
      // Note: aggregation doesn't auto-populate, we need to populate manually or use another stage
      tickets = await Ticket.populate(tickets, POPULATE);
    } else {
      tickets = await Ticket.find(filter)
        .populate(POPULATE)
        .sort({ [sortBy]: order })
        .skip(skip)
        .limit(limit);
    }

    res.status(200).json({ 
      success: true, 
      count: tickets.length, 
      total, 
      pages, 
      currentPage: page, 
      tickets 
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tickets/mine ─────────────────────────────────────────────────
// Returns only tickets where the current user is an assignee
const getMyTickets = async (req, res, next) => {
  try {
    const userTeams = await Team.find({
      $or: [{ teamLead: req.user._id }, { members: req.user._id }],
    }).select("_id");
    const userTeamIds = userTeams.map((t) => t._id);

    const filter = {
      $or: [
        { assignees: req.user._id },
        { teams: { $in: userTeamIds } },
      ],
    };

    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const page   = Number(req.query.page)  || 1;
    const limit  = Number(req.query.limit) || 1000;
    const skip   = (page - 1) * limit;
    const sortBy = req.query.sortBy        || 'createdAt';
    const order  = req.query.order === 'asc' ? 1 : -1;

    const total = await Ticket.countDocuments(filter);
    const pages = Math.ceil(total / limit) || 1;

    let tickets;
    if (sortBy === 'priority') {
      tickets = await Ticket.aggregate([
        { $match: filter },
        {
          $addFields: {
            priorityScore: {
              $switch: {
                branches: [
                  { case: { $eq: ["$priority", "high"] },   then: 1 },
                  { case: { $eq: ["$priority", "medium"] }, then: 2 },
                  { case: { $eq: ["$priority", "low"] },    then: 3 },
                ],
                default: 4
              }
            }
          }
        },
        { $sort: { priorityScore: 1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);
      tickets = await Ticket.populate(tickets, POPULATE);
    } else {
      tickets = await Ticket.find(filter)
        .populate(POPULATE)
        .sort({ [sortBy]: order })
        .skip(skip)
        .limit(limit);
    }

    res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      pages,
      currentPage: page,
      tickets,
    });
  } catch (err) {
    next(err);
  }
};


// ── GET /api/tickets/:ticketNumber ────────────────────────────────────────
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({
      ticketNumber: req.params.id,
    }).populate(POPULATE);

    if (!ticket)
      return next(new ApiError(404, `Ticket #${req.params.id} not found`));

    // Role-based access check
    if (req.user.role !== "superadmin" && req.user.role !== "manager") {
      const isAssignee = ticket.assignees.some(
        (a) => (a._id ? a._id.toString() : a.toString()) === req.user._id.toString()
      );
      const isReporter = ticket.reporter && (ticket.reporter._id ? ticket.reporter._id.toString() : ticket.reporter.toString()) === req.user._id.toString();

      const userTeams = await Team.find({
        $or: [{ teamLead: req.user._id }, { members: req.user._id }]
      }).select("_id");
      const userTeamIds = userTeams.map(t => t._id.toString());
      const isTeamMember = ticket.teams && ticket.teams.some(
        (t) => userTeamIds.includes(t._id ? t._id.toString() : t.toString())
      );

      if (!isAssignee && !isReporter && !isTeamMember) {
        if (!ticket.project) {
          return next(new ApiError(403, "You do not have access to this ticket"));
        } else {
          const project = await Project.findById(ticket.project._id);
          const ok = await hasProjectAccess(req.user._id, project);
          if (!ok)
            return next(new ApiError(403, "You do not have access to this ticket"));
        }
      }
    }

    res.status(200).json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/projects/:id/tickets ─────────────────────────────────────────
const getTicketsByProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ projectId: Number(req.params.id) });
    if (!project)
      return next(new ApiError(404, `Project #${req.params.id} not found`));

    // Role-based visibility
    if (req.user.role !== "superadmin" && req.user.role !== "manager") {
      const ok = await hasProjectAccess(req.user._id, project);
      if (!ok)
        return next(new ApiError(403, "You do not have access to this project"));
    }

    const filter = { project: project._id };
    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    // ── Pagination & Sorting ──────────────────────────────────────
    const page   = Number(req.query.page)  || 1;
    const limit  = Number(req.query.limit) || 10;
    const skip   = (page - 1) * limit;
    const sortBy = req.query.sortBy        || 'createdAt';
    const order  = req.query.order === 'asc' ? 1 : -1;

    const total = await Ticket.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    let tickets;
    if (sortBy === 'priority') {
      tickets = await Ticket.aggregate([
        { $match: filter },
        {
          $addFields: {
            priorityScore: {
              $switch: {
                branches: [
                  { 
                    case: { 
                      $and: [
                        { $ne: ["$status", "done"] },
                        { $lt: ["$endDate", new Date()] },
                        { $ne: ["$endDate", null] }
                      ] 
                    }, 
                    then: 0 
                  },
                  { 
                    case: { 
                      $and: [
                        { $ne: ["$status", "done"] },
                        { $lte: ["$endDate", new Date(Date.now() + 24 * 60 * 60 * 1000)] },
                        { $gt: ["$endDate", new Date()] }
                      ] 
                    }, 
                    then: 1 
                  },
                  { case: { $eq: ["$priority", "high"] },   then: 2 },
                  { case: { $eq: ["$priority", "medium"] }, then: 3 },
                  { case: { $eq: ["$priority", "low"] },    then: 4 },
                ],
                default: 5
              }
            }
          }
        },
        { $sort: { priorityScore: 1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);
      tickets = await Ticket.populate(tickets, POPULATE);
    } else {
      tickets = await Ticket.find(filter)
        .populate(POPULATE)
        .sort({ [sortBy]: order })
        .skip(skip)
        .limit(limit);
    }

    res.status(200).json({ 
      success: true, 
      count: tickets.length, 
      total, 
      pages, 
      currentPage: page, 
      tickets 
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/tickets/:ticketNumber ────────────────────────────────────────
const updateTicket = async (req, res, next) => {
  try {
    const {
      title, description, status, priority,
      assigneeIds, teamIds, tags, startDate, endDate,
    } = req.body;

    const ticket = await Ticket.findOne({
      ticketNumber: req.params.id,
    }).populate("project assignees teams");

    if (!ticket)
      return next(new ApiError(404, `Ticket #${req.params.id} not found`));

    // Role-based access check
    if (req.user.role !== "superadmin" && req.user.role !== "manager") {
      const isAssignee = ticket.assignees.some(
        (a) => (a._id ? a._id.toString() : a.toString()) === req.user._id.toString()
      );
      const isReporter = ticket.reporter && (ticket.reporter._id ? ticket.reporter._id.toString() : ticket.reporter.toString()) === req.user._id.toString();

      const userTeams = await Team.find({
        $or: [{ teamLead: req.user._id }, { members: req.user._id }]
      }).select("_id");
      const userTeamIds = userTeams.map(t => t._id.toString());
      const isTeamMember = ticket.teams && ticket.teams.some(
        (t) => userTeamIds.includes(t._id ? t._id.toString() : t.toString())
      );

      if (!isAssignee && !isReporter && !isTeamMember) {
        if (!ticket.project) {
          return next(new ApiError(403, "You do not have access to update this ticket"));
        } else {
          const project = await Project.findById(ticket.project._id);
          const ok = await hasProjectAccess(req.user._id, project);
          if (!ok)
            return next(new ApiError(403, "You do not have access to update this ticket"));
        }
      }
    }

    if (assigneeIds !== undefined || teamIds !== undefined) {
      // 1. Gather old assigned users (direct + teams) for notification comparison
      const oldDirectAssignees = ticket.assignees
        ? ticket.assignees.map((a) => a._id.toString())
        : [];
      const oldTeamIds = ticket.teams
        ? ticket.teams.map((t) => t._id.toString())
        : [];
      
      const oldTeams = await Team.find({ _id: { $in: oldTeamIds } }).populate('members teamLead');
      const oldUserIds = new Set(oldDirectAssignees);
      for (const t of oldTeams) {
        if (t.teamLead) oldUserIds.add(t.teamLead._id.toString());
        for (const m of t.members) {
          oldUserIds.add(m._id.toString());
        }
      }

      // 2. Perform updating of assignees and teams fields
      if (assigneeIds !== undefined) {
        const newAssigneeObjectIds = [];
        if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length) {
          const users = await User.find({ userId: { $in: assigneeIds } });
          for (const u of users) {
            newAssigneeObjectIds.push(u._id);
          }
        }
        ticket.assignees = newAssigneeObjectIds;
      }

      if (teamIds !== undefined) {
        ticket.teams = teamIds;
      }

      // 3. Resolve all new assigned users (direct + teams)
      const currentTeamIds = ticket.teams.map((t) => t._id ? t._id.toString() : t.toString());
      const currentTeams = await Team.find({ _id: { $in: currentTeamIds } }).populate('members teamLead');
      const currentDirectAssignees = await User.find({ _id: { $in: ticket.assignees } });

      const newAssigneesMap = new Map();
      for (const u of currentDirectAssignees) {
        newAssigneesMap.set(u._id.toString(), u);
      }
      for (const t of currentTeams) {
        if (t.teamLead) newAssigneesMap.set(t.teamLead._id.toString(), t.teamLead);
        for (const m of t.members) {
          newAssigneesMap.set(m._id.toString(), m);
        }
      }

      // 4. Notify users newly added to this ticket (who weren't assigned before)
      for (const [uidStr, u] of newAssigneesMap.entries()) {
        if (!oldUserIds.has(uidStr) && uidStr !== req.user._id.toString()) {
          const notif = await Notification.create({
            recipient: u._id,
            type:      "ticket_assigned",
            message:   `You were assigned to ticket #${ticket.ticketNumber}: "${ticket.title}"`,
            link:      `/tickets/${ticket.ticketNumber}`,
            sender:    req.user._id,
          });
          emitNotification(u._id, notif);
        }
      }
    }

    const oldStatus = ticket.status;

    if (title       !== undefined) ticket.title       = title;
    if (description !== undefined) ticket.description = description;
    if (status      !== undefined) ticket.status      = status;
    if (priority    !== undefined) ticket.priority    = priority;
    if (tags        !== undefined) ticket.tags        = tags;
    if (startDate   !== undefined) ticket.startDate   = startDate || null;
    if (endDate     !== undefined) ticket.endDate     = endDate || null;

    if (status !== undefined && status !== oldStatus) {
      const recipients = new Set();
      if (ticket.reporter) recipients.add(ticket.reporter.toString());
      if (ticket.assignees) ticket.assignees.forEach(a => recipients.add(a._id ? a._id.toString() : a.toString()));

      for (const recipientId of recipients) {
        if (recipientId !== req.user._id.toString()) {
          const notif = await Notification.create({
            recipient: recipientId,
            type: 'ticket_update',
            message: `Ticket #${ticket.ticketNumber} status changed from ${oldStatus} to ${ticket.status}`,
            link: `/tickets/${ticket.ticketNumber}`,
            sender: req.user._id,
          });
          emitNotification(recipientId, notif);
        }
      }
    }

    await ticket.save();
    await ticket.populate(POPULATE);

    res.status(200).json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/tickets/:ticketNumber/attachments (file upload) ─────────────
const addFileAttachment = async (req, res, next) => {
  try {
    if (!req.file) return next(new ApiError(400, "No file uploaded"));

    const ticket = await Ticket.findOne({ ticketNumber: req.params.id });
    if (!ticket)
      return next(new ApiError(404, `Ticket #${req.params.id} not found`));

    const sizeInBytes = req.file.size;
    const sizeFmt =
      sizeInBytes > 1024 * 1024
        ? `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(sizeInBytes / 1024)} KB`;

    ticket.attachments.push({
      type:       "file",
      name:       req.file.originalname,
      url:        `/uploads/${req.file.filename}`,
      size:       sizeFmt,
      mimetype:   req.file.mimetype,
      uploadedBy: req.user._id,
    });

    await ticket.save();
    await ticket.populate(POPULATE);

    res.status(201).json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/tickets/:ticketNumber/attachments/link ──────────────────────
const addLinkAttachment = async (req, res, next) => {
  try {
    const { name, url } = req.body;
    if (!name || !url)
      return next(new ApiError(400, "Name and URL are required"));

    const ticket = await Ticket.findOne({ ticketNumber: req.params.id });
    if (!ticket)
      return next(new ApiError(404, `Ticket #${req.params.id} not found`));

    ticket.attachments.push({ type: "link", name, url, uploadedBy: req.user._id });
    await ticket.save();
    await ticket.populate(POPULATE);

    res.status(201).json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/tickets/:ticketNumber/attachments/:attachmentId ───────────
const removeAttachment = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({
      ticketNumber: req.params.id,
    }).populate("project assignees teams");

    if (!ticket)
      return next(new ApiError(404, `Ticket #${req.params.id} not found`));

    // Role-based access check
    if (req.user.role !== "superadmin" && req.user.role !== "manager") {
      const isAssignee = ticket.assignees.some(
        (a) => (a._id ? a._id.toString() : a.toString()) === req.user._id.toString()
      );
      const isReporter = ticket.reporter && (ticket.reporter._id ? ticket.reporter._id.toString() : ticket.reporter.toString()) === req.user._id.toString();

      const userTeams = await Team.find({
        $or: [{ teamLead: req.user._id }, { members: req.user._id }]
      }).select("_id");
      const userTeamIds = userTeams.map(t => t._id.toString());
      const isTeamMember = ticket.teams && ticket.teams.some(
        (t) => userTeamIds.includes(t._id ? t._id.toString() : t.toString())
      );

      if (!isAssignee && !isReporter && !isTeamMember) {
        if (!ticket.project) {
          return next(new ApiError(403, "You do not have access to this ticket"));
        } else {
          const project = await Project.findById(ticket.project._id);
          const ok = await hasProjectAccess(req.user._id, project);
          if (!ok)
            return next(new ApiError(403, "You do not have access to this ticket"));
        }
      }
    }

    const att = ticket.attachments.find(
      (a) => a._id.toString() === req.params.attachmentId,
    );
    if (!att) return next(new ApiError(404, "Attachment not found"));

    // Remove file from disk if applicable
    if (att.type === "file") {
      const filePath = path.join(__dirname, "..", att.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    ticket.attachments = ticket.attachments.filter(
      (a) => a._id.toString() !== req.params.attachmentId,
    );

    await ticket.save();
    res.status(200).json({ success: true, message: "Attachment removed" });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/tickets/:ticketNumber  (Manager+) ─────────────────────────
const deleteTicket = async (req, res, next) => {
  try {
    if (req.user.role !== "superadmin") {
      return next(new ApiError(403, "Only superadmins can delete tickets"));
    }

    const ticket = await Ticket.findOneAndDelete({ ticketNumber: req.params.id });
    if (!ticket)
      return next(new ApiError(404, `Ticket #${req.params.id} not found`));

    res.status(200).json({ success: true, message: `Ticket #${req.params.id} deleted` });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/tickets/:ticketNumber/forward ───────────────────────────────
const forwardTicket = async (req, res, next) => {
  try {
    const { toUserIds, toTeamIds, message } = req.body;
    
    if ((!toUserIds || !toUserIds.length) && (!toTeamIds || !toTeamIds.length)) {
      return next(new ApiError(400, "Must specify at least one user or team to forward to"));
    }

    const ticket = await Ticket.findOne({
      ticketNumber: req.params.id,
    }).populate("project assignees teams");

    if (!ticket)
      return next(new ApiError(404, `Ticket #${req.params.id} not found`));

    // Role-based access check: Only superadmin, manager, direct assignees, or team members can forward
    if (req.user.role !== "superadmin" && req.user.role !== "manager") {
      const isAssignee = ticket.assignees.some(
        (a) => a._id.toString() === req.user._id.toString()
      );
      const userTeams = await Team.find({
        $or: [{ teamLead: req.user._id }, { members: req.user._id }]
      }).select("_id");
      const userTeamIds = userTeams.map(t => t._id.toString());
      const isTeamMember = ticket.teams && ticket.teams.some(
        (t) => userTeamIds.includes(t._id ? t._id.toString() : t.toString())
      );

      if (!isAssignee && !isTeamMember) {
        return next(new ApiError(403, "You can only forward tickets that are assigned to you or your team"));
      }
    }

    const newAssigneeUserDocs = [];
    const newTeamDocs = [];

    // Resolve Users
    if (toUserIds && Array.isArray(toUserIds) && toUserIds.length) {
      const users = await User.find({ userId: { $in: toUserIds } });
      newAssigneeUserDocs.push(...users);
    }

    // Resolve Teams
    if (toTeamIds && Array.isArray(toTeamIds) && toTeamIds.length) {
      const teams = await Team.find({ _id: { $in: toTeamIds } }).populate('members teamLead');
      newTeamDocs.push(...teams);
    }

    // Get list of previous assigned user IDs (direct + team members) for notification comparison
    const previousAssigneeIds = ticket.assignees ? ticket.assignees.map((a) => a._id) : [];
    const previousTeamIds = ticket.teams ? ticket.teams.map((t) => t._id) : [];

    const oldUserIds = new Set(previousAssigneeIds.map(id => id.toString()));
    const oldTeams = await Team.find({ _id: { $in: previousTeamIds } }).populate('members teamLead');
    for (const t of oldTeams) {
      if (t.teamLead) oldUserIds.add(t.teamLead._id.toString());
      for (const m of t.members) {
        oldUserIds.add(m._id.toString());
      }
    }

    // Assign new lists (no flattening)
    ticket.assignees = newAssigneeUserDocs.map(u => u._id);
    ticket.teams = newTeamDocs.map(t => t._id);

    // Add forward history record
    ticket.forwardHistory.push({
      fromUser: req.user._id,
      toUsers: newAssigneeUserDocs.map(u => u._id),
      toTeams: newTeamDocs.map(t => t._id),
      previouslyAssignedTo: previousAssigneeIds,
      message: message || '',
    });

    await ticket.save();
    await ticket.populate(POPULATE);

    // Find all users who are in the new assignment list
    const newAssigneesMap = new Map();
    for (const u of newAssigneeUserDocs) {
      newAssigneesMap.set(u._id.toString(), u);
    }
    for (const t of newTeamDocs) {
      if (t.teamLead) newAssigneesMap.set(t.teamLead._id.toString(), t.teamLead);
      for (const m of t.members) {
        newAssigneesMap.set(m._id.toString(), m);
      }
    }

    // Send assignment notifications
    for (const [uidStr, u] of newAssigneesMap.entries()) {
      if (!oldUserIds.has(uidStr) && uidStr !== req.user._id.toString()) {
        const notif = await Notification.create({
          recipient: u._id,
          type:      "ticket_assigned",
          message:   `Ticket #${ticket.ticketNumber} was forwarded to you by ${req.user.name}: "${ticket.title}"`,
          link:      `/tickets/${ticket.ticketNumber}`,
          sender:    req.user._id,
        });
        emitNotification(u._id, notif);
      }
    }

    res.status(200).json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tickets/:id/attachments/:attachmentId/download ───────────────
const downloadAttachment = async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;
    const ticket = await Ticket.findOne({ ticketNumber: id });
    if (!ticket) return next(new ApiError(404, `Ticket #${id} not found`));

    const att = ticket.attachments.find(
      (a) => a._id.toString() === attachmentId,
    );
    if (!att || att.type !== "file")
      return next(new ApiError(404, "File attachment not found"));

    const filePath = path.join(__dirname, "..", att.url);
    if (!fs.existsSync(filePath))
      return next(new ApiError(404, "File not found on server"));

    res.download(filePath, att.name);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTicket,
  getAllTickets,
  getMyTickets,
  getTicketById,
  getTicketsByProject,
  updateTicket,
  deleteTicket,
  forwardTicket,
  addFileAttachment,
  addLinkAttachment,
  removeAttachment,
  downloadAttachment,
};
