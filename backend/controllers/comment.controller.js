const Comment = require("../models/Comment");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const Team = require("../models/Team");
const Notification = require("../models/Notification");
const { emitNotification, emitTicketUpdate } = require("../socket/socket");
const ApiError = require("../utils/ApiError");

// ── Helper: parse @mentions from body and resolve to ObjectIds ─────────────
const resolveMentions = async (body) => {
  const mentionRegex = /@(\w+)/g;
  const matches = [];
  let match;
  while ((match = mentionRegex.exec(body)) !== null) {
    matches.push(match[1]);
  }
  if (!matches.length) return { userIds: [], teamIds: [] };

  // Try matching as users
  const users = await User.find({
    name: { $in: matches.map((m) => new RegExp(`^${m}$`, "i")) },
  });
  const userIds = users.map((u) => u._id);

  // Try matching as teams
  const teams = await Team.find({
    teamName: { $in: matches.map((m) => new RegExp(`^${m}$`, "i")) },
  });
  const teamIds = teams.map((t) => t._id);

  return { userIds, teamIds };
};

// ── POST /api/tickets/:id/comments ────────────────────────────────────────
const addComment = async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim())
      return next(new ApiError(400, "Comment body is required"));

    const ticket = await Ticket.findOne({ ticketNumber: req.params.id });
    if (!ticket)
      return next(new ApiError(404, `Ticket #${req.params.id} not found`));

    const { userIds, teamIds } = await resolveMentions(body);

    const comment = await Comment.create({
      ticket: ticket._id,
      author: req.user._id,
      body: body.trim(),
      mentions: userIds,
      teamMentions: teamIds,
      parentComment: null,
    });

    await comment.populate([
      { path: "author", select: "userId name email avatar" },
      { path: "mentions", select: "userId name email avatar" },
      { path: "teamMentions", select: "teamName" },
    ]);

    // Notify mentioned users
    for (const mentionedId of userIds) {
      if (mentionedId.toString() !== req.user._id.toString()) {
        const notif = await Notification.create({
          recipient: mentionedId,
          type: "mention",
          message: `${req.user.name} mentioned you in a comment on ticket #${ticket.ticketNumber}`,
          link: `/tickets/${ticket.ticketNumber}`,
          sender: req.user._id,
        });
        emitNotification(mentionedId, notif);
      }
    }

    // Notify team members
    if (teamIds.length > 0) {
      const teams = await Team.find({ _id: { $in: teamIds } })
        .populate("members")
        .populate("teamLead");
      for (const team of teams) {
        const recipients = new Set();
        if (team.teamLead) recipients.add(team.teamLead._id.toString());
        team.members.forEach((m) => recipients.add(m._id.toString()));

        for (const recipientId of recipients) {
          if (recipientId !== req.user._id.toString()) {
            const notif = await Notification.create({
              recipient: recipientId,
              type: "mention",
              message: `${req.user.name} mentioned team "@${team.teamName}" in a comment on ticket #${ticket.ticketNumber}`,
              link: `/tickets/${ticket.ticketNumber}`,
              sender: req.user._id,
            });
            emitNotification(recipientId, notif);
          }
        }
      }
    }

    emitTicketUpdate(ticket.ticketNumber);

    res.status(201).json({ success: true, comment });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/comments/:id/reply ──────────────────────────────────────────
const replyToComment = async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim())
      return next(new ApiError(400, "Reply body is required"));

    const parentComment = await Comment.findOne({
      commentId: Number(req.params.id),
    });
    if (!parentComment)
      return next(new ApiError(404, `Comment #${req.params.id} not found`));

    const { userIds, teamIds } = await resolveMentions(body);

    const reply = await Comment.create({
      ticket: parentComment.ticket,
      author: req.user._id,
      body: body.trim(),
      mentions: userIds,
      teamMentions: teamIds,
      parentComment: parentComment._id,
    });

    // Push this reply reference into the parent
    parentComment.replies.push(reply._id);
    await parentComment.save();

    await reply.populate([
      { path: "author", select: "userId name email avatar" },
      { path: "mentions", select: "userId name email avatar" },
      { path: "teamMentions", select: "teamName" },
    ]);

    // Notify the parent comment's author
    if (parentComment.author.toString() !== req.user._id.toString()) {
      const ticket = await Ticket.findById(parentComment.ticket);
      const notif = await Notification.create({
        recipient: parentComment.author,
        type: "mention",
        message: `${req.user.name} replied to your comment on ticket #${ticket?.ticketNumber}`,
        link: `/tickets/${ticket?.ticketNumber}`,
        sender: req.user._id,
      });
      emitNotification(parentComment.author, notif);
    }

    // Notify mentioned users (same logic as addComment)
    const ticket = await Ticket.findById(parentComment.ticket);
    for (const mentionedId of userIds) {
      if (mentionedId.toString() !== req.user._id.toString()) {
        const notif = await Notification.create({
          recipient: mentionedId,
          type: "mention",
          message: `${req.user.name} mentioned you in a reply on ticket #${ticket?.ticketNumber}`,
          link: `/tickets/${ticket?.ticketNumber}`,
          sender: req.user._id,
        });
        emitNotification(mentionedId, notif);
      }
    }

    // Notify team members
    if (teamIds.length > 0) {
      const teams = await Team.find({ _id: { $in: teamIds } })
        .populate("members")
        .populate("teamLead");
      for (const team of teams) {
        const recipients = new Set();
        if (team.teamLead) recipients.add(team.teamLead._id.toString());
        team.members.forEach((m) => recipients.add(m._id.toString()));

        for (const recipientId of recipients) {
          if (recipientId !== req.user._id.toString()) {
            const notif = await Notification.create({
              recipient: recipientId,
              type: "mention",
              message: `${req.user.name} mentioned team "@${team.teamName}" in a reply on ticket #${ticket?.ticketNumber}`,
              link: `/tickets/${ticket?.ticketNumber}`,
              sender: req.user._id,
            });
            emitNotification(recipientId, notif);
          }
        }
      }
    }

    emitTicketUpdate(ticket?.ticketNumber);

    res.status(201).json({ success: true, reply });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tickets/:id/comments ─────────────────────────────────────────
const getCommentsByTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ ticketNumber: req.params.id });
    if (!ticket)
      return next(new ApiError(404, `Ticket #${req.params.id} not found`));

    // Only top-level comments; replies are nested inside
    const comments = await Comment.find({
      ticket: ticket._id,
      parentComment: null,
    })
      .populate("author", "userId name email avatar")
      .populate("mentions", "userId name email avatar")
      .populate("teamMentions", "teamName")
      .populate({
        path: "replies",
        populate: [
          { path: "author", select: "userId name email avatar" },
          { path: "mentions", select: "userId name email avatar" },
          { path: "teamMentions", select: "teamName" },
        ],
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: comments.length, comments });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/comments/:id ─────────────
const updateComment = async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim())
      return next(new ApiError(400, "Comment body is required"));

    const comment = await Comment.findOne({ commentId: Number(req.params.id) });
    if (!comment)
      return next(new ApiError(404, `Comment #${req.params.id} not found`));

    // Only author can edit
    if (comment.author.toString() !== req.user._id.toString()) {
      return next(new ApiError(403, "You can only edit your own comments"));
    }

    const { userIds, teamIds } = await resolveMentions(body);
    comment.body = body.trim();
    comment.mentions = userIds;
    comment.teamMentions = teamIds;
    await comment.save();
    await comment.populate([
      { path: "author", select: "userId name email avatar" },
      { path: "mentions", select: "userId name email avatar" },
      { path: "teamMentions", select: "teamName" },
    ]);

    const ticket = await Ticket.findById(comment.ticket);
    emitTicketUpdate(ticket?.ticketNumber);

    res.status(200).json({ success: true, comment });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/comments/:id ────────
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findOne({ commentId: Number(req.params.id) });
    if (!comment)
      return next(new ApiError(404, `Comment #${req.params.id} not found`));

    const ROLE_LEVELS = { member: 1, teamlead: 2, manager: 3, superadmin: 4 };
    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isManager = ROLE_LEVELS[req.user.role] >= ROLE_LEVELS["manager"];

    if (!isAuthor && !isManager) {
      return next(new ApiError(403, "Not authorized to delete this comment"));
    }

    // Remove from parent's replies array if it's a reply
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id },
      });
    }

    const ticket = await Ticket.findById(comment.ticket);
    await Comment.findByIdAndDelete(comment._id);

    emitTicketUpdate(ticket?.ticketNumber);

    res
      .status(200)
      .json({ success: true, message: `Comment #${req.params.id} deleted` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addComment,
  replyToComment,
  getCommentsByTicket,
  updateComment,
  deleteComment,
};
