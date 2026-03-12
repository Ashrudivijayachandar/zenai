import React, { useState } from "react";
import { exportPDF, exportExcel } from "../services/api";

export default function ExportButtons({ title, headers, rows }) {
  const [exporting, setExporting] = useState(null);

  function getFileNameFromDisposition(disposition, fallback) {
    if (!disposition) return fallback;
    const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    const raw = match ? (match[1] || match[2]) : null;
    return raw ? decodeURIComponent(raw) : fallback;
  }

  async function handleExport(type) {
    setExporting(type);
    try {
      const fn = type === "pdf" ? exportPDF : exportExcel;
      const res = await fn({ title, headers, rows });
      const contentType = res.headers?.["content-type"] || (type === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      const fallbackName = `${title.replace(/\s+/g, "_")}.${type === "pdf" ? "pdf" : "xlsx"}`;
      const fileName = getFileNameFromDisposition(res.headers?.["content-disposition"], fallbackName);
      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Export ${type} failed:`, err);
    } finally {
      setExporting(null);
    }
  }

  const btnStyle = {
    background: "none",
    border: "1px solid var(--color-border)",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: "0.7rem",
    fontWeight: 600,
    cursor: "pointer",
    color: "var(--color-text-3)",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    transition: "all 0.15s",
  };

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button
        style={btnStyle}
        onClick={() => handleExport("pdf")}
        disabled={exporting === "pdf"}
        title="Export as PDF"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 1h6l4 4v10H2V1z" strokeLinejoin="round" />
          <polyline points="10,1 10,5 14,5" />
        </svg>
        {exporting === "pdf" ? "…" : "PDF"}
      </button>
      <button
        style={{ ...btnStyle, color: "#16a34a" }}
        onClick={() => handleExport("excel")}
        disabled={exporting === "excel"}
        title="Export as Excel"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="1" width="14" height="14" rx="2" />
          <line x1="1" y1="5" x2="15" y2="5" />
          <line x1="1" y1="9" x2="15" y2="9" />
          <line x1="5" y1="1" x2="5" y2="15" />
        </svg>
        {exporting === "excel" ? "…" : "Excel"}
      </button>
    </div>
  );
}
