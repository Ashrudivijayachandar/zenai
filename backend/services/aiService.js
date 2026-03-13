// ============================================================
// AI SERVICE — NLP-powered query processing via Gemini API
// Pipeline: user query + live data → Gemini → structured JSON action
// ============================================================

const axios = require("axios");

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ─── All available actions with their JSON schemas ────────────
const ACTION_SCHEMAS = {
  // Student "my" actions (read-only, filtered to logged-in user)
  view_my_courses:      { data: {} },
  view_my_gpa:          { data: {} },
  view_course_details:  { data: { courseCode: "optional string", name: "optional string" } },
  view_my_attendance:   { data: { courseCode: "optional string", date: "optional YYYY-MM-DD" } },
  view_my_attendance_report: { data: {} },
  view_my_marks:        { data: { courseCode: "optional string", type: "optional midterm|final", minMarks: "optional number", maxMarks: "optional number" } },
  view_my_results:      { data: {} },
  view_my_timetable:    { data: { day: "optional string" } },
  view_exam_schedule:   { data: { course: "optional string", type: "optional string" } },
  view_my_profile:      { data: {} },
  update_my_profile:    { data: { phone: "optional 10-digit string", email: "optional string" } },
  view_notices:         { data: { category: "optional exam|event|workshop|placement|general", priority: "optional high|medium|low" } },
  // Faculty "my" actions
  view_my_faculty_profile:   { data: {} },
  update_my_faculty_profile: { data: { phone: "optional 10-digit string", email: "optional string" } },
  view_schedule:        { data: { day: "optional string" } },
  // Faculty marks management
  enter_marks:   { data: { studentName: "string", courseCode: "string", courseName: "string", type: "midterm|final", marks: "number", maxMarks: "number" } },
  view_marks:    { data: { studentName: "optional string", courseCode: "optional string", type: "optional string", minMarks: "optional number", maxMarks: "optional number" } },
  update_marks:  { data: { studentName: "string", courseCode: "optional string", type: "optional string", marks: "number" } },
  delete_marks:  { data: { studentName: "string", courseCode: "optional string", type: "optional string" } },
  view_marks_analytics: { data: {} },
  // Student CRUD (faculty)
  list_students:   { data: { department: "optional string", year: "optional number" } },
  create_student:  { data: { name: "string (required)", department: "string", year: "number", gpa: "number", email: "string" } },
  update_student:  { data: { name: "string (name to find)", department: "string", year: "number", gpa: "number" } },
  delete_student:  { data: { name: "string (partial name to match)" } },
  // Faculty CRUD
  list_faculty:    { data: { department: "optional string" } },
  add_faculty:     { data: { name: "string", department: "string", subjects: "array of strings", designation: "string" } },
  delete_faculty:  { data: { name: "string (partial name to match)" } },
  assign_subject:  { data: { faculty: "faculty name", subject: "subject name" } },
  generate_workload: { data: {} },
  // Courses
  list_courses:    { data: { department: "optional string", semester: "optional number" } },
  create_course:   { data: { name: "string", code: "string", semester: "number", department: "string", credits: "number", faculty: "string" } },
  update_course:   { data: { name: "course name to find", semester: "number", credits: "number" } },
  delete_course:   { data: { name: "string (partial name to match)" } },
  // Attendance
  record_attendance: { data: { studentName: "string", courseCode: "string", status: "present|absent", date: "YYYY-MM-DD" } },
  list_attendance:   { data: { studentName: "optional string", date: "optional YYYY-MM-DD" } },
  attendance_report: { data: { threshold: "optional number (default 75)" } },
  // Exams
  schedule_exam:   { data: { course: "string", date: "YYYY-MM-DD", type: "midterm|final|quiz" } },
  list_exams:      { data: {} },
  // Report
  generate_report: { data: {} },
};

// NLP examples: diverse natural language → JSON action
const NLP_EXAMPLES = [
  ["list all students",                      { action: "list_students", data: {} }],
  ["show all students",                      { action: "list_students", data: {} }],
  ["get students",                           { action: "list_students", data: {} }],
  ["students",                               { action: "list_students", data: {} }],
  ["show CSE students",                      { action: "list_students", data: { department: "CSE" } }],
  ["list students in ECE department",        { action: "list_students", data: { department: "ECE" } }],
  ["enroll Harshini in CSE 2024",           { action: "create_student", data: { name: "Harshini", department: "CSE", year: 2024 } }],
  ["add student Ravi to IT year 3",          { action: "create_student", data: { name: "Ravi", department: "IT", year: 3 } }],
  ["register Meera in ECE",                  { action: "create_student", data: { name: "Meera", department: "ECE" } }],
  ["delete Rahul",                           { action: "delete_student", data: { name: "Rahul" } }],
  ["remove Harshini from CSE",               { action: "delete_student", data: { name: "Harshini" } }],
  ["delete student Priya",                   { action: "delete_student", data: { name: "Priya" } }],
  ["REMOVE HARSHINI IN CSE A",              { action: "delete_student", data: { name: "Harshini", department: "CSE" } }],
  ["drop Amit from records",                 { action: "delete_student", data: { name: "Amit" } }],
  ["update Rahul GPA to 8.5",               { action: "update_student", data: { name: "Rahul", gpa: 8.5 } }],
  ["change Priya department to ECE",         { action: "update_student", data: { name: "Priya", department: "ECE" } }],
  ["list all faculty",                       { action: "list_faculty", data: {} }],
  ["show faculty",                           { action: "list_faculty", data: {} }],
  ["faculty",                                { action: "list_faculty", data: {} }],
  ["faculty in CSE",                         { action: "list_faculty", data: { department: "CSE" } }],
  ["add Prof. Kumar to CSE",                 { action: "add_faculty", data: { name: "Prof. Kumar", department: "CSE" } }],
  ["hire Prof. Sharma for ECE",              { action: "add_faculty", data: { name: "Prof. Sharma", department: "ECE" } }],
  ["delete faculty Kumar",                   { action: "delete_faculty", data: { name: "Kumar" } }],
  ["remove Prof. Meena",                     { action: "delete_faculty", data: { name: "Meena" } }],
  ["assign Data Structures to Prof. Kumar",  { action: "assign_subject", data: { faculty: "Kumar", subject: "Data Structures" } }],
  ["generate workload report",               { action: "generate_workload", data: {} }],
  ["faculty workload",                       { action: "generate_workload", data: {} }],
  ["list all courses",                       { action: "list_courses", data: {} }],
  ["show courses",                           { action: "list_courses", data: {} }],
  ["courses",                                { action: "list_courses", data: {} }],
  ["create course Data Structures CS201 semester 3 CSE 4 credits",
                                             { action: "create_course", data: { name: "Data Structures", code: "CS201", semester: 3, department: "CSE", credits: 4 } }],
  ["add course Machine Learning",            { action: "create_course", data: { name: "Machine Learning", department: "CSE" } }],
  ["delete course Data Structures",          { action: "delete_course", data: { name: "Data Structures" } }],
  ["remove course CS201",                    { action: "delete_course", data: { name: "CS201" } }],
  ["record attendance Rahul present",        { action: "record_attendance", data: { studentName: "Rahul", status: "present" } }],
  ["mark Priya absent today",                { action: "record_attendance", data: { studentName: "Priya", status: "absent" } }],
  ["attendance report",                      { action: "attendance_report", data: {} }],
  ["show attendance",                        { action: "list_attendance", data: {} }],
  ["schedule exam Data Structures 2024-04-15 midterm",
                                             { action: "schedule_exam", data: { course: "Data Structures", date: "2024-04-15", type: "midterm" } }],
  ["list exams",                             { action: "list_exams", data: {} }],
  ["generate report",                        { action: "generate_report", data: {} }],
  ["show report",                            { action: "generate_report", data: {} }],
  ["summary",                                { action: "generate_report", data: {} }],
  // Student "my" NLP examples
  ["my courses",                              { action: "view_my_courses", data: {} }],
  ["show my enrolled courses",                { action: "view_my_courses", data: {} }],
  ["what courses am I enrolled in",           { action: "view_my_courses", data: {} }],
  ["what subjects do I have",                 { action: "view_my_courses", data: {} }],
  ["my gpa",                                  { action: "view_my_gpa", data: {} }],
  ["show my gpa",                             { action: "view_my_gpa", data: {} }],
  ["what is my gpa",                          { action: "view_my_gpa", data: {} }],
  ["whats my cgpa",                           { action: "view_my_gpa", data: {} }],
  ["tell me about CS201",                     { action: "view_course_details", data: { courseCode: "CS201" } }],
  ["details of Data Structures",              { action: "view_course_details", data: { name: "Data Structures" } }],
  ["my attendance",                           { action: "view_my_attendance", data: {} }],
  ["show my attendance",                      { action: "view_my_attendance", data: {} }],
  ["how is my attendance",                    { action: "view_my_attendance", data: {} }],
  ["my attendance report",                    { action: "view_my_attendance_report", data: {} }],
  ["attendance percentage",                   { action: "view_my_attendance_report", data: {} }],
  ["am I below 75",                           { action: "view_my_attendance_report", data: {} }],
  ["my marks",                                { action: "view_my_marks", data: {} }],
  ["show my marks",                           { action: "view_my_marks", data: {} }],
  ["my midterm marks",                        { action: "view_my_marks", data: { type: "midterm" } }],
  ["marks in CS201",                          { action: "view_my_marks", data: { courseCode: "CS201" } }],
  ["marks above 85",                          { action: "view_my_marks", data: { minMarks: 85 } }],
  ["marks below 50",                          { action: "view_my_marks", data: { maxMarks: 50 } }],
  ["my results",                              { action: "view_my_results", data: {} }],
  ["show my results",                         { action: "view_my_results", data: {} }],
  ["how did I do in exams",                   { action: "view_my_results", data: {} }],
  ["my timetable",                            { action: "view_my_timetable", data: {} }],
  ["show my schedule",                        { action: "view_my_timetable", data: {} }],
  ["what classes do I have today",            { action: "view_my_timetable", data: {} }],
  ["monday classes",                          { action: "view_my_timetable", data: { day: "Monday" } }],
  ["exam schedule",                           { action: "view_exam_schedule", data: {} }],
  ["when are my exams",                       { action: "view_exam_schedule", data: {} }],
  ["upcoming exams",                          { action: "view_exam_schedule", data: {} }],
  ["my profile",                              { action: "view_my_profile", data: {} }],
  ["show my profile",                         { action: "view_my_profile", data: {} }],
  ["who am I",                                { action: "view_my_profile", data: {} }],
  ["update my phone to 9876543210",           { action: "update_my_profile", data: { phone: "9876543210" } }],
  ["change my email to test@uni.edu",         { action: "update_my_profile", data: { email: "test@uni.edu" } }],
  ["notices",                                 { action: "view_notices", data: {} }],
  ["show notices",                            { action: "view_notices", data: {} }],
  ["any announcements",                       { action: "view_notices", data: {} }],
  ["exam notices",                            { action: "view_notices", data: { category: "exam" } }],
  ["placement notices",                       { action: "view_notices", data: { category: "placement" } }],
  // Faculty marks NLP examples
  ["enter marks for Rahul CS201 midterm 78",  { action: "enter_marks", data: { studentName: "Rahul", courseCode: "CS201", type: "midterm", marks: 78, maxMarks: 100 } }],
  ["add marks",                               { action: "enter_marks", data: {} }],
  ["show marks for Rahul",                    { action: "view_marks", data: { studentName: "Rahul" } }],
  ["marks of CS201",                          { action: "view_marks", data: { courseCode: "CS201" } }],
  ["marks above 90",                          { action: "view_marks", data: { minMarks: 90 } }],
  ["marks less than 40 for Priya",            { action: "view_marks", data: { studentName: "Priya", maxMarks: 40 } }],
  ["update marks of Priya",                   { action: "update_marks", data: { studentName: "Priya" } }],
  ["delete marks of Amit",                    { action: "delete_marks", data: { studentName: "Amit" } }],
  ["marks analytics",                         { action: "view_marks_analytics", data: {} }],
  ["class averages",                          { action: "view_marks_analytics", data: {} }],
  // Faculty profile & schedule NLP examples
  ["my teaching schedule",                    { action: "view_schedule", data: {} }],
  ["my classes today",                        { action: "view_schedule", data: {} }],
  ["my faculty profile",                      { action: "view_my_faculty_profile", data: {} }],
  ["update my phone to 9988776655",           { action: "update_my_faculty_profile", data: { phone: "9988776655" } }],
];

/**
 * Build a comprehensive Gemini system instruction.
 * Filters to allowed actions only, injects live data context.
 */
function buildGeminiSystemPrompt(allowedActions, liveContext, lastTurnContext) {
  const allowed = allowedActions || Object.keys(ACTION_SCHEMAS);

  // Build action reference block
  const actionBlock = allowed.map((action) => {
    const schema = ACTION_SCHEMAS[action];
    if (!schema) return null;
    return `  "${action}": ${JSON.stringify(schema.data)}`;
  }).filter(Boolean).join(",\n");

  // Build relevant examples for this agent's allowed actions
  const relevantExamples = NLP_EXAMPLES
    .filter(([, json]) => allowed.includes(json.action))
    .map(([nl, json]) => `  Input: "${nl}"\n  Output: ${JSON.stringify(json)}`)
    .join("\n\n");

  // Build live data context so Gemini knows actual names
  let dataContext = "";
  if (liveContext) {
    if (liveContext.students?.length) {
      dataContext += `\nCURRENT STUDENTS: ${liveContext.students.map(s => `${s.name} (${s.department})`).join(", ")}`;
    }
    if (liveContext.faculty?.length) {
      dataContext += `\nCURRENT FACULTY: ${liveContext.faculty.map(f => `${f.name} (${f.department})`).join(", ")}`;
    }
    if (liveContext.courses?.length) {
      dataContext += `\nCURRENT COURSES: ${liveContext.courses.map(c => `${c.name} (${c.code})`).join(", ")}`;
    }
  }

  // Build last-turn context block for conversation continuity
  let lastTurnBlock = "";
  if (lastTurnContext) {
    lastTurnBlock = `\n\nLAST TURN CONTEXT:\n` +
      `  Your previous action was: ${lastTurnContext.lastAiAction || "none"}\n` +
      `  Your previous response was: ${(lastTurnContext.lastAiResponse || "").slice(0, 200)}\n` +
      `  The user's previous message was: ${lastTurnContext.lastUserMessage || "none"}\n` +
      `  If the user's current message looks like an answer to your previous question, CONTINUE that flow.`;
  }

  return `You are the decision engine for a university agent.

Your job is to classify intent from full conversation context and return one safe structured decision.

CRITICAL RULES:
1. Return ONLY valid JSON with no markdown.
2. Use ONLY actions listed in ALLOWED ACTIONS.
3. Respect intent direction:
   - viewing intent (view/show/list/get/check/see) -> use read/list actions
   - creating intent (create/add/new/enroll/register/schedule exam) -> use create actions
   - update intent (update/change/edit/modify) -> use update actions
   - delete intent (delete/remove/drop) -> use delete actions
4. If required fields are missing, set action to "clarify" and ask naturally.
5. Never invent placeholder values like "Unknown" or "TBD".
6. Connect multi-turn context. If previous turn asked for student name and latest message is a name, continue that flow.

CONVERSATION CONTINUITY — CRITICAL:
Always read the full conversation history.
If your previous message asked a question like "Which student?" or "What field?" and the user's current message is a short answer like a name ("Kavin") or a field ("email") — CONNECT them and continue the action flow.
NEVER show the help menu when the user is answering your previous question.
If the previous action was "clarify", assume the latest message is answering that clarification.

INTENT SAFETY RULES:
If the user message contains ANY of these words: list, show, view, display, check, get, all, records, report, marms, maks, viwe, lsit
→ The action MUST start with "list_" or "view_" or "attendance_report" or "generate_report" or "view_marks_analytics"
→ NEVER return a create/insert/add/schedule/record action for a viewing query
→ This is non-negotiable

MISSING INFO RULES:
If user says "create" or "add" or "enroll" WITHOUT providing a real name:
→ action: "clarify"
→ Ask for the missing details naturally
→ NEVER use "New Student" or "Unknown" or "TBD" as a default name
→ NEVER use placeholder values for any required field
${lastTurnBlock}

ALLOWED ACTIONS AND DATA SCHEMAS:
${actionBlock}
${dataContext}

EXAMPLES (input -> output):
${relevantExamples}

OUTPUT JSON SCHEMA:
{
  "action": "one of allowed actions OR clarify",
  "data": {},
  "message": "friendly one-line response",
  "needs_more_info": false,
  "missing_fields": []
}

TODAY'S DATE: ${new Date().toISOString().split("T")[0]}`;
}

function coerceConversationHistory(conversationContext) {
  if (Array.isArray(conversationContext)) return conversationContext;
  if (Array.isArray(conversationContext?.history)) return conversationContext.history;
  return [];
}

function getLastTurnContext(conversationContext) {
  if (conversationContext?.lastTurn) return conversationContext.lastTurn;
  if (conversationContext && !Array.isArray(conversationContext) && conversationContext.lastUserMessage) {
    return conversationContext;
  }
  const history = coerceConversationHistory(conversationContext);
  const last = history[history.length - 1];
  if (!last) return null;
  return {
    lastUserMessage: last.user || "",
    lastAiAction: last.action || null,
    lastAiResponse: last.ai || "",
  };
}

function buildGeminiDecisionPrompt(userQuery, liveContext, conversationContext) {
  const history = coerceConversationHistory(conversationContext)
    .slice(-12)
    .map((turn) => ({
      user: turn.user || "",
      assistant: turn.ai || "",
      action: turn.action || null,
      timestamp: turn.timestamp || null,
    }));

  const summaryContext = {
    counts: {
      students: liveContext?.students?.length || 0,
      faculty: liveContext?.faculty?.length || 0,
      courses: liveContext?.courses?.length || 0,
    },
    students: (liveContext?.students || []).slice(0, 40),
    faculty: (liveContext?.faculty || []).slice(0, 40),
    courses: (liveContext?.courses || []).slice(0, 40),
  };

  return [
    "CONVERSATION_HISTORY:",
    JSON.stringify(history),
    "LIVE_CONTEXT:",
    JSON.stringify(summaryContext),
    "LATEST_USER_MESSAGE:",
    JSON.stringify(userQuery),
  ].join("\n");
}

function isReadIntent(text) {
  const q = String(text || "").toLowerCase();
  return /\b(view|show|list|get|display|check|see|what|which|my schedule|timetable|all records?)\b/.test(q);
}

function findReadActionFallback(allowedActions) {
  const allowed = allowedActions || [];
  const preferred = [
    "view_schedule",
    "view_my_timetable",
    "view_exam_schedule",
    "list_exams",
    "view_marks",
    "view_my_marks",
    "list_students",
    "list_courses",
    "list_faculty",
    "list_attendance",
  ];
  return preferred.find((a) => allowed.includes(a)) || allowed.find((a) => a.startsWith("view_") || a.startsWith("list_")) || null;
}

function resolveGeminiDecision(parsed, userQuery, allowedActions) {
  if (!parsed || typeof parsed !== "object") return null;

  const requestedAction = String(parsed.action || "").trim().toLowerCase();
  const message = String(parsed.message || "").trim();
  const data = parsed.data && typeof parsed.data === "object" ? parsed.data : {};

  if (!requestedAction || requestedAction === "clarify") {
    return {
      action: null,
      response: message || "Please share a bit more detail so I can continue.",
    };
  }

  const normalized = normalizeAction(requestedAction, allowedActions);
  if (!normalized) return null;

  // Safety guard: if user asked to view/list but model picked create-like action, force a read action.
  if (isReadIntent(userQuery) && /^(create_|add_|schedule_exam$|record_attendance$|enter_marks$)/.test(normalized)) {
    const readAction = findReadActionFallback(allowedActions);
    if (readAction) {
      return {
        action: { action: readAction, data: {} },
        response: message || buildConfirmationMessage({ action: readAction, data: {} }),
      };
    }
  }

  return {
    action: { action: normalized, data },
    response: message || buildConfirmationMessage({ action: normalized, data }),
  };
}

/**
 * Main entry point. Calls Gemini with smart prompt.
 * Falls back to enhanced mock NLP if API unavailable.
 * @param {number} agentId - The agent ID (1-12) for context-aware responses
 */
async function processQuery(systemPrompt, userQuery, apiKey, allowedActions, liveContext, agentId, conversationContext = null) {
  const lastTurnContext = getLastTurnContext(conversationContext);
  const smartPrompt = buildGeminiSystemPrompt(allowedActions, liveContext, lastTurnContext);
  const decisionPrompt = buildGeminiDecisionPrompt(userQuery, liveContext, conversationContext);

  if (!apiKey || apiKey === "your-gemini-api-key-here") {
    return generateMockResponse(userQuery, allowedActions, liveContext, agentId, lastTurnContext);
  }

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`,
      {
        system_instruction: {
          parts: [{ text: smartPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: decisionPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
        },
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const aiMessage = response.data.candidates[0].content.parts[0].text.trim();
    console.log("[Gemini raw]:", aiMessage);

    const parsed = extractJsonAction(aiMessage);
    const resolved = resolveGeminiDecision(parsed, userQuery, allowedActions);
    if (resolved) return resolved;

    // Parsed but no valid action → fall back
    return generateMockResponse(userQuery, allowedActions, liveContext, agentId, lastTurnContext);

  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    return generateMockResponse(userQuery, allowedActions, liveContext, agentId, lastTurnContext);
  }
}

/** Extract JSON from Gemini's response (handles markdown, mixed text, etc.) */
function extractJsonAction(text) {
  if (!text) return null;
  // Strip markdown code blocks
  let cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  // Direct parse
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  // Extract outermost JSON object
  const start = cleaned.indexOf("{");
  const end   = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* fall through */ }
  }

  return null;
}

/** Build a human-readable confirmation message from the parsed action */
function buildConfirmationMessage(parsed, liveContext) {
  const action = parsed.action;
  const data   = parsed.data || {};
  const msgMap = {
    // Student "my" actions
    view_my_courses:          "Here are your enrolled courses.",
    view_my_gpa:              "Here is your current GPA.",
    view_course_details:      `Details for "${data.courseCode || data.name || "course"}".`,
    view_my_attendance:       "Here is your attendance record.",
    view_my_attendance_report:"Here is your attendance report.",
    view_my_marks:            "Here are your marks.",
    view_my_results:          "Here are your results.",
    view_my_timetable:        "Here is your class timetable.",
    view_exam_schedule:       "Here is the exam schedule.",
    view_my_profile:          "Here is your profile.",
    update_my_profile:        "Updating your profile.",
    view_notices:             "Here are the latest notices.",
    // Faculty "my" actions
    view_my_faculty_profile:   "Here is your faculty profile.",
    update_my_faculty_profile: "Updating your faculty profile.",
    view_schedule:            "Here is your teaching schedule.",
    // Faculty marks
    enter_marks:       `Entering marks for "${data.studentName}".`,
    view_marks:        "Here are the marks records.",
    update_marks:      `Updating marks for "${data.studentName}".`,
    delete_marks:      `Deleting marks for "${data.studentName}".`,
    view_marks_analytics: "Here are the marks analytics.",
    // Legacy CRUD
    list_students:     "Here are the current student records.",
    create_student:    `Enrolling student "${data.name}" in ${data.department || "the university"}.`,
    update_student:    `Updating record for "${data.name}".`,
    delete_student:    `Removing student "${data.name}" from records.`,
    list_faculty:      "Here are the current faculty members.",
    add_faculty:       `Adding "${data.name}" to the faculty roster.`,
    delete_faculty:    `Removing faculty member "${data.name}".`,
    assign_subject:    `Assigning "${data.subject}" to ${data.faculty}.`,
    generate_workload: "Generating faculty workload report.",
    list_courses:      "Here are the available courses.",
    create_course:     `Creating course "${data.name}".`,
    update_course:     `Updating course "${data.name}".`,
    delete_course:     `Removing course "${data.name}".`,
    record_attendance: `Recording attendance for "${data.studentName}".`,
    list_attendance:   "Here are the attendance records.",
    attendance_report: "Generating attendance report.",
    schedule_exam:     `Scheduling exam for "${data.course}" on ${data.date}.`,
    list_exams:        "Here are the upcoming exams.",
    generate_report:   "Generating university report.",
  };
  return msgMap[action] || `Executing action: ${action}.`;
}

// ═════════════════════════════════════════════════════════════════
// ACTION NORMALIZER — Maps non-standard action names to valid ones
// Fixes the core problem: Gemini/mock returning wrong action names
// ═════════════════════════════════════════════════════════════════

const ACTION_ALIASES = {
  // ── Attendance aliases ──
  "attendance_report":       "attendance_report",
  "get_attendance":          "list_attendance",
  "show_attendance":         "list_attendance",
  "check_attendance":        "list_attendance",
  "fetch_attendance":        "list_attendance",
  "display_attendance":      "list_attendance",
  "view_attendance":         "list_attendance",
  "attendance_summary":      "attendance_report",
  "attendance_percentage":   "view_my_attendance_report",
  // ── Marks aliases ──
  "get_marks":               "view_marks",
  "show_marks":              "view_marks",
  "fetch_marks":             "view_marks",
  "display_marks":           "view_marks",
  "check_marks":             "view_marks",
  "get_results":             "view_my_results",
  "show_results":            "view_my_results",
  "add_marks":               "enter_marks",
  "create_marks":            "enter_marks",
  "edit_marks":              "update_marks",
  "modify_marks":            "update_marks",
  "remove_marks":            "delete_marks",
  // ── GPA aliases ──
  "get_gpa":                 "view_my_gpa",
  "show_gpa":                "view_my_gpa",
  "view_gpa":                "view_my_gpa",
  "check_gpa":               "view_my_gpa",
  // ── Schedule aliases ──
  "get_schedule":            "view_schedule",
  "show_schedule":           "view_schedule",
  "get_timetable":           "view_my_timetable",
  "show_timetable":          "view_my_timetable",
  "view_timetable":          "view_my_timetable",
  // ── Profile aliases ──
  "get_profile":             "view_my_profile",
  "show_profile":            "view_my_profile",
  // ── Student CRUD aliases ──
  "add_student":             "create_student",
  "enroll_student":          "create_student",
  "new_student":             "create_student",
  "register_student":        "create_student",
  "edit_student":            "update_student",
  "modify_student":          "update_student",
  "change_student":          "update_student",
  "remove_student":          "delete_student",
  "erase_student":           "delete_student",
  "view_students":           "list_students",
  "show_students":           "list_students",
  "get_students":            "list_students",
  "fetch_students":          "list_students",
  // ── Faculty aliases ──
  "create_faculty":          "add_faculty",
  "new_faculty":             "add_faculty",
  "hire_faculty":            "add_faculty",
  "remove_faculty":          "delete_faculty",
  "view_faculty":            "list_faculty",
  "show_faculty":            "list_faculty",
  "get_faculty":             "list_faculty",
  "fetch_faculty":           "list_faculty",
  // ── Course aliases ──
  "add_course":              "create_course",
  "new_course":              "create_course",
  "edit_course":             "update_course",
  "modify_course":           "update_course",
  "remove_course":           "delete_course",
  "view_courses":            "list_courses",
  "show_courses":            "list_courses",
  "get_courses":             "list_courses",
  "fetch_courses":           "list_courses",
  // ── Exam aliases ──
  "schedule_examination":    "schedule_exam",
  "view_exams":              "list_exams",
  "show_exams":              "list_exams",
  "get_exams":               "list_exams",
  // ── Report aliases ──
  "university_report":       "generate_report",
  "full_report":             "generate_report",
  "analytics_report":        "generate_report",
  "get_report":              "generate_report",
  "show_report":             "generate_report",
  // ── Generic aliases (handled contextually) ──
  "select":                  null,
  "get":                     null,
  "show":                    null,
  "view":                    null,
  "fetch":                   null,
  "display":                 null,
  "list":                    null,
};

/**
 * Normalize a possibly non-standard action name to one that's in allowedActions.
 * Returns the normalized action name, or null if no match found.
 */
function normalizeAction(actionName, allowedActions) {
  if (!actionName) return null;
  const allowed = allowedActions || [];
  const name = actionName.toLowerCase().trim();

  // Direct match — already valid
  if (allowed.includes(name)) return name;

  // Check alias map
  const alias = ACTION_ALIASES[name];
  if (alias && allowed.includes(alias)) return alias;

  // Fuzzy: try partial matching (e.g. "attendance" → first allowed action containing "attendance")
  const fuzzy = allowed.find(a => a.includes(name) || name.includes(a.replace(/^view_my_|^view_|^list_/, "")));
  if (fuzzy) return fuzzy;

  return null;
}

// ═════════════════════════════════════════════════════════════════
// AGENT-AWARE CAPABILITIES & REDIRECTS
// Each agent knows what it can do and where to send users
// ═════════════════════════════════════════════════════════════════

const AGENT_INFO = {
  // Student agents
  1:  { name: "Academic Advisor", emoji: "📚", capabilities: [
      "📚 Your GPA and CGPA",
      "📖 Your enrolled courses and subjects",
      "📊 Course details and information",
      "🎓 Available courses list"
    ]},
  2:  { name: "Attendance Tracker", emoji: "📊", capabilities: [
      "📊 Your attendance percentage",
      "📋 Full attendance report",
      "⚠️ Subjects below 75% attendance",
      "📅 Subject-wise attendance records"
    ]},
  3:  { name: "Results & Grades", emoji: "📝", capabilities: [
      "📝 Your marks and scores",
      "📊 Your exam results",
      "🎯 Subject-wise marks breakdown",
      "📋 Midterm and final results"
    ]},
  4:  { name: "Timetable & Exams", emoji: "📅", capabilities: [
      "📅 Your class timetable",
      "⏰ Today's schedule",
      "📝 Upcoming exam schedule",
      "🗓️ Day-wise class details"
    ]},
  5:  { name: "Profile Manager", emoji: "👤", capabilities: [
      "👤 View your profile details",
      "📱 Update phone number",
      "📧 Update email address",
      "ℹ️ Your personal information"
    ]},
  6:  { name: "Notice Board", emoji: "📢", capabilities: [
      "📢 Latest announcements",
      "📝 Exam notices",
      "🎯 Placement notices",
      "📋 Event and workshop notifications"
    ]},
  // Faculty agents
  7:  { name: "Class Manager", emoji: "👨‍🏫", capabilities: [
      "👥 List and manage students",
      "➕ Add/enroll new students",
      "📚 List and manage courses",
      "✏️ Update student/course records",
      "🗑️ Remove students/courses"
    ]},
  8:  { name: "Attendance Manager", emoji: "📋", capabilities: [
      "📋 Record student attendance",
      "📊 View attendance records",
      "⚠️ Generate attendance reports",
      "✅ Mark present/absent"
    ]},
  9:  { name: "Marks Entry", emoji: "✍️", capabilities: [
      "✍️ Enter student marks",
      "📊 View marks records",
      "✏️ Update existing marks",
      "🗑️ Delete marks entries"
    ]},
  10: { name: "Schedule Manager", emoji: "🗓️", capabilities: [
      "🗓️ View teaching schedule",
      "📝 Schedule exams",
      "📋 View exam schedule",
      "📅 Manage exam dates"
    ]},
  11: { name: "Analytics Dashboard", emoji: "📈", capabilities: [
      "📈 University reports",
      "📊 Faculty workload analysis",
      "⚠️ Attendance reports",
      "📝 Marks analytics and averages"
    ]},
  12: { name: "Faculty Profile", emoji: "👨‍🏫", capabilities: [
      "👨‍🏫 View your faculty profile",
      "📱 Update phone/email",
      "👥 View faculty list",
      "ℹ️ Your professional details"
    ]},
};

// Redirect map: topic keywords → which agent handles it
const REDIRECT_MAP = {
  attendance: { agentIds: [2, 8], studentAgent: "Attendance Tracker (Agent 2)", facultyAgent: "Attendance Manager (Agent 8)" },
  marks:      { agentIds: [3, 9], studentAgent: "Results & Grades (Agent 3)", facultyAgent: "Marks Entry (Agent 9)" },
  results:    { agentIds: [3],    studentAgent: "Results & Grades (Agent 3)", facultyAgent: "Results & Grades (Agent 3)" },
  timetable:  { agentIds: [4, 10], studentAgent: "Timetable & Exams (Agent 4)", facultyAgent: "Schedule Manager (Agent 10)" },
  schedule:   { agentIds: [4, 10], studentAgent: "Timetable & Exams (Agent 4)", facultyAgent: "Schedule Manager (Agent 10)" },
  exam:       { agentIds: [4, 10], studentAgent: "Timetable & Exams (Agent 4)", facultyAgent: "Schedule Manager (Agent 10)" },
  profile:    { agentIds: [5, 12], studentAgent: "Profile Manager (Agent 5)", facultyAgent: "Faculty Profile (Agent 12)" },
  notices:    { agentIds: [6],    studentAgent: "Notice Board (Agent 6)", facultyAgent: "Notice Board (Agent 6)" },
  gpa:        { agentIds: [1],    studentAgent: "Academic Advisor (Agent 1)", facultyAgent: "Academic Advisor (Agent 1)" },
  courses:    { agentIds: [1, 7], studentAgent: "Academic Advisor (Agent 1)", facultyAgent: "Class Manager (Agent 7)" },
  students:   { agentIds: [7],    studentAgent: "Class Manager (Agent 7)", facultyAgent: "Class Manager (Agent 7)" },
  faculty:    { agentIds: [12],   studentAgent: "Faculty Profile (Agent 12)", facultyAgent: "Faculty Profile (Agent 12)" },
  analytics:  { agentIds: [11],   studentAgent: "Analytics Dashboard (Agent 11)", facultyAgent: "Analytics Dashboard (Agent 11)" },
  workload:   { agentIds: [11],   studentAgent: "Analytics Dashboard (Agent 11)", facultyAgent: "Analytics Dashboard (Agent 11)" },
  fees:       { agentIds: [],     studentAgent: null, facultyAgent: null },
};

/**
 * Check if a query belongs to a different agent and return a redirect message.
 * Returns null if the query belongs to the current agent.
 */
function checkForRedirect(query, agentId, allowedActions) {
  const q = query.toLowerCase();
  const isFacultyAgent = agentId >= 7;

  // Topic detection for redirect
  // FIX 7: Skip redirect for compound topics like "exam notices" — notice takes priority
  const hasNoticeKeyword = q.includes("notice") || q.includes("announcement") || q.includes("bulletin");

  const topicChecks = [
    { topic: "fees",       keywords: ["fee","fees","payment","tuition","challan"] },
    { topic: "attendance", keywords: ["attendance","present","absent","bunk","shortage","detained","detention"] },
    { topic: "marks",      keywords: ["marks","mark","score","scored","scoring"] },
    { topic: "results",    keywords: ["result","results","scorecard","grade card","marksheet"] },
    { topic: "timetable",  keywords: ["timetable","time table","schedule","class timing","period"] },
    { topic: "exam",       keywords: hasNoticeKeyword ? [] : ["exam","exams","examination","test date","quiz"] },
    { topic: "profile",    keywords: ["profile","my info","my details","personal","phone","email","update my"] },
    { topic: "notices",    keywords: ["notice","notices","announcement","bulletin","circular"] },
    { topic: "gpa",        keywords: ["gpa","cgpa","grade point","grade","grades","grading"] },
    { topic: "courses",    keywords: ["course","courses","subject","subjects","enrolled","studying"] },
    { topic: "students",   keywords: ["student","students","enroll","register"] },
    { topic: "faculty",    keywords: ["faculty","professor","prof","teacher"] },
    { topic: "analytics",  keywords: ["analytics","report","statistics","stats","analysis","workload"] },
  ];

  for (const { topic, keywords } of topicChecks) {
    if (!keywords.some(kw => q.includes(kw))) continue;

    const redirect = REDIRECT_MAP[topic];
    if (!redirect) continue;

    // Check if this agent can handle this topic
    if (redirect.agentIds.includes(agentId)) return null;

    // Check if any allowed action matches the topic
    const topicActions = Object.keys(ACTION_SCHEMAS).filter(a => a.includes(topic) || 
      (topic === "attendance" && (a.includes("attendance"))) ||
      (topic === "marks" && (a.includes("marks") || a.includes("results"))) ||
      (topic === "results" && (a.includes("results") || a.includes("marks"))) ||
      (topic === "gpa" && a.includes("gpa")) ||
      (topic === "courses" && (a.includes("courses") || a.includes("course"))) ||
      (topic === "timetable" && (a.includes("timetable") || a.includes("schedule"))) ||
      (topic === "exam" && (a.includes("exam"))) ||
      (topic === "profile" && a.includes("profile")) ||
      (topic === "notices" && a.includes("notices")) ||
      (topic === "students" && a.includes("student")) ||
      (topic === "faculty" && a.includes("faculty"))
    );
    const hasCapability = topicActions.some(a => allowedActions.includes(a));
    if (hasCapability) return null; // This agent CAN handle it

    // Fees special case — no agent handles it
    if (topic === "fees") {
      return "I can see you're asking about fees! 💰 Fee details are managed separately. Please contact the accounts department or check your university portal for fee information.";
    }

    // Build redirect message
    const targetAgent = isFacultyAgent ? redirect.facultyAgent : redirect.studentAgent;
    if (targetAgent) {
      return `I can see you're asking about ${topic}! 🎯 That is handled by your **${targetAgent}**. Please switch to that agent to get help with ${topic}.`;
    }
  }

  return null; // No redirect needed
}


// ═════════════════════════════════════════════════════════════════
// ENHANCED MOCK NLP ENGINE — Complete rewrite
// Smart greetings, redirects, single-word queries, never rejects
// ═════════════════════════════════════════════════════════════════

const DELETE_WORDS   = ["delete","remove","drop","cancel","withdraw","kick","expel","fire","dismiss","rem"];
const CREATE_WORDS   = ["add","create","enroll","enrol","register","hire","new","insert","admit","join","appoint"];
const UPDATE_WORDS   = ["update","change","edit","modify","set","correct","fix"];
const ASSIGN_WORDS   = ["assign","give","allocate","map","link"];
const SCHEDULE_WORDS = ["schedule","book","plan","arrange"];
const REPORT_WORDS   = ["report","summary","overview","stats","analytics","generate"];
const WORKLOAD_WORDS = ["workload","load","burden"];
const ATTEND_WORDS   = ["attendance","present","absent","mark attendance","record attendance","bunk","shortage","detained","detention"];

const DEPT_ALIASES = {
  "cse":"CSE","cs":"CSE","computer":"CSE","ece":"ECE","ec":"ECE","electronics":"ECE","ee":"ECE",
  "it":"IT","information":"IT","me":"ME","mechanical":"ME","civil":"CIVIL","mba":"MBA","mca":"MCA"
};

const DESIGNATION_KEYWORDS = [
  "assistant professor","associate professor","professor","lecturer","senior lecturer",
  "hod","head of department","visiting faculty","adjunct professor"
];

function detectDept(tokens) {
  for (const t of tokens) {
    if (DEPT_ALIASES[t.toLowerCase()]) return DEPT_ALIASES[t.toLowerCase()];
  }
  return null;
}

function detectDesignation(q) {
  for (const d of DESIGNATION_KEYWORDS) {
    if (q.includes(d)) return d.replace(/\b\w/g, c => c.toUpperCase());
  }
  return null;
}

function parseNaturalDate(query) {
  const isoMatch = query.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];
  const MONTHS = {
    january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
    july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
    jan:"01",feb:"02",mar:"03",apr:"04",jun:"06",jul:"07",aug:"08",
    sep:"09",oct:"10",nov:"11",dec:"12"
  };
  const q = query.toLowerCase();
  for (const [mon, monNum] of Object.entries(MONTHS)) {
    const m1 = q.match(new RegExp(`${mon}\\s+(\\d{1,2})(?:\\s+(\\d{4}))?`));
    if (m1) { return `${m1[2] || new Date().getFullYear()}-${monNum}-${m1[1].padStart(2, "0")}`; }
    const m2 = q.match(new RegExp(`(\\d{1,2})\\s+${mon}(?:\\s+(\\d{4}))?`));
    if (m2) { return `${m2[2] || new Date().getFullYear()}-${monNum}-${m2[1].padStart(2, "0")}`; }
  }
  return null;
}

function normalizeUserInputText(input) {
  const typoMap = {
    marms: "marks",
    maks: "marks",
    marsk: "marks",
    scheduel: "schedule",
    shedule: "schedule",
    timetabel: "timetable",
    exma: "exam",
    viwe: "view",
    lsit: "list",
    shwo: "show",
    upadte: "update",
    creat: "create",
    delet: "delete",
    studnet: "student",
    coures: "course",
  };

  return String(input || "").replace(/\b\w+\b/gi, (word) => {
    const key = word.toLowerCase();
    if (!typoMap[key]) return word;
    const fixed = typoMap[key];
    return word[0] === word[0]?.toUpperCase()
      ? fixed.charAt(0).toUpperCase() + fixed.slice(1)
      : fixed;
  });
}

function parseStudentCreateDetails(query) {
  const lower = query.toLowerCase();

  const deptMatch = query.match(/\b(?:dept|department)\s*[:=-]?\s*([A-Za-z]+)/i) ||
                    query.match(/\b(CSE|IT|ECE|ME|MECH|CIVIL|MBA|MCA)\b/i);
  const yearMatch = query.match(/\b(20\d{2})\b/) || query.match(/\b(?:year|batch)\s*[:=-]?\s*(\d{1,4})\b/i);
  const emailMatch = query.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = query.match(/\b\d{10}\b/);

  let name = null;
  const keyedName = query.match(/\bname\s*[:=-]?\s*([A-Za-z][A-Za-z\s'.-]+?)(?=\s+(?:dept|department|year|batch|email|phone)\b|$)/i);
  if (keyedName) {
    name = keyedName[1].trim();
  } else {
    const cleaned = query
      .replace(/\b(create|add|enroll|enrol|register|student|new|name|dept|department|year|batch|email|phone|in|to)\b/gi, " ")
      .replace(/[,:;=]/g, " ")
      .replace(/\b\d{4}\b/g, " ")
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, " ")
      .replace(/\b\d{10}\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned) name = cleaned;
  }

  if (name) {
    name = name.replace(/^name\s+/i, "").trim();
  }

  return {
    name,
    department: deptMatch ? String(deptMatch[1]).toUpperCase() : null,
    year: yearMatch ? parseInt(yearMatch[1], 10) : null,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null,
    hasEnoughCoreFields: !!(name && deptMatch),
    asksCreate: /\b(create|add|enroll|enrol|register|new student)\b/.test(lower),
  };
}

function detectName(tokens, existingNames) {
  if (existingNames && existingNames.length) {
    const q = tokens.join(" ").toLowerCase();
    const match = existingNames.find(n =>
      q.includes(n.split(" ")[0].toLowerCase()) ||
      q.includes(n.replace(/^Prof\.\s*/i, "").split(" ")[0].toLowerCase())
    );
    if (match) return match.replace(/^Prof\.\s*/i, "");
  }
  const stopTokens = new Set([
    ...DELETE_WORDS,...CREATE_WORDS,...UPDATE_WORDS,...ASSIGN_WORDS,
    ...SCHEDULE_WORDS,...REPORT_WORDS,...WORKLOAD_WORDS,...ATTEND_WORDS,
    "list","show","get","display","fetch","view","all","find","search","check","what",
    "student","faculty","course","class","section","batch","department","dept","professor","prof",
    "in","from","to","of","at","the","a","an","for","and","or","with","all","is","are","please","kindly","as",
    ...Object.keys(DEPT_ALIASES),"cse","ece","it","me","a","b"
  ]);
  const nameParts = tokens.filter(t => t.length > 1 && !stopTokens.has(t.toLowerCase()) && !/^\d+$/.test(t));
  return nameParts.length ? nameParts.join(" ") : null;
}

function bareDeleteClarification(allowedActions) {
  const a = allowedActions || [];
  if (a.includes("delete_student")) {
    return "Do you want to delete **all student records** or a **particular student**?\n\n" +
           "• To delete a specific student, type: `delete [student name]`\n" +
           "• To delete ALL student records, type: `delete all students` (⚠️ irreversible)";
  }
  if (a.includes("delete_faculty")) {
    return "Do you want to delete **all faculty records** or a **particular faculty member**?\n\n" +
           "• To delete a specific faculty, type: `delete [faculty name]`\n" +
           "• To delete ALL faculty records, type: `delete all faculty` (⚠️ irreversible)";
  }
  if (a.includes("delete_course")) {
    return "Do you want to delete **all courses** or a **particular course**?\n\n" +
           "• To delete a specific course, type: `delete course [name]`\n" +
           "• To delete ALL courses, type: `delete all courses` (⚠️ irreversible)";
  }
  return "Please specify what you want to delete and provide a name.";
}

// ═════════════════════════════════════════════════════════════════
// MAIN MOCK NLP FUNCTION — The heart of the NLP engine
// ═════════════════════════════════════════════════════════════════

function generateMockResponse(query, allowedActions, liveContext, agentId, conversationContext = null) {
  const normalizedQuery = normalizeUserInputText(query);
  const q      = normalizedQuery.toLowerCase().trim();
  const tokens = normalizedQuery.trim().split(/\s+/);
  const allowed = allowedActions || [];
  const info   = AGENT_INFO[agentId] || { name: "Assistant", emoji: "🤖", capabilities: [] };

  // ─── 1. GREETINGS / HELP / THANKS / SMALLTALK ───────────────
  const GREETING_PATTERNS = /^(hi+|he+y+|hello+|hola|howdy|namaste|helo|hai|yo|sup)[!.\s]*$/i;
  const GREETING_PHRASES  = ["good morning","good afternoon","good evening","greetings"];
  const HELP_PHRASES      = ["help","what can you do","what do you do","how can you help","capabilities","commands","options","menu","features","what are you"];
  const THANKS_PHRASES    = ["thanks","thank you","thankyou","thx","ty","appreciate","great","awesome","cool","nice","ok","okay","got it","understood","good","perfect"];
  const SMALLTALK_PHRASES = ["how are you","who are you","are you a bot","are you ai","whats up","what's up","wassup"];

  const isGreeting  = GREETING_PATTERNS.test(q) || GREETING_PHRASES.some(w => q.includes(w));
  const isHelp      = HELP_PHRASES.some(w => q.includes(w));
  const isThanks    = THANKS_PHRASES.some(w => q === w || q === w + "!" || q === w + ".");
  const isSmallTalk = SMALLTALK_PHRASES.some(w => q.includes(w));

  if (isGreeting || isHelp || isThanks || isSmallTalk || q.length <= 2) {
    if (isThanks) {
      return { action: null, response: `You're welcome! 😊 Is there anything else I can help you with?` };
    }
    if (isSmallTalk) {
      return { action: null, response: `I'm your ${info.name}! ${info.emoji} I'm here to help you.\n\nI can assist with:\n${info.capabilities.join("\n")}\n\nWhat would you like to know?` };
    }
    // Greeting or help
    return { action: null, response: `Hello! 👋 Welcome to ZenAi!\nI am your **${info.name}** ${info.emoji}\n\nI can help you with:\n${info.capabilities.join("\n")}\n\nWhat would you like to know today?` };
  }

  // ─── 2. CHECK FOR REDIRECTS (before intent detection) ───────
  const redirectMsg = checkForRedirect(query, agentId, allowed);
  if (redirectMsg) {
    return { action: null, response: redirectMsg };
  }

  // Common list intents like "list all records" should always return records for the current agent domain.
  if (/\b(list|show|view|display|get)\b/.test(q) && /\b(all|records?)\b/.test(q)) {
    if (allowed.includes("view_marks")) {
      return { action: { action: "view_marks", data: {} }, response: "Here are all marks records. 📊" };
    }
    if (allowed.includes("list_students")) {
      return { action: { action: "list_students", data: {} }, response: "Here are all student records. 👥" };
    }
    if (allowed.includes("view_schedule")) {
      return { action: { action: "view_schedule", data: {} }, response: "Here is your teaching schedule. 📅" };
    }
    if (allowed.includes("list_exams")) {
      return { action: { action: "list_exams", data: {} }, response: "Here are all scheduled exams. 📝" };
    }
  }

  // ─── 3. INTENT DETECTION ────────────────────────────────────
  const isDelete   = DELETE_WORDS.some(w => q.includes(w));
  const isCreate   = CREATE_WORDS.some(w => q.includes(w));
  const isUpdate   = UPDATE_WORDS.some(w => q.includes(w));
  const isAssign   = ASSIGN_WORDS.some(w => q.includes(w));
  const isSchedule = SCHEDULE_WORDS.some(w => q.includes(w));
  const isScheduleCreateIntent = /\b(schedule\s+exam|add\s+exam|create\s+exam|book\s+exam|plan\s+exam|new\s+exam)\b/.test(q);
  const isReport   = REPORT_WORDS.some(w => q.includes(w));
  const isWorkload = WORKLOAD_WORDS.some(w => q.includes(w));
  const isAttend   = ATTEND_WORDS.some(w => q.includes(w));
  const isMarks    = /\b(marks?|grades?|scores?|results?)\b/i.test(q);

  const isFacultyWord = q.includes("faculty") || q.includes("prof") || q.includes("professor") || q.includes("teacher") || q.includes("lecturer");
  const isCourseWord  = q.includes("course") || q.includes("subject") || q.includes("class");
  const isExamWord    = q.includes("exam") || q.includes("test") || q.includes("quiz");
  const wantsAll      = q.includes(" all ");
  const isProfileUpdateAgent = allowed.includes("update_my_profile") || allowed.includes("update_my_faculty_profile");

  // Follow-up context: user answers a previous clarification question
  // FIX 1: maybeOnlyName must NOT match queries containing action/entity keywords
  const _looksLikeName = /^[A-Za-z][A-Za-z\s'.-]{1,40}$/.test(normalizedQuery.trim());
  const _hasActionWords = /\b(show|view|list|get|display|fetch|create|add|enroll|update|edit|change|delete|remove|drop|enter|mark|record|schedule|assign|report|generate|all|my|students?|faculty|courses?|marks?|attendance|exam|profile|notices?|workload|analytics|timetable|help|hello|hi|hey)\b/i.test(normalizedQuery.trim());
  const maybeOnlyName = _looksLikeName && !_hasActionWords;
  const lastMsg = (conversationContext?.lastUserMessage || "").toLowerCase();
  const lastAiAction = conversationContext?.lastAiAction || null;
  const lastAiResponse = (conversationContext?.lastAiResponse || "").toLowerCase();
  const aiAskedForName = /which student|student name|provide.*name|specify.*name|who.*update|who.*delete|who.*want/i.test(lastAiResponse);
  const aiAskedForField = /what.*update|what.*change|what field|which field/i.test(lastAiResponse);

  // If last AI response asked for a name and user sent just a name → continue the flow
  if (maybeOnlyName && aiAskedForName) {
    const studentName = normalizedQuery.trim();
    // Determine which action was in progress from the last conversation context
    if (allowed.includes("update_student") && (/\b(update|edit|change|modify)\b/.test(lastMsg) || lastAiAction === "update_student")) {
      return {
        action: null,
        response:
          `Got it — student **${studentName}**. What would you like to update?\n` +
          "• Department\n• Year\n• GPA\n• Email\n• Phone\n" +
          "Example: update student " + studentName + " email to student@university.edu",
      };
    }
    if (allowed.includes("delete_student") && (/\b(delete|remove|drop)\b/.test(lastMsg) || lastAiAction === "delete_student")) {
      return {
        action: { action: "delete_student", data: { name: studentName } },
        response: `Removing student "${studentName}" from records. 🗑️`,
      };
    }
    if (allowed.includes("create_student") && (/\b(create|add|enroll|register)\b/.test(lastMsg) || lastAiAction === "create_student")) {
      return {
        action: null,
        response:
          `Got it — enrolling **${studentName}**. Please also provide the department.\n` +
          "Example: " + studentName + " CSE 2024",
      };
    }
    // Generic: if AI asked for a name but we can't tell the action, ask for clarification
    if (/\b(update|edit|change|modify)\b/.test(lastAiResponse)) {
      return {
        action: null,
        response:
          `Got it — **${studentName}**. What would you like to update?\n` +
          "• Department\n• Year\n• GPA\n• Email\n• Phone",
      };
    }
  }

  // If last AI response asked for a field and user sent a short answer → build data from it
  if (aiAskedForField && q.length < 40 && !isGreeting && !isHelp) {
    // User is answering "what to update" — pass through to intent detection below
    // (the existing logic handles partial update queries already)
  }

  const dept = detectDept(tokens);
  const studentNames = liveContext?.students?.map(s => s.name) || [];
  const facultyNames = liveContext?.faculty?.map(f => f.name) || [];
  const courseNames  = liveContext?.courses?.map(c => c.name) || [];

  const year = tokens.map(t => parseInt(t)).find(n => n > 1990 && n < 2030);
  const gpa  = parseFloat(tokens.find(t => /^\d+(\.\d+)?$/.test(t) && parseFloat(t) <= 10 && parseFloat(t) > 0 && parseFloat(t) < 1990));

  const phoneRaw = query.match(/\b(\d{10})\b/) || query.match(/(?:phone|mobile|number)[:\s#]*(\d+)/i);
  const phone = phoneRaw ? phoneRaw[1] : undefined;
  const emailMatch = query.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch ? emailMatch[0] : undefined;

  const creditsMatch = query.match(/(\d+)\s*credits?/i) || query.match(/credits?\s+to\s+(\d+)/i) || query.match(/credits?\s*[:=]\s*(\d+)/i);
  const credits = creditsMatch ? parseInt(creditsMatch[1]) : undefined;

  const semMatch = query.match(/semester\s*[:=]?\s*(\d+)/i) || query.match(/sem\s*[:=]?\s*(\d+)/i);
  const semester = semMatch ? parseInt(semMatch[1]) : undefined;

  // FIX 2: isFieldUpdate should only fire for update intents, NOT create
  // "add student Ravi to IT year 3" was incorrectly hitting update_student because isCreate + "to" + "year"
  const isFieldUpdate = isUpdate && !isCreate &&
    (q.includes(" to ") || q.includes(" for ") || q.includes(" of ")) &&
    (q.includes("phone") || q.includes("mobile") || q.includes("email") || q.includes("gpa") ||
     q.includes("year") || q.includes("number") || q.includes("address") || q.includes("section") ||
     q.includes("dept") || q.includes("department") || q.includes("designation") || q.includes("salary") ||
     q.includes("credit") || q.includes("credits"));

  // Profile update intents should work even with short prompts like "update" or "update phone number".
  if (isProfileUpdateAgent) {
    const asksProfileChange = isUpdate || q === "update" || q.includes("update my profile") || q.includes("phone") || q.includes("email") || q.includes("contact");
    if (asksProfileChange) {
      if (phone || email) {
        if (allowed.includes("update_my_profile")) {
          return {
            action: {
              action: "update_my_profile",
              data: {
                ...(phone ? { phone } : {}),
                ...(email ? { email } : {}),
              },
            },
            response: "Updating your profile. ✏️",
          };
        }
        if (allowed.includes("update_my_faculty_profile")) {
          return {
            action: {
              action: "update_my_faculty_profile",
              data: {
                ...(phone ? { phone } : {}),
                ...(email ? { email } : {}),
              },
            },
            response: "Updating your faculty profile. ✏️",
          };
        }
      }

      return {
        action: null,
        response:
          "Sure, I can update that. Please share the new value in one line, for example:\n" +
          "• update my phone to 9876543210\n" +
          "• update my email to rahul.new@university.edu",
      };
    }
  }

  // ─── 4. SINGLE-WORD / SHORT QUERY MATCHING ─────────────────
  // Handle bare keywords: "gpa", "result", "courses", "attendance", etc.
  // These should resolve to the correct action based on agent context.

  // FIX 5: Add "scorecard", "how did i do", "how did i perform" to results patterns
  // GPA / CGPA / Grades / Performance / Result
  if (q.match(/\b(gpa|cgpa|grade\s*point|grades?|performance|academic\s*score|overall\s*score)\b/) ||
      q.match(/\b(result|results|scorecard|how\s*am\s*i\s*doing|how\s*did\s*i\s*do|how\s*did\s*i\s*perform)\b/)) {
    if (allowed.includes("view_my_gpa") && !q.includes("result") && !q.includes("scorecard") && !q.includes("how did")) {
      return { action: { action: "view_my_gpa", data: {} }, response: "Here is your current GPA. 📊" };
    }
    if (allowed.includes("view_my_results")) {
      return { action: { action: "view_my_results", data: {} }, response: "Here are your results. 📝" };
    }
    if (allowed.includes("view_my_gpa")) {
      return { action: { action: "view_my_gpa", data: {} }, response: "Here is your current GPA. 📊" };
    }
  }

  // FIX 3: Courses — prefer list_courses when "all" or "list" is present
  if (q.match(/\b(courses?|subjects?|enrolled|studying|what\s*am\s*i\s*studying|class\s*list)\b/) && !isDelete && !isCreate && !isUpdate) {
    // If user says "list all courses" or "show courses" — prefer list_courses (all courses)
    if (allowed.includes("list_courses") && (wantsAll || /\b(list|show|view|display|get)\b/.test(q))) {
      return { action: { action: "list_courses", data: dept ? { department: dept } : {} }, response: "Here are the available courses. 📚" };
    }
    if (allowed.includes("view_my_courses")) {
      return { action: { action: "view_my_courses", data: {} }, response: "Here are your enrolled courses. 📚" };
    }
    if (allowed.includes("list_courses")) {
      return { action: { action: "list_courses", data: dept ? { department: dept } : {} }, response: "Here are the available courses. 📚" };
    }
  }

  // FIX 4: Attendance report — fixed "percentage" not matching due to trailing \b, added "can I sit"
  if (q.match(/\b(attendance\s*report|attendance\s*percent|attendance\s*percentage|below\s*75|shortage|bunk|how\s*many\s*can\s*i\s*(miss|bunk|skip)|detained|detention|can\s*i\s*sit)/) ||
      (q.includes("attendance") && (q.includes("percent") || q.includes("report") || q.includes("eligible") || q.includes("shortage")))) {
    if (allowed.includes("view_my_attendance_report")) {
      return { action: { action: "view_my_attendance_report", data: {} }, response: "Here is your attendance report. ⚠️" };
    }
    if (allowed.includes("attendance_report")) {
      const threshold = parseInt(tokens.find(t => /^\d+$/.test(t) && parseInt(t) <= 100 && parseInt(t) >= 40)) || 75;
      return { action: { action: "attendance_report", data: { threshold } }, response: "Generating attendance report. 📊" };
    }
  }

  // Attendance single-word
  if (q.match(/\b(attendance|att)\b/) && !isCreate && !isDelete && !isUpdate) {
    if (allowed.includes("view_my_attendance")) {
      return { action: { action: "view_my_attendance", data: {} }, response: "Here is your attendance record. 📊" };
    }
    if (allowed.includes("view_my_attendance_report")) {
      return { action: { action: "view_my_attendance_report", data: {} }, response: "Here is your attendance report. 📋" };
    }
    if (allowed.includes("list_attendance")) {
      return { action: { action: "list_attendance", data: {} }, response: "Here are the attendance records. 📋" };
    }
  }

  // Marks / Score single-word block removed due to duplicate advanced handling in isMarks

  // FIX 6: Timetable/Schedule — prefer view_exam_schedule when "exam" keyword present
  if (q.match(/\b(timetable|time\s*table|schedule|class\s*timing|period|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/) && !isScheduleCreateIntent) {
    const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
    let dayVal = null;
    for (const d of days) { if (q.includes(d)) { dayVal = d.charAt(0).toUpperCase() + d.slice(1); break; } }
    if (q.includes("today")) { dayVal = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()]; }
    if (q.includes("tomorrow")) { dayVal = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][(new Date().getDay() + 1) % 7]; }

    // If query mentions "exam" — prefer exam schedule over timetable
    if (isExamWord && allowed.includes("view_exam_schedule")) {
      return { action: { action: "view_exam_schedule", data: {} }, response: "Here is the exam schedule. 📝" };
    }
    if (allowed.includes("view_my_timetable") && !isExamWord) {
      return { action: { action: "view_my_timetable", data: dayVal ? { day: dayVal } : {} }, response: "Here is your timetable. 📅" };
    }
    if (allowed.includes("view_schedule")) {
      return { action: { action: "view_schedule", data: dayVal ? { day: dayVal } : {} }, response: "Here is your teaching schedule. 📅" };
    }
  }

  // Exam
  if (q.match(/\b(exam|exams?|examination|quiz|test\s*date|upcoming\s*exam)\b/) && !isSchedule && !isCreate) {
    if (allowed.includes("view_exam_schedule")) {
      return { action: { action: "view_exam_schedule", data: {} }, response: "Here is the exam schedule. 📝" };
    }
    if (allowed.includes("list_exams")) {
      return { action: { action: "list_exams", data: {} }, response: "Here are the upcoming exams. 📋" };
    }
  }

  // Profile
  if (q.match(/\b(profile|my\s*info|my\s*details?|personal|who\s*am\s*i)\b/) && !isUpdate) {
    if (allowed.includes("view_my_profile")) {
      return { action: { action: "view_my_profile", data: {} }, response: "Here is your profile. 👤" };
    }
    if (allowed.includes("view_my_faculty_profile")) {
      return { action: { action: "view_my_faculty_profile", data: {} }, response: "Here is your faculty profile. 👨‍🏫" };
    }
  }

  // Notices / Announcements
  if (q.match(/\b(notice|notices|announcement|announcements|bulletin|circular|placement|any\s*new)\b/)) {
    if (allowed.includes("view_notices")) {
      const catMap = { exam:"exam", placement:"placement", event:"event", workshop:"workshop", general:"general" };
      let category = null;
      for (const [kw, cat] of Object.entries(catMap)) { if (q.includes(kw)) { category = cat; break; } }
      const prioMap = { urgent:"high", important:"high", high:"high", medium:"medium", low:"low" };
      let priority = null;
      for (const [kw, p] of Object.entries(prioMap)) { if (q.includes(kw)) { priority = p; break; } }
      return { action: { action: "view_notices", data: { ...(category ? { category } : {}), ...(priority ? { priority } : {}) } }, response: "Here are the latest notices. 📢" };
    }
  }

  // Students list
  if (q.match(/\b(students?)\b/) && !isDelete && !isCreate && !isUpdate) {
    if (allowed.includes("list_students")) {
      return { action: { action: "list_students", data: dept ? { department: dept } : {} }, response: "Here are the student records. 👥" };
    }
  }

  // Faculty list
  if (q.match(/\b(faculty|professors?|teachers?|lecturers?)\b/) && !isDelete && !isCreate && !isUpdate) {
    if (allowed.includes("list_faculty")) {
      return { action: { action: "list_faculty", data: dept ? { department: dept } : {} }, response: "Here are the faculty members. 👨‍🏫" };
    }
  }

  // Academics / Academic summary / Overview / Progress
  if (q.match(/\b(academics?|academic\s*summary|academic\s*report|academic\s*progress|progress|overview|credit|credits)\b/)) {
    if (allowed.includes("view_my_gpa")) {
      return { action: { action: "view_my_gpa", data: {} }, response: "Here is your academic summary. 📊" };
    }
    if (allowed.includes("generate_report")) {
      return { action: { action: "generate_report", data: {} }, response: "Generating report. 📈" };
    }
  }

  // Backlog / Arrears / Failed
  if (q.match(/\b(arrear|backlog|pending\s*subject|failed|clear\s*backlog)\b/)) {
    if (allowed.includes("view_my_results")) {
      return { action: { action: "view_my_results", data: {} }, response: "Here are your results — check for any pending subjects. 📝" };
    }
    if (allowed.includes("view_my_gpa")) {
      return { action: { action: "view_my_gpa", data: {} }, response: "Here is your academic standing. 📊" };
    }
  }

  // Eligibility
  if (q.match(/\b(eligible|eligibility|can\s*i\s*sit|allowed\s*for\s*exam)\b/)) {
    if (allowed.includes("view_my_attendance_report")) {
      return { action: { action: "view_my_attendance_report", data: {} }, response: "Here is your attendance — check eligibility based on 75% requirement. ⚠️" };
    }
  }

  // ─── 5. "MY" PREFIX ACTIONS ─────────────────────────────────
  const isMy = q.includes("my ") || q.startsWith("my") || q.includes(" i ") || q.includes("am i") || q.includes("i have") || q.includes("who am");

  if (isMy) {
    if ((q.includes("gpa") || q.includes("cgpa") || q.includes("grade")) && allowed.includes("view_my_gpa")) {
      return { action: { action: "view_my_gpa", data: {} }, response: "Here is your current GPA. 📊" };
    }
    if ((q.includes("course") || q.includes("subject") || q.includes("enrolled")) && allowed.includes("view_my_courses")) {
      return { action: { action: "view_my_courses", data: {} }, response: "Here are your enrolled courses. 📚" };
    }
    if (q.includes("attendance") && q.includes("report") && allowed.includes("view_my_attendance_report")) {
      return { action: { action: "view_my_attendance_report", data: {} }, response: "Here is your attendance report. 📋" };
    }
    if (q.includes("attendance") && allowed.includes("view_my_attendance")) {
      return { action: { action: "view_my_attendance", data: {} }, response: "Here is your attendance. 📊" };
    }
    if ((q.includes("result") || q.includes("scorecard")) && allowed.includes("view_my_results")) {
      return { action: { action: "view_my_results", data: {} }, response: "Here are your results. 📝" };
    }
    // view_my_marks condition removed
    if ((q.includes("timetable") || q.includes("schedule") || q.includes("class")) && allowed.includes("view_my_timetable")) {
      const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
      let dayVal = null;
      for (const d of days) { if (q.includes(d)) { dayVal = d.charAt(0).toUpperCase() + d.slice(1); break; } }
      return { action: { action: "view_my_timetable", data: dayVal ? { day: dayVal } : {} }, response: "Here is your timetable. 📅" };
    }
    if ((q.includes("timetable") || q.includes("schedule") || q.includes("teaching") || q.includes("class")) && allowed.includes("view_schedule")) {
      const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
      let dayVal = null;
      for (const d of days) { if (q.includes(d)) { dayVal = d.charAt(0).toUpperCase() + d.slice(1); break; } }
      return { action: { action: "view_schedule", data: dayVal ? { day: dayVal } : {} }, response: "Here is your teaching schedule. 📅" };
    }
    if (q.includes("exam") && allowed.includes("view_exam_schedule")) {
      return { action: { action: "view_exam_schedule", data: {} }, response: "Here is the exam schedule. 📝" };
    }
    if (q.includes("profile") && allowed.includes("view_my_profile")) {
      return { action: { action: "view_my_profile", data: {} }, response: "Here is your profile. 👤" };
    }
    if (q.includes("profile") && allowed.includes("view_my_faculty_profile")) {
      return { action: { action: "view_my_faculty_profile", data: {} }, response: "Here is your faculty profile. 👨‍🏫" };
    }
    // Profile update
    if ((isUpdate || isFieldUpdate || q.includes("change my") || q.includes("update my")) && (q.includes("phone") || q.includes("email"))) {
      const phoneVal = query.match(/\b(\d{10})\b/);
      const emailVal = query.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (allowed.includes("update_my_profile")) {
        return { action: { action: "update_my_profile", data: { ...(phoneVal ? { phone: phoneVal[1] } : {}), ...(emailVal ? { email: emailVal[0] } : {}) } }, response: "Updating your profile. ✏️" };
      }
      if (allowed.includes("update_my_faculty_profile")) {
        return { action: { action: "update_my_faculty_profile", data: { ...(phoneVal ? { phone: phoneVal[1] } : {}), ...(emailVal ? { email: emailVal[0] } : {}) } }, response: "Updating your faculty profile. ✏️" };
      }
    }
  }

  // ─── 6. FACULTY-SPECIFIC CRUD ACTIONS ───────────────────────

  // FIX 9: Marks analytics / class averages — check early, even without "marks" keyword
  if ((q.includes("analytics") || q.includes("average") || q.includes("averages") || q.includes("class average")) && allowed.includes("view_marks_analytics")) {
    return { action: { action: "view_marks_analytics", data: {} }, response: "Here are the marks analytics. 📊" };
  }

  // FIX 10: Workload — check early, even without compound keywords
  if ((q.includes("workload") || q.includes("work load") || (q.includes("faculty") && q.includes("load"))) && allowed.includes("generate_workload")) {
    return { action: { action: "generate_workload", data: {} }, response: "Generating faculty workload report. 📈" };
  }

  // Marks management (faculty)
  if (q.includes("marks") || q.includes("grade") || q.includes("score")) {
    if ((q.includes("analytics") || q.includes("average") || q.includes("stats")) && allowed.includes("view_marks_analytics")) {
      return { action: { action: "view_marks_analytics", data: {} }, response: "Here are the marks analytics. 📊" };
    }
    if (isDelete && allowed.includes("delete_marks")) {
      const name = detectName(tokens.filter(t => !["delete","remove","marks","grade","score","of","for"].includes(t.toLowerCase())), studentNames);
      const courseCodeMatch = query.match(/\b([A-Z]{2,4}\d{3,4})\b/);
      const type = q.includes("midterm") ? "midterm" : q.includes("final") ? "final" : undefined;
      return { action: { action: "delete_marks", data: { studentName: name || "", ...(courseCodeMatch ? { courseCode: courseCodeMatch[1] } : {}), ...(type ? { type } : {}) } }, response: `Deleting marks for "${name}". 🗑️` };
    }
    if (isUpdate && allowed.includes("update_marks")) {
      const name = detectName(tokens.filter(t => !["update","change","modify","marks","grade","score","of","for"].includes(t.toLowerCase())), studentNames);
      const courseCodeMatch = query.match(/\b([A-Z]{2,4}\d{3,4})\b/);
      const marksMatch = query.match(/(\d+)\s*(?:marks?|out of|\/)/i) || query.match(/to\s+(\d+)/i);
      return { action: { action: "update_marks", data: { studentName: name || "", ...(courseCodeMatch ? { courseCode: courseCodeMatch[1] } : {}), ...(marksMatch ? { marks: parseInt(marksMatch[1]) } : {}) } }, response: `Updating marks for "${name}". ✏️` };
    }
    if ((isCreate || q.includes("enter")) && allowed.includes("enter_marks")) {
      const name = detectName(tokens.filter(t => !["enter","add","create","marks","grade","score","of","for","in"].includes(t.toLowerCase())), studentNames);
      const courseCodeMatch = normalizedQuery.match(/\b([A-Z]{2,4}\d{3,4})\b/);
      const type = q.includes("midterm") ? "midterm" : q.includes("final") ? "final" : "midterm";
      const marksMatch = normalizedQuery.match(/(\d+)\s*(?:marks?|out|\/)/i) || normalizedQuery.match(/\b(\d{1,3})\s*$/);
      const maxMarksMatch = normalizedQuery.match(/(?:out of|\/)\s*(\d+)/i);

      if (!name || !marksMatch) {
        return {
          action: null,
          response:
            "To enter marks, please provide student name, subject/course, and marks.\n" +
            "Example: enter marks for Priya CS301 midterm 85/100",
        };
      }

      return { action: { action: "enter_marks", data: { studentName: name || "", ...(courseCodeMatch ? { courseCode: courseCodeMatch[1] } : {}), type, ...(marksMatch ? { marks: parseInt(marksMatch[1]) } : {}), maxMarks: maxMarksMatch ? parseInt(maxMarksMatch[1]) : 100 } }, response: `Entering marks for "${name}". ✍️` };
    }
    if (allowed.includes("view_marks")) {
      const name = detectName(tokens.filter(t => !["show","view","list","get","marks","grade","score","of","for"].includes(t.toLowerCase())), studentNames);
      const courseCodeMatch = query.match(/\b([A-Z]{2,4}\d{3,4})\b/);
      let minMarks, maxMarks;
      const aboveMatch = query.match(/(?:above|greater than|>)\s*(\d+(\.\d+)?)/i);
      const belowMatch = query.match(/(?:below|less than|under|<)\s*(\d+(\.\d+)?)/i);
      if (aboveMatch) minMarks = parseFloat(aboveMatch[1]);
      if (belowMatch) maxMarks = parseFloat(belowMatch[1]);

      return { action: { action: "view_marks", data: { ...(name ? { studentName: name } : {}), ...(courseCodeMatch ? { courseCode: courseCodeMatch[1] } : {}), ...(minMarks !== undefined ? { minMarks } : {}), ...(maxMarks !== undefined ? { maxMarks } : {}) } }, response: "Here are the marks records." };
    }
  }

  // FIX 8: Course details — also match course names from liveContext without needing "course" keyword
  const _hasCourseNameMatch = courseNames.some(cn => q.includes(cn.toLowerCase()));
  if ((q.includes("detail") || q.includes("about")) && (q.includes("course") || query.match(/\b[A-Z]{2,4}\d{3,4}\b/) || _hasCourseNameMatch)) {
    const courseCodeMatch = query.match(/\b([A-Z]{2,4}\d{3,4})\b/);
    const name = detectName(tokens.filter(t => !["detail","details","about","course","tell","me"].includes(t.toLowerCase())), courseNames);
    if (allowed.includes("view_course_details")) {
      return { action: { action: "view_course_details", data: { ...(courseCodeMatch ? { courseCode: courseCodeMatch[1] } : {}), ...(name ? { name } : {}) } }, response: "Here are the course details. 📖" };
    }
  }

  // Marks operations
  if (isMarks) {
    if (allowed.includes("view_my_marks")) {
      const type = q.includes("midterm") ? "midterm" : q.includes("final") ? "final" : undefined;
      const courseCodeMatch = query.match(/\b([A-Z]{2,4}\d{3,4})\b/);
      let minMarks, maxMarks;
      const aboveMatch = query.match(/(?:above|greater than|>)\s*(\d+(\.\d+)?)/i);
      const belowMatch = query.match(/(?:below|less than|under|<)\s*(\d+(\.\d+)?)/i);
      if (aboveMatch) minMarks = parseFloat(aboveMatch[1]);
      if (belowMatch) maxMarks = parseFloat(belowMatch[1]);
      
      return { action: { action: "view_my_marks", data: { ...(courseCodeMatch ? { courseCode: courseCodeMatch[1] } : {}), ...(type ? { type } : {}), ...(minMarks !== undefined ? { minMarks } : {}), ...(maxMarks !== undefined ? { maxMarks } : {}) } }, response: "Here are your marks. 📊" };
    }
    if (allowed.includes("view_my_results")) {
      return { action: { action: "view_my_results", data: {} }, response: "Here is your overall performance result. 📈" };
    }
  }

  // Attendance operations (faculty)
  if (isAttend) {
    if ((isReport || q.includes("report")) && allowed.includes("attendance_report")) {
      const threshold = parseInt(tokens.find(t => /^\d+$/.test(t) && parseInt(t) <= 100 && parseInt(t) >= 40)) || 75;
      return { action: { action: "attendance_report", data: { threshold } }, response: "Generating attendance report. 📊" };
    }
    const sid    = detectName(tokens.filter(t => !["mark","record","take","attendance","present","absent","status"].includes(t.toLowerCase())), studentNames);
    const status = q.includes("absent") ? "absent" : "present";
    const date   = parseNaturalDate(q) || new Date().toISOString().split("T")[0];
    if (sid && (isCreate || q.includes("mark") || q.includes("record")) && allowed.includes("record_attendance")) {
      const courseCodeMatch = query.match(/\b([A-Z]{2,4}\d{3,4})\b/);
      return {
        action: { action: "record_attendance", data: { studentName: sid, status, date, courseCode: courseCodeMatch ? courseCodeMatch[1] : "GENERAL" } },
        response: `Recording ${status} attendance for ${sid} on ${date}. ✅`,
      };
    }
    if (allowed.includes("list_attendance")) {
      const filterData = {};
      if (sid) filterData.studentName = sid;
      if (parseNaturalDate(q)) filterData.date = parseNaturalDate(q);
      return { action: { action: "list_attendance", data: filterData }, response: "Here are the attendance records. 📋" };
    }
  }

  // Workload
  if (isWorkload && allowed.includes("generate_workload")) {
    return { action: { action: "generate_workload", data: {} }, response: "Generating faculty workload report. 📈" };
  }

  // Exam scheduling
  if ((isExamWord || isSchedule || isScheduleCreateIntent) && (allowed.includes("schedule_exam") || allowed.includes("list_exams"))) {
    if (!isScheduleCreateIntent && !isCreate && !isDelete && allowed.includes("list_exams")) {
      return { action: { action: "list_exams", data: {} }, response: "Here are the upcoming exams. 📋" };
    }
    if (allowed.includes("schedule_exam") && (isScheduleCreateIntent || (isExamWord && isCreate))) {
      const dateVal   = parseNaturalDate(q);
      const typeVal   = q.includes("final") ? "final" : q.includes("quiz") ? "quiz" : "midterm";
      const forMatch  = normalizedQuery.match(/(?:for|of)\s+([A-Za-z][^\d,]+?)(?:\s+on|\s+\d|\s*$)/i);
      const courseVal = forMatch ? forMatch[1].trim() : detectName(tokens.filter(t => !["schedule","exam","on","for","of","date"].includes(t.toLowerCase())), courseNames);

      if (!courseVal || !dateVal) {
        return {
          action: null,
          response:
            "Sure, I can schedule an exam. Please share: subject/course, exam date (YYYY-MM-DD), and type (midterm/final/quiz).\n" +
            "Example: schedule exam Data Structures on 2026-04-15 final",
        };
      }
      return { action: { action: "schedule_exam", data: { course: courseVal, date: dateVal, type: typeVal } }, response: `Scheduling ${typeVal} exam for "${courseVal}" on ${dateVal}. 📝` };
    }
  }

  // Assign subject
  if (isAssign && !isCourseWord && allowed.includes("assign_subject")) {
    let subjectVal = null, facultyVal = null;
    const toIdx = tokens.findIndex(t => t.toLowerCase() === "to");
    if (toIdx > 0) {
      const subjectTokens = tokens.slice(1, toIdx).filter(t => !["assign","give","allocate"].includes(t.toLowerCase()));
      subjectVal = subjectTokens.join(" ").trim() || null;
      facultyVal = detectName(tokens.slice(toIdx + 1), facultyNames);
    } else {
      facultyVal = detectName(tokens, facultyNames);
      const facTokenCount = facultyVal ? facultyVal.split(" ").length : 0;
      const afterFacIdx = facultyVal ? tokens.findIndex(t => t.toLowerCase() === facultyVal.split(" ")[0].toLowerCase()) + facTokenCount : 1;
      subjectVal = tokens.slice(afterFacIdx).join(" ").trim() || null;
    }
    return { action: { action: "assign_subject", data: { faculty: facultyVal || "Unknown", subject: subjectVal || "Unknown" } }, response: `Assigning "${subjectVal || "subject"}" to ${facultyVal || "faculty"}. 🔗` };
  }

  // Faculty CRUD
  if (isFacultyWord) {
    if (isDelete && allowed.includes("delete_faculty")) {
      const name = detectName(tokens.filter(t => !["all","faculty"].includes(t.toLowerCase())), facultyNames) || detectName(tokens, []);
      if (!name || wantsAll) return { action: null, response: bareDeleteClarification(allowed) };
      return { action: { action: "delete_faculty", data: { name, ...(dept ? { department: dept } : {}) } }, response: `Removing faculty member "${name}". 🗑️` };
    }
    if (isCreate && allowed.includes("add_faculty")) {
      const name = detectName(tokens.filter(t => !["add","hire","appoint","new","faculty","professor","lecturer","department","dept","in","to","for"].includes(t.toLowerCase())), []) || "Unknown";
      const designation = detectDesignation(q);
      return { action: { action: "add_faculty", data: { name, department: dept || "General", subjects: [], ...(designation ? { designation } : {}) } }, response: `Adding faculty member "${name}". ➕` };
    }
    if (allowed.includes("list_faculty")) {
      return { action: { action: "list_faculty", data: dept ? { department: dept } : {} }, response: "Here are the faculty members. 👨‍🏫" };
    }
  }

  // Course CRUD
  if (isCourseWord) {
    if (isDelete && allowed.includes("delete_course")) {
      const name = detectName(tokens.filter(t => !["all","course","courses","class","subject"].includes(t.toLowerCase())), courseNames) || detectName(tokens, []);
      if (!name || wantsAll) return { action: null, response: bareDeleteClarification(allowed) };
      return { action: { action: "delete_course", data: { name, ...(dept ? { department: dept } : {}) } }, response: `Removing course "${name}". 🗑️` };
    }
    if (isCreate && allowed.includes("create_course")) {
      const courseStopWords = ["create","add","new","course","class","subject","semester","sem","credits","credit"];
      const name = detectName(tokens.filter(t => !courseStopWords.includes(t.toLowerCase())), courseNames) || detectName(tokens, []) || "New Course";
      const codeMatch = query.match(/\b([A-Z]{2,4}\d{3,4})\b/);
      return { action: { action: "create_course", data: { name, department: dept || "General", semester: semester || 1, credits: credits || 3, ...(codeMatch ? { code: codeMatch[1] } : {}) } }, response: `Creating course "${name}". ➕` };
    }
    if ((isUpdate || isFieldUpdate) && allowed.includes("update_course")) {
      const name = detectName(tokens, courseNames);
      const updateData = { name: name || "" };
      if (dept) updateData.department = dept;
      if (semester) updateData.semester = semester;
      if (credits) updateData.credits = credits;
      return { action: { action: "update_course", data: updateData }, response: `Updating course "${name || "record"}". ✏️` };
    }
    if (allowed.includes("list_courses")) {
      return { action: { action: "list_courses", data: { ...(dept ? { department: dept } : {}), ...(semester ? { semester } : {}) } }, response: "Here are the available courses. 📚" };
    }
  }

  // Student CRUD (default entity for delete/create/update)
  if (isDelete && allowed.includes("delete_student")) {
    const rawName = detectName(tokens.filter(t => !["all","students","student","delete","remove","drop"].includes(t.toLowerCase())), []);
    if (rawName && courseNames.some(c => c.toLowerCase().includes(rawName.toLowerCase())) && !studentNames.some(s => s.toLowerCase().includes(rawName.toLowerCase())) && allowed.includes("delete_course")) {
      return { action: { action: "delete_course", data: { name: rawName } }, response: `Removing course "${rawName}". 🗑️` };
    }
    const name = detectName(tokens.filter(t => !["all","students","student"].includes(t.toLowerCase())), studentNames) || rawName;
    if (!name || wantsAll) return { action: null, response: bareDeleteClarification(allowed) };
    return { action: { action: "delete_student", data: { name, ...(dept ? { department: dept } : {}) } }, response: `Removing student "${name}" from records. 🗑️` };
  }

  if (isFieldUpdate && allowed.includes("update_student")) {
    const name = detectName(tokens, studentNames);
    if (!name) {
      return {
        action: null,
        response: "Which student would you like to update? Please provide the student name first.",
      };
    }
    const updateData = { name: name || "" };
    if (dept) updateData.department = dept;
    if (phone) updateData.phone = phone;
    if (gpa && !isNaN(gpa)) updateData.gpa = gpa;
    if (year) updateData.year = year;
    return { action: { action: "update_student", data: updateData }, response: `Updating student "${name || "record"}". ✏️` };
  }

  if (isCreate && allowed.includes("create_student")) {
    const parsed = parseStudentCreateDetails(normalizedQuery);
    if (!parsed.hasEnoughCoreFields) {
      return {
        action: null,
        response:
          "Sure! To enroll a new student, please provide at least full name and department.\n" +
          "Example: create student name Kavin V department CSE year 2024",
      };
    }

    return {
      action: {
        action: "create_student",
        data: {
          name: parsed.name,
          department: parsed.department || dept || "CSE",
          year: parsed.year || year || new Date().getFullYear(),
          gpa: gpa || 0,
          ...(parsed.email ? { email: parsed.email } : {}),
          ...(parsed.phone ? { phone: parsed.phone } : {}),
        },
      },
      response: `Enrolling student "${parsed.name}" in ${parsed.department || dept || "CSE"}. ➕`,
    };
  }

  if (isUpdate && allowed.includes("update_student")) {
    const name = detectName(tokens, studentNames);
    if (!name) {
      return {
        action: null,
        response: "Which student would you like to update? Please provide their name, for example: update student Kavin V",
      };
    }
    const updateData = { name: name || "" };
    if (dept) updateData.department = dept;
    if (phone) updateData.phone = phone;
    if (gpa && !isNaN(gpa)) updateData.gpa = gpa;
    if (year) updateData.year = year;
    return { action: { action: "update_student", data: updateData }, response: `Updating student "${name || "record"}". ✏️` };
  }

  if (isReport) {
    if (allowed.includes("generate_report")) {
      return { action: { action: "generate_report", data: {} }, response: "Generating university report. 📈" };
    }
    if (allowed.includes("attendance_report")) {
      return { action: { action: "attendance_report", data: {} }, response: "Generating attendance report. 📊" };
    }
    if (allowed.includes("view_marks_analytics")) {
      return { action: { action: "view_marks_analytics", data: {} }, response: "Here are the marks analytics. 📊" };
    }
  }

  // ─── 7. SMART FALLBACK — Never reject, always help ──────────
  // Try to find the best matching allowed action for any unrecognized input
  const defaultMap = [
    { keywords: ["show","view","list","get","display","fetch","see","check","tell"], findFirst: true },
  ];

  for (const { keywords, findFirst } of defaultMap) {
    if (keywords.some(kw => q.includes(kw)) && findFirst) {
      // Pick the first allowed action that makes sense
      const firstAllowed = allowed[0];
      if (firstAllowed) {
        return { action: { action: firstAllowed, data: {} }, response: buildConfirmationMessage({ action: firstAllowed, data: {} }) };
      }
    }
  }

  // Absolute fallback — show friendly help menu, NEVER say "I'm not sure"
  return {
    action: null,
    response: `I am your **${info.name}**! ${info.emoji}\n\nI can help you with:\n${info.capabilities.join("\n")}\n\nCould you tell me what you'd like to know? I'm here to help! 😊`,
  };
}

module.exports = { processQuery };
