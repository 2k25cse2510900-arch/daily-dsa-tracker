"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyMongoError, safeMongoDiagnostic } = require("../diagnostics");

test("classifies common MongoDB connection failures from safe identifiers", () => {
  const cases = [
    [{ name: "MongoServerSelectionError" }, "server-selection-timeout"],
    [{ name: "Error", code: "ENOTFOUND" }, "dns-failure"],
    [{ name: "MongoServerError", code: 18 }, "authentication-failure"],
    [{ name: "MongoParseError" }, "invalid-uri"],
    [{ name: "Error", code: "ERR_TLS_CERT_ALTNAME_INVALID" }, "tls-error"],
    [{ name: "MongoNetworkError", code: "ECONNRESET" }, "network-error"],
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

test("classifies nested DNS causes without exposing their messages", () => {
  const error = Object.assign(new Error("selection failed"), {
    name: "MongoServerSelectionError",
    cause: Object.assign(new Error("DNS failed"), { code: "EAI_AGAIN" })
  });

  assert.equal(classifyMongoError(error), "dns-failure");
});
