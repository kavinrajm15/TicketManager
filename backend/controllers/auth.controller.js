const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// ── Helper: sign JWT ──────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user,
  });
};

// ── POST /api/auth/register ───────

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ApiError(400, 'Email is already registered'));
    }

    const user = await User.create({ name, email, password, role: 'member' });
    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/login ───────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Include password field for comparison
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return next(new ApiError(401, 'Invalid email or password'));
    }

    if (user.isActive === false) {
      return next(new ApiError(403, 'your account is currently inactive please contact admin'));
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ── GET /api/auth/me ─────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
