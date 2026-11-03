"use strict";

// Explicit, idempotent companion to the lazy migration used by /api/groups.
// It only writes the new groups/groupMembers collections and never changes the
// legacy dashboard, auth links, LeetCode records, or CharacterVerse records.
require("dotenv").config();
const { MongoClient } = require("mongodb");
const { ensureLegacyGroup } = require("../group-migration");

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const result = await ensureLegacyGroup(client.db());
    console.log(result ? `Legacy group ensured: ${result}` : "No shared dashboard members found; no legacy group created.");
  } finally {
    await client.close();
  }
}

main().catch(error => {
  console.error("Legacy group migration failed:", error.message);
  process.exitCode = 1;
});
