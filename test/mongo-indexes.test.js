"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { INDEXES, createRequiredIndexes } = require("../mongo-indexes");

test("index manifest does not recreate MongoDB's built-in _id index", () => {
  assert.equal(INDEXES.some(index => Object.keys(index.key).length === 1 && index.key._id === 1), false);
  const email = INDEXES.find(index => index.collection === "memberAuthLinks" && index.name === "email_1");
  assert.deepEqual(email.options, { unique: true, partialFilterExpression: { email: { $type: "string" } } });
});

test("failing index creation identifies its exact safe operation", async () => {
  const failure = Object.assign(new Error("invalid index"), { code: 197 });
  const db = { collection(name) { return { async createIndex() { if (name === "admins") throw failure; } }; } };
  await assert.rejects(createRequiredIndexes(db), error => {
    assert.deepEqual(error.indexOperation, { collection: "admins", name: "email_1", key: { email: 1 }, options: { unique: true } });
    return true;
  });
});
