const fs = require("fs");
const path = require("path");
const { initializeDataStore } = require("../services/dataService");
const pool = require("../db");

const DATA_DIR = path.join(__dirname, "..", "data");

function listJsonFiles() {
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"));
}

async function countsFromDb() {
  const rs = await pool.query(
    `
      SELECT
        filename,
        CASE
          WHEN jsonb_typeof(data) = 'array' THEN jsonb_array_length(data)
          ELSE 1
        END AS count,
        jsonb_typeof(data) AS type
      FROM app_json_data
      ORDER BY filename
    `
  );
  return rs.rows;
}

function clearJsonFilesToEmptyArrays() {
  const files = listJsonFiles();
  for (const file of files) {
    fs.writeFileSync(path.join(DATA_DIR, file), "[]\n", "utf-8");
  }
  return files.length;
}

async function main() {
  const shouldClear = process.argv.includes("--clear-json");

  await initializeDataStore({ importFromFiles: true });

  const summary = await countsFromDb();
  console.log("Migration summary (PostgreSQL app_json_data):");
  for (const row of summary) {
    console.log(`  ${row.filename}: ${row.count} (${row.type})`);
  }

  if (shouldClear) {
    const n = clearJsonFilesToEmptyArrays();
    console.log(`Cleared JSON demo data content in ${n} files (set to []).`);
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error("Migration failed:", err.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
