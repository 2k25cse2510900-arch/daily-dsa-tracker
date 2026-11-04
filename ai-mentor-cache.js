"use strict";

/**
 * AI Code Mentor Multi-Tier Caching & Cost Control
 * Separates global problem-level optimal solutions from student-specific private reviews.
 */

const crypto = require("node:crypto");

class AiMentorCache {
  constructor({ db, now = () => new Date(), defaultTtlMs = 30 * 86400000 } = {}) {
    this.db = db || null;
    this.now = now;
    this.defaultTtlMs = defaultTtlMs;
    // In-memory fallback / fast layer
    this.memoryProblemCache = new Map();
    this.memoryReviewCache = new Map();
  }

  problemOptimalCollection() {
    return this.db ? this.db.collection("aiProblemOptimalSolutions") : null;
  }

  reviewsCollection() {
    return this.db ? this.db.collection("aiCodeReviews") : null;
  }

  hashSource(sourceCode) {
    return crypto.createHash("sha256").update(String(sourceCode || "")).digest("hex").slice(0, 32);
  }

  buildProblemCacheKey(problemSlug, language, model) {
    const slug = String(problemSlug || "unknown").toLowerCase();
    const lang = String(language || "python3").toLowerCase();
    const mdl = String(model || "default").toLowerCase();
    return `optimal:${slug}:${lang}:${mdl}`;
  }

  buildStudentReviewHash(userId, problemSlug, language, mode, sourceCode, model, retainSource = false) {
    const srcHash = this.hashSource(sourceCode);
    return crypto.createHash("sha256")
      .update(`${userId}:${problemSlug}:${language}:${mode}:${srcHash}:${model}:${Boolean(retainSource)}`)
      .digest("hex");
  }

  async getProblemOptimal(problemSlug, language, model) {
    const key = this.buildProblemCacheKey(problemSlug, language, model);
    // 1. Check memory
    if (this.memoryProblemCache.has(key)) {
      const entry = this.memoryProblemCache.get(key);
      if (entry.expiresAt > this.now()) return entry.data;
      this.memoryProblemCache.delete(key);
    }
    // 2. Check DB
    const col = this.problemOptimalCollection();
    if (col) {
      try {
        const doc = await col.findOne({ _id: key });
        if (doc && doc.expiresAt > this.now()) {
          this.memoryProblemCache.set(key, { data: doc.data, expiresAt: doc.expiresAt });
          return doc.data;
        }
      } catch {}
    }
    return null;
  }

  async saveProblemOptimal(problemSlug, language, model, data, { ttlMs = this.defaultTtlMs } = {}) {
    const key = this.buildProblemCacheKey(problemSlug, language, model);
    const expiresAt = new Date(this.now().getTime() + ttlMs);
    // 1. Save memory
    this.memoryProblemCache.set(key, { data, expiresAt });
    // 2. Save DB
    const col = this.problemOptimalCollection();
    if (col) {
      try {
        await col.updateOne(
          { _id: key },
          {
            $set: {
              _id: key,
              problemSlug,
              language,
              model,
              data,
              updatedAt: this.now(),
              expiresAt
            }
          },
          { upsert: true }
        );
      } catch {}
    }
  }

  async getStudentReview(userId, inputHash) {
    const memKey = `review:${userId}:${inputHash}`;
    if (this.memoryReviewCache.has(memKey)) {
      const entry = this.memoryReviewCache.get(memKey);
      if (entry.expiresAt > this.now()) return entry.data;
      this.memoryReviewCache.delete(memKey);
    }
    const col = this.reviewsCollection();
    if (col && inputHash) {
      try {
        const doc = await col.findOne({ userId, inputHash, isFallback: { $ne: true } });
        if (doc && doc.expiresAt > this.now()) {
          this.memoryReviewCache.set(memKey, { data: doc, expiresAt: doc.expiresAt });
          return doc;
        }
      } catch {}
    }
    return null;
  }

  async saveStudentReview(userId, inputHash, reviewDoc) {
    const memKey = `review:${userId}:${inputHash}`;
    const expiresAt = reviewDoc.expiresAt || new Date(this.now().getTime() + this.defaultTtlMs);
    this.memoryReviewCache.set(memKey, { data: reviewDoc, expiresAt });
  }
}

module.exports = { AiMentorCache };
