import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getStats, getLogs } from "../services/api";
import StudentAnalytics from "../components/StudentAnalytics";
import FacultyAnalytics from "../components/FacultyAnalytics";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("charts");
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getLogs()])
      .then(([statsResponse, logsResponse]) => {
        setStats(statsResponse.data.data);
        setLogs(logsResponse.data.data || []);
      })
      .catch((error) => {
        console.error("Analytics fetch failed:", error);
      })
      .finally(() => setLoading(false));
  }, []);

  const isFaculty = user?.role === "faculty";

  return (
    <div className="page-content">
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--color-text-1)",
            letterSpacing: "-0.02em",
            marginBottom: 4,
          }}
        >
          Analytics
        </h1>
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-3)" }}>
          {isFaculty
            ? "Class performance, grade insights, and at-risk students."
            : "Your academic performance, GPA trends, and attendance."}
        </p>
      </div>

      <div className="analytics-tabs">
        {[
          { key: "charts", label: isFaculty ? "Faculty Analytics" : "My Analytics" },
          { key: "logs", label: "Interaction Log" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              padding: "8px 20px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: tab === item.key ? "var(--color-accent)" : "transparent",
              color: tab === item.key ? "#fff" : "var(--color-text-3)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "charts" && (isFaculty ? <FacultyAnalytics /> : <StudentAnalytics />)}

      {tab === "logs" && (
        <>
          {stats && (
            <div className="metrics-grid" style={{ gap: 12, marginBottom: 24 }}>
              {[
                { label: "Agents", value: stats.totalAgents },
                { label: "Students", value: stats.totalStudents },
                { label: "Faculty", value: stats.totalFaculty },
                { label: "Courses", value: stats.totalCourses },
                { label: "Interactions", value: stats.totalInteractions },
              ].map((item) => (
                <div key={item.label} className="metric-card">
                  <div className="metric-value">{item.value ?? 0}</div>
                  <div className="metric-label">{item.label}</div>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-4)" }}>Loading...</div>
          ) : (
            <div className="card table-responsive" style={{ padding: 0 }}>
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--color-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text-1)" }}>
                  Interaction Log
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-4)" }}>{logs.length} entries</span>
              </div>

              {logs.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.875rem", color: "var(--color-text-4)", marginBottom: 6 }}>
                    No interactions yet
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--color-text-4)" }}>
                    Chat with an agent to see activity here.
                  </div>
                </div>
              ) : (
                <>
                  <div className="log-table-desktop">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Agent</th>
                          <th>Message</th>
                          <th>Action Taken</th>
                          <th>Result</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id}>
                            <td style={{ color: "var(--color-text-4)", fontVariantNumeric: "tabular-nums" }}>{log.id}</td>
                            <td>
                              <span className="badge badge-indigo">{log.agentName}</span>
                            </td>
                            <td
                              style={{
                                maxWidth: 260,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color: "var(--color-text-2)",
                              }}
                            >
                              {log.userMessage}
                            </td>
                            <td>
                              {log.aiAction ? (
                                <span className="badge badge-gray">{log.aiAction.replace(/_/g, " ")}</span>
                              ) : (
                                <span style={{ color: "var(--color-text-4)" }}>-</span>
                              )}
                            </td>
                            <td>
                              {log.result === true ? (
                                <span style={{ color: "var(--color-success)", fontWeight: 600, fontSize: "0.8125rem" }}>OK</span>
                              ) : log.result === false ? (
                                <span style={{ color: "var(--color-danger)", fontWeight: 600, fontSize: "0.8125rem" }}>Fail</span>
                              ) : (
                                <span style={{ color: "var(--color-text-4)" }}>-</span>
                              )}
                            </td>
                            <td style={{ color: "var(--color-text-4)", whiteSpace: "nowrap" }}>
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="log-cards-mobile">
                    {logs.map((log) => (
                      <div key={log.id} className="log-mobile-card" style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span className="badge badge-indigo">{log.agentName}</span>
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-4)" }}>
                            {new Date(log.timestamp).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "0.8125rem",
                            color: "var(--color-text-2)",
                            margin: "0 0 6px",
                            lineHeight: 1.45,
                            wordBreak: "break-word",
                          }}
                        >
                          {log.userMessage}
                        </p>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          {log.aiAction && <span className="badge badge-gray">{log.aiAction.replace(/_/g, " ")}</span>}
                          {log.result === true && (
                            <span style={{ color: "var(--color-success)", fontWeight: 600, fontSize: "0.75rem" }}>OK</span>
                          )}
                          {log.result === false && (
                            <span style={{ color: "var(--color-danger)", fontWeight: 600, fontSize: "0.75rem" }}>Fail</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
