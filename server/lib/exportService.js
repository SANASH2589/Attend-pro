const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { getFullClassReport, getFullStudentReport } = require('./attendanceStats');

// ============================================================
// EXCEL EXPORTS
// ============================================================

/**
 * Export class attendance report as Excel workbook with 2 sheets.
 */
async function exportClassReportExcel(classId, dateFrom, dateTo) {
  const report = await getFullClassReport(classId, dateFrom, dateTo);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Attend-Pro';
  workbook.created = new Date();

  // ---------- Sheet 1: Summary ----------
  const sheet1 = workbook.addWorksheet('Summary');

  // Title row
  sheet1.mergeCells('A1:F1');
  const titleCell = sheet1.getCell('A1');
  titleCell.value = 'Attend-Pro — Class Attendance Report';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { horizontal: 'left' };

  // Info row
  sheet1.mergeCells('A2:F2');
  const infoCell = sheet1.getCell('A2');
  infoCell.value = `Class: ${report.class?.name || 'N/A'} | Period: ${dateFrom || 'All'} to ${dateTo || 'All'} | Generated: ${new Date().toLocaleDateString('en-IN')}`;
  infoCell.font = { size: 10, color: { argb: 'FF64748B' } };

  // Empty row
  sheet1.addRow([]);

  // Header row (row 4)
  const headerRow = sheet1.addRow(['Roll No.', 'Student Name', 'Present', 'Absent', 'Total Sessions', 'Attendance %']);
  headerRow.font = { bold: true, size: 11 };
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
  });

  // Freeze header
  sheet1.views = [{ state: 'frozen', ySplit: 4 }];

  // Data rows
  if (report.students.length === 0) {
    sheet1.addRow(['No data for selected period', '', '', '', '', '']);
  } else {
    report.students.forEach(s => {
      const row = sheet1.addRow([
        s.roll_number,
        s.full_name,
        s.present,
        s.absent,
        s.total_sessions,
        s.percentage !== null ? s.percentage : '—'
      ]);

      // Conditional formatting on percentage column
      const pctCell = row.getCell(6);
      if (s.percentage !== null) {
        pctCell.numFmt = '0.00"%"';
        if (s.percentage >= 75) {
          pctCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
          pctCell.font = { color: { argb: 'FF16A34A' }, bold: true };
        } else if (s.percentage >= 50) {
          pctCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
          pctCell.font = { color: { argb: 'FFD97706' }, bold: true };
        } else {
          pctCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
          pctCell.font = { color: { argb: 'FFDC2626' }, bold: true };
        }
      }
    });
  }

  // Auto-size columns
  sheet1.columns.forEach(col => {
    col.width = 18;
  });
  sheet1.getColumn(2).width = 28;

  // ---------- Sheet 2: Daily Sessions ----------
  const sheet2 = workbook.addWorksheet('Daily Sessions');

  const dailyHeader = sheet2.addRow(['Date', 'Session Type', 'Present', 'Absent', 'Attendance %']);
  dailyHeader.font = { bold: true, size: 11 };
  dailyHeader.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
  });

  sheet2.views = [{ state: 'frozen', ySplit: 1 }];

  if (report.daily.length === 0) {
    sheet2.addRow(['No data for selected period', '', '', '', '']);
  } else {
    report.daily.forEach(d => {
      const row = sheet2.addRow([
        d.session_date,
        d.session_type === 'morning' ? 'Morning' : 'Evening',
        d.present,
        d.absent,
        d.percentage !== null ? d.percentage : '—'
      ]);

      const pctCell = row.getCell(5);
      if (d.percentage !== null) {
        if (d.percentage >= 75) {
          pctCell.font = { color: { argb: 'FF16A34A' }, bold: true };
        } else if (d.percentage >= 50) {
          pctCell.font = { color: { argb: 'FFD97706' }, bold: true };
        } else {
          pctCell.font = { color: { argb: 'FFDC2626' }, bold: true };
        }
      }
    });
  }

  sheet2.columns.forEach(col => { col.width = 18; });

  return await workbook.xlsx.writeBuffer();
}

/**
 * Export student attendance report as Excel workbook.
 */
async function exportStudentReportExcel(studentId, classId, dateFrom, dateTo) {
  const report = await getFullStudentReport(studentId, classId, dateFrom, dateTo);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Attend-Pro';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Student Report');

  // Student info header
  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = 'Attend-Pro — Student Attendance Report';
  sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };

  sheet.addRow(['Name:', report.student?.full_name || 'N/A', 'Roll No:', report.student?.roll_number || '']);
  sheet.addRow(['Class:', report.class?.name || 'All', 'Period:', `${dateFrom || 'All'} to ${dateTo || 'All'}`]);
  sheet.addRow(['Present:', report.summary.present, 'Absent:', report.summary.absent]);
  const pctRow = sheet.addRow(['Attendance %:', report.summary.percentage !== null ? `${report.summary.percentage}%` : '—', '', '']);
  pctRow.getCell(2).font = { bold: true, size: 12 };

  sheet.addRow([]);

  // Session detail table
  const headerRow = sheet.addRow(['Date', 'Class', 'Session', 'Status']);
  headerRow.font = { bold: true, size: 11 };
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
  });

  if (report.sessions.length === 0) {
    sheet.addRow(['No data for selected period', '', '', '']);
  } else {
    report.sessions.forEach(s => {
      const row = sheet.addRow([
        s.session_date,
        s.class_name,
        s.session_type === 'morning' ? 'Morning' : 'Evening',
        s.status === 'present' ? 'Present' : s.status === 'absent' ? 'Absent' : '—'
      ]);

      const statusCell = row.getCell(4);
      if (s.status === 'present') {
        statusCell.font = { color: { argb: 'FF16A34A' }, bold: true };
      } else if (s.status === 'absent') {
        statusCell.font = { color: { argb: 'FFDC2626' }, bold: true };
      }
    });
  }

  sheet.columns.forEach(col => { col.width = 20; });

  return await workbook.xlsx.writeBuffer();
}

// ============================================================
// PDF EXPORTS
// ============================================================

/**
 * Export class attendance report as PDF.
 */
async function exportClassReportPDF(classId, dateFrom, dateTo) {
  const report = await getFullClassReport(classId, dateFrom, dateTo);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('Attend-Pro', 50, 40);
    doc.fontSize(12).font('Helvetica').text('Attendance Report', 400, 42, { align: 'right' });
    doc.moveTo(50, 65).lineTo(545, 65).stroke('#E2E8F0');

    // Class info
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').text(report.class?.name || 'Unknown Class');
    doc.fontSize(9).font('Helvetica').fillColor('#64748B')
      .text(`Period: ${dateFrom || 'All'} to ${dateTo || 'All'} | Generated: ${new Date().toLocaleDateString('en-IN')}`)
      .fillColor('#0F172A');

    // Summary section
    doc.moveDown(0.8);
    doc.fontSize(10).font('Helvetica-Bold').text('Summary');
    doc.fontSize(9).font('Helvetica')
      .text(`Total sessions: ${report.summary.total_sessions} · Average attendance: ${report.summary.avg_attendance_pct !== null ? report.summary.avg_attendance_pct + '%' : '—'}`);

    // Student table
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold').text('Student Attendance');
    doc.moveDown(0.4);

    const tableTop = doc.y;
    const colWidths = [60, 160, 55, 55, 70, 70];
    const headers = ['Roll No.', 'Name', 'Present', 'Absent', 'Sessions', '%'];
    const startX = 50;

    // Draw header
    let xPos = startX;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569');
    headers.forEach((h, i) => {
      doc.text(h, xPos, tableTop, { width: colWidths[i] });
      xPos += colWidths[i];
    });
    doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).stroke('#E2E8F0');

    let yPos = tableTop + 20;

    if (report.students.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor('#94A3B8')
        .text('No data for selected period', startX, yPos);
    } else {
      report.students.forEach((s, idx) => {
        // Check for page break
        if (yPos > 720) {
          doc.addPage();
          yPos = 50;
        }

        // Alternate row shading
        if (idx % 2 === 1) {
          doc.rect(startX, yPos - 3, 495, 16).fill('#F8FAFC').fillColor('#0F172A');
        }

        xPos = startX;
        doc.fontSize(8).font('Helvetica').fillColor('#0F172A');
        doc.text(s.roll_number || '', xPos, yPos, { width: colWidths[0] }); xPos += colWidths[0];
        doc.text(s.full_name || '', xPos, yPos, { width: colWidths[1] }); xPos += colWidths[1];
        doc.text(String(s.present), xPos, yPos, { width: colWidths[2] }); xPos += colWidths[2];
        doc.text(String(s.absent), xPos, yPos, { width: colWidths[3] }); xPos += colWidths[3];
        doc.text(String(s.total_sessions), xPos, yPos, { width: colWidths[4] }); xPos += colWidths[4];

        // Percentage with color
        const pctText = s.percentage !== null ? `${s.percentage}%` : '—';
        const pctColor = s.percentage !== null ? (s.percentage >= 75 ? '#16A34A' : s.percentage >= 50 ? '#D97706' : '#DC2626') : '#94A3B8';
        doc.font('Helvetica-Bold').fillColor(pctColor).text(pctText, xPos, yPos, { width: colWidths[5] });
        doc.fillColor('#0F172A');

        yPos += 16;
      });
    }

    // Footer on all pages
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).font('Helvetica').fillColor('#94A3B8');
      doc.text(`Page ${i + 1} of ${range.count}`, 50, 780, { align: 'center', width: 495 });
      doc.text(`Generated by Attend-Pro on ${new Date().toLocaleDateString('en-IN')}`, 50, 792, { align: 'center', width: 495 });
    }

    doc.end();
  });
}

/**
 * Export student attendance report as PDF.
 */
async function exportStudentReportPDF(studentId, classId, dateFrom, dateTo) {
  const report = await getFullStudentReport(studentId, classId, dateFrom, dateTo);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('Attend-Pro', 50, 40);
    doc.fontSize(12).font('Helvetica').text('Student Report', 400, 42, { align: 'right' });
    doc.moveTo(50, 65).lineTo(545, 65).stroke('#E2E8F0');

    // Student info
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').text(report.student?.full_name || 'Unknown Student');
    doc.fontSize(9).font('Helvetica').fillColor('#64748B')
      .text(`Roll No: ${report.student?.roll_number || 'N/A'} | Class: ${report.class?.name || 'All'} | Period: ${dateFrom || 'All'} to ${dateTo || 'All'}`)
      .fillColor('#0F172A');

    // Summary
    doc.moveDown(0.8);
    doc.fontSize(10).font('Helvetica-Bold').text('Attendance Summary');
    doc.fontSize(9).font('Helvetica')
      .text(`Present: ${report.summary.present} · Absent: ${report.summary.absent} · Total: ${report.summary.total_sessions} · Percentage: ${report.summary.percentage !== null ? report.summary.percentage + '%' : '—'}`);

    if (report.summary.consecutive_absences_max > 2) {
      doc.moveDown(0.3);
      doc.fillColor('#D97706').text(`⚠ Longest consecutive absence: ${report.summary.consecutive_absences_max} days (last on ${report.summary.last_absent_date || 'N/A'})`);
      doc.fillColor('#0F172A');
    }

    // Session history table
    doc.moveDown(1);
    doc.fontSize(10).font('Helvetica-Bold').text('Session History');
    doc.moveDown(0.4);

    const tableTop = doc.y;
    const colWidths = [100, 150, 100, 100];
    const headers = ['Date', 'Class', 'Session', 'Status'];
    const startX = 50;

    let xPos = startX;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569');
    headers.forEach((h, i) => {
      doc.text(h, xPos, tableTop, { width: colWidths[i] });
      xPos += colWidths[i];
    });
    doc.moveTo(50, tableTop + 14).lineTo(545, tableTop + 14).stroke('#E2E8F0');

    let yPos = tableTop + 20;

    if (report.sessions.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor('#94A3B8')
        .text('No data for selected period', startX, yPos);
    } else {
      report.sessions.forEach((s, idx) => {
        if (yPos > 720) {
          doc.addPage();
          yPos = 50;
        }

        if (idx % 2 === 1) {
          doc.rect(startX, yPos - 3, 495, 16).fill('#F8FAFC').fillColor('#0F172A');
        }

        xPos = startX;
        doc.fontSize(8).font('Helvetica').fillColor('#0F172A');
        doc.text(s.session_date || '', xPos, yPos, { width: colWidths[0] }); xPos += colWidths[0];
        doc.text(s.class_name || '', xPos, yPos, { width: colWidths[1] }); xPos += colWidths[1];
        doc.text(s.session_type === 'morning' ? 'Morning' : 'Evening', xPos, yPos, { width: colWidths[2] }); xPos += colWidths[2];

        const statusText = s.status === 'present' ? 'Present' : s.status === 'absent' ? 'Absent' : '—';
        const statusColor = s.status === 'present' ? '#16A34A' : s.status === 'absent' ? '#DC2626' : '#94A3B8';
        doc.font('Helvetica-Bold').fillColor(statusColor).text(statusText, xPos, yPos, { width: colWidths[3] });
        doc.fillColor('#0F172A');

        yPos += 16;
      });
    }

    // Footer
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).font('Helvetica').fillColor('#94A3B8');
      doc.text(`Page ${i + 1} of ${range.count}`, 50, 780, { align: 'center', width: 495 });
      doc.text(`Generated by Attend-Pro on ${new Date().toLocaleDateString('en-IN')}`, 50, 792, { align: 'center', width: 495 });
    }

    doc.end();
  });
}

module.exports = {
  exportClassReportExcel,
  exportStudentReportExcel,
  exportClassReportPDF,
  exportStudentReportPDF
};
