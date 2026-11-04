const { MongoClient } = require('mongodb');
require('dotenv').config();

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const subs = await db.collection('dailySubmissionsV2').find({
    problemSlug: 'minimum-moves-to-equal-array-elements'
  }).toArray();
  for (const s of subs) {
    console.log(`--- ID: ${s.id} | Member: ${s.memberId} | Status: ${s.status} | Lang: ${s.language} ---`);
    console.log('Code length:', s.code ? s.code.length : 0);
    if (s.code) console.log(s.code);
  }
  await client.close();
})();
