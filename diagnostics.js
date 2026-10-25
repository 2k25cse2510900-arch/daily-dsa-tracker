"use strict";

const SAFE_NAME = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;
const SAFE_CODE = /^[A-Za-z0-9_-]{1,40}$/;

function errorChain(error) {
  const chain = [];
  const seen = new Set();
  const pending = [error];
  while (pending.length && chain.length < 12) {
    const current = pending.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    chain.push(current);
    seen.add(current);
    if (current.cause) pending.push(current.cause);
    const servers = current.reason?.servers;
    if (servers && typeof servers.values === "function") {
      for (const server of servers.values()) {
        if (server?.error) pending.push(server.error);
      }
    }
  }
  return chain;
}

function classifyMongoError(error) {
  const chain = errorChain(error);
  const names = chain.map(item => typeof item.name === "string" ? item.name : "");
  const codes = chain.map(item => item.code);

  if (names.includes("MongoParseError")) return "invalid-uri";
  if (codes.some(code => code === 18 || code === "AuthenticationFailed")) return "authentication-failure";
  if (codes.some(code => typeof code === "string" && /^(EAI_AGAIN|ENOTFOUND|ENODATA|ESERVFAIL)$/.test(code))) return "dns-failure";
  if (names.some(name => /TLS|Certificate/i.test(name)) ||
      codes.some(code => typeof code === "string" && /^(ERR_TLS|ERR_SSL|CERT_|UNABLE_TO_VERIFY_LEAF_SIGNATURE)/.test(code))) return "tls-error";
  if (codes.some(code => code === "ETIMEDOUT" || code === "ETIMEOUT") || names.includes("MongoNetworkTimeoutError")) return "network-timeout";
  if (codes.some(code => typeof code === "string" && /^(ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|EPIPE)$/.test(code)) ||
      names.includes("MongoNetworkError")) return "network-error";
  if (names.includes("MongoServerSelectionError")) return "server-selection-timeout";
  return "mongodb-error";
}

function safeMongoDiagnostic(error) {
  const chain = errorChain(error);
  const firstWithName = chain.find(item => typeof item.name === "string" && SAFE_NAME.test(item.name));
  const firstWithCode = chain.find(item =>
    (typeof item.code === "string" && SAFE_CODE.test(item.code)) || Number.isInteger(item.code)
  );
  const code = firstWithCode?.code;

  return {
    name: firstWithName?.name || "Error",
    code: typeof code === "string" ? code : Number.isInteger(code) ? code : "UNKNOWN",
    category: classifyMongoError(error)
  };
}

function safeMongoMessage(error) {
  if (typeof error?.message !== "string") return "No MongoDB error message was supplied.";
  // Keep server validation text useful while removing connection credentials,
  // URI hosts, and query-string secrets before it reaches application logs.
  return error.message
    .replace(/mongodb(?:\+srv)?:\/\/[^\s)]+/gi, "[REDACTED_MONGODB_URI]")
    .replace(/\b(?:password|secret|token)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .slice(0, 500);
}

module.exports = { classifyMongoError, safeMongoDiagnostic, safeMongoMessage };
