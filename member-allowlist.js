"use strict";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeMemberEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function parseMemberEmailAllowlist(value) {
  if (typeof value !== "string" || !value.trim()) return { valid: false, reason: "missing", emails: new Set() };
  const entries = value.split(/[,;\s]+/).map(normalizeMemberEmail).filter(Boolean);
  if (!entries.length) return { valid: false, reason: "missing", emails: new Set() };
  if (entries.some(email => email.length > 254 || !EMAIL_PATTERN.test(email))) return { valid: false, reason: "invalid-email", emails: new Set() };
  const emails = new Set(entries);
  if (emails.size !== entries.length) return { valid: false, reason: "duplicate", emails: new Set() };
  return { valid: true, reason: null, emails };
}

module.exports = { normalizeMemberEmail, parseMemberEmailAllowlist };
