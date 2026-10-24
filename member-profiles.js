"use strict";

function createPersonalProfileResolver({ collection, clock = () => new Date() }) {
  return async ({ id, firebaseUid, email, displayName, photoUrl }) => {
    const now = clock();
    const name = typeof displayName === "string" && displayName.trim() ? displayName.trim().slice(0, 60) : "Member";
    const fields = { email, displayName: name, lastVerifiedAt: now };
    if (typeof photoUrl === "string" && photoUrl) fields.photoUrl = photoUrl;
    const result = await collection.updateOne(
      { firebaseUid },
      {
        $setOnInsert: {
          _id: id,
          firebaseUid,
          email,
          displayName: name,
          photoUrl: typeof photoUrl === "string" && photoUrl ? photoUrl : null,
          leetCodeUsername: null,
          sessionVersion: 0,
          onboarding: true,
          createdAt: now
        },
        $set: fields
      },
      { upsert: true }
    );
    const profile = await collection.findOne({ firebaseUid, deactivatedAt: { $exists: false } });
    if (!profile) return null;
    return {
      profile,
      created: Boolean(result.upsertedId)
    };
  };
}

module.exports = { createPersonalProfileResolver };
