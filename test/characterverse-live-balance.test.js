"use strict";

require("dotenv").config();
const assert = require("node:assert/strict");
const test = require("node:test");
const { MongoClient } = require("mongodb");
const express = require("express");
const { publicProfile, ensureProfile } = require("../characterverse-profiles");
const { publicLedgerEntry } = require("../characterverse-rewards");

// This suite reads live member balances and calls ensureProfile through its
// API checks. Keep it out of the default test run so `npm test` never connects
// to a configured production database by accident.
const liveBalanceTestOptions = {
  skip: process.env.RUN_CHARACTERVERSE_LIVE_BALANCE_TESTS !== "1"
};

const EXPECTED_BALANCES = Object.freeze({
  "member_mvggb1nmx303va": { name: "Krish", expectedCoins: 5550 },
  "member_mvggbpb5y8e3h9": { name: "Kartik Kumar", expectedCoins: 605 },
  "member_mvggcet3ogmjrn": { name: "Tanmay Awasthi", expectedCoins: 290 },
  "member_mvggcs86gcby6t": { name: "Avantika Yadav", expectedCoins: 375 },
  "member_mvggd5du6db87b": { name: "Kshitij Rajput", expectedCoins: 235 },
  "member_mvggdgrdrgmkdf": { name: "Krishna Kumar Gaur", expectedCoins: 160 },
  "member_mvggdw3xiz0d21": { name: "Kanika Dwivedi", expectedCoins: 110 },
  "member_mvggeccjh94w6y": { name: "Deepanshu Sachan", expectedCoins: 105 },
});

test("live database verification: all 8 member wallets match approved target balances exactly", liveBalanceTestOptions, async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  try {
    const db = client.db();
    const profiles = await db.collection("characterVerseProfiles").find({}).toArray();
    assert.equal(profiles.length, 8, "Expected exactly 8 CharacterVerse profiles");

    let sum = 0;
    for (const [memberId, info] of Object.entries(EXPECTED_BALANCES)) {
      const profile = profiles.find(p => p._id === memberId);
      assert.ok(profile, `Profile for ${info.name} (${memberId}) must exist`);
      assert.equal(
        profile.wallet?.coins,
        info.expectedCoins,
        `Expected ${info.name} to have ${info.expectedCoins} coins in DB, found ${profile.wallet?.coins}`
      );
      sum += profile.wallet.coins;
    }

    assert.equal(sum, 7430, "Total persisted coins across all 8 members must equal exactly 7,430");
  } finally {
    await client.close();
  }
});

test("live ledger and audit verification: all 8 reconciliation entries are persisted with applied status", liveBalanceTestOptions, async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  try {
    const db = client.db();
    const ledgerEntries = await db
      .collection("characterVerseRewardLedger")
      .find({ batchId: "FINAL-APPROVED-BATCH-20261026" })
      .toArray();

    assert.equal(ledgerEntries.length, 8, "Expected 8 reconciliation ledger records");

    for (const [memberId, info] of Object.entries(EXPECTED_BALANCES)) {
      const entry = ledgerEntries.find(e => e.memberId === memberId);
      assert.ok(entry, `Ledger entry for ${info.name} must exist`);
      assert.equal(entry.status, "applied");
      assert.equal(entry.finalBalance, info.expectedCoins);
      assert.equal(entry.transactionType, "reconciliation");
    }

    const auditEntries = await db
      .collection("audit")
      .find({ batchId: "FINAL-APPROVED-BATCH-20261026" })
      .toArray();

    assert.ok(auditEntries.length >= 8, "Expected at least 8 audit log records");
  } finally {
    await client.close();
  }
});

test("API verification: /api/characterverse/me and /api/characterverse/me/rewards return authentic balances for all members", liveBalanceTestOptions, async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  try {
    const db = client.db();

    // Set up a mock express server using the real endpoint logic from server.js
    const app = express();
    app.use(express.json());

    // Middleware to inject simulated authenticated member
    let activeMemberId = null;
    app.use((req, res, next) => {
      req.member = { id: activeMemberId };
      next();
    });

    app.get("/api/characterverse/me", async (req, res) => {
      const profile = await ensureProfile(db.collection("characterVerseProfiles"), req.member.id);
      res.json(publicProfile(profile));
    });

    app.get("/api/characterverse/me/rewards", async (req, res) => {
      const [profile, entries] = await Promise.all([
        ensureProfile(db.collection("characterVerseProfiles"), req.member.id),
        db.collection("characterVerseRewardLedger").find({ memberId: req.member.id, status: "applied" }).sort({ appliedAt: -1, createdAt: -1 }).limit(100).toArray()
      ]);
      const history = entries.map(publicLedgerEntry);
      const totalEarned = entries.filter(entry => entry.transactionType === "reward").reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
      const totalSpent = entries.filter(entry => entry.transactionType === "purchase").reduce((sum, entry) => sum + Math.abs(Number(entry.amount) || 0), 0);
      res.json({ balance: profile.wallet?.coins ?? 0, totalEarned, totalSpent, history });
    });

    const server = await new Promise(resolve => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const port = server.address().port;

    try {
      for (const [memberId, info] of Object.entries(EXPECTED_BALANCES)) {
        activeMemberId = memberId;

        // Test /api/characterverse/me
        const resMe = await fetch(`http://127.0.0.1:${port}/api/characterverse/me`);
        assert.equal(resMe.status, 200);
        const dataMe = await resMe.json();
        assert.equal(
          dataMe.wallet?.coins,
          info.expectedCoins,
          `API /api/characterverse/me for ${info.name} must return ${info.expectedCoins}`
        );

        // Test /api/characterverse/me/rewards
        const resRewards = await fetch(`http://127.0.0.1:${port}/api/characterverse/me/rewards`);
        assert.equal(resRewards.status, 200);
        const dataRewards = await resRewards.json();
        assert.equal(
          dataRewards.balance,
          info.expectedCoins,
          `API /api/characterverse/me/rewards for ${info.name} must return balance ${info.expectedCoins}`
        );
      }
    } finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  } finally {
    await client.close();
  }
});
