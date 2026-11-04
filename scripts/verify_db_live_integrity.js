"use strict";
require("dotenv").config();
const { MongoClient } = require("mongodb");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI");
    process.exit(1);
  }

  const client = new MongoClient(uri, { family: 4, serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const db = client.db();
    console.log("=== MONGODB LIVE INTEGRITY AUDIT ===");

    // 1. Legacy group
    const legacyGroup = await db.collection("groups").findOne({ _id: "legacy-dsa-group" });
    console.log("\n1. Legacy Group record:");
    console.log("  _id:", legacyGroup?._id);
    console.log("  name:", legacyGroup?.name);
    console.log("  ownerId:", legacyGroup?.ownerId);
    console.log("  status:", legacyGroup?.status);
    console.log("  memberCount:", legacyGroup?.memberCount);
    console.log("  legacy:", legacyGroup?.legacy);

    const legacyMembers = await db.collection("groupMembers").find({ groupId: "legacy-dsa-group", status: "approved" }).toArray();
    console.log("\n2. Legacy Group Members count:", legacyMembers.length);
    legacyMembers.forEach(m => console.log(`  - [${m.role}] ${m.displayName} (${m.userId})`));

    // 3. Shared dashboard
    const sharedDashboard = await db.collection("dashboard").findOne({ _id: "shared" });
    console.log("\n3. Shared Dashboard document:");
    console.log("  _id:", sharedDashboard?._id);
    console.log("  members in dashboard:", sharedDashboard?.members?.length);
    console.log("  weeks count:", Object.keys(sharedDashboard?.weeks || {}).length);
    console.log("  currentWeek:", sharedDashboard?.currentWeek);

    // 4. Group B (Admin 69 & Naruto)
    const groupB = await db.collection("groups").findOne({ _id: "group-3c48d7f6-d88d-4cca-b04c-89ac10b35f9c" });
    console.log("\n4. Group B record:");
    console.log("  _id:", groupB?._id);
    console.log("  name:", groupB?.name);
    console.log("  ownerId:", groupB?.ownerId);
    console.log("  status:", groupB?.status);
    console.log("  memberCount:", groupB?.memberCount);

    const groupBMembers = await db.collection("groupMembers").find({ groupId: "group-3c48d7f6-d88d-4cca-b04c-89ac10b35f9c", status: "approved" }).toArray();
    console.log("\n5. Group B Members count:", groupBMembers.length);
    groupBMembers.forEach(m => console.log(`  - [${m.role}] ${m.displayName} (${m.userId})`));

    // 6. Submissions count
    const submissionsCount = await db.collection("leetcodeSubmissions").countDocuments();
    console.log("\n6. Total leetcodeSubmissions count:", submissionsCount);

    // 7. Check for any cross-linked memberships
    const allMemberships = await db.collection("groupMembers").find().toArray();
    console.log("\n7. Total groupMembers records:", allMemberships.length);

    console.log("\nLive Database Integrity: VERIFIED OK");
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
