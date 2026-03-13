// ============================================================
// ACTION ROUTER — Executes structured JSON actions on data
// Supports both legacy faculty CRUD and new role-based actions
// ============================================================

const { readData, writeData } = require("./dataService");

/**
 * Execute a structured action against the data layer.
 * @param {string} action - The action name
 * @param {object} data   - The action payload
 * @param {object} currentUser - Logged-in user (from JWT): { id, name, email, role, department }
 * @returns {{ success: boolean, message: string, data: any }}
 */
function executeAction(action, data, currentUser) {
  switch (action) {

    // ===================== STUDENT "MY" ACTIONS (read-only) =====================

    case "view_my_courses": {
      if (!currentUser) return { success: false, message: "Please log in to view your courses.", data: null };
      const enrollments = readData("enrollments.json");
      const myCourses = enrollments.filter(e => e.studentName.toLowerCase().includes(currentUser.name.toLowerCase()));
      if (myCourses.length === 0) return { success: true, message: "You have no course enrollments on record.", data: [] };
      return { success: true, message: `You are enrolled in ${myCourses.length} course(s).`, data: myCourses };
    }

    case "view_my_gpa": {
      if (!currentUser) return { success: false, message: "Please log in to view your GPA.", data: null };
      const students = readData("students.json");
      const me = students.find(s => s.name.toLowerCase() === currentUser.name.toLowerCase());
      if (!me) return { success: false, message: "Your student record was not found.", data: null };
      return { success: true, message: `Your current GPA is ${me.gpa}.`, data: { name: me.name, department: me.department, year: me.year, gpa: me.gpa } };
    }

    case "view_course_details": {
      const courses = readData("courses.json");
      if (data.courseCode) {
        const course = courses.find(c => c.code.toLowerCase() === data.courseCode.toLowerCase());
        if (!course) return { success: false, message: `Course "${data.courseCode}" not found.`, data: null };
        return { success: true, message: `Details for ${course.name} (${course.code}).`, data: course };
      }
      if (data.name) {
        const course = courses.find(c => c.name.toLowerCase().includes(data.name.toLowerCase()));
        if (!course) return { success: false, message: `Course "${data.name}" not found.`, data: null };
        return { success: true, message: `Details for ${course.name} (${course.code}).`, data: course };
      }
      return { success: false, message: "Please specify a course name or code.", data: null };
    }

    case "view_my_attendance": {
      if (!currentUser) return { success: false, message: "Please log in to view your attendance.", data: null };
      const attendance = readData("attendance.json");
      let myAttendance = attendance.filter(a => a.studentName.toLowerCase().includes(currentUser.name.toLowerCase()));
      if (data.courseCode) {
        myAttendance = myAttendance.filter(a => a.courseCode === data.courseCode);
      }
      if (data.date) {
        myAttendance = myAttendance.filter(a => a.date === data.date);
      }
      const total = myAttendance.length;
      const present = myAttendance.filter(a => a.status === "present").length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 100;
      return {
        success: true,
        message: `Your attendance: ${present}/${total} (${pct}%).`,
        data: { total, present, absent: total - present, percentage: pct, records: myAttendance },
      };
    }

    case "view_my_attendance_report": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const attendance = readData("attendance.json");
      const enrollments = readData("enrollments.json");
      const myEnrollments = enrollments.filter(e => e.studentName.toLowerCase().includes(currentUser.name.toLowerCase()));
      const report = myEnrollments.map(en => {
        const records = attendance.filter(a =>
          a.studentName.toLowerCase().includes(currentUser.name.toLowerCase()) &&
          a.courseCode === en.courseCode
        );
        const total = records.length;
        const present = records.filter(a => a.status === "present").length;
        const pct = total > 0 ? Math.round((present / total) * 100) : 100;
        return { course: en.courseName, courseCode: en.courseCode, total, present, absent: total - present, percentage: pct, belowThreshold: pct < 75 };
      });
      const belowCount = report.filter(r => r.belowThreshold).length;
      return {
        success: true,
        message: belowCount > 0 ? `⚠️ You are below 75% attendance in ${belowCount} course(s).` : "Your attendance is above 75% in all courses.",
        data: report,
      };
    }

    case "view_my_marks": {
      if (!currentUser) return { success: false, message: "Please log in to view your marks.", data: null };
      const marks = readData("marks.json");
      console.log("actionRouter view_my_marks -> received data:", data);
      let myMarks = marks.filter(m => m.studentName.toLowerCase().includes(currentUser.name.toLowerCase()));
      if (data.courseCode) myMarks = myMarks.filter(m => m.courseCode === data.courseCode);
      if (data.courseName) myMarks = myMarks.filter(m => m.courseName.toLowerCase().includes(data.courseName.toLowerCase()));
      if (data.type) myMarks = myMarks.filter(m => m.type === data.type);
      if (data.minMarks !== undefined) myMarks = myMarks.filter(m => m.marks >= parseFloat(data.minMarks));
      if (data.maxMarks !== undefined) myMarks = myMarks.filter(m => m.marks <= parseFloat(data.maxMarks));
      if (myMarks.length === 0) return { success: true, message: "No marks records found.", data: [] };
      return { success: true, message: `Found ${myMarks.length} marks record(s).`, data: myMarks };
    }

    case "view_my_results": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const marks = readData("marks.json");
      const myMarks = marks.filter(m => m.studentName.toLowerCase().includes(currentUser.name.toLowerCase()));
      // Group by course
      const courses = {};
      myMarks.forEach(m => {
        if (!courses[m.courseCode]) courses[m.courseCode] = { courseName: m.courseName, courseCode: m.courseCode, exams: [] };
        courses[m.courseCode].exams.push({ type: m.type, marks: m.marks, maxMarks: m.maxMarks, percentage: Math.round((m.marks / m.maxMarks) * 100) });
      });
      const summary = Object.values(courses).map(c => {
        const totalMarks = c.exams.reduce((s, e) => s + e.marks, 0);
        const totalMax = c.exams.reduce((s, e) => s + e.maxMarks, 0);
        return { ...c, totalMarks, totalMax, overallPercentage: totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0 };
      });
      return { success: true, message: `Results for ${summary.length} course(s).`, data: summary };
    }

    case "view_my_timetable": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const schedules = readData("schedules.json");
      const enrollments = readData("enrollments.json");
      const myCodes = enrollments
        .filter(e => e.studentName.toLowerCase().includes(currentUser.name.toLowerCase()))
        .map(e => e.courseCode);
      let mySchedule = schedules.filter(s => myCodes.includes(s.courseCode));
      if (data.day) mySchedule = mySchedule.filter(s => s.day.toLowerCase() === data.day.toLowerCase());
      mySchedule.sort((a, b) => {
        const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        return days.indexOf(a.day) - days.indexOf(b.day) || a.time.localeCompare(b.time);
      });
      return { success: true, message: `Found ${mySchedule.length} class(es) in your timetable.`, data: mySchedule };
    }

    case "view_exam_schedule": {
      const exams = readData("exams.json");
      let filtered = exams;
      if (data.type) filtered = filtered.filter(e => e.type === data.type);
      if (data.course) filtered = filtered.filter(e => e.course.toLowerCase().includes(data.course.toLowerCase()));
      return { success: true, message: filtered.length > 0 ? `Found ${filtered.length} exam(s).` : "No exams scheduled.", data: filtered };
    }

    case "view_my_profile": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const students = readData("students.json");
      const me = students.find(s => s.name.toLowerCase() === currentUser.name.toLowerCase());
      if (!me) return { success: false, message: "Profile not found.", data: null };
      return { success: true, message: `Profile for ${me.name}.`, data: me };
    }

    case "update_my_profile": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const students = readData("students.json");
      const idx = students.findIndex(s => s.name.toLowerCase() === currentUser.name.toLowerCase());
      if (idx === -1) return { success: false, message: "Profile not found.", data: null };
      // Only allow phone and email updates
      const updates = {};
      if (data.phone) {
        if (!/^\d{10}$/.test(data.phone)) return { success: false, message: "Phone must be exactly 10 digits.", data: null };
        updates.phone = data.phone;
      }
      if (data.email) {
        if (!data.email.includes("@")) return { success: false, message: "Invalid email address.", data: null };
        updates.email = data.email;
      }
      if (Object.keys(updates).length === 0) {
        return { success: false, message: "You can only update your phone and email. Specify what to change.", data: null };
      }
      students[idx] = { ...students[idx], ...updates };
      writeData("students.json", students);
      return { success: true, message: `Profile updated: ${Object.keys(updates).join(", ")} changed.`, data: students[idx] };
    }

    case "view_notices": {
      const notices = readData("notices.json");
      let filtered = notices;
      if (data.category) filtered = filtered.filter(n => n.category === data.category);
      if (data.department) {
        filtered = filtered.filter(n => n.department === "ALL" || n.department === data.department);
      } else if (currentUser && currentUser.department) {
        filtered = filtered.filter(n => n.department === "ALL" || n.department === currentUser.department);
      }
      if (data.priority) filtered = filtered.filter(n => n.priority === data.priority);
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
      return { success: true, message: `Found ${filtered.length} notice(s).`, data: filtered };
    }

    // ===================== FACULTY "MY" ACTIONS =====================

    case "view_my_faculty_profile": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const faculty = readData("faculty.json");
      const me = faculty.find(f => f.name.toLowerCase().includes(currentUser.name.toLowerCase()));
      if (!me) return { success: false, message: "Faculty profile not found.", data: null };
      return { success: true, message: `Profile for ${me.name}.`, data: me };
    }

    case "update_my_faculty_profile": {
      if (!currentUser) return { success: false, message: "Please log in.", data: null };
      const faculty = readData("faculty.json");
      const idx = faculty.findIndex(f => f.name.toLowerCase().includes(currentUser.name.toLowerCase()));
      if (idx === -1) return { success: false, message: "Faculty profile not found.", data: null };
      const updates = {};
      if (data.phone) {
        if (!/^\d{10}$/.test(data.phone)) return { success: false, message: "Phone must be exactly 10 digits.", data: null };
        updates.phone = data.phone;
      }
      if (data.email) {
        if (!data.email.includes("@")) return { success: false, message: "Invalid email address.", data: null };
        updates.email = data.email;
      }
      if (Object.keys(updates).length === 0) {
        return { success: false, message: "You can only update your phone and email.", data: null };
      }
      faculty[idx] = { ...faculty[idx], ...updates };
      writeData("faculty.json", faculty);
      return { success: true, message: `Profile updated: ${Object.keys(updates).join(", ")} changed.`, data: faculty[idx] };
    }

    case "view_schedule": {
      const schedules = readData("schedules.json");
      let filtered = schedules;
      if (currentUser) {
        filtered = filtered.filter(s => s.faculty.toLowerCase().includes(currentUser.name.toLowerCase()));
      }
      if (data.day) filtered = filtered.filter(s => s.day.toLowerCase() === data.day.toLowerCase());
      filtered.sort((a, b) => {
        const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        return days.indexOf(a.day) - days.indexOf(b.day) || a.time.localeCompare(b.time);
      });
      return { success: true, message: `Found ${filtered.length} scheduled class(es).`, data: filtered };
    }

    // ===================== MARKS MANAGEMENT (Faculty) =====================

    case "enter_marks": {
      const marks = readData("marks.json");
      const students = readData("students.json");
      if (!data.studentName) return { success: false, message: "Please specify the student name.", data: null };
      const student = students.find(s => s.name.toLowerCase().includes(data.studentName.toLowerCase()));
      const newId = marks.length > 0 ? Math.max(...marks.map(m => m.id)) + 1 : 1;
      const record = {
        id: newId,
        studentId: student ? student.id : null,
        studentName: data.studentName,
        courseCode: data.courseCode || "GENERAL",
        courseName: data.courseName || data.courseCode || "Unknown",
        type: data.type || "midterm",
        marks: data.marks || 0,
        maxMarks: data.maxMarks || 100,
        date: data.date || new Date().toISOString().split("T")[0],
      };
      marks.push(record);
      writeData("marks.json", marks);
      return { success: true, message: `Marks entered: ${record.studentName} got ${record.marks}/${record.maxMarks} in ${record.courseName} (${record.type}).`, data: record };
    }

    case "view_marks": {
      const marks = readData("marks.json");
      let filtered = marks;
      if (data.studentName) filtered = filtered.filter(m => m.studentName.toLowerCase().includes(data.studentName.toLowerCase()));
      if (data.courseCode) filtered = filtered.filter(m => m.courseCode === data.courseCode);
      if (data.type) filtered = filtered.filter(m => m.type === data.type);
      if (data.minMarks !== undefined) filtered = filtered.filter(m => m.marks >= parseFloat(data.minMarks));
      if (data.maxMarks !== undefined) filtered = filtered.filter(m => m.marks <= parseFloat(data.maxMarks));
      return { success: true, message: `Found ${filtered.length} marks record(s).`, data: filtered };
    }

    case "update_marks": {
      const marks = readData("marks.json");
      if (!data.studentName) return { success: false, message: "Please specify the student name.", data: null };
      const idx = marks.findIndex(m =>
        m.studentName.toLowerCase().includes(data.studentName.toLowerCase()) &&
        (!data.courseCode || m.courseCode === data.courseCode) &&
        (!data.type || m.type === data.type)
      );
      if (idx === -1) return { success: false, message: "Marks record not found.", data: null };
      if (data.marks !== undefined) marks[idx].marks = data.marks;
      if (data.maxMarks !== undefined) marks[idx].maxMarks = data.maxMarks;
      writeData("marks.json", marks);
      return { success: true, message: `Marks updated for ${marks[idx].studentName}: ${marks[idx].marks}/${marks[idx].maxMarks}.`, data: marks[idx] };
    }

    case "delete_marks": {
      const marks = readData("marks.json");
      if (!data.studentName) return { success: false, message: "Please specify which marks record to delete (student name, course, or type).", data: null };
      const candidates = marks.filter(m =>
        m.studentName.toLowerCase().includes(data.studentName.toLowerCase()) &&
        (!data.courseCode || m.courseCode === data.courseCode) &&
        (!data.type || m.type === data.type)
      );
      if (candidates.length === 0) return { success: false, message: "Marks record not found.", data: null };
      if (candidates.length > 1 && !data.courseCode && !data.type) {
        return { success: false, message: `Multiple records found: ${candidates.map(m => `${m.courseName} (${m.type})`).join(", ")}. Specify course or type.`, data: candidates };
      }
      const toDelete = candidates[0];
      const remaining = marks.filter(m => m.id !== toDelete.id);
      writeData("marks.json", remaining);
      return { success: true, message: `Marks record deleted: ${toDelete.studentName} - ${toDelete.courseName} (${toDelete.type}).`, data: remaining };
    }

    case "view_marks_analytics": {
      const marks = readData("marks.json");
      const courses = {};
      marks.forEach(m => {
        const key = `${m.courseCode}-${m.type}`;
        if (!courses[key]) courses[key] = { courseName: m.courseName, courseCode: m.courseCode, type: m.type, scores: [] };
        courses[key].scores.push(m.marks);
      });
      const analytics = Object.values(courses).map(c => {
        const avg = c.scores.reduce((s, v) => s + v, 0) / c.scores.length;
        const max = Math.max(...c.scores);
        const min = Math.min(...c.scores);
        return { ...c, count: c.scores.length, average: Math.round(avg * 10) / 10, highest: max, lowest: min };
      });
      return { success: true, message: `Analytics for ${analytics.length} exam(s).`, data: analytics };
    }

    // ===================== STUDENT CRUD (Faculty) =====================

    case "create_student": {
      const students = readData("students.json");
      const newId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1;
      const newStudent = {
        id: newId,
        name: data.name || "Unknown",
        department: data.department || "General",
        year: data.year || new Date().getFullYear(),
        gpa: data.gpa || 0,
        email: data.email || `${(data.name || "student").toLowerCase().replace(/\s+/g, ".")}@university.edu`,
        phone: data.phone || "",
        section: data.section || "A",
        enrolledAt: new Date().toISOString().split("T")[0],
      };
      students.push(newStudent);
      writeData("students.json", students);
      return { success: true, message: `Student "${newStudent.name}" enrolled successfully.`, data: newStudent };
    }

    case "list_students": {
      const students = readData("students.json");
      let filtered = students;
      if (data.department) filtered = filtered.filter(s => s.department.toLowerCase() === data.department.toLowerCase());
      if (data.year) filtered = filtered.filter(s => s.year === data.year);
      if (data.section) filtered = filtered.filter(s => s.section.toLowerCase() === data.section.toLowerCase());
      return { success: true, message: `Found ${filtered.length} student(s).`, data: filtered };
    }

    case "update_student": {
      const students = readData("students.json");
      if (!data.id && (!data.name || !data.name.trim())) {
        return { success: false, message: "Please specify which student to update (provide a name).", data: null };
      }
      let uCandidates = data.id
        ? students.filter(s => s.id === data.id)
        : students.filter(s => s.name.toLowerCase().includes(data.name.toLowerCase().trim()));
      if (uCandidates.length > 1 && data.department) {
        const narrow = uCandidates.filter(s => s.department.toLowerCase() === data.department.toLowerCase());
        if (narrow.length > 0) uCandidates = narrow;
      }
      if (uCandidates.length === 0) return { success: false, message: "Student not found.", data: null };
      if (uCandidates.length > 1) {
        return { success: false, message: `Multiple students found: ${uCandidates.map(s => `${s.name} (${s.department})`).join(", ")}. Please specify the department.`, data: uCandidates };
      }
      const idx = students.findIndex(s => s.id === uCandidates[0].id);
      const { name: _searchName, ...fieldsToUpdate } = data;
      const updated = { ...students[idx], ...fieldsToUpdate, id: students[idx].id, name: students[idx].name };
      students[idx] = updated;
      writeData("students.json", students);
      return { success: true, message: `Student "${updated.name}" updated successfully.`, data: updated };
    }

    case "delete_student": {
      const students = readData("students.json");
      if (!data.id && (!data.name || !data.name.trim())) {
        return { success: false, message: "Please specify which student to delete. Provide a name and optionally a department.", data: null };
      }
      let dCandidates = data.id
        ? students.filter(s => s.id === data.id)
        : students.filter(s => s.name.toLowerCase().includes(data.name.toLowerCase().trim()));
      if (dCandidates.length > 1 && data.department) {
        const narrow = dCandidates.filter(s => s.department.toLowerCase() === data.department.toLowerCase());
        if (narrow.length > 0) dCandidates = narrow;
      }
      if (dCandidates.length === 0) return { success: false, message: "Student not found.", data: null };
      if (dCandidates.length > 1) {
        return { success: false, message: `Multiple students found: ${dCandidates.map(s => `${s.name} (${s.department})`).join(", ")}. Please specify the department.`, data: dCandidates };
      }
      const toDelete = dCandidates[0];
      const remaining = students.filter(s => s.id !== toDelete.id);
      writeData("students.json", remaining);
      return { success: true, message: `Student "${toDelete.name}" (${toDelete.department}) removed. ${remaining.length} student(s) remaining.`, data: remaining };
    }

    // ===================== FACULTY ACTIONS =====================

    case "add_faculty": {
      const faculty = readData("faculty.json");
      const newId = faculty.length > 0 ? Math.max(...faculty.map(f => f.id)) + 1 : 1;
      const newFaculty = {
        id: newId,
        name: data.name || "Unknown",
        department: data.department || "General",
        subjects: data.subjects || [],
        email: data.email || `${(data.name || "faculty").toLowerCase().replace(/\s+/g, ".")}@university.edu`,
        designation: data.designation || "Lecturer",
        experience: data.experience || 0,
        phone: data.phone || "",
      };
      faculty.push(newFaculty);
      writeData("faculty.json", faculty);
      return { success: true, message: `Faculty "${newFaculty.name}" (${newFaculty.designation}) added to ${newFaculty.department}.`, data: newFaculty };
    }

    case "list_faculty": {
      const faculty = readData("faculty.json");
      let filtered = faculty;
      if (data.department) filtered = filtered.filter(f => f.department.toLowerCase() === data.department.toLowerCase());
      return { success: true, message: `Found ${filtered.length} faculty member(s).`, data: filtered };
    }

    case "delete_faculty": {
      const faculty = readData("faculty.json");
      if (!data.id && (!data.name || !data.name.trim())) {
        return { success: false, message: "Please specify which faculty member to delete (provide a name).", data: null };
      }
      let fCandidates = data.id
        ? faculty.filter(f => f.id === data.id)
        : faculty.filter(f => f.name.toLowerCase().includes(data.name.toLowerCase().trim()));
      if (fCandidates.length > 1 && data.department) {
        const narrow = fCandidates.filter(f => f.department.toLowerCase() === data.department.toLowerCase());
        if (narrow.length > 0) fCandidates = narrow;
      }
      if (fCandidates.length === 0) return { success: false, message: "Faculty member not found.", data: null };
      if (fCandidates.length > 1) {
        return { success: false, message: `Multiple faculty found: ${fCandidates.map(f => `${f.name} (${f.department})`).join(", ")}. Please specify.`, data: fCandidates };
      }
      const fToDelete = fCandidates[0];
      const remaining = faculty.filter(f => f.id !== fToDelete.id);
      writeData("faculty.json", remaining);
      return { success: true, message: `Faculty "${fToDelete.name}" removed.`, data: remaining };
    }

    case "assign_subject": {
      const faculty = readData("faculty.json");
      const member = faculty.find(f => f.name.toLowerCase().includes((data.faculty || "").toLowerCase()));
      if (!member) return { success: false, message: "Faculty member not found.", data: null };
      if (data.subject && !member.subjects.includes(data.subject)) {
        member.subjects.push(data.subject);
      }
      writeData("faculty.json", faculty);
      return { success: true, message: `Subject "${data.subject}" assigned to ${member.name}.`, data: member };
    }

    case "generate_workload": {
      const faculty = readData("faculty.json");
      const workload = faculty.map(f => ({
        name: f.name, department: f.department,
        subjectCount: f.subjects.length, subjects: f.subjects,
      }));
      return { success: true, message: "Faculty workload report generated.", data: workload };
    }

    // ===================== COURSE ACTIONS =====================

    case "create_course": {
      const courses = readData("courses.json");
      const newId = courses.length > 0 ? Math.max(...courses.map(c => c.id)) + 1 : 1;
      const newCourse = {
        id: newId,
        name: data.name || "New Course",
        code: data.code || `COURSE${newId}`,
        semester: data.semester || 1,
        department: data.department || "General",
        credits: data.credits || 3,
        faculty: data.faculty || "TBD",
      };
      courses.push(newCourse);
      writeData("courses.json", courses);
      return { success: true, message: `Course "${newCourse.name}" created.`, data: newCourse };
    }

    case "list_courses": {
      const courses = readData("courses.json");
      let filtered = courses;
      if (data.semester) filtered = filtered.filter(c => c.semester === data.semester);
      if (data.department) filtered = filtered.filter(c => c.department.toLowerCase() === data.department.toLowerCase());
      return { success: true, message: `Found ${filtered.length} course(s).`, data: filtered };
    }

    case "update_course": {
      const courses = readData("courses.json");
      if (!data.id && (!data.name || !data.name.trim())) {
        return { success: false, message: "Please specify which course to update (provide a name).", data: null };
      }
      let ucIdx = data.id
        ? courses.findIndex(c => c.id === data.id)
        : courses.findIndex(c => c.name.toLowerCase().includes(data.name.toLowerCase().trim()));
      if (ucIdx === -1) return { success: false, message: "Course not found.", data: null };
      const { name: _searchName, ...courseFieldsToUpdate } = data;
      const updated = { ...courses[ucIdx], ...courseFieldsToUpdate, id: courses[ucIdx].id, name: courses[ucIdx].name };
      courses[ucIdx] = updated;
      writeData("courses.json", courses);
      return { success: true, message: `Course "${updated.name}" updated successfully.`, data: updated };
    }

    case "delete_course": {
      const courses = readData("courses.json");
      if (!data.id && (!data.name || !data.name.trim())) {
        return { success: false, message: "Please specify which course to delete.", data: null };
      }
      let dcCandidates = data.id
        ? courses.filter(c => c.id === data.id)
        : courses.filter(c => c.name.toLowerCase().includes(data.name.toLowerCase().trim()));
      if (data.department && dcCandidates.length > 1) {
        const narrow = dcCandidates.filter(c => c.department.toLowerCase() === data.department.toLowerCase());
        if (narrow.length > 0) dcCandidates = narrow;
      }
      if (dcCandidates.length === 0) return { success: false, message: "Course not found.", data: null };
      if (dcCandidates.length > 1) {
        return { success: false, message: `Multiple courses found: ${dcCandidates.map(c => `${c.name} (${c.department})`).join(", ")}. Be more specific.`, data: dcCandidates };
      }
      const dcToDelete = dcCandidates[0];
      const remaining = courses.filter(c => c.id !== dcToDelete.id);
      writeData("courses.json", remaining);
      return { success: true, message: `Course "${dcToDelete.name}" removed. ${remaining.length} course(s) remaining.`, data: remaining };
    }

    // ===================== ATTENDANCE ACTIONS ===================

    case "record_attendance": {
      const attendance = readData("attendance.json");
      const students = readData("students.json");
      const student = students.find(s => s.name.toLowerCase().includes((data.studentName || "").toLowerCase()));
      const newId = attendance.length > 0 ? Math.max(...attendance.map(a => a.id)) + 1 : 1;
      const record = {
        id: newId,
        studentId: student ? student.id : null,
        studentName: data.studentName || "Unknown",
        courseCode: data.courseCode || "GENERAL",
        date: data.date || new Date().toISOString().split("T")[0],
        status: data.status || "present",
      };
      attendance.push(record);
      writeData("attendance.json", attendance);
      return { success: true, message: `Attendance recorded for ${record.studentName}: ${record.status} on ${record.date}.`, data: record };
    }

    case "list_attendance": {
      const attendance = readData("attendance.json");
      let filtered = attendance;
      if (data.studentName) filtered = filtered.filter(a => a.studentName.toLowerCase().includes(data.studentName.toLowerCase()));
      if (data.date) filtered = filtered.filter(a => a.date === data.date);
      if (data.courseCode) filtered = filtered.filter(a => a.courseCode === data.courseCode);
      return { success: true, message: `Found ${filtered.length} attendance record(s).`, data: filtered };
    }

    case "attendance_report": {
      const attendance = readData("attendance.json");
      const students = readData("students.json");
      const threshold = data.threshold || 75;
      const report = students.map(s => {
        const records = attendance.filter(a => a.studentId === s.id);
        const total = records.length;
        const present = records.filter(a => a.status === "present").length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 100;
        return { name: s.name, department: s.department, total, present, percentage };
      });
      const below = report.filter(r => r.percentage < threshold);
      return {
        success: true,
        message: `${below.length} student(s) below ${threshold}% attendance.`,
        data: { threshold, studentsBelow: below, allStudents: report },
      };
    }

    // ===================== EXAM ACTIONS =========================

    case "schedule_exam": {
      const exams = readData("exams.json");
      const newExamId = exams.length > 0 ? Math.max(...exams.map(e => e.id)) + 1 : 1;
      const newExam = {
        id: newExamId,
        course: data.course || "Unknown",
        date: data.date || "TBD",
        type: data.type || "midterm",
        scheduledAt: new Date().toISOString().split("T")[0],
      };
      exams.push(newExam);
      writeData("exams.json", exams);
      return { success: true, message: `${newExam.type.charAt(0).toUpperCase() + newExam.type.slice(1)} exam for "${newExam.course}" scheduled on ${newExam.date}.`, data: newExam };
    }

    case "list_exams": {
      const exams = readData("exams.json");
      return { success: true, message: exams.length > 0 ? `Found ${exams.length} scheduled exam(s).` : "No exams scheduled yet.", data: exams };
    }

    // ===================== REPORT ACTIONS ========================

    case "generate_report": {
      const students = readData("students.json");
      const faculty = readData("faculty.json");
      const courses = readData("courses.json");
      const attendance = readData("attendance.json");
      const marks = readData("marks.json");
      const departmentCounts = {};
      students.forEach((s) => {
        const key = s.department || "General";
        departmentCounts[key] = (departmentCounts[key] || 0) + 1;
      });

      const passed = marks.filter(m => m.maxMarks > 0 && ((m.marks / m.maxMarks) * 100) >= 40).length;
      const passRate = marks.length > 0 ? Math.round((passed / marks.length) * 100) : 0;
      const presentCount = attendance.filter(a => a.status === "present").length;
      const avgAttendance = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

      const report = {
        totalStudents: students.length,
        totalFaculty: faculty.length,
        totalCourses: courses.length,
        totalAttendanceRecords: attendance.length,
        totalMarksRecords: marks.length,
        departments: [...new Set(students.map(s => s.department))],
        departmentCounts,
        passRate,
        averageAttendance: avgAttendance,
        averageGPA: students.length > 0
          ? (students.reduce((sum, s) => sum + (s.gpa || 0), 0) / students.length).toFixed(2)
          : "N/A",
      };
      return {
        success: true,
        message:
          "University Analytics Report\n" +
          `Total Students: ${report.totalStudents}\n` +
          `Departments: ${Object.entries(report.departmentCounts).map(([d, c]) => `${d}(${c})`).join(", ")}\n` +
          `Average GPA: ${report.averageGPA}\n` +
          `Average Attendance: ${report.averageAttendance}%\n` +
          `Pass Rate: ${report.passRate}%\n` +
          `Total Faculty: ${report.totalFaculty}\n` +
          `Total Courses: ${report.totalCourses}`,
        data: report,
      };
    }

    default:
      return { success: false, message: `Unknown action: "${action}". Cannot execute.`, data: null };
  }
}

module.exports = { executeAction };
