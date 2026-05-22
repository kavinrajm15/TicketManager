const mongoose = require("mongoose");
const Counter = require("./Counter");

const commentSchema = new mongoose.Schema(
  {
    // Auto-incrementing clean ID
    commentId: { type: Number, unique: true },

    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    body: {
      type: String,
      required: [true, "Comment body is required"],
      trim: true,
    },

    // Mentioned users (populated from @username parsing)
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Mentioned teams
    teamMentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],

    // Null = top-level comment; ObjectId = reply to that comment
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    // Direct children replies (for quick thread hydration)
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  },
  { timestamps: true },
);

// ── Auto-increment commentId ───────────────────────────────────────────────
commentSchema.pre("save", async function () {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: "comment_sequence" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    this.commentId = counter.seq;
  }
});

module.exports = mongoose.model("Comment", commentSchema);
