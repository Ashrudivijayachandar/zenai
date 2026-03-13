require('dotenv').config();
const pool = require('../db');

async function resetAgents() {
  try {
    // Delete agents from DB to force re-import from file
    const r = await pool.query("DELETE FROM app_json_data WHERE filename = 'agents.json'");
    console.log('Deleted agents from DB:', r.rowCount, 'rows');
    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

resetAgents();
