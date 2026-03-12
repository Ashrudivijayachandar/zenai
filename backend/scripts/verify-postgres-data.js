const pool = require("../db");

async function main() {
  const total = await pool.query("SELECT COUNT(*)::int AS c FROM app_json_data");
  const rows = await pool.query(`
    SELECT
      filename,
      jsonb_typeof(data) AS type,
      CASE
        WHEN jsonb_typeof(data) = 'array' THEN jsonb_array_length(data)
        ELSE 1
      END AS count
    FROM app_json_data
    ORDER BY filename
  `);

  console.log(JSON.stringify({
    totalFilesInDb: total.rows[0].c,
    files: rows.rows,
  }, null, 2));

  await pool.end();
}

main().catch(async (err) => {
  console.error(err.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
