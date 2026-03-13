import React from "react";
import { useNavigate } from "react-router-dom";

export default function LoginSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="login-bg">
      <div className="login-card-wide">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div className="login-logo-mark">UA</div>
          <h1 className="login-logo-text">Uni<span>Agent</span></h1>
          <p className="login-subtitle">University AI Agent Platform</p>
          <p style={{ color: "var(--color-text-3)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
            Please select your role to continue
          </p>
        </div>

        {/* Role cards */}
        <div className="login-role-grid">
          {/* Student Card */}
          <button className="login-role-card" onClick={() => navigate("/login/student")}>
            <div className="login-role-icon student-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3L1 9l11 6 9-4.91V17M1 9v8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 13.5V18a8 8 0 01-16 0v-4.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="login-role-title">Student</h2>
            <p className="login-role-desc">Access your academic records, courses, attendance, and more.</p>
            <div className="login-role-btn">Login as Student →</div>
          </button>

          {/* Faculty Card */}
          <button className="login-role-card" onClick={() => navigate("/login/faculty")}>
            <div className="login-role-icon faculty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="4" strokeLinecap="round"/>
                <path d="M4 20c0-4 3.58-7 8-7s8 3 8 7" strokeLinecap="round"/>
                <path d="M17 3l1.5 1.5L21 2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="login-role-title">Faculty</h2>
            <p className="login-role-desc">Manage subjects, workload, student records, and AI agents.</p>
            <div className="login-role-btn faculty-btn">Login as Faculty →</div>
          </button>
        </div>

        <p className="login-footer-text">
          UniAgent · University Portal · v1.0
        </p>
      </div>
    </div>
  );
}
