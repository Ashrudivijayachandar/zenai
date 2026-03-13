// ─── Agents Page ─────────────────────────────────────────────
// Full agents management table — list, open chat, delete
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AgentCard from "../components/AgentCard";
import { getAgents, deleteAgent } from "../services/api";
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
  academics: "Academic Advisory",
  results: "Results & Grades",
  timetable: "Timetable & Exams",
  profile: "Profile Mgmt",
  notices: "Notice Board",
  class_management: "Class Mgmt",
  attendance_mgmt: "Attendance Mgmt",
  marks: "Marks Entry",
  schedule: "Schedule Mgmt",
  analytics: "Analytics",
  faculty_profile: "Faculty Profile",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchAgents = useCallback(async () => {
    try {
      const role = user?.role || "";
      const res = await getAgents(role);
      setAgents(res.data.data);
    } catch {
      showToast("Failed to load agents.", "error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  function showToast(msg, type = "info") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Remove agent "${name}"?`)) return;
    try {
      await deleteAgent(id);
      setAgents((prev) => prev.filter((a) => a.id !== id));
      showToast(`"${name}" deleted.`);
    } catch {
      showToast("Failed to delete.", "error");
    }
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-heading" style={{ marginBottom: 3 }}>Agents</h1>
          <p className="text-body" style={{ color: "var(--color-text-3)" }}>
            {agents.length} agent{agents.length !== 1 ? "s" : ""} configured
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/create")}>
          + New Agent
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card" style={{ padding: "60px 0", textAlign: "center", color: "var(--color-text-4)" }}>
          Loading…
        </div>
      ) : agents.length === 0 ? (
        <div className="card" style={{ padding: "60px 24px", textAlign: "center" }}>
          <p className="text-body" style={{ color: "var(--color-text-3)", marginBottom: 14 }}>
            No agents yet. Create one to get started.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/create")}>
            Create Agent
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card table-responsive agents-table-desktop" style={{ overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Domain</th>
                  <th>Capabilities</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="agents-cards-mobile">
            {agents.map((agent) => (
              <div key={agent.id} className="card agent-mobile-card" style={{ padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 6,
                    background: "var(--color-accent-lt)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "var(--color-accent)", flexShrink: 0,
                  }}>
                    {agent.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--color-text-1)" }}>
                      {agent.name}
                    </div>
                    <div className="text-caption" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.7rem" }}>
                      {agent.description}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                  <span className="badge badge-indigo" style={{ fontSize: "0.65rem" }}>{DOMAIN_LABEL[agent.domain] || agent.domain}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.7rem", color: "var(--color-success)" }}>
                    <span className="status-dot active" /> Active
                  </span>
                  <span className="text-caption" style={{ fontSize: "0.7rem" }}>{agent.allowedActions?.length || 0} actions</span>
                  <span className="text-caption" style={{ fontSize: "0.7rem" }}>
                    {agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : ""}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => navigate(`/chat/${agent.id}`)}>
                    Open Chat
                  </button>
                  <button className="btn btn-danger-ghost btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => handleDelete(agent.id, agent.name)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {toast && (
        <div className="toast" style={{ background: toast.type === "error" ? "var(--color-danger)" : "var(--color-text-1)" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
