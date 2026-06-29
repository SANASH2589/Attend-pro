const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { supabaseAdmin } = require('../lib/supabase');
const { getFullStudentReport, getFullClassReport, getAdminOverviewReport } = require('../lib/attendanceStats');
const { exportClassReportExcel, exportStudentReportExcel, exportClassReportPDF, exportStudentReportPDF } = require('../lib/exportService');

// Global auth
router.use(authMiddleware);

// Role checks
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin role required.' });
  }
  next();
};

/**
 * Helper: Validate staff has access to given class
 */
async function staffHasClassAccess(staffId, classId) {
  const { data } = await supabaseAdmin
    .from('staff_class_assignments')
    .select('id')
    .eq('staff_id', staffId)
    .eq('class_id', classId)
    .maybeSingle();
  return !!data;
}

/**
 * Middleware: admin or staff-with-class-access
 */
const adminOrAssignedStaff = (classIdParam = 'classId') => async (req, res, next) => {
  if (req.user.role === 'super_admin') return next();
  if (req.user.role === 'staff') {
    const classId = req.params[classIdParam] || req.query.class_id;
    if (classId && await staffHasClassAccess(req.user.id, classId)) {
      return next();
    }
  }
  return res.status(403).json({ message: 'Access denied to this report.' });
};

// ============================================================
// REPORT DATA ROUTES
// ============================================================

/**
 * GET /api/v1/reports/overview
 * Admin only overview report
 */
router.get('/overview', superAdminOnly, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const report = await getAdminOverviewReport(date_from, date_to);
    return res.json(report);
  } catch (err) {
    console.error('[Reports] Overview error:', err.message);
    return res.status(500).json({ message: 'Failed to generate overview report.' });
  }
});

/**
 * GET /api/v1/reports/student/:studentId
 * Student report — admin or assigned staff
 */
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { class_id, date_from, date_to } = req.query;

    // Staff access check
    if (req.user.role === 'staff') {
      if (!class_id) {
        return res.status(400).json({ message: 'class_id is required for staff reports.' });
      }
      if (!(await staffHasClassAccess(req.user.id, class_id))) {
        return res.status(403).json({ message: 'Access denied to this class.' });
      }
    }

    const report = await getFullStudentReport(studentId, class_id, date_from, date_to);

    // Strip parent_phone for staff
    if (req.user.role === 'staff' && report.student) {
      delete report.student.parent_phone;
    }

    return res.json(report);
  } catch (err) {
    console.error('[Reports] Student report error:', err.message);
    return res.status(500).json({ message: 'Failed to generate student report.' });
  }
});

/**
 * GET /api/v1/reports/class/:classId
 * Class report — admin or assigned staff
 */
router.get('/class/:classId', adminOrAssignedStaff('classId'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { date_from, date_to } = req.query;
    const report = await getFullClassReport(classId, date_from, date_to);
    return res.json(report);
  } catch (err) {
    console.error('[Reports] Class report error:', err.message);
    return res.status(500).json({ message: 'Failed to generate class report.' });
  }
});

// ============================================================
// EXPORT ROUTES
// ============================================================

/**
 * GET /api/v1/reports/export/class/:classId/excel
 */
router.get('/export/class/:classId/excel', adminOrAssignedStaff('classId'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { date_from, date_to } = req.query;

    const buffer = await exportClassReportExcel(classId, date_from, date_to);

    // Get class name for filename
    const { data: cls } = await supabaseAdmin
      .from('classes')
      .select('name')
      .eq('id', classId)
      .single();
    const safeName = (cls?.name || 'class').replace(/[^a-zA-Z0-9]/g, '-');
    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${safeName}-${dateStr}.xlsx"`);
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[Export] Class Excel error:', err.message);
    return res.status(500).json({ message: 'Failed to generate Excel report.' });
  }
});

/**
 * GET /api/v1/reports/export/class/:classId/pdf
 */
router.get('/export/class/:classId/pdf', adminOrAssignedStaff('classId'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { date_from, date_to } = req.query;

    const buffer = await exportClassReportPDF(classId, date_from, date_to);

    const { data: cls } = await supabaseAdmin
      .from('classes')
      .select('name')
      .eq('id', classId)
      .single();
    const safeName = (cls?.name || 'class').replace(/[^a-zA-Z0-9]/g, '-');
    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${safeName}-${dateStr}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    console.error('[Export] Class PDF error:', err.message);
    return res.status(500).json({ message: 'Failed to generate PDF report.' });
  }
});

/**
 * GET /api/v1/reports/export/student/:studentId/excel
 */
router.get('/export/student/:studentId/excel', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { class_id, date_from, date_to } = req.query;

    // Staff access check
    if (req.user.role === 'staff') {
      if (!class_id || !(await staffHasClassAccess(req.user.id, class_id))) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    }

    const buffer = await exportStudentReportExcel(studentId, class_id, date_from, date_to);

    const { data: student } = await supabaseAdmin
      .from('students')
      .select('full_name')
      .eq('id', studentId)
      .single();
    const safeName = (student?.full_name || 'student').replace(/[^a-zA-Z0-9]/g, '-');
    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${safeName}-${dateStr}.xlsx"`);
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[Export] Student Excel error:', err.message);
    return res.status(500).json({ message: 'Failed to generate Excel report.' });
  }
});

/**
 * GET /api/v1/reports/export/student/:studentId/pdf
 */
router.get('/export/student/:studentId/pdf', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { class_id, date_from, date_to } = req.query;

    if (req.user.role === 'staff') {
      if (!class_id || !(await staffHasClassAccess(req.user.id, class_id))) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    }

    const buffer = await exportStudentReportPDF(studentId, class_id, date_from, date_to);

    const { data: student } = await supabaseAdmin
      .from('students')
      .select('full_name')
      .eq('id', studentId)
      .single();
    const safeName = (student?.full_name || 'student').replace(/[^a-zA-Z0-9]/g, '-');
    const dateStr = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${safeName}-${dateStr}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    console.error('[Export] Student PDF error:', err.message);
    return res.status(500).json({ message: 'Failed to generate PDF report.' });
  }
});

module.exports = router;
