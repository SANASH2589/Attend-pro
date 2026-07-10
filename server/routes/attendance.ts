import express, { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import authMiddleware from '../middleware/auth';
import { getStudentAttendanceStats, getClassAttendanceStats } from '../lib/attendanceStats';
import { sendAttendanceNotifications } from '../services/sms/smsOrchestrator';
import type { SessionState, SessionStatus, ClassConfig } from '../types';

const router = express.Router();

// Helper to convert time "HH:MM" to minutes from midnight
function timeToMinutes(t: string | null | undefined): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Helper to determine today's local date string YYYY-MM-DD
function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDbError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const dbErr = err as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const message = typeof dbErr.message === 'string' && dbErr.message.trim() ? dbErr.message.trim() : fallback;
    const details = typeof dbErr.details === 'string' && dbErr.details.trim() ? dbErr.details.trim() : '';
    const hint = typeof dbErr.hint === 'string' && dbErr.hint.trim() ? dbErr.hint.trim() : '';
    const code = typeof dbErr.code === 'string' && dbErr.code.trim() ? dbErr.code.trim() : '';

    const extra = [details, hint, code ? `code ${code}` : ''].filter(Boolean).join(' | ');
    return extra ? `${message} (${extra})` : message;
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }

  return fallback;
}

// Role authorization checks
const superAdminOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user!.role !== 'super_admin') {
    res.status(403).json({ message: 'Access denied. Super Admin role required.' });
    return;
  }
  next();
};

const staffOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user!.role !== 'staff') {
    res.status(403).json({ message: 'Access denied. Faculty/Staff role required.' });
    return;
  }
  next();
};

// Global authentication protect
router.use(authMiddleware);

// Helper to calculate gating status state
function evaluateSessionState(
  type: 'morning' | 'evening',
  classObj: Record<string, unknown>,
  todaySession: { id: string; is_locked: boolean; submitted_at?: string } | null | undefined,
  currentMinutes: number
): SessionState {
  const batchType = classObj.batch_type as string;
  const hasSession = (type === 'morning' && (batchType === 'morning' || batchType === 'both')) ||
                     (type === 'evening' && (batchType === 'evening' || batchType === 'both'));
                     
  if (!hasSession) {
    return {
      status: 'not_applicable',
      session_id: null,
      is_submitted: false,
      opens_at: null,
      locks_at: null
    };
  }

  const startStr = classObj[`${type}_start`] as string | null;
  const lockStr = classObj[`${type}_lock`] as string | null;
  const opens_at = startStr ? startStr.slice(0, 5) : null;
  const locks_at = lockStr ? lockStr.slice(0, 5) : null;

  if (todaySession) {
    return {
      status: 'locked',
      session_id: todaySession.id,
      is_submitted: true,
      is_locked: todaySession.is_locked,
      submitted_at: todaySession.submitted_at,
      opens_at,
      locks_at
    };
  }

  const startMin = timeToMinutes(startStr);
  const lockMin = timeToMinutes(lockStr);

  if (currentMinutes < startMin) {
    return {
      status: 'not_yet_open',
      session_id: null,
      is_submitted: false,
      opens_at,
      locks_at
    };
  } else if (currentMinutes >= startMin && currentMinutes < lockMin) {
    return {
      status: 'open',
      session_id: null,
      is_submitted: false,
      opens_at,
      locks_at
    };
  } else {
    return {
      status: 'closed',
      session_id: null,
      is_submitted: false,
      opens_at,
      locks_at
    };
  }
}

// ============================================================
// 1. STAFF ROUTES
// ============================================================

/**
 * GET /api/v1/attendance/my-classes
 * Returns classes assigned to the logged-in staff member, with today's session details.
 */
router.get('/my-classes', staffOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const todayStr = getTodayDateString();

    // 1. Fetch class mappings
    const { data: assignments, error: assignErr } = await supabaseAdmin
      .from('staff_class_assignments')
      .select('class_id, classes(*)')
      .eq('staff_id', req.user!.id);

    if (assignErr) throw assignErr;

    if (!assignments || assignments.length === 0) {
      res.json([]);
      return;
    }

    const assignedClasses = (assignments as any[]).map((a: any) => a.classes).filter(Boolean) as Record<string, unknown>[];
    const classIds = assignedClasses.map((c) => c.id as string);

    // 2. Fetch today's submission details
    const { data: todaySessions, error: sessErr } = await supabaseAdmin
      .from('attendance_sessions')
      .select('class_id, session_type, is_locked, id, submitted_at')
      .eq('session_date', todayStr)
      .in('class_id', classIds);

    if (sessErr) throw sessErr;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 3. Map status states
    const result = assignedClasses.map((c) => {
      const morningSession = (todaySessions || []).find((s: { class_id: string; session_type: string }) => s.class_id === c.id && s.session_type === 'morning');
      const eveningSession = (todaySessions || []).find((s: { class_id: string; session_type: string }) => s.class_id === c.id && s.session_type === 'evening');

      const morningState = evaluateSessionState('morning', c, morningSession as { id: string; is_locked: boolean; submitted_at?: string } | null, currentMinutes);
      const eveningState = evaluateSessionState('evening', c, eveningSession as { id: string; is_locked: boolean; submitted_at?: string } | null, currentMinutes);

      return {
        id: c.id,
        name: c.name,
        batch_type: c.batch_type,
        morning_start: c.morning_start,
        morning_lock: c.morning_lock,
        evening_start: c.evening_start,
        evening_lock: c.evening_lock,
        sessions: {
          morning: morningState,
          evening: eveningState
        }
      };
    });

    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching my-classes list:', message);
    res.status(500).json({ message: 'Failed to retrieve assigned class structures.' });
  }
});

/**
 * GET /api/v1/attendance/session-status/:classId
 * Evaluates morning/evening scheduling windows compared to server time.
 */
router.get('/session-status/:classId', staffOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const todayStr = getTodayDateString();

    const { data: classObj, error: classErr } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (classErr || !classObj) {
      res.status(404).json({ message: 'Class section configuration not found.' });
      return;
    }

    const { data: todaySessions, error: sessErr } = await supabaseAdmin
      .from('attendance_sessions')
      .select('id, session_type, is_locked, submitted_at')
      .eq('class_id', classId)
      .eq('session_date', todayStr);

    if (sessErr) throw sessErr;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const morningSession = (todaySessions || []).find((s: { session_type: string }) => s.session_type === 'morning');
    const eveningSession = (todaySessions || []).find((s: { session_type: string }) => s.session_type === 'evening');

    res.json({
      morning: evaluateSessionState('morning', classObj, morningSession as { id: string; is_locked: boolean; submitted_at?: string } | null, currentMinutes),
      evening: evaluateSessionState('evening', classObj, eveningSession as { id: string; is_locked: boolean; submitted_at?: string } | null, currentMinutes)
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error checking session window status:', message);
    res.status(500).json({ message: 'Failed to check class window status.' });
  }
});

/**
 * GET /api/v1/attendance/students/:classId
 * Returns assigned active student roster with statuses if session_id is active.
 */
router.get('/students/:classId', staffOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId } = req.params;
    const { session_id } = req.query as { session_id?: string };

    // 1. Fetch active students assigned to this section
    const { data: assignments, error: assignErr } = await supabaseAdmin
      .from('student_class_assignments')
      .select('student:students(*)')
      .eq('class_id', classId);

    if (assignErr) throw assignErr;

    const students = ((assignments || []) as any[])
      .map((a: any) => a.student)
      .filter((s: any): s is Record<string, unknown> => s !== null && s.is_active === true)
      .sort((a: any, b: any) => (a.roll_number as string).localeCompare(b.roll_number as string));

    // 2. Fetch record mappings if session is specified
    const recordMap: Record<string, string> = {};
    if (session_id) {
      const { data: records, error: recsErr } = await supabaseAdmin
        .from('attendance_records')
        .select('student_id, status')
        .eq('session_id', session_id);

      if (recsErr) throw recsErr;

      (records || []).forEach((r: { student_id: string; status: string }) => {
        recordMap[r.student_id] = r.status;
      });
    }

    const result = students.map((s: Record<string, unknown>) => ({
      id: s.id,
      roll_number: s.roll_number,
      full_name: s.full_name,
      status: recordMap[s.id as string] || 'present'
    }));

    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching student class list:', message);
    res.status(500).json({ message: 'Failed to retrieve student roster.' });
  }
});

/**
 * GET /api/v1/attendance/history
 * Returns paginated attendance sessions for the logged-in staff member's assigned classes.
 */
router.get('/history', staffOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const { class_id, date_from, date_to, page, limit } = req.query as {
      class_id?: string;
      date_from?: string;
      date_to?: string;
      page?: string;
      limit?: string;
    };

    const { data: assignments, error: assignErr } = await supabaseAdmin
      .from('staff_class_assignments')
      .select('class_id')
      .eq('staff_id', req.user!.id);

    if (assignErr) throw assignErr;

    const assignedClassIds = (assignments || []).map((row: { class_id: string }) => row.class_id);
    if (assignedClassIds.length === 0) {
      res.json({ sessions: [], total: 0, page: 1, limit: 20 });
      return;
    }

    let query = supabaseAdmin
      .from('attendance_sessions')
      .select(`
        id,
        class_id,
        session_date,
        session_type,
        is_locked,
        total_students,
        total_absent,
        submitted_at,
        classes (
          name
        ),
        profiles (
          full_name
        )
      `, { count: 'exact' })
      .in('class_id', assignedClassIds);

    if (class_id) query = query.eq('class_id', class_id);
    if (date_from) query = query.gte('session_date', date_from);
    if (date_to) query = query.lte('session_date', date_to);

    const pageNum = parseInt(page || '1') || 1;
    const limitNum = parseInt(limit || '20') || 20;
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    query = query
      .order('session_date', { ascending: false })
      .range(from, to);

    const { data: sessions, count, error } = await query;
    if (error) throw error;

    const mappedSessions = (sessions || []).map((s: Record<string, unknown>) => {
      const { profiles, ...rest } = s;
      return {
        ...rest,
        users: profiles
      };
    });

    res.json({
      sessions: mappedSessions,
      total: count || 0,
      page: pageNum,
      limit: limitNum
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error querying staff history sessions:', message);
    res.status(500).json({ message: 'Failed to retrieve attendance history.' });
  }
});

/**
 * POST /submit
 * Atomically submits attendance sheet for a class section.
 * Post-submission flow: save → lock → recalculate stats.
 */
router.post('/submit', staffOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const { class_id, session_type, absent_student_ids } = req.body as {
      class_id: string;
      session_type: string;
      absent_student_ids: string[];
    };

    if (!class_id || !session_type || !Array.isArray(absent_student_ids)) {
      res.status(400).json({ message: 'Missing required request body params.' });
      return;
    }

    // 1. Validate staff assignment
    const { data: hasAssign, error: assignErr } = await supabaseAdmin
      .from('staff_class_assignments')
      .select('id')
      .eq('staff_id', req.user!.id)
      .eq('class_id', class_id)
      .maybeSingle();

    if (assignErr) {
      throw new Error(formatDbError(assignErr, 'Failed to validate staff assignment.'));
    }

    if (!hasAssign) {
      res.status(403).json({ message: 'You are not assigned to instruct this class section.' });
      return;
    }

    // 2. Fetch class settings and re-verify time window is open
    const { data: classObj, error: classErr } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', class_id)
      .single();

    if (classErr) {
      throw new Error(formatDbError(classErr, 'Failed to load class configuration.'));
    }

    if (!classObj) {
      res.status(404).json({ message: 'Target class configuration not found.' });
      return;
    }

    const todayStr = getTodayDateString();
    
    // Check if session exists already
    const { data: existingSession } = await supabaseAdmin
      .from('attendance_sessions')
      .select('id')
      .eq('class_id', class_id)
      .eq('session_date', todayStr)
      .eq('session_type', session_type)
      .maybeSingle();

    if (existingSession) {
      res.status(409).json({ message: 'Attendance already submitted for this session' });
      return;
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const sessionState = evaluateSessionState(session_type as 'morning' | 'evening', classObj, null, currentMinutes);

    if (sessionState.status !== 'open') {
      res.status(400).json({ message: `Attendance window is not currently open. Status is: ${sessionState.status}` });
      return;
    }

    // 3. Fetch assigned students list — filtered by class_id
    const { data: studentAssigns, error: studErr } = await supabaseAdmin
      .from('student_class_assignments')
      .select('student_id')
      .eq('class_id', class_id);

    if (studErr) {
      throw new Error(formatDbError(studErr, 'Failed to load assigned students.'));
    }

    const assignedStudentIds = ((studentAssigns || []) as Array<{ student_id: string }>)
      .map((row) => row.student_id)
      .filter(Boolean);

    let activeStudentIds: string[] = [];
    if (assignedStudentIds.length > 0) {
      const { data: activeStudents, error: activeStudentsErr } = await supabaseAdmin
        .from('students')
        .select('id')
        .in('id', assignedStudentIds)
        .eq('is_active', true);

      if (activeStudentsErr) {
        throw new Error(formatDbError(activeStudentsErr, 'Failed to load active students.'));
      }

      activeStudentIds = (activeStudents || []).map((student: { id: string }) => student.id);
    }

    const totalStudents = activeStudentIds.length;

    // 4. Create attendance session — immediately locked to prevent edits
    console.log('[DEBUG SUBMIT] Step 10 — Inserting attendance_sessions:', JSON.stringify({
      class_id,
      staff_id: req.user!.id,
      created_by: req.user!.id,
      session_date: todayStr,
      session_type,
      is_locked: true,
      locked_at: now.toISOString(),
      total_students: totalStudents,
      total_absent: absent_student_ids.length,
      submitted_at: now.toISOString()
    }));
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('attendance_sessions')
      .insert({
        class_id,
        staff_id: req.user!.id,
        created_by: req.user!.id,
        session_date: todayStr,
        session_type,
        is_locked: true,
        locked_at: now.toISOString(),
        total_students: totalStudents,
        total_absent: absent_student_ids.length,
        submitted_at: now.toISOString()
      })
      .select()
      .single();

    if (sessErr) {
      console.error('[DEBUG SUBMIT] Step 10 FAILED — attendance_sessions INSERT error:', JSON.stringify({
        code: (sessErr as any).code,
        message: (sessErr as any).message,
        details: (sessErr as any).details,
        hint: (sessErr as any).hint
      }));
      if ((sessErr as { code?: string }).code === '23505') { // UNIQUE check
        res.status(409).json({ message: 'Attendance already submitted for this session' });
        return;
      }
      throw new Error(formatDbError(sessErr, 'Failed to create attendance session.'));
    }
    console.log('[DEBUG SUBMIT] Step 10 OK — session id:', session!.id);

    // 5. Bulk insert records
    const recordsToInsert = activeStudentIds.map((sid: string) => ({
      session_id: session!.id,
      student_id: sid,
      status: (absent_student_ids.includes(sid) ? 'absent' : 'present').toLowerCase(),
      recorded_by: req.user!.id
    }));

    if (recordsToInsert.length > 0) {
      console.log('[DEBUG SUBMIT] Step 11 — Inserting attendance_records:', JSON.stringify(recordsToInsert));
      const { error: insertErr } = await supabaseAdmin
        .from('attendance_records')
        .insert(recordsToInsert);

      if (insertErr) {
        console.error('[DEBUG SUBMIT] Step 11 FAILED — attendance_records INSERT error:', JSON.stringify({
          code: (insertErr as any).code,
          message: (insertErr as any).message,
          details: (insertErr as any).details,
          hint: (insertErr as any).hint
        }));
        // Rollback session insert if record insertions fail
        await supabaseAdmin.from('attendance_sessions').delete().eq('id', session!.id);
        throw new Error(formatDbError(insertErr, 'Failed to save attendance records.'));
      }
      console.log('[DEBUG SUBMIT] Step 11 OK — records inserted:', recordsToInsert.length);
    }

    // Step E: Recalculate attendance statistics
    try {
      const classStats = await getClassAttendanceStats(class_id);
      // Stats are calculated — consumers will read fresh data on next request
      console.log(`[Post-Submit Stats] Class ${class_id} stats recalculated.`);
    } catch (statsErr: unknown) {
      const statsMessage = statsErr instanceof Error ? statsErr.message : 'Unknown error';
      console.error('[Post-Submit Stats] Recalculation error:', statsMessage);
    }

    // Step F: Fire and forget SMS dispatch for locked session in the background
    sendAttendanceNotifications(session!.id)
      .then((summary) => {
        console.log(
          `[Attendance Submit] Lock SMS complete — ` +
          `Sent: ${summary.sent} ` +
          `Failed: ${summary.failed} ` +
          `Skipped: ${summary.skipped}`
        );
      })
      .catch((err) => {
        console.error(
          '[Attendance Submit] SMS notification error:',
          err.message
        );
      });

    res.status(201).json({
      session_id: session!.id,
      total_students: totalStudents,
      total_absent: absent_student_ids.length,
      submitted_at: session!.submitted_at,
      is_locked: true
    });
  } catch (err: unknown) {
    const message = formatDbError(err, 'Internal error during attendance submission.');
    console.error('Error submitting attendance sheet:', err);
    res.status(500).json({ message });
  }
});

// ============================================================
// 2. ADMIN MONITORING ROUTES
// ============================================================

/**
 * GET /api/v1/attendance/all-sessions
 * Returns paginated sessions history list for administration dashboard.
 */
router.get('/all-sessions', superAdminOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const { class_id, date_from, date_to, page, limit } = req.query as {
      class_id?: string;
      date_from?: string;
      date_to?: string;
      page?: string;
      limit?: string;
    };

    let query = supabaseAdmin
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
        ),
        profiles (
          full_name
        )
      `, { count: 'exact' });

    if (class_id) query = query.eq('class_id', class_id);
    if (date_from) query = query.gte('session_date', date_from);
    if (date_to) query = query.lte('session_date', date_to);

    const pageNum = parseInt(page || '1') || 1;
    const limitNum = parseInt(limit || '20') || 20;
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    query = query
      .order('session_date', { ascending: false })
      .range(from, to);

    const { data: sessions, count, error } = await query;
    if (error) throw error;

    // Map profiles back to users for frontend compatibility
    const mappedSessions = (sessions || []).map((s: Record<string, unknown>) => {
      const { profiles, ...rest } = s;
      return {
        ...rest,
        users: profiles
      };
    });

    res.json({
      sessions: mappedSessions,
      total: count || 0,
      page: pageNum,
      limit: limitNum
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error querying all sessions:', message);
    res.status(500).json({ message: 'Failed to retrieve attendance monitoring sessions.' });
  }
});

/**
 * GET /api/v1/attendance/session/:sessionId
 * Returns full session details and active student records.
 */
router.get('/session/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // 1. Fetch session structure
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('attendance_sessions')
      .select('*, classes(name), profiles(full_name)')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      res.status(404).json({ message: 'Attendance session not found.' });
      return;
    }

    // Role gate checks: staff can only view details if assigned to class
    if (req.user!.role === 'staff') {
      const { data: assign } = await supabaseAdmin
         .from('staff_class_assignments')
         .select('id')
         .eq('staff_id', req.user!.id)
         .eq('class_id', session.class_id)
         .maybeSingle();

      if (!assign) {
        res.status(403).json({ message: 'Access denied to this session log.' });
        return;
      }
    }

    // 2. Fetch student records
    const { data: records, error: recsErr } = await supabaseAdmin
      .from('attendance_records')
      .select('id, student_id, status, student:students(roll_number, full_name)')
      .eq('session_id', sessionId);

    if (recsErr) throw recsErr;

    // Map profiles back to users for frontend compatibility
    if (session) {
      session.users = session.profiles;
      delete session.profiles;
    }

    res.json({
      session,
      records: records || []
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching session detail:', message);
    res.status(500).json({ message: 'Failed to retrieve session detail log.' });
  }
});

/**
 * PUT /api/v1/attendance/session/:sessionId/lock
 * Manually locks a session (admin only).
 */
router.put('/session/:sessionId/lock', superAdminOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const { data: updated, error } = await supabaseAdmin
      .from('attendance_sessions')
      .update({
        is_locked: true,
        locked_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;

    // Fire and forget — non-blocking
    // Attendance lock completes instantly
    // SMS runs in background
    sendAttendanceNotifications(sessionId as string)
      .then((summary) => {
        console.log(
          `[Attendance] Lock SMS complete — ` +
          `Sent: ${summary.sent} ` +
          `Failed: ${summary.failed} ` +
          `Skipped: ${summary.skipped}`
        );
      })
      .catch((err) => {
        console.error(
          '[Attendance] SMS notification error:',
          err.message
        );
      });

    // Return lock success immediately
    // Do NOT await the SMS call
    res.status(200).json({
      success:    true,
      message:    'Session locked successfully.',
      session_id: sessionId,
      locked_at:  new Date().toISOString()
    });
    return;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error locking session:', message);
    res.status(500).json({ message: 'Failed to lock session logs.' });
  }
});

/**
 * GET /api/v1/attendance/session/:sessionId/sms-summary
 * Fetches log details and summary metrics of sent SMS for a locked session.
 */
router.get(
  '/session/:sessionId/sms-summary',
  superAdminOnly,
  async (req: Request, res: Response): Promise<void> => {
    const { sessionId } = req.params;

    const { data: logs, error } = await supabaseAdmin
      .from('sms_logs')
      .select(`
        id,
        phone_number,
        message_body,
        status,
        gateway_ref,
        sent_at,
        students (
          full_name,
          roll_number
        )
      `)
      .eq('session_id', sessionId)
      .order('sent_at', { ascending: false });

    if (error) {
      res.status(500).json({
        message: 'Failed to fetch SMS summary'
      });
      return;
    }

    const summary = {
      total:     logs?.length || 0,
      sent:      logs?.filter(
                   l => l.status?.toLowerCase() === 'sent'
                 ).length || 0,
      failed:    logs?.filter(
                   l => l.status?.toLowerCase() === 'failed'
                 ).length || 0,
      skipped:   logs?.filter(
                   l => !l.phone_number
                 ).length || 0,
      logs:      logs || []
    };

    res.status(200).json(summary);
  }
);

/**
 * PUT /api/v1/attendance/session/:sessionId/unlock
 * Manually unlocks a session (admin only). Registers audit logs.
 */
router.put('/session/:sessionId/unlock', superAdminOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const { data: updated, error } = await supabaseAdmin
      .from('attendance_sessions')
      .update({
        is_locked: false,
        locked_at: null
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;

    // Log the action to audit_log
    const { error: logErr } = await supabaseAdmin
      .from('audit_log')
      .insert({
        action: 'unlock_session',
        actor_id: req.user!.id,
        session_id: sessionId
      });

    if (logErr) {
      console.warn('Failed to insert audit log entry:', logErr.message);
    }

    res.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error unlocking session:', message);
    res.status(500).json({ message: 'Failed to unlock session logs.' });
  }
});

// ============================================================
// 3. STATS ROUTES
// ============================================================

router.get('/stats/student/:studentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.params.studentId as string;
    const { class_id, date_from, date_to } = req.query as any;

    const stats = await getStudentAttendanceStats(studentId, class_id, date_from, date_to);
    res.json(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error calculating student stats:', message);
    res.status(500).json({ message: 'Failed to calculate student attendance statistics.' });
  }
});

router.get('/stats/class/:classId', async (req: Request, res: Response): Promise<void> => {
  try {
    const classId = req.params.classId as string;
    const { date_from, date_to } = req.query as any;

    const stats = await getClassAttendanceStats(classId, date_from, date_to);
    res.json(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error calculating class stats:', message);
    res.status(500).json({ message: 'Failed to calculate class attendance statistics.' });
  }
});

export default router;
