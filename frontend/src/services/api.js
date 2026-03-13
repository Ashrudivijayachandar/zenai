// ============================================================
// API SERVICE — Axios client for communicating with the backend
// ============================================================

import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("zenai_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Agent APIs ----

export const getAgents = (role) =>
  api.get(role ? `/agents?role=${role}` : "/agents");

export const getAgent = (id) => api.get(`/agents/${id}`);

export const createAgent = (payload) => {
  if (typeof payload === "string") {
    return api.post("/agents", { purpose: payload });
  }
  return api.post("/agents", payload);
};

export const deleteAgent = (id) => api.delete(`/agents/${id}`);

export const getAgentLogs = (id) => api.get(`/agents/${id}/logs`);

// ---- Chat APIs ----

export const sendMessage = (agentId, message) =>
  api.post(`/chat/${agentId}`, { message });

export const getChatHistory = (agentId) =>
  api.get(`/chat/${agentId}/history`);

// ---- Auth APIs ----

export const studentLogin = (email, password) =>
  api.post("/auth/student/login", { email, password });

export const facultyLogin = (email, password) =>
  api.post("/auth/faculty/login", { email, password });

export const getMe = (token) =>
  api.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } });

// ---- Data / Analytics APIs ----

export const getStats = () => api.get("/data/stats");

export const getLogs = () => api.get("/data/logs");

// ---- Alert APIs ----

export const getAlerts = () => api.get("/alerts");

export const getAlertCount = () => api.get("/alerts/count");

export const markAlertRead = (alertId) => api.put(`/alerts/read/${alertId}`);

export const markAllAlertsRead = () => api.put("/alerts/read-all");

export const clearAlerts = () => api.delete("/alerts/clear");

// ---- Analytics APIs ----

export const getStudentGpaTrend = () => api.get("/analytics/student/gpa-trend");

export const getStudentAttendance = () => api.get("/analytics/student/attendance");

export const getStudentGrades = () => api.get("/analytics/student/grade-distribution");

export const getStudentSummary = () => api.get("/analytics/student/performance-summary");

export const getFacultyClassPerformance = () => api.get("/analytics/faculty/class-performance");

export const getFacultyGrades = () => api.get("/analytics/faculty/grade-distribution");

export const getFacultyAttVsMarks = () => api.get("/analytics/faculty/attendance-vs-marks");

export const getFacultySemComparison = () => api.get("/analytics/faculty/semester-comparison");

export const getAtRiskStudents = () => api.get("/analytics/faculty/at-risk-students");

// ---- Profile APIs ----

export const getStudentProfile = () => api.get("/profile/student");

export const updateStudentProfile = (data) => api.put("/profile/student", data);

export const getFacultyProfile = () => api.get("/profile/faculty");

export const updateFacultyProfile = (data) => api.put("/profile/faculty", data);

// ---- Export APIs ----

export const exportPDF = (data) =>
  api.post("/export/pdf", data, { responseType: "blob" });

export const exportExcel = (data) =>
  api.post("/export/excel", data, { responseType: "blob" });

export default api;
