const express = require("express");
const router = express.Router();

const {
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
} = require("../controllers/user.controller");

const { protect } = require("../middleware/auth.middleware");
const { isSuperAdmin, isManager } = require("../middleware/rbac.middleware");
const upload = require("../middleware/upload.middleware");

router.get("/", protect, getAllUsers);
router.post("/", protect, isSuperAdmin, createUser);
router.get("/:id", protect, getUserById);
router.put("/profile", protect, updateProfile);
router.put("/profile/photo", protect, upload.single("photo"), updatePhoto);
router.delete("/profile/photo", protect, removePhoto);
router.put("/notifications", protect, updateNotificationPrefs);
router.put("/password", protect, changePassword);
router.put("/:id", protect, isSuperAdmin, updateUser);
router.patch("/:id/role", protect, isSuperAdmin, updateUserRole);
router.patch("/:id/status", protect, isSuperAdmin, updateUserStatus);

module.exports = router;
