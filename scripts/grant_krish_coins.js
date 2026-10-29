"use strict";

require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const { MongoClient } = require("mongodb");

const KRISH_MEMBER_ID = "member_mvggb1nmx303va";
const COINS_TO_ADD = 2000;

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is required.");
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  try {
    const db = client.db();
    const profilesCol = db.collection("characterVerseProfiles");
    const ledgerCol = db.collection("characterVerseRewardLedger");
    const auditCol = db.collection("audit");

    // 1. Fetch all profiles before modification
    const allProfilesBefore = await profilesCol.find({}).toArray();
    const otherBalancesBefore = new Map(
      allProfilesBefore
        .filter(p => p._id !== KRISH_MEMBER_ID)
        .map(p => [p._id, p.wallet?.coins])
    );

    // 2. Identify Krish's profile
    const krishProfileBefore = allProfilesBefore.find(p => p._id === KRISH_MEMBER_ID);
    if (!krishProfileBefore) {
      throw new Error(`Profile for Krish (${KRISH_MEMBER_ID}) not found!`);
    }

    const previousBalance = krishProfileBefore.wallet?.coins ?? 0;
    const expectedFinalBalance = previousBalance + COINS_TO_ADD;

    console.log(`[IDENTIFIED] Krish profile: ${KRISH_MEMBER_ID}`);
    console.log(`[CURRENT BALANCE] ${previousBalance} coins`);
    console.log(`[GRANT AMOUNT] +${COINS_TO_ADD} coins`);
    console.log(`[TARGET BALANCE] ${expectedFinalBalance} coins`);

    // 3. Create safety backup
    const backupDir = path.join(__dirname, "..", "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFilePath = path.join(backupDir, `characterverse-backup-pre-krish-grant-${backupTimestamp}.json`);

    const allLedgerBefore = await ledgerCol.find({}).toArray();
    fs.writeFileSync(
      backupFilePath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          reason: "Pre-grant backup before adding 2000 coins to Krish",
          characterVerseProfiles: allProfilesBefore,
          characterVerseRewardLedger: allLedgerBefore
        },
        null,
        2
      ),
      "utf8"
    );
    console.log(`[BACKUP CREATED] ${backupFilePath}`);

    // 4. Record ledger transaction
    const now = new Date();
    const txTimestamp = Date.now();
    const txKey = `characterverse:admin-grant:${KRISH_MEMBER_ID}:${txTimestamp}`;

    const ledgerEntry = {
      _id: txKey,
      transactionId: txKey,
      memberId: KRISH_MEMBER_ID,
      transactionType: "reward",
      category: "admin-grant",
      amount: COINS_TO_ADD,
      previousBalance,
      finalBalance: expectedFinalBalance,
      reason: `Admin grant of ${COINS_TO_ADD.toLocaleString()} coins to Krish`,
      status: "applied",
      createdAt: now,
      appliedAt: now
    };

    await ledgerCol.insertOne(ledgerEntry);
    console.log(`[LEDGER RECORDED] Transaction: ${txKey}`);

    // 5. Update Krish's profile atomically
    const updateResult = await profilesCol.findOneAndUpdate(
      { _id: KRISH_MEMBER_ID },
      {
        $inc: { "wallet.coins": COINS_TO_ADD },
        $addToSet: {
          walletTransactionKeys: txKey,
          appliedRewardKeys: txKey
        },
        $set: { updatedAt: now }
      },
      { returnDocument: "after" }
    );

    if (!updateResult) {
      throw new Error(`Failed to update profile for ${KRISH_MEMBER_ID}`);
    }

    // 6. Record audit log entry
    await auditCol.insertOne({
      action: "characterverse_admin_coin_grant",
      memberId: KRISH_MEMBER_ID,
      memberName: "Krish",
      previousBalance,
      finalBalance: expectedFinalBalance,
      adjustment: COINS_TO_ADD,
      transactionKey: txKey,
      timestamp: now
    });
    console.log(`[AUDIT RECORDED] Action: characterverse_admin_coin_grant`);

    // 7. Verification: Krish's balance
    const krishProfileAfter = await profilesCol.findOne({ _id: KRISH_MEMBER_ID });
    const finalBalance = krishProfileAfter?.wallet?.coins;
    console.log(`[VERIFICATION] Krish new balance in DB: ${finalBalance}`);

    if (finalBalance !== expectedFinalBalance) {
      throw new Error(`Verification failed! Expected ${expectedFinalBalance}, got ${finalBalance}`);
    }

    const balanceDifference = finalBalance - previousBalance;
    if (balanceDifference !== COINS_TO_ADD) {
      throw new Error(`Balance increase mismatch! Expected +${COINS_TO_ADD}, got +${balanceDifference}`);
    }

    // 8. Verification: No other users' balances were modified
    const allProfilesAfter = await profilesCol.find({}).toArray();
    for (const p of allProfilesAfter) {
      if (p._id !== KRISH_MEMBER_ID) {
        const prevCoins = otherBalancesBefore.get(p._id);
        const currCoins = p.wallet?.coins;
        if (currCoins !== prevCoins) {
          throw new Error(`CRITICAL: Other profile ${p._id} balance changed from ${prevCoins} to ${currCoins}!`);
        }
      }
    }
    console.log(`[VERIFICATION] Confirmed: All other 7 user balances remain exactly unchanged.`);

    // 9. Verification: Ledger entry is present and valid
    const verifiedLedger = await ledgerCol.findOne({ _id: txKey });
    if (!verifiedLedger || verifiedLedger.status !== "applied") {
      throw new Error(`Verification failed: Ledger entry ${txKey} missing or not applied!`);
    }
    console.log(`[VERIFICATION] Confirmed: Ledger entry verified with status: ${verifiedLedger.status}`);

    console.log("\n=======================================================");
    console.log(`SUCCESS: Added exactly ${COINS_TO_ADD.toLocaleString()} coins to Krish's profile.`);
    console.log(`Previous Balance: ${previousBalance.toLocaleString()} coins`);
    console.log(`New Balance:      ${finalBalance.toLocaleString()} coins`);
    console.log(`Net Change:       +${balanceDifference.toLocaleString()} coins`);
    console.log("=======================================================\n");

  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error("Error executing grant:", err);
  process.exit(1);
});
