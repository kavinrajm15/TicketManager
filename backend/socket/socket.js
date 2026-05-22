const Message = require("../models/Message");
const User = require("../models/User");
const Project = require("../models/Project");
const Notification = require("../models/Notification");

let ioInstance;
const onlineUsers = new Map();

/**
 * Attaches Socket.io event handlers to the server.
 */
const initSocket = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Register user as online
    socket.on("user:online", (userId) => {
      onlineUsers.set(String(userId), socket.id);
      io.emit("users:online", Array.from(onlineUsers.keys()));
      console.log(`User #${userId} is online`);
    });

    // Chat room logic

    socket.on("chat:joinTicket", (ticketId) => {
      socket.join(`ticket:${ticketId}`);
      console.log(`Joined ticket room: ${ticketId}`);
    });

    socket.on("chat:leaveTicket", (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
    });

    socket.on("chat:joinTeam", (teamId) => {
      socket.join(`team:${teamId}`);
      console.log(`Joined team room: ${teamId}`);
    });

    socket.on("chat:leaveTeam", (teamId) => {
      socket.leave(`team:${teamId}`);
    });

    socket.on("chat:personalMessage", async (data) => {
      try {
        const { senderId, recipientId, body, replyToId } = data;
        const sender = await User.findOne({ userId: senderId });
        const recipient = await User.findOne({ userId: recipientId });
        if (!sender || !recipient) return;

        const message = await Message.create({
          type: "personal",
          sender: sender._id,
          recipient: recipient._id,
          body: body.trim(),
          readBy: [sender._id],
          replyTo: replyToId || null,
        });

        await message.populate([
          { path: "sender", select: "userId name email avatar" },
          { path: "recipient", select: "userId name email avatar" },
          { path: "replyTo", populate: { path: "sender", select: "name" } },
        ]);

        const recipientSocketId = onlineUsers.get(String(recipientId));
        if (recipientSocketId)
          io.to(recipientSocketId).emit("chat:newPersonalMessage", message);
        socket.emit("chat:messageSent", message);

        // Notification
        const recipientFull = await User.findById(recipient._id);
        if (!recipientFull.notificationPrefs?.mutedPersonalChat) {
          const notif = await Notification.create({
            recipient: recipient._id,
            type: "personal_chat",
            message: `${sender.name} sent you a message`,
            link: `/chat/personal/${senderId}`,
            sender: sender._id,
          });
          emitNotification(recipient._id, notif);
        }
      } catch (err) {
        socket.emit("chat:error", { message: err.message });
      }
    });

    socket.on("chat:teamMessage", async (data) => {
      try {
        const { senderId, teamId, body, replyToId } = data;
        const sender = await User.findOne({ userId: senderId });
        if (!sender) return;

        const message = await Message.create({
          type: "team",
          sender: sender._id,
          team: teamId,
          body: body.trim(),
          readBy: [sender._id],
          replyTo: replyToId || null,
        });

        await message.populate([
          { path: "sender", select: "userId name email avatar role" },
          { path: "replyTo", populate: { path: "sender", select: "name" } },
        ]);

        io.to(`team:${teamId}`).emit("chat:newTeamMessage", message);

        // Notify team members (offline/unselected)
        const Project = require("../models/Project");
        const Team = require("../models/Team");
        const team = await Team.findById(teamId).populate("members teamLead");
        if (team) {
          const recipients = new Set();
          if (team.teamLead) recipients.add(team.teamLead._id.toString());
          team.members.forEach((m) => recipients.add(m._id.toString()));

          for (const recipientObjectId of recipients) {
            if (recipientObjectId === sender._id.toString()) continue;

            const notif = await Notification.create({
              recipient: recipientObjectId,
              type: "team_chat",
              message: `New message in team ${team.teamName}`,
              link: `/chat/team/${teamId}`,
              sender: sender._id,
            });

            emitNotification(recipientObjectId, notif);
          }
        }
      } catch (err) {
        socket.emit("chat:error", { message: err.message });
      }
    });

    socket.on("chat:deleteMessage", async (data) => {
      try {
        const { messageId, userId } = data;
        const message = await Message.findById(messageId);
        if (!message) return;

        // Check ownership
        const user = await User.findOne({ userId });
        if (
          !user ||
          (message.sender.toString() !== user._id.toString() &&
            user.role !== "superadmin")
        ) {
          return socket.emit("chat:error", {
            message: "Not authorized to delete",
          });
        }

        await Message.findByIdAndDelete(messageId);

        if (message.type === "personal") {
          const sender = await User.findById(message.sender);
          const recipient = await User.findById(message.recipient);
          const sSid = onlineUsers.get(String(sender.userId));
          const rSid = onlineUsers.get(String(recipient.userId));
          if (sSid) io.to(sSid).emit("chat:messageDeleted", { messageId });
          if (rSid) io.to(rSid).emit("chat:messageDeleted", { messageId });
        } else if (message.type === "team") {
          io.to(`team:${message.team}`).emit("chat:messageDeleted", {
            messageId,
          });
        }
      } catch (err) {
        socket.emit("chat:error", { message: err.message });
      }
    });


    socket.on("disconnect", () => {
      for (const [userId, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }
      io.emit("users:online", Array.from(onlineUsers.keys()));
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

const webpush = require('web-push');

/**
 * Utility to emit a real-time notification to a specific user by their ID.
 * @param {ObjectId|string} userObjectId - MongoDB _id of the recipient
 * @param {Object} notificationData - The notification object from DB
 */
const emitNotification = async (userObjectId, notificationData) => {
  if (!ioInstance) return;
  try {
    const user = await User.findById(userObjectId).select("userId webPushSubscriptions");
    if (!user) return;

    const socketId = onlineUsers.get(String(user.userId));
    if (socketId) {
      ioInstance.to(socketId).emit("notification:new", notificationData);
    }

    // Send web push to all subscriptions
    if (user.webPushSubscriptions && user.webPushSubscriptions.length > 0) {
      const payload = JSON.stringify({
        title: notificationData.type === 'ticket_assigned' ? 'New Ticket Assigned' : 'New Notification',
        body: notificationData.message,
        url: notificationData.link || '/'
      });

      const invalidSubs = [];
      
      const pushPromises = user.webPushSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub, payload);
        } catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            console.log('Subscription has expired or is no longer valid:', error);
            invalidSubs.push(sub._id);
          } else {
            console.error('Error sending web push:', error);
          }
        }
      });

      await Promise.all(pushPromises);

      // Clean up invalid subscriptions
      if (invalidSubs.length > 0) {
        user.webPushSubscriptions = user.webPushSubscriptions.filter(
          (sub) => !invalidSubs.includes(sub._id)
        );
        await user.save();
      }
    }
  } catch (err) {
    console.error("Error emitting notification:", err);
  }
};

/**
 * Utility to notify all users in a ticket room that comments have changed.
 */
const emitTicketUpdate = (ticketNumber) => {
  if (!ioInstance) return;
  ioInstance
    .to(`ticket:${ticketNumber}`)
    .emit("ticket:commentsUpdated", { ticketNumber });
};

module.exports = { initSocket, emitNotification, emitTicketUpdate };
