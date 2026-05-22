const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    teamName: { 
      type: String, 
      required: [true, 'Team name is required'], 
      trim: true,
      unique: true 
    },
    teamLead: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: [true, 'Team lead is required'] 
    },
    members: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      }
    ],
    projects: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project' 
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Team', teamSchema);
