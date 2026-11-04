"use strict";
require("dotenv").config();
const { MongoClient } = require("mongodb");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("No MONGODB_URI in .env");
    return;
  }
  let client;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Connection attempt ${attempt}...`);
      client = new MongoClient(uri, {
        family: 4,
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000
      });
      await client.connect();
      console.log("Connected successfully!");
      break;
    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message);
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  try {
    const db = client.db();
    console.log("Connected to DB:", db.databaseName);
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));

    // Groups
    if (collections.some(c => c.name === "groups")) {
      const groups = await db.collection("groups").find().toArray();
      console.log("\n--- GROUPS ---");
      console.log(JSON.stringify(groups, null, 2));
    }

    // Group Members
    if (collections.some(c => c.name === "groupMembers")) {
      const groupMembers = await db.collection("groupMembers").find().toArray();
      console.log("\n--- GROUP MEMBERS ---");
      console.log(JSON.stringify(groupMembers, null, 2));
    }

    // Group Join Requests
    if (collections.some(c => c.name === "groupJoinRequests")) {
      const groupJoinRequests = await db.collection("groupJoinRequests").find().toArray();
      console.log("\n--- GROUP JOIN REQUESTS ---");
      console.log(JSON.stringify(groupJoinRequests, null, 2));
    }

    // Group Invitations
    if (collections.some(c => c.name === "groupInvitations")) {
      const groupInvitations = await db.collection("groupInvitations").find().toArray();
      console.log("\n--- GROUP INVITATIONS ---");
      console.log(JSON.stringify(groupInvitations, null, 2));
    }

    // Member Profiles
    if (collections.some(c => c.name === "memberProfiles")) {
      const profiles = await db.collection("memberProfiles").find().project({ _id: 1, name: 1, email: 1, role: 1, numericId: 1, memberId: 1 }).toArray();
      console.log("\n--- MEMBER PROFILES (summary) ---");
      console.log(JSON.stringify(profiles, null, 2));
    }

    // Member Auth Links
    if (collections.some(c => c.name === "memberAuthLinks")) {
      const authLinks = await db.collection("memberAuthLinks").find().toArray();
      console.log("\n--- MEMBER AUTH LINKS ---");
      console.log(JSON.stringify(authLinks, null, 2));
    }

    // Dashboard
    if (collections.some(c => c.name === "dashboard")) {
      const shared = await db.collection("dashboard").findOne({ _id: "shared" });
      if (shared) {
        console.log("\n--- DASHBOARD SHARED ---");
        console.log("Keys:", Object.keys(shared));
        if (shared.members) console.log("Members count:", shared.members.length, shared.members.map(m => ({ id: m.id, name: m.name })));
        if (shared.concepts) console.log("Concepts count:", shared.concepts.length, shared.concepts.slice(0, 2));
        if (shared.daily) console.log("Daily keys/sample:", typeof shared.daily, Object.keys(shared.daily || {}).slice(0, 5));
      }
    }

    // Daily Submissions / Daily Workspace
    for (const cname of ["dailyWorkspace", "leetcodeSubmissions", "dailySubmissions", "submissions", "submissionRecords", "dailyTracking", "studentDailyActivity", "concepts", "dailyConcepts"]) {
      if (collections.some(c => c.name === cname)) {
        const count = await db.collection(cname).countDocuments();
        const sample = await db.collection(cname).find().limit(2).toArray();
        console.log(`\n--- COLLECTION: ${cname} (count: ${count}) ---`);
        console.log(JSON.stringify(sample, null, 2));
      }
    }

    // Race sessions / arena
    for (const cname of ["raceSessions", "arenaRaces", "races", "arenaSessions"]) {
      if (collections.some(c => c.name === cname)) {
        const count = await db.collection(cname).countDocuments();
        const sample = await db.collection(cname).find().limit(2).toArray();
        console.log(`\n--- COLLECTION: ${cname} (count: ${count}) ---`);
        console.log(JSON.stringify(sample, null, 2));
      }
    }

  } finally {
    if (client) await client.close();
  }
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
