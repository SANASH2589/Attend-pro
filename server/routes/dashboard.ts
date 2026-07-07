import express, { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import authMiddleware from '../middleware/auth';

const router = express.Router();

// Middleware to ensure user is super_admin
const superAdminOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user!.role !== 'super_admin') {
    res.status(403).json({ message: 'Access denied. Super Admin role required.' });
    return;
  }
  next();
};

// Mount auth and admin check middleware for all routes in this file
router.use(authMiddleware);
router.use(superAdminOnly);

/**
 * GET /api/super-admin/dashboard/stats
 * Returns aggregate statistics for the admin dashboard.
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Count active students
    const { count: studentCount, error: studErr } = await supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (studErr) throw studErr;

    // 2. Count active staff
    const { count: staffCount, error: staffErr } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'STAFF')
      .eq('status', 'ACTIVE');

    if (staffErr) throw staffErr;

    // 3. Count classes
    const { count: classCount, error: classErr } = await supabaseAdmin
      .from('classes')
      .select('*', { count: 'exact', head: true });

    if (classErr) throw classErr;

    // 4. Fetch recent 10 attendance sessions
    const { data: sessions, error: sessionErr } = await supabaseAdmin
      .from('attendance_sessions')
      .select(`
        id,
        session_date,
        session_type,
        is_locked,
        total_students,
        total_absent,
        submitted_at,
        classes (
          name
        )
      `)
      .order('session_date', { ascending: false })
      .order('submitted_at', { ascending: false })
      .limit(10);

    if (sessionErr) throw sessionErr;

    res.json({
      stats: {
        students: studentCount || 0,
        staff: staffCount || 0,
        classes: classCount || 0
      },
      recentSessions: sessions || []
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching dashboard stats:', message);
    res.status(500).json({ message: 'Failed to retrieve dashboard statistics.' });
  }
});

export default router;
