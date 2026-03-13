import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  getFacultyClassPerformance,
  getFacultyGrades,
  getFacultyAttVsMarks,
  getFacultySemComparison,
  getAtRiskStudents,
} from "../services/api";
import ExportButtons from "./ExportButtons";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#64748b", "#ec4899"];

function Empty() {
  return (
    <div
      style={{
        height: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-text-4)",
        fontSize: "0.85rem",
      }}
    >
      No data available
    </div>
  );
}

export default function FacultyAnalytics() {
  const [classPerf, setClassPerf] = useState([]);
  const [grades, setGrades] = useState([]);
  const [scatter, setScatter] = useState([]);
  const [semComp, setSemComp] = useState([]);
  const [atRisk, setAtRisk] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getFacultyClassPerformance().catch(() => ({ data: { data: {} } })),
      getFacultyGrades().catch(() => ({ data: { data: {} } })),
      getFacultyAttVsMarks().catch(() => ({ data: { data: {} } })),
      getFacultySemComparison().catch(() => ({ data: { data: {} } })),
      getAtRiskStudents().catch(() => ({ data: { data: {} } })),
    ])
      .then(([cp, gr, sc, sem, ar]) => {
        const cpd = cp.data.data || {};
        if (cpd.total_students !== undefined) {
          setClassPerf([
            {
              course: "All Courses",
              passed: cpd.passed || 0,
              failed: cpd.failed || 0,
              avgMarks: cpd.average_marks || 0,
              passRate: cpd.pass_percentage || 0,
              totalStudents: cpd.total_students || 0,
            },
          ]);
        }

        const grd = gr.data.data || {};
        if (grd.grades && grd.counts) {
          setGrades(grd.grades.map((grade, i) => ({ grade, count: grd.counts[i] })));
        }

        const scd = sc.data.data || {};
        setScatter(scd.data_points || []);

        const semd = sem.data.data || {};
        if (semd.current_semester && semd.previous_semester) {
          const current = semd.current_semester;
          const previous = semd.previous_semester;
          setSemComp([
            { metric: "Avg Marks", current: current.avg_marks, previous: previous.avg_marks },
            { metric: "Pass Rate", current: current.pass_rate, previous: previous.pass_rate },
            { metric: "Attendance", current: current.avg_attendance, previous: previous.avg_attendance },
          ]);
        }

        const ard = ar.data.data || {};
        setAtRisk(
          (ard.at_risk || []).map((item) => ({
            name: item.name,
            course: item.department,
            attendance: item.attendance,
            marks: item.avg_marks,
            reason: item.attendance < 75 ? "Low Attendance" : "Low Marks",
          }))
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-4)" }}>
        Loading analytics...
      </div>
    );
  }

  return (
    <div>
      <div className="metrics-grid" style={{ marginBottom: 28 }}>
        <div className="metric-card">
          <div className="metric-value" style={{ color: "var(--color-accent)" }}>
            {classPerf.length}
          </div>
          <div className="metric-label">Courses Taught</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{atRisk.length}</div>
          <div className="metric-label">At-Risk Students</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            {classPerf.length > 0
              ? Math.round(classPerf.reduce((sum, item) => sum + (item.passRate || 0), 0) / classPerf.length)
              : 0}
            %
          </div>
          <div className="metric-label">Avg Pass Rate</div>
        </div>
      </div>

      <div className="grid-2-col" style={{ gap: 20, marginBottom: 20 }}>
        <div className="card chart-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: "0.925rem", fontWeight: 700, color: "var(--color-text-1)", margin: 0 }}>
              Class Performance
            </h3>
            {classPerf.length > 0 && (
              <ExportButtons
                title="Class Performance"
                headers={["Course", "Avg Marks", "Pass Rate", "Total Students"]}
                rows={classPerf.map((item) => [item.course, item.avgMarks, `${item.passRate}%`, item.totalStudents])}
              />
            )}
          </div>
          {classPerf.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={classPerf}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="course" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="passed" fill="#22c55e" name="Passed" radius={[2, 2, 0, 0]} />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>

        <div className="card chart-card">
          <h3 style={{ fontSize: "0.925rem", fontWeight: 700, color: "var(--color-text-1)", margin: 0, marginBottom: 16 }}>
            Grade Distribution
          </h3>
          {grades.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={grades}
                  dataKey="count"
                  nameKey="grade"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={3}
                  label={({ grade, count }) => `${grade}: ${count}`}
                >
                  {grades.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>
      </div>

      <div className="grid-2-col" style={{ gap: 20, marginBottom: 20 }}>
        <div className="card chart-card">
          <h3 style={{ fontSize: "0.925rem", fontWeight: 700, color: "var(--color-text-1)", margin: 0, marginBottom: 16 }}>
            Attendance vs Marks
          </h3>
          {scatter.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" dataKey="attendance" name="Attendance %" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="number" dataKey="marks" name="Marks %" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  formatter={(value, name) => [`${value}%`, name]}
                />
                <Scatter data={scatter} fill="#6366f1">
                  {scatter.map((item, i) => (
                    <Cell key={i} fill={item.attendance < 75 || item.marks < 40 ? "#ef4444" : "#6366f1"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>

        <div className="card chart-card">
          <h3 style={{ fontSize: "0.925rem", fontWeight: 700, color: "var(--color-text-1)", margin: 0, marginBottom: 16 }}>
            Semester Comparison
          </h3>
          {semComp.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={semComp}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="current" fill="#6366f1" name="Current" radius={[2, 2, 0, 0]} />
                <Bar dataKey="previous" fill="#cbd5e1" name="Previous" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>
      </div>

      {atRisk.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-text-1)" }}>
              At-Risk Students ({atRisk.length})
            </span>
            <ExportButtons
              title="At-Risk Students"
              headers={["Student", "Course", "Attendance", "Marks", "Reason"]}
              rows={atRisk.map((item) => [item.name, item.course, `${item.attendance}%`, item.marks, item.reason])}
            />
          </div>

          <div className="log-table-desktop table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Attendance</th>
                  <th>Marks</th>
                  <th>Risk Reason</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>{item.course}</td>
                    <td>
                      <span
                        style={{
                          color: item.attendance < 75 ? "#ef4444" : "var(--color-text-2)",
                          fontWeight: item.attendance < 75 ? 700 : 400,
                        }}
                      >
                        {item.attendance}%
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          color: item.marks < 40 ? "#ef4444" : "var(--color-text-2)",
                          fontWeight: item.marks < 40 ? 700 : 400,
                        }}
                      >
                        {item.marks}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${item.reason === "Low Attendance" ? "badge-red" : "badge-amber"}`}>
                        {item.reason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="log-cards-mobile">
            {atRisk.map((item, i) => (
              <div key={i} className="log-mobile-card" style={{ borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--color-text-1)" }}>{item.name}</span>
                  <span className={`badge ${item.reason === "Low Attendance" ? "badge-red" : "badge-amber"}`}>
                    {item.reason}
                  </span>
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--color-text-3)", marginBottom: 6 }}>{item.course}</div>
                <div style={{ display: "flex", gap: 16, fontSize: "0.8125rem" }}>
                  <div>
                    <span className="text-caption">Attendance </span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: item.attendance < 75 ? "#ef4444" : "var(--color-text-2)",
                      }}
                    >
                      {item.attendance}%
                    </span>
                  </div>
                  <div>
                    <span className="text-caption">Marks </span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: item.marks < 40 ? "#ef4444" : "var(--color-text-2)",
                      }}
                    >
                      {item.marks}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
