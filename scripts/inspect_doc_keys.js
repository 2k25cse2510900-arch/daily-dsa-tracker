const { MongoClient } = require('mongodb');
require('dotenv').config();

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  const doc = await db.collection('dailySubmissionsV2').findOne({
    problemSlug: 'minimum-moves-to-equal-array-elements'
  });
  console.log('Keys:', Object.keys(doc));
  console.log('Doc preview:', JSON.stringify(doc, null, 2));
  await client.close();
})();
