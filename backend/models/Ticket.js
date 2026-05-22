const mongoose = require('mongoose');
const Counter  = require('./Counter');

const ticketSchema = new mongoose.Schema(
  {
    // Auto-incrementing clean ID
    ticketNumber:     { type: String, unique: true },
    projectTicketSeq: { type: Number },

    title:       { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, trim: true, default: '' },

    status: {
      type: String,
      enum: ['todo', 'in-progress', 'in-review', 'done'],
      default: 'todo',
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },

    startDate: { type: Date, default: null },
    endDate:   { type: Date, default: null },

    // References – project is OPTIONAL (null = global/unassigned ticket)
    project:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    teams:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
    reporter:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    tags: [{ type: String, trim: true }],

    forwardHistory: [
      {
        fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        toUsers:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        toTeams:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
        previouslyAssignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        message:  { type: String, trim: true, default: '' },
        forwardedAt: { type: Date, default: Date.now }
      }
    ],

    // Attachments: uploaded files or external links
    attachments: [
      {
        type:       { type: String, enum: ['file', 'link'], required: true },
        name:       { type: String, required: true, trim: true },
        url:        { type: String, required: true, trim: true },
        size:       { type: String, default: '' },
        mimetype:   { type: String, default: '' },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// ── Ticket number generation ───────────────────────────────────────────────
ticketSchema.pre('save', async function () {
  if (this.isNew) {
    if (this.project) {
      // ── Project ticket: e.g. "bhoom1", "proj2" ────────────────────────
      const Project = require('./Project');
      const project = await Project.findById(this.project);
      if (!project) throw new Error('Project not found for ticket creation');

      project.ticketCounter += 1;
      await project.save();

      this.projectTicketSeq = project.ticketCounter;
      this.ticketNumber = `${project.key}${project.ticketCounter}`;
    } else {
      // ── Global ticket: e.g. "GLOBAL-1", "GLOBAL-2" ───────────────────
      const counter = await Counter.findOneAndUpdate(
        { id: 'global_ticket_sequence' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.ticketNumber = `GLOBAL-${counter.seq}`;
    }
  }
});

module.exports = mongoose.model('Ticket', ticketSchema);