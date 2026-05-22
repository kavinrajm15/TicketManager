const ApiError = require('../utils/ApiError');

const ROLE_LEVELS = {
  member: 1,
  teamlead: 2,
  manager: 3,
  superadmin: 4,
};


const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Not authenticated.'));
    }

    const userLevel = ROLE_LEVELS[req.user.role] || 0;
    const minLevel = Math.min(...roles.map((r) => ROLE_LEVELS[r] || 99));

    if (userLevel < minLevel) {
      return next(
        new ApiError(
          403,
          `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
        )
      );
    }

    next();
  };
};

/**
 * Shorthand helpers for common role guards
 */
const isSuperAdmin = authorize('superadmin');
const isManager = authorize('manager', 'superadmin');
const isTeamLead = authorize('teamlead', 'manager', 'superadmin');

module.exports = { authorize, isSuperAdmin, isManager, isTeamLead };
