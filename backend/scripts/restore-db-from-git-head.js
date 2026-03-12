const { execSync } = require("child_process");
const path = require("path");
const pool = require("../db");

const FILES = [
  "backend/data/agents.json",
  "backend/data/alerts.json",
  "backend/data/attendance.json",
  "backend/data/courses.json",
  "backend/data/enrollments.json",
  "backend/data/exams.json",
  "backend/data/faculty.json",
  "backend/data/logs.json",
  "backend/data/marks.json",
  "backend/data/notices.json",
  "backend/data/schedules.json",
  "backend/data/students.json",
];

async function ensureStoreTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_json_data (
      filename TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function upsert(filename, data) {
  await pool.query(
    `
      INSERT INTO app_json_data (filename, data, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (filename)
      DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
    `,
    [filename, JSON.stringify(data)]
  );
}

async function main() {
  await ensureStoreTable();

  for (const rel of FILES) {
    const raw = execSync(`git show HEAD:${rel}`, {
      cwd: path.join(__dirname, "..", ".."),
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const data = JSON.parse(raw);
    await upsert(path.basename(rel), data);
    const count = Array.isArray(data) ? data.length : Object.keys(data || {}).length;
    console.log(`Restored ${path.basename(rel)} -> ${count}`);
  }

  const rs = await pool.query(`
    SELECT filename,
           CASE WHEN jsonb_typeof(data)='array' THEN jsonb_array_length(data) ELSE 1 END AS count
    FROM app_json_data
    ORDER BY filename
  `);
  console.log("\nCurrent DB summary:");
  for (const row of rs.rows) {
    console.log(`  ${row.filename}: ${row.count}`);
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error("Restore failed:", err.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
