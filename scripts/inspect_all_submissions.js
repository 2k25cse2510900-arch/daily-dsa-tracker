"use strict";
const { MongoClient } = require("mongodb");
require("dotenv").config();

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const allSubs = await db.collection("dailySubmissionsV2").find({}).toArray();
  console.log("Total dailySubmissionsV2 records:", allSubs.length);
  const seen = new Set();
  for (const s of allSubs) {
    const key = `${s.problemTitle} [slug: ${s.problemSlug}, id: ${s.frontendId || s.submissionId}] (lang: ${s.language}, verdict: ${s.verdict})`;
    if (!seen.has(key)) {
      seen.add(key);
      console.log(key);
    }
  }
  await client.close();
}

run().catch(console.error);
