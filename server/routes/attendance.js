const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');
const { getStudentAttendanceStats, getClassAttendanceStats } = require('../lib/attendanceStats');
const { sendAbsenteeNotifications } = require('../services/smsService');

// Helper to convert time "HH:MM" to minutes from midnight
function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Helper to determine today's local date string YYYY-MM-DD
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Role authorization checks
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin role required.' });
  }
  next();
};

const staffOnly = (req, res, next) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Access denied. Faculty/Staff role required.' });
  }
  next();
};

// Global authentication protect
router.use(authMiddleware);

// Helper to calculate gating status state
function evaluateSessionState(type, classObj, todaySession, currentMinutes) {
  const batchType = classObj.batch_type;
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

  const startStr = classObj[`${type}_start`];
  const lockStr = classObj[`${type}_lock`];
  const opens_at = startStr ? startStr.slice(0, 5) : null;
  const locks_at = lockStr ? lockStr.slice(0, 5) : null;

  if (todaySession) {
    return {
      status: todaySession.is_locked ? 'locked' : 'locked', // Re-take blocked if submitted
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
router.get('/my-classes', staffOnly, async (req, res) => {
  try {
    const todayStr = getTodayDateString();

    // 1. Fetch class mappings
    const { data: assignments, error: assignErr } = await supabaseAdmin
      .from('staff_class_assignments')
      .select('class_id, classes(*)')
      .eq('staff_id', req.user.id);

    if (assignErr) throw assignErr;

    if (!assignments || assignments.length === 0) {
      return res.json([]);
    }

    const assignedClasses = assignments.map(a => a.classes).filter(Boolean);
    const classIds = assignedClasses.map(c => c.id);

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
    const result = assignedClasses.map(c => {
      const morningSession = (todaySessions || []).find(s => s.class_id === c.id && s.session_type === 'morning');
      const eveningSession = (todaySessions || []).find(s => s.class_id === c.id && s.session_type === 'evening');

      const morningState = evaluateSessionState('morning', c, morningSession, currentMinutes);
      const eveningState = evaluateSessionState('evening', c, eveningSession, currentMinutes);

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

    return res.json(result);
  } catch (err) {
    console.error('Error fetching my-classes list:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve assigned class structures.' });
  }
});

/**
 * GET /api/v1/attendance/session-status/:classId
 * Evaluates morning/evening scheduling windows compared to server time.
 */
router.get('/session-status/:classId', staffOnly, async (req, res) => {
  try {
    const { classId } = req.params;
    const todayStr = getTodayDateString();

    const { data: classObj, error: classErr } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (classErr || !classObj) {
      return res.status(404).json({ message: 'Class section configuration not found.' });
    }

    const { data: todaySessions, error: sessErr } = await supabaseAdmin
      .from('attendance_sessions')
      .select('id, session_type, is_locked, submitted_at')
      .eq('class_id', classId)
      .eq('session_date', todayStr);

    if (sessErr) throw sessErr;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const morningSession = (todaySessions || []).find(s => s.session_type === 'morning');
    const eveningSession = (todaySessions || []).find(s => s.session_type === 'evening');

    return res.json({
      morning: evaluateSessionState('morning', classObj, morningSession, currentMinutes),
      evening: evaluateSessionState('evening', classObj, eveningSession, currentMinutes)
    });
  } catch (err) {
    console.error('Error checking session window status:', err.message);
    return res.status(500).json({ message: 'Failed to check class window status.' });
  }
});

/**
 * GET /api/v1/attendance/students/:classId
 * Returns assigned active student roster with statuses if session_id is active.
 */
router.get('/students/:classId', staffOnly, async (req, res) => {
  try {
    const { classId } = req.params;
    const { session_id } = req.query;

    // 1. Fetch active students assigned to this section
    const { data: assignments, error: assignErr } = await supabaseAdmin
      .from('student_class_assignments')
      .select('student:students(*)')
      .eq('class_id', classId);

    if (assignErr) throw assignErr;

    const students = (assignments || [])
      .map(a => a.student)
      .filter(s => s && s.is_active)
      .sort((a, b) => a.roll_number.localeCompare(b.roll_number));

    // 2. Fetch record mappings if session is specified
    const recordMap = {};
    if (session_id) {
      const { data: records, error: recsErr } = await supabaseAdmin
        .from('attendance_records')
        .select('student_id, status')
        .eq('session_id', session_id);

      if (recsErr) throw recsErr;

      (records || []).forEach(r => {
        recordMap[r.student_id] = r.status;
      });
    }

    const result = students.map(s => ({
      id: s.id,
      roll_number: s.roll_number,
      full_name: s.full_name,
      status: recordMap[s.id] || 'present'
    }));

    return res.json(result);
  } catch (err) {
    console.error('Error fetching student class list:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve student roster.' });
  }
});

/**
 * POST /api/v1/attendance/submit
 * Atomically submits attendance sheet for a class section.
 */
router.post('/submit', staffOnly, async (req, res) => {
  try {
    const { class_id, session_type, absent_student_ids } = req.body;

    if (!class_id || !session_type || !Array.isArray(absent_student_ids)) {
      return res.status(400).json({ message: 'Missing required request body params.' });
    }

    // 1. Validate staff assignment
    const { data: hasAssign, error: assignErr } = await supabaseAdmin
      .from('staff_class_assignments')
      .select('id')
      .eq('staff_id', req.user.id)
      .eq('class_id', class_id)
      .maybeSingle();

    if (assignErr || !hasAssign) {
      return res.status(403).json({ message: 'You are not assigned to instruct this class section.' });
    }

    // 2. Fetch class settings and re-verify time window is open
    const { data: classObj, error: classErr } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', class_id)
      .single();

    if (classErr || !classObj) {
      return res.status(404).json({ message: 'Target class configuration not found.' });
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
      return res.status(409).json({ message: 'Attendance already submitted for this session' });
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const sessionState = evaluateSessionState(session_type, classObj, null, currentMinutes);

    if (sessionState.status !== 'open') {
      return res.status(400).json({ message: `Attendance window is not currently open. Status is: ${sessionState.status}` });
    }

    // 3. Fetch assigned students list
    const { data: studentAssigns, error: studErr } = await supabaseAdmin
      .from('student_class_assignments')
      .select('student:students(id, is_active)');

    if (studErr) throw studErr;

    const activeStudentIds = (studentAssigns || [])
      .map(a => a.student)
      .filter(s => s && s.is_active)
      .map(s => s.id);

    const totalStudents = activeStudentIds.length;

    // 4. Create attendance session
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('attendance_sessions')
      .insert({
        class_id,
        staff_id: req.user.id,
        session_date: todayStr,
        session_type,
        is_locked: false,
        total_students: totalStudents,
        total_absent: absent_student_ids.length,
        submitted_at: now.toISOString()
      })
      .select()
      .single();

    if (sessErr) {
      if (sessErr.code === '23505') { // UNIQUE check
        return res.status(409).json({ message: 'Attendance already submitted for this session' });
      }
      throw sessErr;
    }

    // 5. Bulk insert records
    const recordsToInsert = activeStudentIds.map(sid => ({
      session_id: session.id,
      student_id: sid,
      status: absent_student_ids.includes(sid) ? 'absent' : 'present'
    }));

    if (recordsToInsert.length > 0) {
      const { error: insertErr } = await supabaseAdmin
        .from('attendance_records')
        .insert(recordsToInsert);

      if (insertErr) {
        // Rollback session insert if record insertions fail
        await supabaseAdmin.from('attendance_sessions').delete().eq('id', session.id);
        throw insertErr;
      }
    }

    return res.status(201).json({
      session_id: session.id,
      total_students: totalStudents,
      total_absent: absent_student_ids.length,
      submitted_at: session.submitted_at
    });
  } catch (err) {
    console.error('Error submitting attendance sheet:', err.message);
    return res.status(500).json({ message: err.message || 'Internal error during attendance submission.' });
  }
});

// ============================================================
// 2. ADMIN MONITORING ROUTES
// ============================================================

/**
 * GET /api/v1/attendance/all-sessions
 * Returns paginated sessions history list for administration dashboard.
 */
router.get('/all-sessions', superAdminOnly, async (req, res) => {
  try {
    const { class_id, date_from, date_to, page, limit } = req.query;

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
        users (
          full_name
        )
      `, { count: 'exact' });

    if (class_id) query = query.eq('class_id', class_id);
    if (date_from) query = query.gte('session_date', date_from);
    if (date_to) query = query.lte('session_date', date_to);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    query = query
      .order('session_date', { ascending: false })
      .range(from, to);

    const { data: sessions, count, error } = await query;
    if (error) throw error;

    return res.json({
      sessions: sessions || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum
    });
  } catch (err) {
    console.error('Error querying all sessions:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve attendance monitoring sessions.' });
  }
});

/**
 * GET /api/v1/attendance/session/:sessionId
 * Returns full session details and active student records.
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // 1. Fetch session structure
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('attendance_sessions')
      .select('*, classes(name), users(full_name)')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      return res.status(404).json({ message: 'Attendance session not found.' });
    }

    // Role gate checks: staff can only view details if assigned to class
    if (req.user.role === 'staff') {
      const { data: assign } = await supabaseAdmin
        .from('staff_class_assignments')
        .select('id')
        .eq('staff_id', req.user.id)
        .eq('class_id', session.class_id)
        .maybeSingle();

      if (!assign) {
        return res.status(403).json({ message: 'Access denied to this session log.' });
      }
    }

    // 2. Fetch student records
    const { data: records, error: recsErr } = await supabaseAdmin
      .from('attendance_records')
      .select('id, student_id, status, student:students(roll_number, full_name)')
      .eq('session_id', sessionId);

    if (recsErr) throw recsErr;

    return res.json({
      session,
      records: records || []
    });
  } catch (err) {
    console.error('Error fetching session detail:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve session detail log.' });
  }
});

/**
 * PUT /api/v1/attendance/session/:sessionId/lock
 * Manually locks a session (admin only).
 */
router.put('/session/:sessionId/lock', superAdminOnly, async (req, res) => {
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

    // Fire-and-forget: trigger SMS notifications for absent students
    sendAbsenteeNotifications(sessionId).catch(smsErr => {
      console.error('[SMS] Background notification error on lock:', smsErr.message);
    });

    return res.json(updated);
  } catch (err) {
    console.error('Error locking session:', err.message);
    return res.status(500).json({ message: 'Failed to lock session logs.' });
  }
});

/**
 * PUT /api/v1/attendance/session/:sessionId/unlock
 * Manually unlocks a session (admin only). Registers audit logs.
 */
router.put('/session/:sessionId/unlock', superAdminOnly, async (req, res) => {
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
        actor_id: req.user.id,
        session_id: sessionId
      });

    if (logErr) {
      console.warn('Failed to insert audit log entry:', logErr.message);
    }

    return res.json(updated);
  } catch (err) {
    console.error('Error unlocking session:', err.message);
    return res.status(500).json({ message: 'Failed to unlock session logs.' });
  }
});

// ============================================================
// 3. STATS ROUTES
// ============================================================

router.get('/stats/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { class_id, date_from, date_to } = req.query;

    const stats = await getStudentAttendanceStats(studentId, class_id, date_from, date_to);
    return res.json(stats);
  } catch (err) {
    console.error('Error calculating student stats:', err.message);
    return res.status(500).json({ message: 'Failed to calculate student attendance statistics.' });
  }
});

router.get('/stats/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const { date_from, date_to } = req.query;

    const stats = await getClassAttendanceStats(classId, date_from, date_to);
    return res.json(stats);
  } catch (err) {
    console.error('Error calculating class stats:', err.message);
    return res.status(500).json({ message: 'Failed to calculate class attendance statistics.' });
  }
});

module.exports = router;
