// ============================================================
// DATA SERVICE — Reads and writes JSON files as our "database"
// Uses simple file-based storage for hackathon simplicity
// ============================================================

const fs = require("fs");
const path = require("path");
const pool = require("../db");

const DATA_DIR = path.join(__dirname, "..", "data");
let dataCache = {};
let cacheLoaded = false;

function listJsonFiles() {
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"));
}

async function ensureStoreTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_json_data (
      filename TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '[]'::jsonb,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

function readFileData(filename) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function upsertDbData(filename, data) {
  await pool.query(
    `
      INSERT INTO app_json_data (filename, data, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (filename)
      DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
    `,
    [filename, JSON.stringify(data || [])]
  );
}

async function importFilesToDb() {
  const files = listJsonFiles();
  for (const file of files) {
    const fileData = readFileData(file);
    await upsertDbData(file, fileData);
  }
}

async function loadDbToCache() {
  const rs = await pool.query(`SELECT filename, data FROM app_json_data`);
  dataCache = {};
  for (const row of rs.rows) {
    dataCache[row.filename] = row.data;
  }
  cacheLoaded = true;
}

/**
 * Initialize data layer with PostgreSQL as source of truth.
 * Imports JSON files into DB and then serves all reads from in-memory cache.
 */
async function initializeDataStore(options = {}) {
  const {
    importFromFiles = true,
    forceImport = false,
  } = options;

  await ensureStoreTable();

  const countRs = await pool.query(`SELECT COUNT(*)::int AS c FROM app_json_data`);
  const hasRows = (countRs.rows[0]?.c || 0) > 0;

  if (importFromFiles && (forceImport || !hasRows)) {
    await importFilesToDb();
  }
  await loadDbToCache();
}

/**
 * Read a JSON data file and return its parsed contents.
 * Falls back to an empty array if the file doesn't exist.
 */
function readData(filename) {
  if (cacheLoaded && Object.prototype.hasOwnProperty.call(dataCache, filename)) {
    return JSON.parse(JSON.stringify(dataCache[filename]));
  }
  return readFileData(filename);
}

/**
 * Write data (array) to a JSON file, overwriting its contents.
 */
function writeData(filename, data) {
  dataCache[filename] = data;

  // Persist asynchronously to PostgreSQL; keep sync API for existing callers.
  upsertDbData(filename, data).catch((err) => {
    console.error(`[DataService] Failed to persist ${filename} to PostgreSQL:`, err.message);
  });
}

module.exports = { readData, writeData, initializeDataStore };
