"use strict";

function createAdminOnly(isAdminSession) {
  return (req, res, next) => {
    if (!isAdminSession(req)) return res.status(401).json({ error: "Authentication required." });
    next();
  };
}

module.exports = { createAdminOnly };
