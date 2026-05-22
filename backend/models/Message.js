const mongoose = require('mongoose');
const Counter = require('./Counter');

const messageSchema = new mongoose.Schema(
  {
    // Auto-incrementing clean ID
    messageId: { type: Number, unique: true },

    // 'personal' = 1-to-1 | 'team' = group team chat
    type: {
      type: String,
      enum: ['personal', 'team'],
      required: true,
    },

    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Used when type === 'personal'
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },


    // Used when type === 'team'
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },

    body: { type: String, required: [true, 'Message body is required'], trim: true },

    // nested reply
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

    // Track who has read this message
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// ── Auto-increment messageId ───────────────────────────────────────────────
messageSchema.pre('save', async function () {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: 'message_sequence' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.messageId = counter.seq;
  }
});

module.exports = mongoose.model('Message', messageSchema);
