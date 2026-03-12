const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf-8"));
}

function writeJson(name, value) {
  fs.writeFileSync(path.join(dataDir, name), JSON.stringify(value, null, 2) + "\n", "utf-8");
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function makeAttendanceStatus(studentId, courseCode, dayIndex) {
  const base = hashCode(`${studentId}-${courseCode}`) % 100;
  const score = (base + dayIndex * 11) % 100;
  if (score < 13) return "absent";
  if (score < 20) return "absent";
  return "present";
}

function ensureAtRiskPattern(records, studentId, courseCode) {
  const target = records.filter(r => r.studentId === studentId && r.courseCode === courseCode);
  if (target.length === 0) return;

  const absentsNeeded = Math.max(2, Math.ceil(target.length * 0.35));
  for (let i = 0; i < target.length; i++) {
    target[i].status = i < absentsNeeded ? "absent" : "present";
  }
}

function scoreFromAttendance(student, presentPct, kind, courseCode) {
  const gpaBoost = (Number(student.gpa) || 7) * 6;
  const base = presentPct * 0.55 + gpaBoost;
  const noise = (hashCode(`${student.id}-${courseCode}-${kind}`) % 9) - 4;
  let score = Math.round(base + noise + (kind === "final" ? 4 : 0));
  if (score > 99) score = 99;
  if (score < 35) score = 35;
  return score;
}

function buildSchedulesFromCourses(courses) {
  const scheduleRows = [];
  let id = 1;

  const parseBlocks = (s) => {
    const text = String(s || "").trim();
    if (!text) return [];

    const parts = text.split(" ");
    if (parts.length < 2) return [];

    const daysText = parts[0];
    const timeText = parts.slice(1).join(" ");
    const rawDays = daysText.split("/");

    const dayMap = {
      Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
      Monday: "Monday", Tuesday: "Tuesday", Wednesday: "Wednesday", Thursday: "Thursday", Friday: "Friday", Saturday: "Saturday", Sunday: "Sunday"
    };

    return rawDays.map(d => dayMap[d] || d).map(day => ({ day, time: timeText }));
  };

  for (const c of courses) {
    const blocks = parseBlocks(c.schedule);
    for (const b of blocks) {
      scheduleRows.push({
        id: id++,
        day: b.day,
        time: b.time,
        courseCode: c.code,
        courseName: c.name,
        faculty: c.faculty,
        room: `${c.department}-LH-${100 + (c.id || id)}`,
        department: c.department,
        semester: c.semester
      });
    }
  }

  return scheduleRows;
}

function buildFees(students) {
  const semesterFee = {
    CSE: 82000,
    IT: 78000,
    ECE: 80000,
    ME: 76000,
    MECH: 76000,
    CIVIL: 74000
  };

  return students.map((s) => {
    const key = String(s.department || "").toUpperCase();
    const total = semesterFee[key] || 75000;
    const paidRatioRaw = ((hashCode(`${s.id}-${s.name}`) % 41) + 55) / 100;
    const paid = Math.round(total * paidRatioRaw);
    const pending = total - paid;
    return {
      id: s.id,
      studentId: s.id,
      studentName: s.name,
      department: s.department,
      semester: 2,
      totalFee: total,
      paidAmount: paid,
      pendingAmount: pending,
      dueDate: "2026-03-31",
      status: pending === 0 ? "paid" : (pending < total * 0.25 ? "partial" : "pending")
    };
  });
}

function buildFacultyWorkload(faculty, courses, schedules, enrollments) {
  return faculty.map((f) => {
    const myCourses = courses.filter(c => c.faculty === f.name);
    const codes = new Set(myCourses.map(c => c.code));
    const weeklyHours = schedules
      .filter(s => codes.has(s.courseCode))
      .reduce((sum, s) => {
        const [start, end] = String(s.time).split("-");
        if (!start || !end) return sum + 1;
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        const diff = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
        return sum + (diff > 0 ? diff : 1);
      }, 0);

    const studentCount = enrollments.filter(e => codes.has(e.courseCode)).length;

    return {
      facultyId: f.id,
      facultyName: f.name,
      department: f.department,
      courses: myCourses.map(c => ({ code: c.code, name: c.name, semester: c.semester })),
      totalCourses: myCourses.length,
      weeklyHours: Math.round(weeklyHours * 10) / 10,
      assignedStudents: studentCount,
      workloadLevel: weeklyHours > 12 ? "high" : (weeklyHours > 8 ? "medium" : "normal")
    };
  });
}

function buildLibraryData(students) {
  const catalog = [
    { id: 1, title: "Introduction to Algorithms", author: "Cormen", category: "CSE", copiesAvailable: 4 },
    { id: 2, title: "Database System Concepts", author: "Silberschatz", category: "IT", copiesAvailable: 3 },
    { id: 3, title: "Signals and Systems", author: "Oppenheim", category: "ECE", copiesAvailable: 5 },
    { id: 4, title: "Engineering Mechanics", author: "Hibbeler", category: "ME", copiesAvailable: 6 },
    { id: 5, title: "Structural Analysis", author: "R.C. Hibbeler", category: "CIVIL", copiesAvailable: 2 }
  ];

  const borrows = students.slice(0, 12).map((s, i) => ({
    id: i + 1,
    studentId: s.id,
    studentName: s.name,
    bookId: (i % catalog.length) + 1,
    borrowedOn: `2026-03-${String((i % 12) + 1).padStart(2, "0")}`,
    dueDate: `2026-04-${String((i % 12) + 1).padStart(2, "0")}`,
    status: i % 5 === 0 ? "overdue" : "borrowed"
  }));

  return { catalog, borrows };
}

function buildNotices(existingNotices) {
  const base = existingNotices && existingNotices.length > 0 ? existingNotices : [];
  const hasLibrary = base.some(n => String(n.title || "").toLowerCase().includes("library"));
  if (!hasLibrary) {
    base.push({
      id: (base.length ? Math.max(...base.map(n => n.id || 0)) : 0) + 1,
      title: "Library Hours Extended",
      category: "general",
      department: "ALL",
      content: "Library remains open until 10 PM during exam season.",
      date: "2026-03-10",
      priority: "low"
    });
  }
  return base.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function main() {
  const students = readJson("students.json");
  const courses = readJson("courses.json");
  const enrollments = readJson("enrollments.json");
  const faculty = readJson("faculty.json");
  const existingNotices = readJson("notices.json");

  const schedules = buildSchedulesFromCourses(courses);
  const classDays = [
    "2026-02-03", "2026-02-05", "2026-02-10", "2026-02-12", "2026-02-17", "2026-02-19", "2026-02-24", "2026-02-26"
  ];

  const attendance = [];
  let attendanceId = 1;

  for (const e of enrollments) {
    const student = students.find(s => s.id === e.studentId);
    if (!student) continue;

    for (let i = 0; i < classDays.length; i++) {
      attendance.push({
        id: attendanceId++,
        studentId: student.id,
        studentName: student.name,
        courseCode: e.courseCode,
        courseName: e.courseName,
        date: classDays[i],
        status: makeAttendanceStatus(student.id, e.courseCode, i)
      });
    }
  }

  const forceLow = [
    { studentName: "Karthik Raja", courseCode: "CS201" },
    { studentName: "Aditya Bhatt", courseCode: "ME201" },
    { studentName: "Amit Kumar", courseCode: "EC301" }
  ];

  for (const r of forceLow) {
    const s = students.find(st => st.name === r.studentName);
    if (s) ensureAtRiskPattern(attendance, s.id, r.courseCode);
  }

  const groupedAttendance = {};
  for (const a of attendance) {
    const key = `${a.studentId}_${a.courseCode}`;
    if (!groupedAttendance[key]) groupedAttendance[key] = { present: 0, total: 0 };
    groupedAttendance[key].total++;
    if (a.status === "present") groupedAttendance[key].present++;
  }

  const marks = [];
  let marksId = 1;
  const examDates = { midterm: "2026-02-15", final: "2026-03-10" };

  for (const e of enrollments) {
    const student = students.find(s => s.id === e.studentId);
    if (!student) continue;

    const key = `${student.id}_${e.courseCode}`;
    const stats = groupedAttendance[key] || { present: 6, total: 8 };
    const pct = Math.round((stats.present / Math.max(1, stats.total)) * 100);

    for (const kind of ["midterm", "final"]) {
      marks.push({
        id: marksId++,
        studentId: student.id,
        studentName: student.name,
        courseCode: e.courseCode,
        courseName: e.courseName,
        type: kind,
        marks: scoreFromAttendance(student, pct, kind, e.courseCode),
        maxMarks: 100,
        date: examDates[kind]
      });
    }
  }

  const fees = buildFees(students);
  const facultyWorkload = buildFacultyWorkload(faculty, courses, schedules, enrollments);
  const facultyAdvisees = faculty.map((f) => {
    const myCourses = courses.filter(c => c.faculty === f.name).map(c => c.code);
    const advisees = enrollments
      .filter(e => myCourses.includes(e.courseCode))
      .map(e => ({ studentId: e.studentId, studentName: e.studentName, courseCode: e.courseCode }));

    const uniq = [];
    const seen = new Set();
    for (const a of advisees) {
      const k = `${a.studentId}_${a.courseCode}`;
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(a);
    }

    return {
      facultyId: f.id,
      facultyName: f.name,
      department: f.department,
      advisees: uniq
    };
  });

  const library = buildLibraryData(students);
  const notices = buildNotices(existingNotices);

  writeJson("attendance.json", attendance);
  writeJson("marks.json", marks);
  writeJson("schedules.json", schedules);
  writeJson("timetable.json", schedules);
  writeJson("fees.json", fees);
  writeJson("faculty_workload.json", facultyWorkload);
  writeJson("faculty_advisees.json", facultyAdvisees);
  writeJson("library.json", library);
  writeJson("notices.json", notices);

  writeJson("alerts.json", []);

  console.log(`Seed complete:`);
  console.log(`  attendance: ${attendance.length}`);
  console.log(`  marks: ${marks.length}`);
  console.log(`  schedules: ${schedules.length}`);
  console.log(`  fees: ${fees.length}`);
  console.log(`  faculty_workload: ${facultyWorkload.length}`);
  console.log(`  faculty_advisees: ${facultyAdvisees.length}`);
}

main();
