"use strict";

const crypto = require("node:crypto");

function createMongoRateLimit({ getCollection, secret, windowMs, clock = Date.now }) {
  return (bucket, limit) => async (req, res, next) => {
    try {
      const windowNumber = Math.floor(clock() / windowMs);
      const address = req.ip || req.socket?.remoteAddress || "unknown";
      const addressHash = crypto.createHmac("sha256", secret).update(address).digest("hex");
      const id = `${bucket}:${windowNumber}:${addressHash}`;
      const collection = getCollection();
      try {
        await collection.updateOne({ _id: id }, { $setOnInsert: { count: 0, expiresAt: new Date((windowNumber + 1) * windowMs) } }, { upsert: true });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
      const increment = await collection.updateOne({ _id: id, count: { $lt: limit } }, { $inc: { count: 1 } });
      if (!increment.matchedCount) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil(((windowNumber + 1) * windowMs - clock()) / 1000))));
        return res.status(429).json({ error: "Too many attempts. Try again later." });
      }
      next();
    } catch {
      res.status(503).json({ error: "Security service is temporarily unavailable." });
    }
  };
}

module.exports = { createMongoRateLimit };
