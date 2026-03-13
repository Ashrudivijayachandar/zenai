const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ host: 'localhost', port: 5432, user: 'postgres', password: 'Ashrudi', database: 'zenai' });

(async () => {
  try {
    const s = await pool.query('SELECT id, name, email, department, year, gpa, roll_number FROM students');
    const f = await pool.query('SELECT id, name, email, department, designation, subjects FROM faculty');
    fs.writeFileSync('db_users.json', JSON.stringify({ students: s.rows, faculty: f.rows }, null, 2));
    console.log('Done: db_users.json');
  } catch(e) {
    console.error(e.message);
  } finally {
    pool.end();
  }
})();
