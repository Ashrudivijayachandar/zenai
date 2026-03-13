import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAgent } from "../services/api";
import { useAuth } from "../context/AuthContext";

const STUDENT_TEMPLATES = [
  {
    label: "Study Planner",
    templateDomain: "student_timetable",
    purpose: "Help students plan study schedules, set revision goals, and manage assignment deadlines",
  },
  {
    label: "Career Guidance",
    templateDomain: "student_academic",
    purpose: "Provide career advice, internship suggestions, and placement preparation tips for students",
  },
  {
    label: "Library Assistant",
    templateDomain: "library_management",
    purpose: "Help students find books, research papers, and library resources for their courses",
  },
  {
    label: "Hostel & Campus",
    templateDomain: "student_profile",
    purpose: "Manage hostel room queries, campus facility info, and student welfare services",
  },
  {
    label: "Fee & Scholarship",
    templateDomain: "fee_management",
    purpose: "Track fee payment status, scholarship eligibility, and financial aid information for students",
  },
];

const FACULTY_TEMPLATES = [
  {
    label: "Assignment Manager",
    templateDomain: "faculty_marks",
    purpose: "Create, distribute, and grade student assignments and projects for faculty courses",
  },
  {
    label: "Research Tracker",
    templateDomain: "faculty_analytics",
    purpose: "Track faculty research publications, conference papers, and ongoing research projects",
  },
  {
    label: "Leave Manager",
    templateDomain: "faculty_attendance",
    purpose: "Manage faculty leave requests, substitution scheduling, and attendance records",
  },
  {
    label: "Feedback Collector",
    templateDomain: "faculty_analytics",
    purpose: "Collect and analyze student feedback on courses and teaching effectiveness",
  },
  {
    label: "Curriculum Planner",
    templateDomain: "faculty_class_manager",
    purpose: "Plan and update course curriculum, syllabus content, and learning outcomes",
  },
];

const DOMAIN_LABEL = {
  students: "Student Management",
  faculty: "Faculty Management",
  courses: "Course Management",
  attendance: "Attendance",
  exams: "Exam Management",
  academic_advisor: "Academic Advisory",
  attendance_tracker: "Attendance Tracking",
  results___grades: "Results & Grades",
  timetable___exams: "Timetable & Exams",
  profile_manager: "Profile Management",
  class_manager: "Class Management",
  attendance_manager: "Attendance Management",
  marks_entry: "Marks Entry",
  schedule_manager: "Schedule Management",
  analytics_dashboard: "Analytics Dashboard",
  library_management: "Library Management",
  fee_management: "Fee Management",
};

export default function AgentCreator({ onCreated }) {
  const [purpose, setPurpose] = useState("");
  const [selectedTemplateDomain, setSelectedTemplateDomain] = useState("");
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { user } = useAuth();
  const templates = user?.role === "faculty" ? FACULTY_TEMPLATES : STUDENT_TEMPLATES;

  const handleCreate = async () => {
    const trimmedPurpose = purpose.trim();
    if (!trimmedPurpose) {
      setError("Please describe the agent's purpose");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        purpose: trimmedPurpose,
        ...(selectedTemplateDomain ? { templateDomain: selectedTemplateDomain } : {}),
        ...(selectedTemplateName ? { templateName: selectedTemplateName } : {}),
      };

      const res = await createAgent(payload);
      const created = res.data?.data || res.data?.agent;
      setResult(created);
      setPurpose("");
      setSelectedTemplateDomain("");
      setSelectedTemplateName("");
      if (onCreated) onCreated(created);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create agent. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agent-creator-wrap">
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-1)", marginBottom: 6 }}>
          New AI Agent
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)", lineHeight: 1.6 }}>
          Describe what the agent should manage. The system will auto-generate its name, domain, allowed actions, and system prompt.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="text-label" style={{ marginBottom: 8 }}>Quick Templates</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {templates.map((t) => (
            <button
              key={t.label}
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setPurpose(t.purpose);
                setSelectedTemplateDomain(t.templateDomain);
                setSelectedTemplateName(t.label);
                setError("");
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card card-padded" style={{ marginBottom: 0 }}>
        <label className="form-label" htmlFor="agent-purpose">Agent Purpose</label>
        <textarea
          id="agent-purpose"
          className="form-input"
          style={{ minHeight: 88, resize: "vertical" }}
          value={purpose}
          onChange={(e) => {
            setPurpose(e.target.value);
            if (!e.target.value.trim()) {
              setSelectedTemplateDomain("");
              setSelectedTemplateName("");
            }
            setError("");
          }}
          placeholder="e.g. Manage student records, enrollment, and GPA tracking across departments..."
          rows={3}
        />

        {error && (
          <p style={{ marginTop: 6, fontSize: "0.8125rem", color: "var(--color-danger)" }}>{error}</p>
        )}

        <button
          className="btn btn-primary"
          style={{ marginTop: 16, width: "100%", justifyContent: "center" }}
          onClick={handleCreate}
          disabled={loading || !purpose.trim()}
        >
          {loading ? "Generating agent..." : "Generate Agent"}
        </button>
      </div>

      {result && (
        <div
          className="card card-padded"
          style={{
            marginTop: 20,
            borderColor: "var(--color-success-lt)",
            background: "var(--color-success-bg, #f0fdf4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-success)", display: "inline-block" }} />
            <span style={{ fontSize: "0.8125rem", color: "var(--color-success)", fontWeight: 600 }}>
              Agent created successfully
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: "var(--color-accent-lt)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--color-accent)",
                flexShrink: 0,
              }}
            >
              {String(result.name || "AI").substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "var(--color-text-1)", fontSize: "0.9375rem" }}>
                {result.name}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", marginTop: 2 }}>
                {result.description}
              </div>
            </div>
          </div>

          <div className="agent-result-meta">
            <div>
              <div className="text-caption">Domain</div>
              <span className="badge badge-indigo" style={{ marginTop: 4, display: "inline-block" }}>
                {DOMAIN_LABEL[result.domain] || result.domain}
              </span>
            </div>
            <div>
              <div className="text-caption">Capabilities</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-1)", marginTop: 4 }}>
                {(result.allowedActions || []).length} actions
              </div>
            </div>
            <div>
              <div className="text-caption">Agent ID</div>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-1)", marginTop: 4 }}>
                #{result.id}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/chat/${result.id}`)}>
              Open Chat
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setResult(null)}>
              Create Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
