// ΓöÇΓöÇΓöÇ ChatBox ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Professional chat interface ΓÇö minimal, readable, productivity-tool style
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

import React, { useState, useRef, useEffect } from "react";
import { sendMessage } from "../services/api";

// ΓöÇΓöÇΓöÇ DataTable ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Renders an array-of-objects as a sortable, scrollable table
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function DataTable({ data }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  if (!data || data.length === 0) return null;

  const HIDDEN = ["systemPrompt", "chatHistory", "actionLog"];
  const columns = Object.keys(data[0]).filter((k) => !HIDDEN.includes(k));

  const sorted = [...data].sort((a, b) => {
    if (!sortCol) return 0;
    const av = a[sortCol] ?? "";
    const bv = b[sortCol] ?? "";
    const isNum = typeof av === "number" || (typeof av === "string" && !isNaN(av));
    const cmp = isNum ? Number(av) - Number(bv) : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(col) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  function downloadCSV() {
    const escape = (v) => {
      const s = v == null ? "" : Array.isArray(v) ? v.join(", ") : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [columns.join(","), ...sorted.map((r) => columns.map((c) => escape(r[c])).join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "data.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const tdStyle = {
    padding: "9px 12px",
    borderBottom: "1px solid var(--color-border)",
    fontSize: "0.85rem",
    color: "var(--color-text-2)",
    whiteSpace: "normal",
    wordBreak: "break-word",
    verticalAlign: "middle",
    textAlign: "left",
  };
  const thStyle = {
    ...tdStyle,
    background: "var(--color-surface)",
    color: "var(--color-text-1)",
    fontWeight: 600,
    cursor: "pointer",
    userSelect: "none",
    position: "sticky",
    top: 0,
    zIndex: 1,
    fontSize: "0.75rem",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
        <button
          onClick={downloadCSV}
          style={{
            padding: "5px 14px",
            fontSize: "0.85rem",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 4,
            cursor: "pointer",
            color: "var(--color-text-3)",
          }}
        >
          Download CSV
        </button>
      </div>
      <div style={{ overflowX: "auto", maxHeight: 560, border: "1px solid var(--color-border)", borderRadius: 6, WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", minWidth: 400, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} style={thStyle} onClick={() => toggleSort(col)}>
                  {col.replace(/_/g, " ")}
                  {sortCol === col ? (sortDir === "asc" ? " Γû▓" : " Γû╝") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)" }}>
                {columns.map((col) => {
                  const val = row[col];
                  const display = val == null ? "ΓÇö" : Array.isArray(val) ? (val.length ? val.join(", ") : "ΓÇö") : String(val);
                  return <td key={col} style={tdStyle}>{display}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 6, fontSize: "0.85rem", color: "var(--color-text-3)" }}>
        {sorted.length} record{sorted.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

export default function ChatBox({ agent }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    setMessages([
      {
        role: "ai",
        text: `Hello. I'm the **${agent.name}** — ${agent.description}\n\nI can assist with: ${agent.allowedActions.map((a) => a.replace(/_/g, " ")).join(", ")}.`,
        ts: new Date(),
      },
    ]);
  }, [agent]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((p) => [...p, { role: "user", text, ts: new Date() }]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendMessage(agent.id, text);
      const { response, action, actionResult, aiRawAction } = res.data.data;

      const body = response || actionResult?.message || "";
      const tableData =
        actionResult?.data &&
        Array.isArray(actionResult.data) &&
        actionResult.data.length > 0
          ? actionResult.data
          : null;

      setMessages((p) => [
        ...p,
        {
          role: "ai",
          text: body,
          tableData,
          action,
          success: actionResult?.success,
          ts: new Date(),
        },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        {
          role: "ai",
          text: "Could not reach the server. Please ensure the backend is running on port 5000.",
          isError: true,
          ts: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const suggestions = getSuggestions(agent.domain);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Message list */}
      <div className="chat-msg-list">
        {messages.map((msg, i) => (
          <div
            key={i}
            className="animate-in"
            style={{
              display: "flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              alignItems: "flex-end",
              gap: 8,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 26, height: 26, borderRadius: "50%",
                background: msg.role === "user" ? "var(--color-accent)" : "#f3f4f6",
                border: "1px solid var(--color-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700,
                color: msg.role === "user" ? "#fff" : "var(--color-text-3)",
                flexShrink: 0,
              }}
            >
              {msg.role === "user" ? "U" : "AI"}
            </div>

            {/* Bubble */}
            <div className={`chat-bubble-outer${msg.tableData ? ' has-table' : ''}`}>
              <div className={msg.role === "user" ? "chat-bubble-user" : (msg.isError ? "chat-bubble-ai" : "chat-bubble-ai")}
                style={msg.isError ? { borderColor: "var(--color-danger)", color: "var(--color-danger)" } : {}}>
                {renderText(msg.text)}
              </div>

              {/* Structured data table */}
              {msg.tableData && <DataTable data={msg.tableData} />}

              {/* Action tag */}
              {msg.action && (
                <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="chat-action-pill">
                    {msg.action.replace(/_/g, " ")}
                  </span>
                  {msg.success === true && (
                    <span style={{ fontSize: "0.6875rem", color: "var(--color-success)", fontWeight: 500 }}>
                      Success
                    </span>
                  )}
                  {msg.success === false && (
                    <span style={{ fontSize: "0.6875rem", color: "var(--color-danger)", fontWeight: 500 }}>
                      Failed
                    </span>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-caption" style={{ marginTop: 3, textAlign: msg.role === "user" ? "right" : "left" }}>
                {fmt(msg.ts)}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#f3f4f6", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--color-text-3)" }}>AI</div>
            <div className="chat-bubble-ai" style={{ padding: "10px 14px" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips ΓÇö visible only initially */}
      {messages.length <= 1 && (
        <div className="chat-suggestions">
          <p className="text-caption" style={{ marginBottom: 7 }}>Suggested queries:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setInput(s)}
                style={{
                  padding: "4px 11px",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 5,
                  fontSize: "0.75rem",
                  color: "var(--color-text-3)",
                  cursor: "pointer",
                  transition: "all 0.1s",
                }}
                onMouseEnter={e => { e.target.style.borderColor = "var(--color-accent)"; e.target.style.color = "var(--color-accent)"; }}
                onMouseLeave={e => { e.target.style.borderColor = "var(--color-border)"; e.target.style.color = "var(--color-text-3)"; }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Message ${agent.name}ΓÇª`}
          rows={1}
          className="form-input"
          style={{ resize: "none", minHeight: 38, maxHeight: 100, lineHeight: 1.5, paddingTop: 8, paddingBottom: 8 }}
        />
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{ flexShrink: 0, height: 38 }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function fmt(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderText(text) {
  if (!text) return null;
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
  });
}

function formatResult(data) {
  if (!data) return "";
  if (Array.isArray(data)) {
    if (data.length === 0) return "No records found.";
    return data.map((item, i) => {
      const lines = Object.entries(item)
        .filter(([k]) => !["systemPrompt", "chatHistory", "actionLog"].includes(k))
        .map(([k, v]) => `  ${k}: ${Array.isArray(v) ? (v.length ? v.join(", ") : "ΓÇö") : (v ?? "ΓÇö")}`)
        .join("\n");
      return `Record ${i + 1}:\n${lines}`;
    }).join("\n\n");
  }
  if (typeof data === "object") {
    return Object.entries(data)
      .filter(([k]) => !["systemPrompt", "chatHistory", "actionLog"].includes(k))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? (v.length ? v.join(", ") : "ΓÇö") : (v ?? "ΓÇö")}`)
      .join("\n");
  }
  return String(data);
}

function getSuggestions(domain) {
  const m = {
    students:            ["List students in CSE", "Create student Rahul in CSE 2024", "Update Rahul GPA to 8.5", "Delete Rahul from CSE"],
    faculty:             ["List faculty in CSE", "Add faculty Dr Meena in ECE", "Assign Data Structures to Prof Kumar", "Generate workload"],
    courses:             ["List courses in CSE", "Create course AI Fundamentals CS401 semester 7 CSE 4 credits", "Update course CS201 credits to 4", "Delete course Data Structures"],
    attendance:          ["Record attendance Rahul present for CS201", "List attendance for Rahul", "Attendance report below 75", "Show attendance on 2026-03-13"],
    exams:               ["List exams", "Schedule exam Data Structures 2026-04-15 midterm"],
    academic_advisor:    ["View my courses", "What is my GPA?", "Details for course CS201"],
    attendance_tracker:  ["Show my attendance", "Attendance report"],
    results___grades:    ["View my marks", "Show my results", "Marks above 85"],
    timetable___exams:   ["View my timetable", "Show exam schedule"],
    profile_manager:     ["View my profile", "Update my email to rahul@test.com"],
    notice_board:        ["Show all notices", "Latest announcements"],
    class_manager:       ["List all students", "List all courses", "Create student Amit"],
    attendance_manager:  ["List attendance records", "Mark Rahul present for CS201", "Show students below 75% attendance", "Attendance report 75"],
    marks_entry:         ["View marks for CS201", "Enter marks for Rahul", "Marks analytics"],
    schedule_manager:    ["View schedule", "Schedule exam for Data Structures on April 20", "List all exams"],
    analytics_dashboard: ["Generate report", "Generate workload", "Attendance report", "Marks analytics"],
    faculty_profile:     ["View my profile", "Update my profile", "List all faculty"],
  };
  return m[domain] || ["List all records", "Generate summary report"];
}


