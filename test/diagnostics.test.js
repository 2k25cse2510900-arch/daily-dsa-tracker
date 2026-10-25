"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { classifyMongoError, safeMongoDiagnostic, safeMongoMessage } = require("../diagnostics");

test("classifies common MongoDB connection failures from safe identifiers", () => {
  const serverTimeout = Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
  const serverTlsError = Object.assign(new Error("TLS failed"), { code: "ERR_TLS_CERT_ALTNAME_INVALID" });
  const cases = [
    [{ name: "MongoServerSelectionError" }, "server-selection-timeout"],
    [{ name: "Error", code: "ETIMEOUT" }, "network-timeout"],
    [{ name: "Error", code: "ENOTFOUND" }, "dns-failure"],
    [{ name: "MongoServerError", code: 18 }, "authentication-failure"],
    [{ name: "MongoParseError" }, "invalid-uri"],
    [{ name: "Error", code: "ERR_TLS_CERT_ALTNAME_INVALID" }, "tls-error"],
    [{ name: "MongoServerSelectionError", code: "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR" }, "tls-error"],
    [{ name: "MongoNetworkError", code: "ECONNRESET" }, "network-error"],
    [{ name: "MongoServerSelectionError", reason: { servers: new Map([["private-host", { error: serverTimeout }]]) } }, "network-timeout"],
    [{ name: "MongoServerSelectionError", reason: { servers: new Map([["private-host", { error: serverTlsError }]]) } }, "tls-error"],
    [{ name: "MongoServerError", code: 99999 }, "mongodb-error"]
  ];

  for (const [error, expected] of cases) assert.equal(classifyMongoError(error), expected);
});

test("includes only sanitized identifiers and category, never error messages", () => {
  const error = Object.assign(new Error("mongodb://user:password@example.test/private"), {
    code: "ECONNRESET"
  });
  const diagnostic = safeMongoDiagnostic(error);

  assert.deepEqual(diagnostic, {
    name: "Error",
    code: "ECONNRESET",
    category: "network-error"
  });
  assert.equal(JSON.stringify(diagnostic).includes("password"), false);
  assert.equal(JSON.stringify(diagnostic).includes("example.test"), false);
});

test("sanitizes connection strings while retaining MongoDB index validation text", () => {
  assert.equal(safeMongoMessage(new Error("The field 'unique' is not valid for an _id index specification.")), "The field 'unique' is not valid for an _id index specification.");
  assert.equal(safeMongoMessage(new Error("failed mongodb+srv://user:password@example.test/db?token=nope")), "failed [REDACTED_MONGODB_URI]");
});

test("classifies nested DNS causes without exposing their messages", () => {
  const error = Object.assign(new Error("selection failed"), {
    name: "MongoServerSelectionError",
    cause: Object.assign(new Error("DNS failed"), { code: "EAI_AGAIN" })
  });

  assert.equal(classifyMongoError(error), "dns-failure");
});

test("MongoDB TLS diagnostic preserves certificate validation and reports only safe outcomes", () => {
  const script = fs.readFileSync(path.join(__dirname, "..", "scripts", "diagnose-mongodb.js"), "utf8");
  assert.match(script, /require\("node:tls"\)/);
  assert.match(script, /rejectUnauthorized:\s*true/);
  assert.match(script, /report\("TLS_HANDSHAKE"/);
  assert.doesNotMatch(script, /rejectUnauthorized:\s*false/);
});
