require('dotenv').config();
const { processQuery } = require('./services/aiService');
const fs = require('fs');

async function test() {
  process.env.GEMINI_API_KEY = 'invalid'; // Force mock

  try {
    const res = await processQuery(
      'You are a student assistant.',
      'list with marks above 85',
      'invalid',
      ['view_my_marks', 'view_my_results'],
      { students: [], faculty: [], courses: [] },
      3,
      { history: [], lastTurn: null }
    );
    fs.writeFileSync('test_output.json', JSON.stringify(res, null, 2));
    console.log("Done");
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
