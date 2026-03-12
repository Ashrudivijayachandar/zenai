const jwt = require("../node_modules/jsonwebtoken");

async function call(agentId, message, token) {
  const res = await fetch(`http://localhost:5000/api/chat/${agentId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });
  const json = await res.json();
  return {
    agentId,
    message,
    action: json?.data?.action || null,
    response: String(json?.data?.response || "").split("\n")[0],
    ok: !!json?.success,
  };
}

async function main() {
  const token = jwt.sign(
    { id: 1, name: "Prof. Rajesh Kumar", email: "r.kumar@university.edu", role: "faculty", department: "CSE" },
    "zenai_jwt_secret_university_2026",
    { expiresIn: "8h" }
  );

  const tests = [
    { id: 7, msg: "create" },
    { id: 7, msg: "create student name Kavin V department CSE year 2024" },
    { id: 10, msg: "view schedule" },
    { id: 7, msg: "list all records" },
    { id: 9, msg: "view marms" },
    { id: 7, msg: "update student" },
    { id: 7, msg: "Kavin V" },
    { id: 10, msg: "schedule exam" },
    { id: 11, msg: "generate report" },
  ];

  const out = [];
  for (const t of tests) {
    out.push(await call(t.id, t.msg, token));
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
