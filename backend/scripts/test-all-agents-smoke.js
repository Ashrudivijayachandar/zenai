const jwt = require("../node_modules/jsonwebtoken");

async function callAgent(agentId, message, token) {
  const res = await fetch(`http://localhost:5000/api/chat/${agentId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });
  const json = await res.json();
  const d = json.data || {};
  return {
    agentId,
    message,
    action: d.action || null,
    ok: d.actionResult ? !!d.actionResult.success : true,
    preview: String(d.response || "").split("\n")[0],
  };
}

async function main() {
  const secret = "zenai_jwt_secret_university_2026";
  const studentToken = jwt.sign({ id: 1, name: "Rahul Sharma", email: "rahul.sharma@university.edu", role: "student", department: "IT" }, secret, { expiresIn: "8h" });
  const facultyToken = jwt.sign({ id: 1, name: "Prof. Rajesh Kumar", email: "r.kumar@university.edu", role: "faculty", department: "CSE" }, secret, { expiresIn: "8h" });

  const tests = [
    { id: 1, msg: "my gpa", token: studentToken },
    { id: 2, msg: "my attendance report", token: studentToken },
    { id: 3, msg: "my results", token: studentToken },
    { id: 4, msg: "my timetable", token: studentToken },
    { id: 5, msg: "view my profile", token: studentToken },
    { id: 6, msg: "show notices", token: studentToken },
    { id: 7, msg: "list students", token: facultyToken },
    { id: 8, msg: "attendance report", token: facultyToken },
    { id: 9, msg: "show marks", token: facultyToken },
    { id: 10, msg: "my teaching schedule", token: facultyToken },
    { id: 11, msg: "generate report", token: facultyToken },
    { id: 12, msg: "my faculty profile", token: facultyToken },
  ];

  const out = [];
  for (const t of tests) {
    out.push(await callAgent(t.id, t.msg, t.token));
  }

  const failed = out.filter(x => !x.ok);
  console.log(JSON.stringify({ total: out.length, failed: failed.length, results: out }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
