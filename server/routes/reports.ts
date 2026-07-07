import express, { Request, Response, NextFunction } from 'express';
import authMiddleware from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { getFullStudentReport, getFullClassReport, getAdminOverviewReport } from '../lib/attendanceStats';
import { exportClassReportExcel, exportStudentReportExcel, exportClassReportPDF, exportStudentReportPDF } from '../lib/exportService';

const router = express.Router();

// Global auth
router.use(authMiddleware);

// Role checks
const superAdminOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user!.role !== 'super_admin') {
    res.status(403).json({ message: 'Access denied. Super Admin role required.' });
    return;
  }
  next();
};

/**
 * Helper: Validate staff has access to given class
 */
async function staffHasClassAccess(staffId: string, classId: string): Promise<boolean> {
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
const adminOrAssignedStaff = (classIdParam: string = 'classId') => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.user!.role === 'super_admin') { next(); return; }
  if (req.user!.role === 'staff') {
    const classId = req.params[classIdParam] || (req.query as any).class_id;
    if (classId && await staffHasClassAccess(req.user!.id, classId)) {
      next();
      return;
    }
  }
  res.status(403).json({ message: 'Access denied to this report.' });
};

// ============================================================
// REPORT DATA ROUTES
// ============================================================

/**
 * GET /api/v1/reports/overview
 * Admin only overview report
 */
router.get('/overview', superAdminOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const { date_from, date_to } = req.query as any;
    const report = await getAdminOverviewReport(date_from, date_to);
    res.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Reports] Overview error:', message);
    res.status(500).json({ message: 'Failed to generate overview report.' });
  }
});

/**
 * GET /api/v1/reports/student/:studentId
 * Student report — admin or assigned staff
 */
router.get('/student/:studentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.params.studentId as string;
    const { class_id, date_from, date_to } = req.query as any;

    // Staff access check
    if (req.user!.role === 'staff') {
      if (!class_id) {
        res.status(400).json({ message: 'class_id is required for staff reports.' });
        return;
      }
      if (!(await staffHasClassAccess(req.user!.id, class_id))) {
        res.status(403).json({ message: 'Access denied to this class.' });
        return;
      }
    }

    const report = await getFullStudentReport(studentId, class_id, date_from, date_to);

    // Strip parent_phone for staff
    if (req.user!.role === 'staff' && report.student) {
      delete (report.student as Record<string, unknown>).parent_phone;
    }

    res.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Reports] Student report error:', message);
    res.status(500).json({ message: 'Failed to generate student report.' });
  }
});

/**
 * GET /api/v1/reports/class/:classId
 * Class report — admin or assigned staff
 */
router.get('/class/:classId', adminOrAssignedStaff('classId'), async (req: Request, res: Response): Promise<void> => {
  try {
    const classId = req.params.classId as string;
    const { date_from, date_to } = req.query as any;
    const report = await getFullClassReport(classId, date_from, date_to);
    res.json(report);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Reports] Class report error:', message);
    res.status(500).json({ message: 'Failed to generate class report.' });
  }
});

// ============================================================
// EXPORT ROUTES
// ============================================================

/**
 * GET /api/v1/reports/export/class/:classId/excel
 */
router.get('/export/class/:classId/excel', adminOrAssignedStaff('classId'), async (req: Request, res: Response): Promise<void> => {
  try {
    const classId = req.params.classId as string;
    const { date_from, date_to } = req.query as any;

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
    res.send(Buffer.from(buffer));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Export] Class Excel error:', message);
    res.status(500).json({ message: 'Failed to generate Excel report.' });
  }
});

/**
 * GET /api/v1/reports/export/class/:classId/pdf
 */
router.get('/export/class/:classId/pdf', adminOrAssignedStaff('classId'), async (req: Request, res: Response): Promise<void> => {
  try {
    const classId = req.params.classId as string;
    const { date_from, date_to } = req.query as any;

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
    res.send(buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Export] Class PDF error:', message);
    res.status(500).json({ message: 'Failed to generate PDF report.' });
  }
});

/**
 * GET /api/v1/reports/export/student/:studentId/excel
 */
router.get('/export/student/:studentId/excel', async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.params.studentId as string;
    const { class_id, date_from, date_to } = req.query as any;

    // Staff access check
    if (req.user!.role === 'staff') {
      if (!class_id || !(await staffHasClassAccess(req.user!.id, class_id))) {
        res.status(403).json({ message: 'Access denied.' });
        return;
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
    res.send(Buffer.from(buffer));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Export] Student Excel error:', message);
    res.status(500).json({ message: 'Failed to generate Excel report.' });
  }
});

/**
 * GET /api/v1/reports/export/student/:studentId/pdf
 */
router.get('/export/student/:studentId/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.params.studentId as string;
    const { class_id, date_from, date_to } = req.query as any;

    if (req.user!.role === 'staff') {
      if (!class_id || !(await staffHasClassAccess(req.user!.id, class_id))) {
        res.status(403).json({ message: 'Access denied.' });
        return;
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
    res.send(buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Export] Student PDF error:', message);
    res.status(500).json({ message: 'Failed to generate PDF report.' });
  }
});

export default router;
