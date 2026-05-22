const Message = require("../models/Message");
const User = require("../models/User");
const Project = require("../models/Project");
const Team = require("../models/Team");
const Notification = require("../models/Notification");
const { emitNotification } = require("../socket/socket");
const ApiError = require("../utils/ApiError");

// ── GET /api/chat/personal/:userId ──────────

const getPersonalMessages = async (req, res, next) => {
  try {
    const otherUser = await User.findOne({ userId: Number(req.params.userId) });
    if (!otherUser)
      return next(new ApiError(404, `User #${req.params.userId} not found`));

    const messages = await Message.find({
      type: "personal",
      $or: [
        { sender: req.user._id, recipient: otherUser._id },
        { sender: otherUser._id, recipient: req.user._id },
      ],
    })
      .populate("sender", "userId name email avatar")
      .populate("recipient", "userId name email avatar")
      .populate("replyTo", "body sender")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" },
      })
      .sort({ createdAt: 1 });

    // Mark unread messages as read
    await Message.updateMany(
      {
        type: "personal",
        sender: otherUser._id,
        recipient: req.user._id,
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } },
    );

    res.status(200).json({ success: true, count: messages.length, messages });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/chat/personal/:userId ─────────

const sendPersonalMessage = async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim())
      return next(new ApiError(400, "Message body is required"));

    const recipient = await User.findOne({ userId: Number(req.params.userId) });
    if (!recipient)
      return next(new ApiError(404, `User #${req.params.userId} not found`));

    const message = await Message.create({
      type: "personal",
      sender: req.user._id,
      recipient: recipient._id,
      body: body.trim(),
      readBy: [req.user._id],
    });

    await message.populate([
      { path: "sender", select: "userId name email avatar" },
      { path: "recipient", select: "userId name email avatar" },
    ]);

    // Notify recipient if they haven't muted personal chat
    const recipientFull = await User.findById(recipient._id);
    if (!recipientFull.notificationPrefs.mutedPersonalChat) {
      const notif = await Notification.create({
        recipient: recipient._id,
        type: "personal_chat",
        message: `${req.user.name} sent you a message`,
        link: `/chat/personal/${req.user.userId}`,
        sender: req.user._id,
      });
      emitNotification(recipient._id, notif);
    }

    res.status(201).json({ success: true, message });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/chat/team/:teamId ─────────
const getTeamMessages = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return next(new ApiError(404, "Team not found"));

    const isMember =
      team.members.includes(req.user._id) ||
      team.teamLead.toString() === req.user._id.toString();
    const isAdmin = ["superadmin", "manager"].includes(req.user.role);
    if (!isMember && !isAdmin)
      return next(new ApiError(403, "Not authorized to view this team chat"));

    const messages = await Message.find({ type: "team", team: team._id })
      .populate("sender", "userId name email avatar role")
      .populate("replyTo", "body sender")
      .populate({
        path: "replyTo",
        populate: { path: "sender", select: "name" },
      })
      .sort({ createdAt: 1 });

    // Mark as read
    await Message.updateMany(
      { type: "team", team: team._id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } },
    );

    res.status(200).json({ success: true, count: messages.length, messages });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/chat/team/:teamId ────────
const sendTeamMessage = async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim())
      return next(new ApiError(400, "Message body is required"));

    const team = await Team.findById(req.params.teamId).populate(
      "members",
      "_id notificationPrefs",
    );
    if (!team) return next(new ApiError(404, "Team not found"));

    // Check authorization
    const isMember =
      team.members.some((m) => m._id.toString() === req.user._id.toString()) ||
      team.teamLead.toString() === req.user._id.toString();
    if (!isMember)
      return next(
        new ApiError(403, "Not authorized to send messages to this team"),
      );

    const message = await Message.create({
      type: "team",
      sender: req.user._id,
      team: team._id,
      body: body.trim(),
      readBy: [req.user._id],
    });

    await message.populate("sender", "userId name email avatar role");

    // Notify team members + team lead
    const recipients = [...team.members];
    const lead = await User.findById(team.teamLead);
    if (lead) recipients.push(lead);

    for (const member of recipients) {
      if (
        member._id.toString() !== req.user._id.toString() &&
        !member.notificationPrefs?.mutedTeamChat
      ) {
        const notif = await Notification.create({
          recipient: member._id,
          type: "team_chat",
          message: `${req.user.name} sent a message in team ${team.teamName}`,
          link: `/chat/team/${team._id}`,
          sender: req.user._id,
        });
        emitNotification(member._id, notif);
      }
    }

    res.status(201).json({ success: true, message });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/chat/conversations ──────
// Get list of users the logged-in user has chatted with
const getConversations = async (req, res, next) => {
  try {
    const messages = await Message.find({
      type: "personal",
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
    })
      .populate("sender", "userId name email avatar")
      .populate("recipient", "userId name email avatar")
      .sort({ createdAt: -1 });

    // Deduplicate: one entry per conversation partner
    const seen = new Set();
    const conversations = [];
    for (const msg of messages) {
      const other =
        msg.sender._id.toString() === req.user._id.toString()
          ? msg.recipient
          : msg.sender;
      if (!seen.has(other._id.toString())) {
        seen.add(other._id.toString());
        conversations.push({ user: other, lastMessage: msg });
      }
    }

    res.status(200).json({ success: true, conversations });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPersonalMessages,
  sendPersonalMessage,
  getTeamMessages,
  sendTeamMessage,
  getConversations,
};
