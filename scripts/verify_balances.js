"use strict";

require("dotenv").config();
const { MongoClient } = require("mongodb");

async function verify() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  try {
    const db = client.db();
    
    // Krish profile
    const krish = await db.collection("characterVerseProfiles").findOne({ _id: "member_mvggb1nmx303va" });
    console.log("Krish wallet:", krish.wallet);
    console.log("Krish last updated:", krish.updatedAt);
    
    // All profiles
    const profiles = await db.collection("characterVerseProfiles").find({}).toArray();
    console.log("\nAll profile balances:");
    for (const p of profiles) {
      console.log(`- ${p._id}: ${p.wallet?.coins} coins`);
    }

    // Latest ledger entry for Krish
    const latestLedger = await db.collection("characterVerseRewardLedger").findOne({ memberId: "member_mvggb1nmx303va" }, { sort: { createdAt: -1 } });
    console.log("\nLatest Krish ledger entry:", latestLedger);

    // Latest audit entry for Krish
    const latestAudit = await db.collection("audit").findOne({ memberId: "member_mvggb1nmx303va" }, { sort: { timestamp: -1 } });
    console.log("\nLatest Krish audit entry:", latestAudit);

  } finally {
    await client.close();
  }
}

verify().catch(console.error);
