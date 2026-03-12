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
  const data = json.data || {};
  return {
    message,
    action: data.action || null,
    response: String(data.response || "").split("\n")[0],
  };
}

async function main() {
  const token = jwt.sign(
    {
      id: 1,
      name: "Rahul Sharma",
      email: "rahul.sharma@university.edu",
      role: "student",
      department: "IT",
    },
    "zenai_jwt_secret_university_2026",
    { expiresIn: "8h" }
  );

  const tests = [
    "update",
    "Update phone number",
    "update my profile.",
    "update my phone to 9876543210",
    "update my email to rahul.new@university.edu",
    "view my profile",
  ];

  for (const t of tests) {
    try {
      const out = await callAgent(5, t, token);
      console.log(JSON.stringify(out));
    } catch (e) {
      console.log(JSON.stringify({ message: t, error: e.message }));
    }
  }
}

main();
