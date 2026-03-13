// ============================================================
// AGENT CONTROLLER — Handles AI agent CRUD operations
// Agents are the core abstraction: each "owns" a domain
// ============================================================

const axios = require("axios");
const { readData, writeData } = require("../services/dataService");

// Agent domain templates — auto-generated based on purpose keywords
const DOMAIN_TEMPLATES = {
  student: {
    name: "Student Management Agent",
    domain: "students",
    description: "Handles student enrollment, updates, deletions, and student reports.",
    allowedActions: ["create_student", "update_student", "delete_student", "list_students"],
    systemPrompt: `You are a Student Management AI Agent responsible for managing student records.
You can enroll students, update their information, delete records, and generate reports.
You must convert user requests into structured JSON actions.

Allowed actions: create_student, update_student, delete_student, list_students

For each user query, return ONLY a JSON object with:
{
  "action": "<action_name>",
  "data": { ...relevant fields... }
}

Fields for students: name, department, year, gpa, email
Do NOT include any text outside the JSON.`,
  },

  faculty: {
    name: "Faculty Management Agent",
    domain: "faculty",
    description: "Manages faculty records, subject assignments, and workload tracking.",
    allowedActions: ["add_faculty", "list_faculty", "delete_faculty", "assign_subject", "generate_workload"],
    systemPrompt: `You are a Faculty Management AI Agent responsible for managing faculty records.
You can add faculty, assign subjects, generate workload reports, and list faculty.
You must convert user requests into structured JSON actions.

Allowed actions: add_faculty, list_faculty, delete_faculty, assign_subject, generate_workload

For each user query, return ONLY a JSON object with:
{
  "action": "<action_name>",
  "data": { ...relevant fields... }
}

Fields for faculty: name, department, subjects, email
For assign_subject: faculty (name), subject (name)
Do NOT include any text outside the JSON.`,
  },

  course: {
    name: "Course Management Agent",
    domain: "courses",
    description: "Handles course creation, updates, listings, and curriculum management.",
    allowedActions: ["create_course", "list_courses", "update_course", "delete_course"],
    systemPrompt: `You are a Course Management AI Agent responsible for managing courses.
You can create courses, update details, delete courses, and list available courses.
You must convert user requests into structured JSON actions.

Allowed actions: create_course, list_courses, update_course, delete_course

For each user query, return ONLY a JSON object with:
{
  "action": "<action_name>",
  "data": { ...relevant fields... }
}

Fields for courses: name, code, semester, department, credits, faculty
Do NOT include any text outside the JSON.`,
  },

  attendance: {
    name: "Attendance Agent",
    domain: "attendance",
    description: "Records and reports student attendance across courses.",
    allowedActions: ["record_attendance", "list_attendance", "attendance_report"],
    systemPrompt: `You are an Attendance Management AI Agent responsible for tracking attendance.
You can record attendance, list records, and generate attendance reports.
You must convert user requests into structured JSON actions.

Allowed actions: record_attendance, list_attendance, attendance_report

For each user query, return ONLY a JSON object with:
{
  "action": "<action_name>",
  "data": { ...relevant fields... }
}

Fields: studentName, courseCode, date, status (present/absent)
For reports: threshold (percentage number)
Do NOT include any text outside the JSON.`,
  },

  exam: {
    name: "Exam Management Agent",
    domain: "exams",
    description: "Manages exam scheduling, listings, and exam-related operations.",
    allowedActions: ["schedule_exam", "list_exams"],
    systemPrompt: `You are an Exam Management AI Agent responsible for scheduling and managing exams.
You can schedule exams and list upcoming exams.
You must convert user requests into structured JSON actions.

Allowed actions: schedule_exam, list_exams

For each user query, return ONLY a JSON object with:
{
  "action": "<action_name>",
  "data": { ...relevant fields... }
}

Fields: course, date, type (midterm/final/quiz)
Do NOT include any text outside the JSON.`,
  },

  // Student quick templates
  student_academic: {
    name: "Academic Performance Agent",
    role: "student",
    domain: "academic_advisor",
    description: "View GPA, courses, credits and academic standing for the logged-in student.",
    type: "student_academic",
    keywords: ["gpa", "cgpa", "academic", "credits", "grades", "performance", "result"],
    allowedActions: ["view_my_gpa", "view_my_courses", "view_my_results", "view_course_details"],
    systemPrompt: "You are an Academic Performance Agent for students. Use only allowed actions and never expose other students' data.",
  },
  student_attendance: {
    name: "Attendance Tracker Agent",
    role: "student",
    domain: "attendance_tracker",
    description: "Track overall and subject-wise attendance with shortage alerts.",
    type: "student_attendance",
    keywords: ["attendance", "shortage", "detain", "bunk", "present", "absent"],
    allowedActions: ["view_my_attendance", "view_my_attendance_report"],
    systemPrompt: "You are an Attendance Tracker Agent for students. Use only allowed actions and keep responses student-specific.",
  },
  student_results: {
    name: "Results Agent",
    role: "student",
    domain: "results___grades",
    description: "Show marks, grades, result trends and exam performance.",
    type: "student_results",
    keywords: ["result", "marks", "grades", "score", "rank", "arrear"],
    allowedActions: ["view_my_marks", "view_my_results"],
    systemPrompt: "You are a Results Agent for students. Use only allowed actions and return clear academic summaries.",
  },
  student_timetable: {
    name: "Timetable Agent",
    role: "student",
    domain: "timetable___exams",
    description: "View class schedule, exam dates and day-wise plan.",
    type: "student_timetable",
    keywords: ["timetable", "schedule", "today class", "exam date", "time slot"],
    allowedActions: ["view_my_timetable", "view_exam_schedule"],
    systemPrompt: "You are a Timetable Agent for students. Use only allowed actions and focus on schedule/exam queries.",
  },
  student_profile: {
    name: "Profile Agent",
    role: "student",
    domain: "profile_manager",
    description: "View and update student profile contact details safely.",
    type: "student_profile",
    keywords: ["profile", "my details", "phone", "email", "address", "contact"],
    allowedActions: ["view_my_profile", "update_my_profile"],
    systemPrompt: "You are a Profile Agent for students. Allow only safe profile-view/update operations.",
  },

  // Faculty quick templates
  faculty_class_manager: {
    name: "Class Manager Agent",
    role: "faculty",
    domain: "class_manager",
    description: "Manage student records, enrollment updates and class-level operations.",
    type: "faculty_class_manager",
    keywords: ["class", "student records", "enrollment", "admit", "register student"],
    allowedActions: ["list_students", "create_student", "update_student", "delete_student", "list_courses", "create_course", "update_course", "delete_course"],
    systemPrompt: "You are a Class Manager Agent for faculty. Use only allowed student/course management actions.",
  },
  faculty_attendance: {
    name: "Attendance Manager Agent",
    role: "faculty",
    domain: "attendance_manager",
    description: "Record attendance, list records and produce shortage reports.",
    type: "faculty_attendance",
    keywords: ["attendance", "mark attendance", "present", "absent", "shortage"],
    allowedActions: ["record_attendance", "list_attendance", "attendance_report"],
    systemPrompt: "You are an Attendance Manager Agent for faculty. Use only attendance-related actions.",
  },
  faculty_marks: {
    name: "Marks Entry Agent",
    role: "faculty",
    domain: "marks_entry",
    description: "Enter and manage marks, updates and marks analytics.",
    type: "faculty_marks",
    keywords: ["marks", "grade", "score", "result entry", "marks report"],
    allowedActions: ["enter_marks", "view_marks", "update_marks", "delete_marks", "view_marks_analytics"],
    systemPrompt: "You are a Marks Entry Agent for faculty. Use only marks-related actions and return clear summaries.",
  },
  faculty_schedule: {
    name: "Schedule Manager Agent",
    role: "faculty",
    domain: "schedule_manager",
    description: "Manage teaching schedules and exam schedules.",
    type: "faculty_schedule",
    keywords: ["schedule", "exam schedule", "timetable", "invigilation", "hall"],
    allowedActions: ["view_schedule", "schedule_exam", "list_exams"],
    systemPrompt: "You are a Schedule Manager Agent for faculty. Keep list/view and schedule/create intents strictly separated.",
  },
  faculty_analytics: {
    name: "Analytics Dashboard Agent",
    role: "faculty",
    domain: "analytics_dashboard",
    description: "Generate analytics reports across marks, attendance and workload.",
    type: "faculty_analytics",
    keywords: ["analytics", "report", "statistics", "insights", "workload", "at risk"],
    allowedActions: ["generate_report", "generate_workload", "attendance_report", "view_marks_analytics"],
    systemPrompt: "You are an Analytics Dashboard Agent for faculty. You are read-focused and report-oriented.",
  },

  // Custom domain templates (faculty)
  library_management: {
    name: "Library Management Agent",
    role: "faculty",
    domain: "library_management",
    description: "Manage books, borrowing, returns and fines.",
    type: "library_management",
    keywords: ["library", "book", "borrow", "return", "fine", "issue"],
    allowedActions: ["list_books", "issue_book", "return_book", "list_borrowers", "calculate_fine", "add_book", "delete_book"],
    systemPrompt: "You are a Library Management Agent for faculty. Use only library-related actions.",
  },
  fee_management: {
    name: "Fee Management Agent",
    role: "faculty",
    domain: "fee_management",
    description: "Track fees, pending dues, payments and receipts.",
    type: "fee_management",
    keywords: ["fee", "payment", "dues", "receipt", "challan", "pending fees"],
    allowedActions: ["list_fees", "record_payment", "pending_fees", "fee_report", "generate_receipt"],
    systemPrompt: "You are a Fee Management Agent for faculty. Use only fee-related actions.",
  },
};

function normalizeType(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function matchTemplate(purpose, userRole) {
  const p = String(purpose || "").toLowerCase();
  const candidates = Object.entries(DOMAIN_TEMPLATES).map(([key, template]) => {
    let score = 0;
    if (template.role && template.role === userRole) score += 20;
    if (template.role && template.role !== userRole) score -= 100;
    const keywords = template.keywords || [];
    for (const kw of keywords) {
      if (p.includes(kw.toLowerCase())) score += 10;
    }
    if (p.includes(String(template.domain || "").toLowerCase())) score += 20;
    return { key, template, score };
  }).sort((a, b) => b.score - a.score);

  if (!candidates.length || candidates[0].score < 5) return null;
  return candidates[0].template;
}

async function generateCustomAgent(purpose, userRole, apiKey) {
  if (!apiKey || apiKey === "your-gemini-api-key-here") return null;

  const prompt = `Generate a JSON agent config for a university assistant.
Purpose: "${purpose}"
Role: ${userRole}
Use only actions from this list:
view_my_courses, view_my_gpa, view_course_details, view_my_attendance, view_my_attendance_report, view_my_marks, view_my_results, view_my_timetable, view_exam_schedule, view_my_profile, update_my_profile, view_notices, view_my_faculty_profile, update_my_faculty_profile, view_schedule, enter_marks, view_marks, update_marks, delete_marks, view_marks_analytics, list_students, create_student, update_student, delete_student, list_faculty, add_faculty, delete_faculty, assign_subject, generate_workload, list_courses, create_course, update_course, delete_course, record_attendance, list_attendance, attendance_report, schedule_exam, list_exams, generate_report, list_books, issue_book, return_book, list_borrowers, calculate_fine, add_book, delete_book, list_fees, record_payment, pending_fees, fee_report, generate_receipt
Return only JSON with keys: name, description, domain, role, allowedActions, keywords, systemPrompt`;

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1600 },
    }
  );

  let raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(raw);

  if (!parsed || !parsed.name || !Array.isArray(parsed.allowedActions)) return null;
  return {
    name: String(parsed.name).trim(),
    role: parsed.role === "student" || parsed.role === "faculty" ? parsed.role : userRole,
    domain: normalizeType(parsed.domain || parsed.name),
    description: String(parsed.description || purpose).trim(),
    type: normalizeType(parsed.domain || parsed.name),
    allowedActions: parsed.allowedActions,
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    systemPrompt: String(parsed.systemPrompt || "You are a university assistant. Use only allowed actions.").trim(),
  };
}

/**
 * Determine the best domain template by matching keywords in the purpose.
 */
function detectDomain(purpose, userRole) {
  const p = String(purpose || "").toLowerCase();

  if (p.includes("faculty") || p.includes("professor") || p.includes("teacher") || p.includes("lecturer")) return "faculty";
  if (p.includes("attendance") || p.includes("presence") || p.includes("absent")) return "attendance";
  if (p.includes("exam") || p.includes("test") || p.includes("assessment")) return "exam";
  if (p.includes("assignment") || p.includes("marks") || p.includes("grade")) return userRole === "faculty" ? "faculty" : "student";
  if (p.includes("research") || p.includes("workload") || p.includes("report") || p.includes("analytics")) return userRole === "faculty" ? "faculty" : "student";
  if (p.includes("leave") || p.includes("curriculum") || p.includes("syllabus") || p.includes("feedback")) return userRole === "faculty" ? "faculty" : "course";
  if (p.includes("student") || p.includes("enroll") || p.includes("admission")) return "student";
  if (p.includes("course") || p.includes("curriculum") || p.includes("subject")) return "course";
  return userRole === "faculty" ? "faculty" : "student";
}

// --- Controller Methods ---

/**
 * GET /api/agents — Return all agents, optionally filtered by role query param
 * Usage: GET /api/agents?role=student  or  GET /api/agents?role=faculty
 */
function getAllAgents(req, res) {
  const agents = readData("agents.json");
  const roleFilter = req.query.role;
  const filtered = roleFilter
    ? agents.filter(a => a.role === roleFilter)
    : agents;
  res.json({ success: true, data: filtered });
}

/**
 * GET /api/agents/:id — Return a single agent
 */
function getAgent(req, res) {
  const agents = readData("agents.json");
  const agent = agents.find((a) => a.id === parseInt(req.params.id));
  if (!agent) return res.status(404).json({ success: false, message: "Agent not found" });
  res.json({ success: true, data: agent });
}

/**
 * POST /api/agents — Create a new agent from a purpose description
 * The system auto-generates name, domain, actions, and system prompt
 */
async function createAgent(req, res) {
  try {
    const payload = typeof req.body === "string" ? { purpose: req.body } : (req.body || {});
    const purpose = String(payload.purpose || "").trim();
    const requestedTemplate = String(payload.templateDomain || payload.domain || "").trim().toLowerCase();
    const requestedName = String(payload.templateName || "").trim();
    const userRole = req.user?.role || "student";
    const userId = req.user?.id || null;

    if (!purpose || purpose.length < 5) {
      return res.status(400).json({ success: false, message: "Please describe the agent purpose in more detail" });
    }

    let template = null;
    if (requestedTemplate && DOMAIN_TEMPLATES[requestedTemplate]) {
      template = DOMAIN_TEMPLATES[requestedTemplate];
    } else {
      template = matchTemplate(purpose, userRole);
    }

    if (!template) {
      try {
        template = await generateCustomAgent(purpose, userRole, process.env.GEMINI_API_KEY);
      } catch (err) {
        console.warn("Custom agent generation failed, falling back to domain detect:", err.message);
      }
    }

    if (!template) {
      const fallbackDomain = detectDomain(purpose, userRole);
      template = DOMAIN_TEMPLATES[fallbackDomain];
    }

    if (!template) {
      template = userRole === "faculty"
        ? DOMAIN_TEMPLATES.faculty_class_manager
        : DOMAIN_TEMPLATES.student_academic;
    }

    // Keep role-safe defaults unless template is explicitly same role.
    const finalRole = template.role && template.role !== userRole ? userRole : userRole;
    const finalType = normalizeType(template.type || template.domain || template.name);

    const agents = readData("agents.json");

    const duplicate = agents.find((a) => {
      const sameCreator = userId && a.createdBy && String(a.createdBy) === String(userId);
      const sameRole = String(a.role || "") === String(finalRole);
      const aType = normalizeType(a.type || a.domain || a.name);
      return sameRole && aType === finalType && (sameCreator || (!a.createdBy && requestedTemplate));
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: "duplicate",
        message: `You already have a ${duplicate.name}. Open the existing one or choose a different template.`,
        existingAgent: duplicate,
      });
    }

    const newId = agents.length > 0 ? Math.max(...agents.map((a) => a.id)) + 1 : 1;
    const newAgent = {
      id: newId,
      name: requestedName || template.name,
      role: finalRole,
      type: finalType,
      domain: template.domain,
      description: template.description,
      purpose,
      icon: template.icon || "AI",
      color: template.color || "blue",
      allowedActions: template.allowedActions || [],
      keywords: template.keywords || [],
      systemPrompt: template.systemPrompt || "You are a university assistant. Use only allowed actions.",
      createdBy: userId,
      createdAt: new Date().toISOString(),
      chatHistory: [],
      actionLog: [],
    };

    agents.push(newAgent);
    writeData("agents.json", agents);

    return res.status(201).json({ success: true, message: `${newAgent.name} created successfully`, data: newAgent, agent: newAgent });
  } catch (error) {
    console.error("Create agent error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to create agent" });
  }
}

/**
 * DELETE /api/agents/:id — Remove an agent
 */
function deleteAgent(req, res) {
  const agents = readData("agents.json");
  const remaining = agents.filter((a) => a.id !== parseInt(req.params.id));
  if (remaining.length === agents.length) {
    return res.status(404).json({ success: false, message: "Agent not found" });
  }
  writeData("agents.json", remaining);
  res.json({ success: true, message: "Agent deleted" });
}

/**
 * GET /api/agents/:id/logs — Return action log for an agent
 */
function getAgentLogs(req, res) {
  const logs = readData("logs.json");
  const agentLogs = logs.filter((l) => l.agentId === parseInt(req.params.id));
  res.json({ success: true, data: agentLogs });
}

module.exports = {
  getAllAgents,
  getAgent,
  createAgent,
  deleteAgent,
  getAgentLogs,
  DOMAIN_TEMPLATES,
  matchTemplate,
};
