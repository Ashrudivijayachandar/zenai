// ─── Chat Page ───────────────────────────────────────────────
// Full chat interface: left panel (agent info) | right (chat)
// Professional productivity-tool layout
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ChatBox from "../components/ChatBox";
import { getAgent } from "../services/api";
import { useAuth } from "../context/AuthContext";

const DOMAIN_LABEL = {
  students: "Student Management",
  faculty: "Faculty Management",
  courses: "Course Management",
  attendance: "Attendance",
  exams: "Exam Management",
  student: "Student Management",
  exam: "Exam Management",
  course: "Course Management",
  academic_advisor: "Academic Advisory",
  attendance_tracker: "Attendance Tracking",
  results___grades: "Results & Grades",
  timetable___exams: "Timetable & Exams",
  profile_manager: "Profile Management",
  notice_board: "Notice Board",
  class_manager: "Class Management",
  attendance_manager: "Attendance Management",
  marks_entry: "Marks Entry",
  schedule_manager: "Schedule Management",
  analytics_dashboard: "Analytics Dashboard",
  faculty_profile: "Faculty Profile",
  library_management: "Library Management",
  fee_management: "Fee Management",
  academic: "Academic Advisory",
  "student-attendance": "Attendance Tracking",
  results: "Results & Grades",
  timetable: "Timetable & Exams",
  profile: "Profile Management",
  notices: "Notice Board",
  "class-management": "Class Management",
  "attendance-management": "Attendance Management",
  marks: "Marks Entry",
  schedule: "Schedule Management",
  analytics: "Analytics Dashboard",
  "faculty-profile": "Faculty Profile",
};

export default function ChatPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAgent(agentId)
      .then((res) => {
        const a = res.data.data;
        // Role guard: redirect if agent role doesn't match user role
        if (user?.role && a.role && a.role !== user.role) {
          navigate("/agents");
          return;
        }
        setAgent(a);
      })
      .catch(() => navigate("/agents"))
      .finally(() => setLoading(false));
  }, [agentId, navigate, user]);

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", color:"var(--color-text-4)" }}>
        Loading agent…
      </div>
    );
  }
  if (!agent) return null;

  return (
    <div className="chat-layout">

      {/* ── Left panel: Agent info ── */}
      <div className="chat-left-panel">
        {/* Back */}
        <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--color-border)" }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("/agents")}
            style={{ paddingLeft:0 }}
          >
            ← Back to Agents
          </button>
        </div>

        {/* Agent identity */}
        <div style={{ padding:"20px 20px 16px" }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8,
            background: "var(--color-accent-lt)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize: 13, fontWeight: 700, color:"var(--color-accent)",
            marginBottom: 12,
          }}>
            {agent.name.substring(0,2).toUpperCase()}
          </div>
          <h2 style={{ fontSize:"0.9375rem", fontWeight:700, color:"var(--color-text-1)", marginBottom:6, letterSpacing:"-0.01em" }}>
            {agent.name}
          </h2>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
            <span className="status-dot active" />
            <span style={{ fontSize:"0.75rem", color:"var(--color-success)", fontWeight:500 }}>Active</span>
            <span style={{ color:"var(--color-border-md)", fontSize:"0.75rem" }}>·</span>
            <span className="badge badge-indigo" style={{ fontSize:"0.65rem" }}>
              {DOMAIN_LABEL[agent.domain] || agent.domain}
            </span>
          </div>
          <p style={{ fontSize:"0.8125rem", color:"var(--color-text-3)", lineHeight:1.55 }}>
            {agent.description}
          </p>
        </div>

        <div className="divider" style={{ margin:"0 20px" }} />

        {/* Capabilities */}
        <div style={{ padding:"0 20px 16px", flex:1, overflowY:"auto" }}>
          <div className="text-label" style={{ marginBottom:10 }}>Capabilities</div>
          {agent.allowedActions.map((a) => (
            <div key={a} style={{
              display:"flex", alignItems:"center", gap:8,
              padding:"6px 0",
              borderBottom:"1px solid var(--color-border)",
              fontSize:"0.8125rem", color:"var(--color-text-2)",
            }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"var(--color-accent)", flexShrink:0 }} />
              {a.replace(/_/g, " ")}
            </div>
          ))}
        </div>

        {/* Meta footer */}
        <div style={{ padding:"12px 20px", borderTop:"1px solid var(--color-border)" }}>
          {[
            ["Agent ID", `#${agent.id}`],
            ["Conversations", agent.chatHistory?.length || 0],
            ["Actions run", agent.actionLog?.length || 0],
          ].map(([k, v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <span className="text-caption">{k}</span>
              <span style={{ fontSize:"0.75rem", color:"var(--color-text-3)", fontWeight:500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: Chat ── */}
      <div className="chat-right-panel">
        {/* Chat top bar */}
        <div className="chat-topbar" style={{
          height: 48, background:"var(--color-surface)",
          borderBottom:"1px solid var(--color-border)",
          display:"flex", alignItems:"center",
          padding:"0 20px", gap:10, flexShrink:0,
        }}>
          <button className="chat-back-mobile" onClick={() => navigate("/agents")}>←</button>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--color-success)" }} />
          <span style={{ fontSize:"0.875rem", fontWeight:600, color:"var(--color-text-1)" }}>
            {agent.name}
          </span>
          <span style={{ color:"var(--color-border-md)" }}>·</span>
          <span style={{ fontSize:"0.8125rem", color:"var(--color-text-4)" }}>Conversational AI</span>
        </div>

        {/* Agent info bar (mobile only — since left panel is hidden) */}
        <div className="chat-agent-info-mobile">
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: "var(--color-accent-lt)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: "var(--color-accent)", flexShrink: 0,
          }}>
            {agent.name.substring(0,2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span className="badge badge-indigo" style={{ fontSize: "0.65rem" }}>
                {DOMAIN_LABEL[agent.domain] || agent.domain}
              </span>
              <span className="text-caption">{agent.allowedActions?.length || 0} capabilities</span>
            </div>
            <div className="agent-desc-mobile">{agent.description}</div>
          </div>
        </div>

        {/* Chat body */}
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          <ChatBox agent={agent} />
        </div>
      </div>
    </div>
  );
}
