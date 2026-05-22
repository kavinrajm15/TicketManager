const User = require("../models/User");
const Project = require("../models/Project");
const ApiError = require("../utils/ApiError");

// ── GET /api/users  ───────────────────────────────────────────────────────
// Optional query param: ?projectId=N
//   → With projectId : returns only members of that project
//     (direct project members + team members + team lead)
//   → Without projectId : returns all users (paginated, existing behaviour)
const getAllUsers = async (req, res, next) => {
  try {
    const { projectId } = req.query;

    if (projectId) {
      // ── Project-scoped user list ──────────────────────────────────────
      const project = await Project.findOne({ projectId: Number(projectId) })
        .populate("members.user", "-password")
        .populate({
          path: "teams",
          select: "members teamLead",
          populate: [
            { path: "members", select: "-password" },
            { path: "teamLead", select: "-password" },
          ],
        });

      if (!project)
        return next(new ApiError(404, `Project #${projectId} not found`));

      // Collect unique user ObjectIds: project members + team members + team lead
      const memberMap = new Map();

      // Direct project members (already populated)
      for (const m of project.members) {
        if (m.user) memberMap.set(m.user._id.toString(), m.user);
      }

      // Team members + team lead (if teams are assigned)
      if (project.teams && project.teams.length > 0) {
        for (const team of project.teams) {
          if (team.teamLead) {
            const tl = team.teamLead;
            memberMap.set(tl._id.toString(), tl);
          }
          for (const tm of team.members || []) {
            memberMap.set(tm._id.toString(), tm);
          }
        }
      }

      const users = Array.from(memberMap.values()).sort(
        (a, b) => (a.userId ?? 0) - (b.userId ?? 0),
      );

      return res.status(200).json({
        success: true,
        count: users.length,
        total: users.length,
        users,
      });
    }

    // ── All users (paginated) ─────────────────────────────────────────────
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === "true" || req.query.isActive === true;
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query).sort({ userId: 1 }).skip(skip).limit(limit);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      users,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/:id ────────────────────────────────────────────────────
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findOne({ userId: Number(req.params.id) });
    if (!user)
      return next(new ApiError(404, `User #${req.params.id} not found`));
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/users  (SuperAdmin creates user with any role) ───────────────
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return next(new ApiError(400, "Name, email and password are required"));
    }

    const existing = await User.findOne({ email });
    if (existing) return next(new ApiError(400, "Email already registered"));

    const user = await User.create({
      name,
      email,
      password,
      role: role || "member",
    });

    res.status(201).json({
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/users/:id  (SuperAdmin only) ────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const userId = Number(req.params.id);

    const user = await User.findOne({ userId });
    if (!user) return next(new ApiError(404, `User #${userId} not found`));

    // Role logic
    if (role) {
      const validRoles = ["superadmin", "manager", "teamlead", "member"];
      if (!validRoles.includes(role)) {
        return next(new ApiError(400, "Invalid role"));
      }
      if (user.role === "superadmin" && role !== "superadmin") {
        const superadminCount = await User.countDocuments({ role: "superadmin" });
        if (superadminCount <= 1) {
          return next(new ApiError(400, "Cannot demote the last superadmin"));
        }
      }
      user.role = role;
    }

    if (name) user.name = name;
    if (email) {
      const existing = await User.findOne({ email, userId: { $ne: userId } });
      if (existing) return next(new ApiError(400, "Email already in use"));
      user.email = email.toLowerCase();
    }
    if (password) {
      user.password = password; // pre-save hook handles hashing and validation
    }

    await user.save();
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/users/:id/role  (SuperAdmin only) ────────
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ["superadmin", "manager", "teamlead", "member"];

    if (!validRoles.includes(role)) {
      return next(
        new ApiError(
          400,
          `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        ),
      );
    }

    const targetUser = await User.findOne({ userId: Number(req.params.id) });
    if (!targetUser)
      return next(new ApiError(404, `User #${req.params.id} not found`));

    if (targetUser.role === "superadmin" && role !== "superadmin") {
      const superadminCount = await User.countDocuments({ role: "superadmin" });
      if (superadminCount <= 1) {
        return next(
          new ApiError(
            400,
            "Cannot demote the last superadmin. Promote another user first.",
          ),
        );
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      { userId: Number(req.params.id) },
      { role },
      { new: true, runValidators: true },
    ).select("-password");

    res.status(200).json({ success: true, user: updatedUser });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/users/profile  (self) ────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ["name"];
    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/users/notifications  (self) ──────────────────────────────────
const updateNotificationPrefs = async (req, res, next) => {
  try {
    const { mutedPersonalChat, mutedTeamChat } = req.body;

    const prefs = {};
    if (mutedPersonalChat !== undefined)
      prefs["notificationPrefs.mutedPersonalChat"] = mutedPersonalChat;
    if (mutedTeamChat !== undefined)
      prefs["notificationPrefs.mutedTeamChat"] = mutedTeamChat;

    const user = await User.findByIdAndUpdate(req.user._id, prefs, {
      new: true,
    });
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};



// ── PATCH /api/users/:id/status (SuperAdmin only) ────────────────────────
const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    
    // Prevent deactivating the last superadmin
    if (isActive === false) {
      const targetUser = await User.findOne({ userId: Number(req.params.id) });
      if (!targetUser) return next(new ApiError(404, `User #${req.params.id} not found`));
      
      if (targetUser.role === "superadmin") {
        const superadminCount = await User.countDocuments({ role: "superadmin", isActive: true });
        if (superadminCount <= 1) {
          return next(new ApiError(400, "Cannot deactivate the last active superadmin."));
        }
      }
    }

    const updatedUser = await User.findOneAndUpdate(
      { userId: Number(req.params.id) },
      { isActive },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return next(new ApiError(404, `User #${req.params.id} not found`));
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/users/password (self) ────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return next(new ApiError(400, "Old password and new password are required"));
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return next(new ApiError(400, "Invalid old password"));

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/users/photo (self) ───────────────────────────────────────────
const updatePhoto = async (req, res, next) => {
  try {
    if (!req.file) return next(new ApiError(400, "Please upload a photo"));

    const photoUrl = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { photo: photoUrl },
      { new: true }
    );

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/users/photo (self) ─────────────────────────────────────────
const removePhoto = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { photo: "" },
      { new: true }
    );
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};
module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUserRole,
  updateUserStatus,
  updateProfile,
  updateNotificationPrefs,
  changePassword,
  updateUser,
  updatePhoto,
  removePhoto,
};
