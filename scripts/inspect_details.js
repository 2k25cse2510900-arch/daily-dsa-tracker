"use strict";
require("dotenv").config();
const { MongoClient } = require("mongodb");

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { family: 4 });
  await client.connect();
  const db = client.db();

  console.log("=== GROUP MEMBERS FOR legacy-dsa-group ===");
  const legacyMembers = await db.collection("groupMembers").find({ groupId: "legacy-dsa-group" }).toArray();
  console.log(legacyMembers.map(m => ({ userId: m.userId, name: m.displayName, role: m.role })));

  console.log("=== GROUP MEMBERS FOR 69's group ===");
  const groupB = await db.collection("groups").findOne({ _id: "group-3c48d7f6-d88d-4cca-b04c-89ac10b35f9c" });
  console.log("Group B:", groupB);
  const groupBMembers = await db.collection("groupMembers").find({ groupId: "group-3c48d7f6-d88d-4cca-b04c-89ac10b35f9c" }).toArray();
  console.log(groupBMembers.map(m => ({ userId: m.userId, name: m.displayName, role: m.role })));

  console.log("=== DAILY WORKSPACES ===");
  const dw = await db.collection("dailyWorkspaces").find().limit(3).toArray();
  console.log(JSON.stringify(dw, null, 2));

  console.log("=== DAILY SUBMISSIONS V2 ===");
  const ds2 = await db.collection("dailySubmissionsV2").find().limit(3).toArray();
  console.log(JSON.stringify(ds2, null, 2));

  console.log("=== LEETCODE ACTIVITY ===");
  const la = await db.collection("leetcodeActivity").find().limit(3).toArray();
  console.log(JSON.stringify(la, null, 2));

  await client.close();
}

main().catch(console.error);
