const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Counter = require("./Counter");

const userSchema = new mongoose.Schema(
  {
    // Auto-incrementing clean ID
    userId: { type: Number, unique: true },

    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      validate: {
        validator: function(v) {
          // Validation runs before hashing in pre-save
          if (!this.isModified('password')) return true;
          return v.length >= 8 && 
                 /[A-Z]/.test(v) && 
                 /[0-9]/.test(v) && 
                 /[^A-Za-z0-9]/.test(v);
        },
        message: "Password must be at least 8 characters long, contain one capital letter, one number, and one special character."
      }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ["superadmin", "manager", "teamlead", "member"],
      default: "member",
    },
    photo: { type: String, default: "" },


    notificationPrefs: {
      mutedPersonalChat: { type: Boolean, default: false },
      mutedTeamChat: { type: Boolean, default: false },
    },

    webPushSubscriptions: [
      {
        endpoint: String,
        keys: {
          p256dh: String,
          auth: String,
        },
      },
    ],
  },
  { timestamps: true },
);

// ── Auto-increment userId ──────────
userSchema.pre("save", async function () {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: "user_sequence" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    this.userId = counter.seq;
  }

  // Hash password only when modified
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// ── Instance method: compare password ─────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Hide sensitive fields in JSON responses ────────────────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
