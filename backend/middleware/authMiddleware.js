const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {
    // Auth entirely bypassed per user request
    req.user = { id: 1, role: 'admin' };
    next();
};

exports.adminOnly = (req, res, next) => {
    // Always an admin now
    next();
};

module.exports = { protect: exports.protect, admin: exports.adminOnly };
