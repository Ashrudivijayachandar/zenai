const { readData, writeData } = require("./dataService");

function nextId(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 1;
  return Math.max(...rows.map((r) => Number(r.id) || 0)) + 1;
}

function containsName(source, target) {
  return String(source || "").toLowerCase().includes(String(target || "").toLowerCase());
}

function executeAction(action, data = {}, currentUser = null) {
  switch (action) {
    case "view_my_courses": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const enrollments = readData("enrollments.json");
      const rows = enrollments.filter((e) => containsName(e.studentName, currentUser.name));
      return { success: true, message: `Found ${rows.length} course(s).`, data: rows };
    }

    case "view_my_gpa": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const students = readData("students.json");
      const me = students.find((s) => String(s.name || "").toLowerCase() === String(currentUser.name || "").toLowerCase());
      if (!me) return { success: false, message: "Student profile not found.", data: null };
      return { success: true, message: `Your current GPA is ${me.gpa}.`, data: me };
    }

    case "view_course_details": {
      const courses = readData("courses.json");
      let row = null;
      if (data.courseCode) {
        row = courses.find((c) => String(c.code || "").toLowerCase() === String(data.courseCode).toLowerCase());
      }
      if (!row && data.name) {
        row = courses.find((c) => containsName(c.name, data.name));
      }
      if (!row) return { success: false, message: "Course not found.", data: null };
      return { success: true, message: `Details for ${row.name}.`, data: row };
    }

    case "view_my_attendance": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const attendance = readData("attendance.json");
      let rows = attendance.filter((a) => containsName(a.studentName, currentUser.name));
      if (data.courseCode) rows = rows.filter((a) => String(a.courseCode) === String(data.courseCode));
      return { success: true, message: `Found ${rows.length} attendance record(s).`, data: rows };
    }

    case "view_my_attendance_report": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const attendance = readData("attendance.json");
      const rows = attendance.filter((a) => containsName(a.studentName, currentUser.name));
      const total = rows.length;
      const present = rows.filter((a) => String(a.status || "").toLowerCase() === "present").length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 100;
      return {
        success: true,
        message: `Attendance: ${present}/${total} (${percentage}%).`,
        data: { total, present, absent: total - present, percentage, records: rows },
      };
    }

    case "view_my_marks": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const marks = readData("marks.json");
      let rows = marks.filter((m) => containsName(m.studentName, currentUser.name));
      if (data.courseCode) rows = rows.filter((m) => String(m.courseCode) === String(data.courseCode));
      if (data.type) rows = rows.filter((m) => String(m.type || "").toLowerCase() === String(data.type).toLowerCase());
      if (data.minMarks !== undefined) rows = rows.filter((m) => Number(m.marks) >= Number(data.minMarks));
      if (data.maxMarks !== undefined) rows = rows.filter((m) => Number(m.marks) <= Number(data.maxMarks));
      return { success: true, message: `Found ${rows.length} marks record(s).`, data: rows };
    }

    case "view_my_results": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const marks = readData("marks.json");
      const rows = marks.filter((m) => containsName(m.studentName, currentUser.name));
      return { success: true, message: `Found ${rows.length} result record(s).`, data: rows };
    }

    case "view_my_timetable": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const schedules = readData("schedules.json");
      const enrollments = readData("enrollments.json");
      const myCodes = enrollments
        .filter((e) => containsName(e.studentName, currentUser.name))
        .map((e) => String(e.courseCode));
      let rows = schedules.filter((s) => myCodes.includes(String(s.courseCode)));
      if (data.day) rows = rows.filter((s) => String(s.day || "").toLowerCase() === String(data.day).toLowerCase());
      return { success: true, message: `Found ${rows.length} class(es).`, data: rows };
    }

    case "view_exam_schedule": {
      let rows = readData("exams.json");
      if (data.course) rows = rows.filter((e) => containsName(e.course, data.course));
      if (data.type) rows = rows.filter((e) => String(e.type || "").toLowerCase() === String(data.type).toLowerCase());
      return { success: true, message: `Found ${rows.length} exam(s).`, data: rows };
    }

    case "view_my_profile": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const students = readData("students.json");
      const me = students.find((s) => String(s.name || "").toLowerCase() === String(currentUser.name || "").toLowerCase());
      if (!me) return { success: false, message: "Profile not found.", data: null };
      return { success: true, message: `Profile for ${me.name}.`, data: me };
    }

    case "update_my_profile": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const students = readData("students.json");
      const idx = students.findIndex((s) => String(s.name || "").toLowerCase() === String(currentUser.name || "").toLowerCase());
      if (idx === -1) return { success: false, message: "Profile not found.", data: null };
      students[idx] = { ...students[idx], ...(data.phone ? { phone: data.phone } : {}), ...(data.email ? { email: data.email } : {}) };
      writeData("students.json", students);
      return { success: true, message: "Profile updated.", data: students[idx] };
    }

    case "view_notices": {
      let rows = readData("notices.json");
      if (data.category) rows = rows.filter((n) => String(n.category || "").toLowerCase() === String(data.category).toLowerCase());
      if (data.priority) rows = rows.filter((n) => String(n.priority || "").toLowerCase() === String(data.priority).toLowerCase());
      return { success: true, message: `Found ${rows.length} notice(s).`, data: rows };
    }

    case "view_my_faculty_profile": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const faculty = readData("faculty.json");
      const me = faculty.find((f) => containsName(f.name, currentUser.name));
      if (!me) return { success: false, message: "Faculty profile not found.", data: null };
      return { success: true, message: `Profile for ${me.name}.`, data: me };
    }

    case "update_my_faculty_profile": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const faculty = readData("faculty.json");
      const idx = faculty.findIndex((f) => containsName(f.name, currentUser.name));
      if (idx === -1) return { success: false, message: "Faculty profile not found.", data: null };
      faculty[idx] = { ...faculty[idx], ...(data.phone ? { phone: data.phone } : {}), ...(data.email ? { email: data.email } : {}) };
      writeData("faculty.json", faculty);
      return { success: true, message: "Faculty profile updated.", data: faculty[idx] };
    }

    case "view_schedule": {
      let rows = readData("schedules.json");
      if (currentUser) rows = rows.filter((s) => containsName(s.faculty, currentUser.name));
      if (data.day) rows = rows.filter((s) => String(s.day || "").toLowerCase() === String(data.day).toLowerCase());
      return { success: true, message: `Found ${rows.length} schedule item(s).`, data: rows };
    }

    case "enter_marks": {
      const marks = readData("marks.json");
      const row = {
        id: nextId(marks),
        studentName: data.studentName || "Unknown",
        courseCode: data.courseCode || "GENERAL",
        courseName: data.courseName || data.courseCode || "Unknown",
        type: data.type || "midterm",
        marks: Number(data.marks || 0),
        maxMarks: Number(data.maxMarks || 100),
        date: data.date || new Date().toISOString().split("T")[0],
      };
      marks.push(row);
      writeData("marks.json", marks);
      return { success: true, message: `Marks entered for ${row.studentName}.`, data: row };
    }

    case "view_marks": {
      let rows = readData("marks.json");
      if (data.studentName) rows = rows.filter((m) => containsName(m.studentName, data.studentName));
      if (data.courseCode) rows = rows.filter((m) => String(m.courseCode) === String(data.courseCode));
      if (data.type) rows = rows.filter((m) => String(m.type || "").toLowerCase() === String(data.type).toLowerCase());
      if (data.minMarks !== undefined) rows = rows.filter((m) => Number(m.marks) >= Number(data.minMarks));
      if (data.maxMarks !== undefined) rows = rows.filter((m) => Number(m.marks) <= Number(data.maxMarks));
      return { success: true, message: `Found ${rows.length} mark record(s).`, data: rows };
    }

    case "update_marks": {
      const marks = readData("marks.json");
      const idx = marks.findIndex((m) => containsName(m.studentName, data.studentName));
      if (idx === -1) return { success: false, message: "Marks record not found.", data: null };
      marks[idx] = { ...marks[idx], ...(data.marks !== undefined ? { marks: Number(data.marks) } : {}), ...(data.type ? { type: data.type } : {}) };
      writeData("marks.json", marks);
      return { success: true, message: "Marks updated.", data: marks[idx] };
    }

    case "delete_marks": {
      const marks = readData("marks.json");
      const before = marks.length;
      const remaining = marks.filter((m) => !containsName(m.studentName, data.studentName));
      writeData("marks.json", remaining);
      return { success: true, message: `Deleted ${before - remaining.length} mark record(s).`, data: null };
    }

    case "view_marks_analytics": {
      const marks = readData("marks.json");
      if (marks.length === 0) return { success: true, message: "No marks data available.", data: { total: 0, average: 0 } };
      const avg = marks.reduce((sum, m) => sum + Number(m.marks || 0), 0) / marks.length;
      return { success: true, message: "Marks analytics generated.", data: { total: marks.length, average: Math.round(avg * 100) / 100 } };
    }

    case "list_students": {
      let rows = readData("students.json");
      if (data.department) rows = rows.filter((s) => String(s.department || "").toLowerCase() === String(data.department).toLowerCase());
      if (data.year !== undefined) rows = rows.filter((s) => Number(s.year) === Number(data.year));
      return { success: true, message: `Found ${rows.length} student(s).`, data: rows };
    }

    case "create_student": {
      const students = readData("students.json");
      const row = {
        id: nextId(students),
        name: data.name,
        department: data.department || "CSE",
        year: Number(data.year || new Date().getFullYear()),
        gpa: Number(data.gpa || 0),
        email: data.email || "",
      };
      students.push(row);
      writeData("students.json", students);
      return { success: true, message: `Student ${row.name} enrolled successfully.`, data: row };
    }

    case "update_student": {
      const students = readData("students.json");
      const idx = students.findIndex((s) => containsName(s.name, data.name));
      if (idx === -1) return { success: false, message: "Student not found.", data: null };
      students[idx] = {
        ...students[idx],
        ...(data.department ? { department: data.department } : {}),
        ...(data.year !== undefined ? { year: Number(data.year) } : {}),
        ...(data.gpa !== undefined ? { gpa: Number(data.gpa) } : {}),
      };
      writeData("students.json", students);
      return { success: true, message: `Student ${students[idx].name} updated.`, data: students[idx] };
    }

    case "delete_student": {
      const students = readData("students.json");
      const before = students.length;
      const remaining = students.filter((s) => !containsName(s.name, data.name));
      writeData("students.json", remaining);
      return { success: true, message: `Deleted ${before - remaining.length} student(s).`, data: null };
    }

    case "list_faculty": {
      let rows = readData("faculty.json");
      if (data.department) rows = rows.filter((f) => String(f.department || "").toLowerCase() === String(data.department).toLowerCase());
      return { success: true, message: `Found ${rows.length} faculty member(s).`, data: rows };
    }

    case "add_faculty": {
      const faculty = readData("faculty.json");
      const row = {
        id: nextId(faculty),
        name: data.name,
        department: data.department || "General",
        subjects: Array.isArray(data.subjects) ? data.subjects : [],
        designation: data.designation || "Faculty",
      };
      faculty.push(row);
      writeData("faculty.json", faculty);
      return { success: true, message: `Faculty ${row.name} added.`, data: row };
    }

    case "delete_faculty": {
      const faculty = readData("faculty.json");
      const before = faculty.length;
      const remaining = faculty.filter((f) => !containsName(f.name, data.name));
      writeData("faculty.json", remaining);
      return { success: true, message: `Deleted ${before - remaining.length} faculty member(s).`, data: null };
    }

    case "assign_subject": {
      const faculty = readData("faculty.json");
      const idx = faculty.findIndex((f) => containsName(f.name, data.faculty));
      if (idx === -1) return { success: false, message: "Faculty member not found.", data: null };
      const subjects = Array.isArray(faculty[idx].subjects) ? faculty[idx].subjects : [];
      if (!subjects.includes(data.subject)) subjects.push(data.subject);
      faculty[idx] = { ...faculty[idx], subjects };
      writeData("faculty.json", faculty);
      return { success: true, message: `Assigned ${data.subject} to ${faculty[idx].name}.`, data: faculty[idx] };
    }

    case "generate_workload": {
      const faculty = readData("faculty.json");
      const rows = faculty.map((f) => ({ name: f.name, department: f.department, subjectCount: (f.subjects || []).length }));
      return { success: true, message: "Workload report generated.", data: rows };
    }

    case "list_courses": {
      let rows = readData("courses.json");
      if (data.department) rows = rows.filter((c) => String(c.department || "").toLowerCase() === String(data.department).toLowerCase());
      if (data.semester !== undefined) rows = rows.filter((c) => Number(c.semester) === Number(data.semester));
      return { success: true, message: `Found ${rows.length} course(s).`, data: rows };
    }

    case "create_course": {
      const courses = readData("courses.json");
      const row = {
        id: nextId(courses),
        name: data.name,
        code: data.code || `C${Date.now().toString().slice(-4)}`,
        semester: Number(data.semester || 1),
        department: data.department || "General",
        credits: Number(data.credits || 3),
        faculty: data.faculty || "",
      };
      courses.push(row);
      writeData("courses.json", courses);
      return { success: true, message: `Course ${row.name} created.`, data: row };
    }

    case "update_course": {
      const courses = readData("courses.json");
      const idx = courses.findIndex((c) => containsName(c.name, data.name) || String(c.code || "").toLowerCase() === String(data.code || "").toLowerCase());
      if (idx === -1) return { success: false, message: "Course not found.", data: null };
      courses[idx] = {
        ...courses[idx],
        ...(data.semester !== undefined ? { semester: Number(data.semester) } : {}),
        ...(data.credits !== undefined ? { credits: Number(data.credits) } : {}),
        ...(data.department ? { department: data.department } : {}),
      };
      writeData("courses.json", courses);
      return { success: true, message: `Course ${courses[idx].name} updated.`, data: courses[idx] };
    }

    case "delete_course": {
      const courses = readData("courses.json");
      const before = courses.length;
      const remaining = courses.filter((c) => !containsName(c.name, data.name) && String(c.code || "").toLowerCase() !== String(data.name || "").toLowerCase());
      writeData("courses.json", remaining);
      return { success: true, message: `Deleted ${before - remaining.length} course(s).`, data: null };
    }

    case "record_attendance": {
      const attendance = readData("attendance.json");
      const row = {
        id: nextId(attendance),
        studentName: data.studentName,
        courseCode: data.courseCode || "GENERAL",
        status: String(data.status || "present").toLowerCase() === "absent" ? "absent" : "present",
        date: data.date || new Date().toISOString().split("T")[0],
      };
      attendance.push(row);
      writeData("attendance.json", attendance);
      return { success: true, message: `Attendance recorded for ${row.studentName}.`, data: row };
    }

    case "list_attendance": {
      let rows = readData("attendance.json");
      if (data.studentName) rows = rows.filter((a) => containsName(a.studentName, data.studentName));
      if (data.date) rows = rows.filter((a) => String(a.date) === String(data.date));
      return { success: true, message: `Found ${rows.length} attendance record(s).`, data: rows };
    }

    case "attendance_report": {
      const attendance = readData("attendance.json");
      const threshold = Number(data.threshold || 75);
      const grouped = {};
      attendance.forEach((a) => {
        const k = a.studentName;
        if (!grouped[k]) grouped[k] = { studentName: k, total: 0, present: 0 };
        grouped[k].total += 1;
        if (String(a.status || "").toLowerCase() === "present") grouped[k].present += 1;
      });
      const rows = Object.values(grouped).map((r) => ({
        ...r,
        percentage: r.total > 0 ? Math.round((r.present / r.total) * 100) : 100,
      }));
      const below = rows.filter((r) => r.percentage < threshold);
      return { success: true, message: `${below.length} student(s) below ${threshold}% attendance.`, data: { threshold, studentsBelow: below, allStudents: rows } };
    }

    case "schedule_exam": {
      const exams = readData("exams.json");
      const row = {
        id: nextId(exams),
        course: data.course || "Unknown",
        date: data.date || "TBD",
        type: data.type || "midterm",
        scheduledAt: new Date().toISOString().split("T")[0],
      };
      exams.push(row);
      writeData("exams.json", exams);
      return {
        success: true,
        message: `${row.type.charAt(0).toUpperCase() + row.type.slice(1)} exam for "${row.course}" scheduled on ${row.date}.`,
        data: row,
      };
    }

    case "list_exams": {
      const rows = readData("exams.json");
      return { success: true, message: rows.length > 0 ? `Found ${rows.length} scheduled exam(s).` : "No exams scheduled.", data: rows };
    }

    case "generate_report": {
      const summary = {
        students: readData("students.json").length,
        faculty: readData("faculty.json").length,
        courses: readData("courses.json").length,
        attendanceRecords: readData("attendance.json").length,
        exams: readData("exams.json").length,
        marks: readData("marks.json").length,
      };
      return { success: true, message: "University report generated.", data: summary };
    }

    default:
      return { success: false, message: `Unsupported action: ${action}`, data: null };
  }
}

module.exports = { executeAction };
