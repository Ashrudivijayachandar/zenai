const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "data");

function read(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf-8"));
}

const students = read("students.json");
const enrollments = read("enrollments.json");
const attendance = read("attendance.json");
const marks = read("marks.json");
const fees = read("fees.json");

const attendanceKey = new Set(attendance.map(a => `${a.studentId}_${a.courseCode}`));
const marksKey = new Set(marks.map(m => `${m.studentId}_${m.courseCode}`));

const missingAttendance = enrollments.filter(e => !attendanceKey.has(`${e.studentId}_${e.courseCode}`));
const missingMarks = enrollments.filter(e => !marksKey.has(`${e.studentId}_${e.courseCode}`));
const missingFees = students.filter(s => !fees.some(f => f.studentId === s.id));

const output = {
  students: students.length,
  enrollments: enrollments.length,
  attendance: attendance.length,
  marks: marks.length,
  fees: fees.length,
  missingAttendance: missingAttendance.length,
  missingMarks: missingMarks.length,
  missingFees: missingFees.length,
  attendanceHasStudentId: attendance.every(a => typeof a.studentId === "number"),
  marksHasStudentId: marks.every(m => typeof m.studentId === "number"),
  sampleMissingAttendance: missingAttendance.slice(0, 3),
  sampleMissingMarks: missingMarks.slice(0, 3)
};

console.log(JSON.stringify(output, null, 2));
