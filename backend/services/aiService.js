const axios = require("axios");

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const ACTION_ALIASES = {
  show_students: "list_students",
  get_students: "list_students",
  view_students: "list_students",
  add_student: "create_student",
  remove_student: "delete_student",

  show_faculty: "list_faculty",
  get_faculty: "list_faculty",
  create_faculty: "add_faculty",
  remove_faculty: "delete_faculty",

  show_courses: "list_courses",
  get_courses: "list_courses",
  add_course: "create_course",
  remove_course: "delete_course",

  show_attendance: "list_attendance",
  get_attendance: "list_attendance",

  show_marks: "view_marks",
  get_marks: "view_marks",
  add_marks: "enter_marks",

  show_exams: "list_exams",
  get_exams: "list_exams",
  schedule_examination: "schedule_exam",

  show_report: "generate_report",
  get_report: "generate_report",
};

function normalizeAction(actionName, allowedActions) {
  if (!actionName) return null;
  const allowed = allowedActions || [];
  const raw = String(actionName).toLowerCase().trim();

  if (allowed.includes(raw)) return raw;

  const alias = ACTION_ALIASES[raw];
  if (alias && allowed.includes(alias)) return alias;

  const fuzzy = allowed.find((a) => a.includes(raw) || raw.includes(a.replace(/^view_my_|^view_|^list_/, "")));
  return fuzzy || null;
}

function parseNaturalDate(query) {
  const text = String(query || "");
  const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  return null;
}

function normalizeExamTypeFromQuery(userQuery, existingType) {
  const q = String(userQuery || "").toLowerCase();
  if (/\b(final|end|endterm|end-term|semester end|sem end)\b/.test(q)) return "final";
  if (/\b(quiz|surprise test)\b/.test(q)) return "quiz";
  if (/\b(mid|midterm|mid-term|internal)\b/.test(q)) return "midterm";

  const t = String(existingType || "").toLowerCase().trim();
  if (["final", "quiz", "midterm"].includes(t)) return t;
  if (["end", "endterm", "end-term"].includes(t)) return "final";
  return "midterm";
}

function extractScheduledCourseFromQuery(userQuery, liveContext, fallbackCourse) {
  const raw = String(userQuery || "").trim();
  if (!raw) return fallbackCourse || null;

  let course = null;

  let m = raw.match(/schedule\s+exam\s+(.+?)\s+on\s+\d{4}-\d{2}-\d{2}\b/i);
  if (m) course = m[1].trim();

  if (!course) {
    m = raw.match(/(?:for|of)\s+(.+?)\s+(?:on\s+\d{4}-\d{2}-\d{2}\b|$)/i);
    if (m) course = m[1].trim();
  }

  if (!course && Array.isArray(liveContext?.courses)) {
    const q = raw.toLowerCase();
    const found = liveContext.courses.find((c) => q.includes(String(c.name || "").toLowerCase()));
    if (found?.name) course = found.name;
  }

  if (!course && fallbackCourse) course = String(fallbackCourse).trim();
  if (!course) return null;

  return course
    .replace(/\b(midterm|mid-term|final|quiz|end|endterm|end-term)\b\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractJsonAction(text) {
  if (!text) return null;

  const cleaned = String(text).replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try outer-most object parse.
  }

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  return null;
}

function buildConfirmationMessage(action, data) {
  const d = data || {};
  const messages = {
    schedule_exam: `Scheduling ${d.type || "exam"} for "${d.course || "course"}" on ${d.date || "the selected date"}.`,
    list_exams: "Here are the upcoming exams.",
    list_students: "Here are the current student records.",
    create_student: `Enrolling student "${d.name || "new student"}".`,
    update_student: `Updating student "${d.name || "record"}".`,
    delete_student: `Removing student "${d.name || "record"}".`,
    list_courses: "Here are the available courses.",
    create_course: `Creating course "${d.name || "new course"}".`,
    list_faculty: "Here are the faculty records.",
    record_attendance: `Recording attendance for "${d.studentName || "student"}".`,
    attendance_report: "Generating attendance report.",
    view_marks: "Here are the marks records.",
    enter_marks: `Entering marks for "${d.studentName || "student"}".`,
    generate_report: "Generating report.",
  };

  return messages[action] || `Executing action: ${action}.`;
}

function isReadIntent(query) {
  const q = String(query || "").toLowerCase();
  return /\b(view|show|list|get|display|check|see|what|which|all records?)\b/.test(q);
}

function findReadActionFallback(allowedActions) {
  const allowed = allowedActions || [];
  const candidates = [
    "list_exams",
    "view_exam_schedule",
    "view_schedule",
    "list_students",
    "list_courses",
    "list_faculty",
    "list_attendance",
    "view_marks",
    "view_my_marks",
  ];
  return candidates.find((a) => allowed.includes(a)) || allowed.find((a) => a.startsWith("list_") || a.startsWith("view_")) || null;
}

function resolveDecision(parsed, userQuery, allowedActions, liveContext) {
  if (!parsed || typeof parsed !== "object") return null;

  const requestedAction = String(parsed.action || "").toLowerCase().trim();
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

  if (isReadIntent(userQuery) && /^(create_|add_|schedule_exam$|record_attendance$|enter_marks$)/.test(normalized)) {
    const readAction = findReadActionFallback(allowedActions);
    if (readAction) {
      return {
        action: { action: readAction, data: {} },
        response: message || buildConfirmationMessage(readAction, {}),
      };
    }
  }

  if (normalized === "schedule_exam") {
    const normalizedData = { ...data };
    const queryDate = parseNaturalDate(userQuery);
    const queryCourse = extractScheduledCourseFromQuery(userQuery, liveContext, normalizedData.course);

    if (queryDate) normalizedData.date = queryDate;
    if (queryCourse) normalizedData.course = queryCourse;
    normalizedData.type = normalizeExamTypeFromQuery(userQuery, normalizedData.type);

    if (!normalizedData.course || !normalizedData.date) {
      return {
        action: null,
        response:
          "Sure, I can schedule an exam. Please share: subject/course, exam date (YYYY-MM-DD), and type (midterm/final/quiz). " +
          "Example: schedule exam Data Structures on 2026-04-15 final",
      };
    }

    return {
      action: { action: normalized, data: normalizedData },
      response: message || buildConfirmationMessage(normalized, normalizedData),
    };
  }

  return {
    action: { action: normalized, data },
    response: message || buildConfirmationMessage(normalized, data),
  };
}

function generateMockResponse(userQuery, allowedActions, liveContext) {
  const q = String(userQuery || "").toLowerCase().trim();
  const allowed = allowedActions || [];

  if (!q || /^(hi|hello|hey|help)$/i.test(q)) {
    return {
      action: null,
      response: "Tell me what you want to do and I will handle it.",
    };
  }

  const isScheduleCreateIntent = /\b(schedule\s+exam|add\s+exam|create\s+exam|book\s+exam|plan\s+exam|new\s+exam)\b/.test(q);
  const isExamWord = /\b(exam|exams|examination|quiz|test)\b/.test(q);
  const isCreateWord = /\b(create|add|schedule|book|plan|new)\b/.test(q);

  if ((isScheduleCreateIntent || (isExamWord && isCreateWord)) && allowed.includes("schedule_exam")) {
    const date = parseNaturalDate(userQuery);
    const course = extractScheduledCourseFromQuery(userQuery, liveContext, null);
    const type = normalizeExamTypeFromQuery(userQuery, null);

    if (!course || !date) {
      return {
        action: null,
        response:
          "Sure, I can schedule an exam. Please share: subject/course, exam date (YYYY-MM-DD), and type (midterm/final/quiz). " +
          "Example: schedule exam Data Structures on 2026-04-15 final",
      };
    }

    return {
      action: { action: "schedule_exam", data: { course, date, type } },
      response: `Scheduling ${type} exam for \"${course}\" on ${date}.`,
    };
  }

  if (isExamWord && allowed.includes("list_exams")) {
    return {
      action: { action: "list_exams", data: {} },
      response: "Here are the upcoming exams.",
    };
  }

  if (/\battendance\b/.test(q)) {
    if (allowed.includes("view_my_attendance_report")) {
      return { action: { action: "view_my_attendance_report", data: {} }, response: "Here is your attendance report." };
    }
    if (allowed.includes("list_attendance")) {
      return { action: { action: "list_attendance", data: {} }, response: "Here are the attendance records." };
    }
  }

  if (/\bmarks?|grades?|scores?|results?\b/.test(q)) {
    if (allowed.includes("view_my_marks")) {
      return { action: { action: "view_my_marks", data: {} }, response: "Here are your marks." };
    }
    if (allowed.includes("view_marks")) {
      return { action: { action: "view_marks", data: {} }, response: "Here are the marks records." };
    }
  }

  if (/\bcourses?|subjects?\b/.test(q)) {
    if (allowed.includes("view_my_courses")) {
      return { action: { action: "view_my_courses", data: {} }, response: "Here are your courses." };
    }
    if (allowed.includes("list_courses")) {
      return { action: { action: "list_courses", data: {} }, response: "Here are the courses." };
    }
  }

  const fallbackAction = findReadActionFallback(allowed) || allowed[0] || null;
  if (fallbackAction) {
    return {
      action: { action: fallbackAction, data: {} },
      response: buildConfirmationMessage(fallbackAction, {}),
    };
  }

  return {
    action: null,
    response: "Please share a bit more detail so I can continue.",
  };
}

async function processQuery(systemPrompt, userQuery, apiKey, allowedActions, liveContext, agentId, conversationContext = null) {
  if (!apiKey || apiKey === "your-gemini-api-key-here") {
    return generateMockResponse(userQuery, allowedActions, liveContext);
  }

  const safeAllowed = (allowedActions || []).join(", ");
  const prompt =
    "Return ONLY JSON: { action, data, message }. " +
    `Use only one action from this list: ${safeAllowed}. ` +
    "If data is missing, set action='clarify' and ask for required fields. " +
    `User message: ${userQuery}`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const aiMessage = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const parsed = extractJsonAction(aiMessage);
    const resolved = resolveDecision(parsed, userQuery, allowedActions, liveContext);
    if (resolved) return resolved;

    return generateMockResponse(userQuery, allowedActions, liveContext);
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message);
    return generateMockResponse(userQuery, allowedActions, liveContext);
  }
}

module.exports = { processQuery };
