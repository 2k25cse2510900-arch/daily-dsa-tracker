"use strict";

const SAFE_NAME = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;
const SAFE_CODE = /^[A-Za-z0-9_-]{1,40}$/;

function errorChain(error) {
  const chain = [];
  const seen = new Set();
  let current = error;
  while (current && typeof current === "object" && chain.length < 5 && !seen.has(current)) {
    chain.push(current);
    seen.add(current);
    current = current.cause;
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
      codes.some(code => typeof code === "string" && /^(ERR_TLS|CERT_|UNABLE_TO_VERIFY_LEAF_SIGNATURE)/.test(code))) return "tls-error";
  if (names.includes("MongoServerSelectionError")) return "server-selection-timeout";
  if (codes.some(code => code === "ETIMEDOUT") || names.includes("MongoNetworkTimeoutError")) return "network-timeout";
  if (codes.some(code => typeof code === "string" && /^(ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETUNREACH|EPIPE)$/.test(code)) ||
      names.includes("MongoNetworkError")) return "network-error";
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

module.exports = { classifyMongoError, safeMongoDiagnostic };
