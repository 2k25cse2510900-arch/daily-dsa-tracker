"use strict";

function sameOriginMutationOnly(req, res, next) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.get("origin");
    const fetchSite = req.get("sec-fetch-site");
    if ((origin && origin !== `${req.protocol}://${req.get("host")}`) || fetchSite === "cross-site") {
      return res.status(403).json({ error: "Cross-origin request rejected." });
    }
  }
  next();
}

module.exports = { sameOriginMutationOnly };
