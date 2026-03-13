/**
 * ============================================================
 * ZENAI — COMPREHENSIVE AGENT VALIDATION SCRIPT
 * Tests ALL 12 agents (6 student + 6 faculty) with diverse
 * natural language phrasing variations.
 * ============================================================
 *
 * HOW TO USE:
 *   1. Start the backend:  node server.js
 *   2. Run this script:    node scripts/test-comprehensive.js
 *
 * Requires the server to be running on localhost:5000
 */

const jwt = require("jsonwebtoken");

const BASE = "http://localhost:5000";
const JWT_SECRET = "zenai_jwt_secret_university_2026";

// ── TOKENS ────────────────────────────────────────────────────

const STUDENT_TOKEN = jwt.sign(
  { id: 1, name: "Rahul Sharma", email: "rahul.sharma@university.edu", role: "student", department: "IT" },
  JWT_SECRET, { expiresIn: "8h" }
);

const FACULTY_TOKEN = jwt.sign(
  { id: 1, name: "Prof. Rajesh Kumar", email: "r.kumar@university.edu", role: "faculty", department: "CSE" },
  JWT_SECRET, { expiresIn: "8h" }
);

// ── AGENT DEFINITIONS ─────────────────────────────────────────
// These mirror what the frontend seeds. Each agent has a role,
// name, allowed actions, and the list of test messages.

const AGENT_DEFS = [
  // ═══════════════ STUDENT AGENTS (1-6) ═══════════════
  {
    id: 1,
    name: "Academic Advisor",
    role: "student",
    allowedActions: ["view_my_courses", "view_my_gpa", "view_course_details", "list_courses"],
    tests: [
      // GPA
      { msg: "my gpa", expectAction: "view_my_gpa" },
      { msg: "show my gpa", expectAction: "view_my_gpa" },
      { msg: "what is my gpa", expectAction: "view_my_gpa" },
      { msg: "whats my cgpa", expectAction: "view_my_gpa" },
      { msg: "grades", expectAction: "view_my_gpa" },
      // Courses
      { msg: "my courses", expectAction: "view_my_courses" },
      { msg: "what courses am I enrolled in", expectAction: "view_my_courses" },
      { msg: "show my enrolled courses", expectAction: "view_my_courses" },
      { msg: "what subjects do I have", expectAction: "view_my_courses" },
      // Course details
      { msg: "tell me about CS201", expectAction: "view_course_details" },
      { msg: "details of Data Structures", expectAction: "view_course_details" },
      // List all courses
      { msg: "list all courses", expectAction: "list_courses" },
      { msg: "show courses", expectAction: "list_courses" },
      { msg: "courses", expectAction: "view_my_courses" },
      // Greeting
      { msg: "hello", expectAction: null },
      { msg: "help", expectAction: null },
      { msg: "thanks", expectAction: null },
    ]
  },
  {
    id: 2,
    name: "Attendance Tracker",
    role: "student",
    allowedActions: ["view_my_attendance", "view_my_attendance_report"],
    tests: [
      { msg: "my attendance", expectAction: "view_my_attendance" },
      { msg: "show my attendance", expectAction: "view_my_attendance" },
      { msg: "how is my attendance", expectAction: "view_my_attendance" },
      { msg: "attendance", expectAction: "view_my_attendance" },
      { msg: "my attendance report", expectAction: "view_my_attendance_report" },
      { msg: "attendance percentage", expectAction: "view_my_attendance_report" },
      { msg: "am I below 75", expectAction: "view_my_attendance_report" },
      { msg: "shortage", expectAction: "view_my_attendance_report" },
      { msg: "can I sit for exams", expectAction: "view_my_attendance_report" },
      { msg: "hi", expectAction: null },
    ]
  },
  {
    id: 3,
    name: "Results & Grades",
    role: "student",
    allowedActions: ["view_my_marks", "view_my_results"],
    tests: [
      { msg: "my marks", expectAction: "view_my_marks" },
      { msg: "show my marks", expectAction: "view_my_marks" },
      { msg: "my midterm marks", expectAction: "view_my_marks" },
      { msg: "marks in CS201", expectAction: "view_my_marks" },
      { msg: "my results", expectAction: "view_my_results" },
      { msg: "show my results", expectAction: "view_my_results" },
      { msg: "how did I do in exams", expectAction: "view_my_results" },
      { msg: "scorecard", expectAction: "view_my_results" },
      { msg: "hello", expectAction: null },
    ]
  },
  {
    id: 4,
    name: "Timetable & Exams",
    role: "student",
    allowedActions: ["view_my_timetable", "view_exam_schedule"],
    tests: [
      { msg: "my timetable", expectAction: "view_my_timetable" },
      { msg: "show my schedule", expectAction: "view_my_timetable" },
      { msg: "what classes do I have today", expectAction: "view_my_timetable" },
      { msg: "monday classes", expectAction: "view_my_timetable" },
      { msg: "timetable", expectAction: "view_my_timetable" },
      { msg: "exam schedule", expectAction: "view_exam_schedule" },
      { msg: "when are my exams", expectAction: "view_exam_schedule" },
      { msg: "upcoming exams", expectAction: "view_exam_schedule" },
      { msg: "hey", expectAction: null },
    ]
  },
  {
    id: 5,
    name: "Profile Manager",
    role: "student",
    allowedActions: ["view_my_profile", "update_my_profile"],
    tests: [
      { msg: "my profile", expectAction: "view_my_profile" },
      { msg: "show my profile", expectAction: "view_my_profile" },
      { msg: "who am I", expectAction: "view_my_profile" },
      { msg: "my details", expectAction: "view_my_profile" },
      { msg: "update my phone to 9876543210", expectAction: "update_my_profile" },
      { msg: "change my email to test@uni.edu", expectAction: "update_my_profile" },
      { msg: "update", expectAction: null },
      { msg: "hello", expectAction: null },
    ]
  },
  {
    id: 6,
    name: "Notice Board",
    role: "student",
    allowedActions: ["view_notices"],
    tests: [
      { msg: "notices", expectAction: "view_notices" },
      { msg: "show notices", expectAction: "view_notices" },
      { msg: "any announcements", expectAction: "view_notices" },
      { msg: "exam notices", expectAction: "view_notices" },
      { msg: "placement notices", expectAction: "view_notices" },
      { msg: "any new notices", expectAction: "view_notices" },
      { msg: "hi", expectAction: null },
    ]
  },

  // ═══════════════ FACULTY AGENTS (7-12) ═══════════════
  {
    id: 7,
    name: "Class Manager",
    role: "faculty",
    allowedActions: ["list_students", "create_student", "update_student", "delete_student", "list_courses", "create_course", "update_course", "delete_course"],
    tests: [
      // List students
      { msg: "list all students", expectAction: "list_students" },
      { msg: "show all students", expectAction: "list_students" },
      { msg: "get students", expectAction: "list_students" },
      { msg: "students", expectAction: "list_students" },
      { msg: "show CSE students", expectAction: "list_students" },
      { msg: "view all students", expectAction: "list_students" },
      { msg: "list students in ECE department", expectAction: "list_students" },
      { msg: "display all student records", expectAction: "list_students" },
      { msg: "show all records", expectAction: "list_students" },
      // Create student
      { msg: "enroll Harshini in CSE 2024", expectAction: "create_student" },
      { msg: "add student Ravi to IT year 3", expectAction: "create_student" },
      { msg: "register Meera in ECE", expectAction: "create_student" },
      { msg: "create student name Priya department CSE year 2025", expectAction: "create_student" },
      // Create student — should clarify (no name)
      { msg: "add student", expectAction: null, desc: "should clarify (no name given)" },
      { msg: "create student", expectAction: null, desc: "should clarify (no name given)" },
      // Update student
      { msg: "update Rahul GPA to 8.5", expectAction: "update_student" },
      { msg: "change Priya department to ECE", expectAction: "update_student" },
      { msg: "update student", expectAction: null, desc: "should ask for name" },
      // Delete student
      { msg: "delete Rahul", expectAction: "delete_student" },
      { msg: "remove Harshini from CSE", expectAction: "delete_student" },
      // Courses
      { msg: "list all courses", expectAction: "list_courses" },
      { msg: "show courses", expectAction: "list_courses" },
      { msg: "create course Data Structures CS201 semester 3 CSE 4 credits", expectAction: "create_course" },
      { msg: "delete course Data Structures", expectAction: "delete_course" },
      // Greetings
      { msg: "hello", expectAction: null },
      { msg: "help", expectAction: null },
      // Intent safety (view should NOT create)
      { msg: "show all students", expectAction: "list_students", desc: "SAFETY: must NOT return create_student" },
      { msg: "view records", expectAction: "list_students", desc: "SAFETY: must be read action" },
    ]
  },
  {
    id: 8,
    name: "Attendance Manager",
    role: "faculty",
    allowedActions: ["record_attendance", "list_attendance", "attendance_report"],
    tests: [
      { msg: "record attendance Rahul present", expectAction: "record_attendance" },
      { msg: "mark Priya absent today", expectAction: "record_attendance" },
      { msg: "show attendance", expectAction: "list_attendance" },
      { msg: "list attendance", expectAction: "list_attendance" },
      { msg: "attendance records", expectAction: "list_attendance" },
      { msg: "attendance report", expectAction: "attendance_report" },
      { msg: "show attendance report", expectAction: "attendance_report" },
      { msg: "students below 75 attendance", expectAction: "attendance_report" },
      { msg: "view all records", expectAction: "list_attendance", desc: "SAFETY: must be read action" },
      { msg: "hi", expectAction: null },
    ]
  },
  {
    id: 9,
    name: "Marks Entry",
    role: "faculty",
    allowedActions: ["enter_marks", "view_marks", "update_marks", "delete_marks", "view_marks_analytics"],
    tests: [
      { msg: "enter marks for Rahul CS201 midterm 78", expectAction: "enter_marks" },
      { msg: "add marks", expectAction: "enter_marks" },
      { msg: "show marks for Rahul", expectAction: "view_marks" },
      { msg: "marks of CS201", expectAction: "view_marks" },
      { msg: "view all marks", expectAction: "view_marks" },
      { msg: "show all records", expectAction: "view_marks" },
      { msg: "list marks", expectAction: "view_marks" },
      { msg: "update marks of Priya", expectAction: "update_marks" },
      { msg: "delete marks of Amit", expectAction: "delete_marks" },
      { msg: "marks analytics", expectAction: "view_marks_analytics" },
      { msg: "class averages", expectAction: "view_marks_analytics" },
      { msg: "hello", expectAction: null },
    ]
  },
  {
    id: 10,
    name: "Schedule Manager",
    role: "faculty",
    allowedActions: ["view_schedule", "schedule_exam", "list_exams"],
    tests: [
      { msg: "my teaching schedule", expectAction: "view_schedule" },
      { msg: "my classes today", expectAction: "view_schedule" },
      { msg: "show schedule", expectAction: "view_schedule" },
      { msg: "timetable", expectAction: "view_schedule" },
      { msg: "monday schedule", expectAction: "view_schedule" },
      { msg: "list exams", expectAction: "list_exams" },
      { msg: "show exams", expectAction: "list_exams" },
      { msg: "upcoming exams", expectAction: "list_exams" },
      { msg: "schedule exam Data Structures 2026-04-15 midterm", expectAction: "schedule_exam" },
      { msg: "hey", expectAction: null },
    ]
  },
  {
    id: 11,
    name: "Analytics Dashboard",
    role: "faculty",
    allowedActions: ["generate_report", "generate_workload", "attendance_report", "view_marks_analytics"],
    tests: [
      { msg: "generate report", expectAction: "generate_report" },
      { msg: "show report", expectAction: "generate_report" },
      { msg: "university report", expectAction: "generate_report" },
      { msg: "summary", expectAction: "generate_report" },
      { msg: "analytics", expectAction: "generate_report" },
      { msg: "faculty workload", expectAction: "generate_workload" },
      { msg: "workload report", expectAction: "generate_workload" },
      { msg: "attendance report", expectAction: "attendance_report" },
      { msg: "marks analytics", expectAction: "view_marks_analytics" },
      { msg: "class averages", expectAction: "view_marks_analytics" },
      { msg: "hello", expectAction: null },
    ]
  },
  {
    id: 12,
    name: "Faculty Profile",
    role: "faculty",
    allowedActions: ["view_my_faculty_profile", "update_my_faculty_profile", "list_faculty"],
    tests: [
      { msg: "my faculty profile", expectAction: "view_my_faculty_profile" },
      { msg: "show my profile", expectAction: "view_my_faculty_profile" },
      { msg: "my profile", expectAction: "view_my_faculty_profile" },
      { msg: "who am I", expectAction: "view_my_faculty_profile" },
      { msg: "update my phone to 9988776655", expectAction: "update_my_faculty_profile" },
      { msg: "change my email to prof@uni.edu", expectAction: "update_my_faculty_profile" },
      { msg: "list faculty", expectAction: "list_faculty" },
      { msg: "show faculty", expectAction: "list_faculty" },
      { msg: "faculty in CSE", expectAction: "list_faculty" },
      { msg: "all faculty members", expectAction: "list_faculty" },
      { msg: "hello", expectAction: null },
    ]
  },
];

// ── HELPERS ───────────────────────────────────────────────────

async function apiPost(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

async function apiDelete(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json();
}

// ── SEED AGENTS ───────────────────────────────────────────────

async function seedAgents() {
  console.log("🌱 Checking agents...\n");

  // Verify agents exist via API
  const existing = await apiGet("/api/agents", FACULTY_TOKEN);
  if (existing.success && existing.data && existing.data.length >= 12) {
    console.log(`   ✅ Found ${existing.data.length} agents already seeded\n`);
    return;
  }

  // If not enough agents, seed via file write
  console.log("   ⚠️  Agents not found, seeding via file write...");
  const fs = require("fs");
  const path = require("path");

  const agents = AGENT_DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    role: def.role,
    domain: def.name.toLowerCase().replace(/[^a-z]/g, "_"),
    description: `AI agent for ${def.name}`,
    purpose: def.name,
    allowedActions: def.allowedActions,
    systemPrompt: `You are a ${def.name} AI agent.`,
    createdAt: new Date().toISOString(),
    chatHistory: [],
    actionLog: [],
    pendingConfirmations: {},
  }));

  const dataFile = path.join(__dirname, "..", "data", "agents.json");
  fs.writeFileSync(dataFile, JSON.stringify(agents, null, 2));
  console.log(`   ✅ Wrote ${agents.length} agents to file`);
  console.log("   ⚠️  You may need to RESTART the server for these to take effect!\n");
}

// ── RUN TESTS ─────────────────────────────────────────────────

async function runAllTests() {
  const results = [];
  let totalPass = 0;
  let totalFail = 0;
  let totalSkip = 0;

  for (const agentDef of AGENT_DEFS) {
    const token = agentDef.role === "student" ? STUDENT_TOKEN : FACULTY_TOKEN;
    const emoji = agentDef.role === "student" ? "🎓" : "👨‍🏫";

    console.log(`\n${emoji} Agent ${agentDef.id}: ${agentDef.name} (${agentDef.role})`);
    console.log("─".repeat(60));

    let agentPass = 0;
    let agentFail = 0;

    for (const test of agentDef.tests) {
      try {
        const res = await apiPost(`/api/chat/${agentDef.id}`, { message: test.msg }, token);

        if (!res.success) {
          console.log(`  ❌ FAIL "${test.msg}" → API error: ${res.message}`);
          agentFail++;
          results.push({ agent: agentDef.id, name: agentDef.name, msg: test.msg, status: "FAIL", reason: `API error: ${res.message}` });
          continue;
        }

        const data = res.data || {};
        const gotAction = data.action || null;

        // Check if action matches expectation
        let pass = false;
        if (test.expectAction === null) {
          // We expect no action (greeting/help/clarify)
          pass = gotAction === null;
        } else {
          pass = gotAction === test.expectAction;
        }

        // For safety tests, also check it's NOT a destructive action when expecting read
        if (test.desc && test.desc.includes("SAFETY") && gotAction) {
          const readActions = ["list_students", "list_courses", "list_faculty", "list_attendance",
            "view_marks", "view_my_marks", "view_schedule", "view_my_timetable",
            "view_my_attendance", "view_notices", "attendance_report", "view_marks_analytics",
            "generate_report", "generate_workload", "list_exams", "view_exam_schedule"];
          if (!readActions.includes(gotAction)) {
            pass = false;
          }
        }

        const indicator = pass ? "✅" : "❌";
        const detail = test.desc ? ` (${test.desc})` : "";
        const expected = test.expectAction || "null (greeting/clarify)";
        const got = gotAction || "null (greeting/clarify)";

        if (pass) {
          console.log(`  ${indicator} PASS "${test.msg}" → ${got}${detail}`);
          agentPass++;
        } else {
          console.log(`  ${indicator} FAIL "${test.msg}" → got: ${got}, expected: ${expected}${detail}`);
          agentFail++;
          results.push({ agent: agentDef.id, name: agentDef.name, msg: test.msg, status: "FAIL", got, expected, detail });
        }
      } catch (err) {
        console.log(`  ⚠️ SKIP "${test.msg}" → Network error: ${err.message}`);
        totalSkip++;
        results.push({ agent: agentDef.id, name: agentDef.name, msg: test.msg, status: "SKIP", reason: err.message });
      }
    }

    totalPass += agentPass;
    totalFail += agentFail;
    console.log(`  📊 ${agentPass}/${agentDef.tests.length} passed`);
  }

  return { totalPass, totalFail, totalSkip, failures: results.filter(r => r.status === "FAIL") };
}

// ── MAIN ──────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  ZENAI — COMPREHENSIVE AGENT VALIDATION                 ║");
  console.log("║  Testing all 12 agents with diverse command phrasings   ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Check server health
  try {
    const health = await apiGet("/api/health");
    if (!health || health.status !== "ok") throw new Error("Health check failed");
    console.log("🟢 Server is running\n");
  } catch (err) {
    console.error("🔴 Server is not running! Start it with: node server.js");
    console.error("   Error:", err.message);
    process.exit(1);
  }

  // Seed agents
  await seedAgents();

  // Run all tests
  const { totalPass, totalFail, totalSkip, failures } = await runAllTests();

  // Summary
  const total = totalPass + totalFail + totalSkip;
  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  TEST SUMMARY                                           ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Total tests:  ${String(total).padEnd(4)}                                    ║`);
  console.log(`║  ✅ Passed:    ${String(totalPass).padEnd(4)}                                    ║`);
  console.log(`║  ❌ Failed:    ${String(totalFail).padEnd(4)}                                    ║`);
  console.log(`║  ⚠️  Skipped:   ${String(totalSkip).padEnd(4)}                                    ║`);
  console.log(`║  Success rate: ${total > 0 ? Math.round((totalPass / (totalPass + totalFail)) * 100) : 0}%                                     ║`);
  console.log("╚══════════════════════════════════════════════════════════╝");

  if (failures.length > 0) {
    console.log("\n🔴 FAILURES:");
    for (const f of failures) {
      console.log(`  Agent ${f.agent} (${f.name}): "${f.msg}"`);
      console.log(`    Got: ${f.got || f.reason} | Expected: ${f.expected || "N/A"}`);
    }
  }

  // Test creating new agents via /api/agents
  console.log("\n\n═══════════════════════════════════════════════════════════");
  console.log("  BONUS: Testing Agent Creation (POST /api/agents)");
  console.log("═══════════════════════════════════════════════════════════\n");

  const createTests = [
    { purpose: "Manage student enrollment and records", expectDomain: "students", token: FACULTY_TOKEN },
    { purpose: "Handle faculty assignments and workload", expectDomain: "faculty", token: FACULTY_TOKEN },
    { purpose: "Course curriculum management", expectDomain: "courses", token: FACULTY_TOKEN },
    { purpose: "Track student attendance", expectDomain: "attendance", token: FACULTY_TOKEN },
    { purpose: "Schedule and manage exams", expectDomain: "exams", token: FACULTY_TOKEN },
  ];

  let createPass = 0;
  for (const ct of createTests) {
    const res = await apiPost("/api/agents", { purpose: ct.purpose }, ct.token);
    if (res.success && res.data && res.data.domain === ct.expectDomain) {
      console.log(`  ✅ PASS: "${ct.purpose}" → domain: ${res.data.domain}, actions: [${res.data.allowedActions.join(", ")}]`);
      createPass++;
      // Clean up
      await apiDelete(`/api/agents/${res.data.id}`, ct.token);
    } else {
      console.log(`  ❌ FAIL: "${ct.purpose}" → got domain: ${res.data?.domain || "N/A"}, expected: ${ct.expectDomain}`);
    }
  }

  console.log(`\n  📊 Agent creation: ${createPass}/${createTests.length} passed`);
  console.log("\n🏁 Validation complete!");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
