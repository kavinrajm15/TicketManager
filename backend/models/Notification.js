const mongoose = require('mongoose');
const Counter = require('./Counter');

const notificationSchema = new mongoose.Schema(
  {
    // Auto-incrementing clean ID
    notificationId: { type: Number, unique: true },

    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    type: {
      type: String,
      enum: ['mention', 'personal_chat', 'team_chat', 'ticket_update', 'ticket_assigned'],
      required: true,
    },

    message: { type: String, required: true }, 
    link:    { type: String, default: '' },    

    read: { type: Boolean, default: false },

    // Optional: who triggered the notification
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// ── Auto-increment notificationId ─────────────────────────────────────────────
notificationSchema.pre('save', async function () {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'notification_sequence' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.notificationId = counter.seq;
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
