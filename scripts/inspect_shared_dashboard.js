"use strict";
require("dotenv").config();
const { MongoClient } = require("mongodb");

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI, { family: 4 });
  await client.connect();
  const db = client.db();
  const shared = await db.collection("dashboard").findOne({ _id: "shared" });
  console.log("Shared dashboard keys:", Object.keys(shared));
  console.log("Current week:", shared.currentWeek);
  console.log("Members:", shared.members);
  console.log("Week 1 keys:", Object.keys(shared.weeks["1"] || {}));
  if (shared.weeks["1"]) {
    console.log("Week 1 daily keys (member ids):", Object.keys(shared.weeks["1"].daily || {}));
    console.log("Week 1 concepts keys (member ids):", Object.keys(shared.weeks["1"].concepts || {}));
  }
  await client.close();
}

run().catch(console.error);
