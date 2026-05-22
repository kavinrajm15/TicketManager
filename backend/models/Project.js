const mongoose = require('mongoose');
const Counter = require('./Counter');

const projectSchema = new mongoose.Schema(
  {
    // Auto-incrementing clean ID
    projectId: { type: Number, unique: true },

    name:        { type: String, required: [true, 'Project name is required'], trim: true },
    description: { type: String, trim: true, default: '' },
    key:         { type: String, trim: true, unique: true }, // e.g. "bhoom"
    ticketCounter: { type: Number, default: 0 }, // For per-project ticket numbering

    // Creator / owner
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Assigned teams (multiple allowed)
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],

    // Project members with their roles inside this project
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: {
          type: String,
          enum: ['manager', 'teamlead', 'member'],
          default: 'member',
        },
      },
    ],
  },
  { timestamps: true }
);

// ── Auto-increment projectId & Generate Key ────────────────────────────────
projectSchema.pre('save', async function () {
  if (this.isNew) {
    // Increment projectId
    const counter = await Counter.findOneAndUpdate(
      { id: 'project_sequence' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.projectId = counter.seq;

    // Generate Key if not provided
    if (!this.key && this.name) {
      // First 5 letters, alphanumeric only, lowercase
      let generatedKey = this.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 5)
        .toLowerCase();
      
      // Ensure key is unique
      let uniqueKey = generatedKey;
      let suffix = 1;
      while (await mongoose.models.Project.findOne({ key: uniqueKey })) {
        uniqueKey = generatedKey.substring(0, 4) + suffix;
        suffix++;
      }
      this.key = uniqueKey;
    }
  }
});

module.exports = mongoose.model('Project', projectSchema);