// ============================================================
// EXPORT ROUTES — PDF & Excel export endpoints
// ============================================================

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

function sanitizeFileName(value, fallback = "Report") {
  return String(value || fallback).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function normalizeRows(headers, rows) {
  const colCount = Array.isArray(headers) ? headers.length : 0;
  return (rows || []).map((row) => {
    const cells = Array.isArray(row) ? row.slice(0, colCount) : [];
    while (cells.length < colCount) cells.push("");
    return cells.map((c) => (c === null || c === undefined ? "" : String(c)));
  });
}

// POST /api/export/pdf
router.post("/pdf", authenticateToken, (req, res) => {
  const { title, headers, rows } = req.body;
  if (!Array.isArray(headers) || !Array.isArray(rows) || headers.length === 0) {
    return res.status(400).json({ success: false, message: "headers and rows required" });
  }
  const reportTitle = title || "Report";
  const filename = `${sanitizeFileName(reportTitle)}.pdf`;
  const bodyRows = normalizeRows(headers, rows);
  const now = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);

  doc.font("Helvetica-Bold").fontSize(18).text(reportTitle, { align: "center" });
  doc.moveDown(0.3);
  doc.font("Helvetica").fontSize(10).fillColor("#666").text(`Generated: ${now}`, { align: "center" });
  doc.fillColor("#111");
  doc.moveDown(1.2);

  const page = doc.page;
  const usableWidth = page.width - page.margins.left - page.margins.right;
  const colWidth = usableWidth / headers.length;
  const rowHeight = 22;
  let y = doc.y;

  const drawHeader = () => {
    for (let i = 0; i < headers.length; i++) {
      const x = page.margins.left + i * colWidth;
      doc.rect(x, y, colWidth, rowHeight).fillAndStroke("#1A56DB", "#1A56DB");
      doc.fillColor("#fff").font("Helvetica-Bold").fontSize(9)
        .text(String(headers[i]), x + 4, y + 7, { width: colWidth - 8, align: "center", ellipsis: true });
      doc.fillColor("#111");
    }
    y += rowHeight;
  };

  drawHeader();

  for (let r = 0; r < bodyRows.length; r++) {
    if (y + rowHeight > page.height - page.margins.bottom - 25) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader();
    }
    const row = bodyRows[r];
    const fill = r % 2 === 0 ? "#FFFFFF" : "#F5F8FF";
    for (let i = 0; i < headers.length; i++) {
      const x = page.margins.left + i * colWidth;
      doc.rect(x, y, colWidth, rowHeight).fillAndStroke(fill, "#DDDDDD");
      doc.fillColor("#111").font("Helvetica").fontSize(8.5)
        .text(row[i], x + 4, y + 7, { width: colWidth - 8, align: "center", ellipsis: true });
    }
    y += rowHeight;
  }

  doc.end();
});

// POST /api/export/csv (Excel-compatible CSV)
router.post("/excel", authenticateToken, (req, res) => {
  const { title, headers, rows } = req.body;
  if (!Array.isArray(headers) || !Array.isArray(rows) || headers.length === 0) {
    return res.status(400).json({ success: false, message: "headers and rows required" });
  }
  const reportTitle = title || "Report";
  const filename = `${sanitizeFileName(reportTitle)}.xlsx`;
  const bodyRows = normalizeRows(headers, rows);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "UniAgent";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Report", {
    properties: { defaultRowHeight: 18 },
    views: [{ state: "frozen", ySplit: 3 }],
  });

  ws.mergeCells(1, 1, 1, headers.length);
  ws.getCell(1, 1).value = reportTitle;
  ws.getCell(1, 1).font = { bold: true, size: 14 };
  ws.getCell(1, 1).alignment = { horizontal: "center" };

  ws.mergeCells(2, 1, 2, headers.length);
  ws.getCell(2, 1).value = `Generated: ${new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}`;
  ws.getCell(2, 1).font = { italic: true, size: 10, color: { argb: "FF666666" } };
  ws.getCell(2, 1).alignment = { horizontal: "center" };

  ws.addRow([]);
  const headerRow = ws.addRow(headers.map((h) => String(h)));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A56DB" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF1A56DB" } },
      left: { style: "thin", color: { argb: "FF1A56DB" } },
      bottom: { style: "thin", color: { argb: "FF1A56DB" } },
      right: { style: "thin", color: { argb: "FF1A56DB" } },
    };
  });

  for (const row of bodyRows) {
    const dataRow = ws.addRow(row);
    dataRow.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFDDDDDD" } },
        left: { style: "thin", color: { argb: "FFDDDDDD" } },
        bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
        right: { style: "thin", color: { argb: "FFDDDDDD" } },
      };
    });
  }

  ws.columns = headers.map(() => ({ width: 24 }));

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  workbook.xlsx.write(res).then(() => res.end());
});

module.exports = router;
