const pool = require("../db");

async function getData(filename) {
  const rs = await pool.query(`SELECT data FROM app_json_data WHERE filename=$1`, [filename]);
  return rs.rows[0]?.data || [];
}

async function setData(filename, data) {
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

function buildFees(students) {
  const baseByDept = { CSE: 82000, IT: 78000, ECE: 80000, ME: 76000, MECH: 76000, CIVIL: 74000 };
  return students.map((s) => {
    const dept = String(s.department || "").toUpperCase();
    const total = baseByDept[dept] || 75000;
    const paid = Math.round(total * 0.72);
    return {
      id: s.id,
      studentId: s.id,
      studentName: s.name,
      department: s.department,
      semester: 2,
      totalFee: total,
      paidAmount: paid,
      pendingAmount: total - paid,
      dueDate: "2026-03-31",
      status: total - paid > 0 ? "pending" : "paid",
    };
  });
}

function buildLibrary(students) {
  const catalog = [
    { id: 1, title: "Introduction to Algorithms", author: "Cormen", category: "CSE", copiesAvailable: 4 },
    { id: 2, title: "Database System Concepts", author: "Silberschatz", category: "IT", copiesAvailable: 3 },
    { id: 3, title: "Signals and Systems", author: "Oppenheim", category: "ECE", copiesAvailable: 5 },
    { id: 4, title: "Engineering Mechanics", author: "Hibbeler", category: "ME", copiesAvailable: 6 },
    { id: 5, title: "Structural Analysis", author: "R.C. Hibbeler", category: "CIVIL", copiesAvailable: 2 },
  ];

  const borrows = students.slice(0, Math.min(12, students.length)).map((s, i) => ({
    id: i + 1,
    studentId: s.id,
    studentName: s.name,
    bookId: ((i % 5) + 1),
    borrowedOn: `2026-03-${String((i % 12) + 1).padStart(2, "0")}`,
    dueDate: `2026-04-${String((i % 12) + 1).padStart(2, "0")}`,
    status: i % 5 === 0 ? "overdue" : "borrowed",
  }));

  return { catalog, borrows };
}

function parseHours(timeRange) {
  const [s, e] = String(timeRange || "").split("-");
  if (!s || !e) return 1;
  const [sh, sm] = s.split(":").map(Number);
  const [eh, em] = e.split(":").map(Number);
  const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
  return hours > 0 ? hours : 1;
}

function buildFacultyWorkload(faculty, courses, schedules, enrollments) {
  return faculty.map((f) => {
    const myCourses = courses.filter((c) => c.faculty === f.name);
    const codes = new Set(myCourses.map((c) => c.code));
    const weeklyHours = schedules.filter((s) => codes.has(s.courseCode)).reduce((sum, s) => sum + parseHours(s.time), 0);
    const assignedStudents = enrollments.filter((e) => codes.has(e.courseCode)).length;
    return {
      facultyId: f.id,
      facultyName: f.name,
      department: f.department,
      totalCourses: myCourses.length,
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      assignedStudents,
      workloadLevel: weeklyHours > 12 ? "high" : (weeklyHours > 8 ? "medium" : "normal"),
    };
  });
}

function buildFacultyAdvisees(faculty, courses, enrollments) {
  return faculty.map((f) => {
    const codes = new Set(courses.filter((c) => c.faculty === f.name).map((c) => c.code));
    const advisees = enrollments
      .filter((e) => codes.has(e.courseCode))
      .map((e) => ({ studentId: e.studentId, studentName: e.studentName, courseCode: e.courseCode }));
    return {
      facultyId: f.id,
      facultyName: f.name,
      department: f.department,
      advisees,
    };
  });
}

async function main() {
  const students = await getData("students.json");
  const faculty = await getData("faculty.json");
  const courses = await getData("courses.json");
  const schedules = await getData("schedules.json");
  const enrollments = await getData("enrollments.json");

  await setData("timetable.json", schedules);
  await setData("fees.json", buildFees(students));
  await setData("library.json", buildLibrary(students));
  await setData("faculty_workload.json", buildFacultyWorkload(faculty, courses, schedules, enrollments));
  await setData("faculty_advisees.json", buildFacultyAdvisees(faculty, courses, enrollments));

  const rs = await pool.query(`
    SELECT filename,
           CASE WHEN jsonb_typeof(data)='array' THEN jsonb_array_length(data) ELSE 1 END AS count
    FROM app_json_data
    WHERE filename IN ('timetable.json','fees.json','library.json','faculty_workload.json','faculty_advisees.json')
    ORDER BY filename
  `);

  console.log("Supplementary dataset summary:");
  for (const row of rs.rows) {
    console.log(`  ${row.filename}: ${row.count}`);
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error("Populate extras failed:", err.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});
