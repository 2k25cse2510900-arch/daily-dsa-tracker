require('dotenv').config();
const { MongoClient } = require('mongodb');
const { createAiCodeMentorService } = require('../ai-code-mentor');
const { createUnifiedMentorProvider } = require('../ai-code-mentor-provider');

async function debugCall() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  const provider = createUnifiedMentorProvider({ env: process.env });
  const service = createAiCodeMentorService({ db, provider });

  try {
    const res = await service.createReview(
      { id: '22' },
      {
        sourceCode: 'class Solution { public int[] twoSum(int[] nums, int target) { return new int[0]; } }',
        language: 'java',
        problemTitle: 'Two Sum',
        problemNumber: 1,
        mode: 'explain',
        verdict: 'Accepted'
      }
    );
    console.log('CREATE REVIEW SUCCESS!');
    console.log('ID:', res.id);
    console.log('Provider:', res.provider);
    console.log('Model:', res.model);
    console.log('Optimal Time:', res.analysis.optimalComplexity?.timeComplexity);
    console.log('Optimal Code snippet:', res.analysis.optimalCode?.slice(0, 120));
  } catch (err) {
    console.error('CREATE REVIEW ERROR:', err.code, err.message, err.stack);
  } finally {
    await client.close();
  }
}

debugCall();
