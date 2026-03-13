import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  getStudentGpaTrend,
  getStudentAttendance,
  getStudentGrades,
  getStudentSummary,
} from "../services/api";
import ExportButtons from "./ExportButtons";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#64748b"];
const ATT_OK = "#22c55e";
const ATT_LOW = "#ef4444";

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

export default function StudentAnalytics() {
  const [gpa, setGpa] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [grades, setGrades] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStudentGpaTrend().catch(() => ({ data: { data: {} } })),
      getStudentAttendance().catch(() => ({ data: { data: {} } })),
      getStudentGrades().catch(() => ({ data: { data: {} } })),
      getStudentSummary().catch(() => ({ data: { data: null } })),
    ])
      .then(([g, a, gr, s]) => {
        const gd = g.data.data || {};
        if (gd.labels && gd.values) {
          setGpa(gd.labels.map((label, i) => ({ semester: label, gpa: gd.values[i] })));
        }

        const ad = a.data.data || {};
        if (ad.subjects && ad.percentages) {
          setAttendance(
            ad.subjects.map((subject, i) => ({
              courseCode: subject,
              percentage: ad.percentages[i],
            }))
          );
        }

        const grd = gr.data.data || {};
        if (grd.grades && grd.counts) {
          setGrades(grd.grades.map((grade, i) => ({ grade, count: grd.counts[i] })));
        }

        const sd = s.data.data;
        if (sd) {
          setSummary({
            gpa: sd.current_gpa,
            totalCredits: sd.total_credits,
            overallAttendance: sd.attendance_overall,
            rank: sd.class_rank,
            passed: sd.subjects_passed,
            failed: sd.subjects_failed,
          });
        }
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

  const summaryCards = summary
    ? [
        { label: "Overall GPA", value: summary.gpa ?? "-", accent: true },
        { label: "Credits Earned", value: summary.totalCredits ?? 0 },
        { label: "Attendance", value: `${summary.overallAttendance ?? 0}%` },
        { label: "Rank", value: summary.rank ? `#${summary.rank}` : "-" },
        { label: "Passed", value: summary.passed ?? 0 },
        { label: "Failed", value: summary.failed ?? 0 },
      ]
    : [];

  return (
    <div>
      {summary && (
        <div className="metrics-grid" style={{ marginBottom: 28 }}>
          {summaryCards.map((card) => (
            <div key={card.label} className="metric-card">
              <div className="metric-value" style={card.accent ? { color: "var(--color-accent)" } : {}}>
                {card.value}
              </div>
              <div className="metric-label">{card.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid-2-col" style={{ gap: 20, marginBottom: 20 }}>
        <div className="card chart-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: "0.925rem", fontWeight: 700, color: "var(--color-text-1)", margin: 0 }}>
              GPA Trend
            </h3>
            {gpa.length > 0 && (
              <ExportButtons
                title="GPA Trend"
                headers={["Semester", "GPA"]}
                rows={gpa.map((item) => [item.semester, item.gpa])}
              />
            )}
          </div>
          {gpa.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={gpa}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="gpa"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#6366f1" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
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

      <div className="card chart-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: "0.925rem", fontWeight: 700, color: "var(--color-text-1)", margin: 0 }}>
            Attendance by Subject
          </h3>
          {attendance.length > 0 && (
            <ExportButtons
              title="Attendance"
              headers={["Subject", "Percentage"]}
              rows={attendance.map((item) => [item.courseCode, `${item.percentage}%`])}
            />
          )}
        </div>
        {attendance.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={attendance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="courseCode" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(value) => [`${value}%`, "Attendance"]} />
              <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                {attendance.map((item, i) => (
                  <Cell key={i} fill={item.percentage < 75 ? ATT_LOW : ATT_OK} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}

        {attendance.some((item) => item.percentage < 75) && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 6,
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              color: "#dc2626",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            Some subjects have attendance below 75%. You may not be eligible for exams.
          </div>
        )}
      </div>
    </div>
  );
}
