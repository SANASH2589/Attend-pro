const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');
const { sendAbsenteeNotifications, retrySmsForSession, getSmsLogsForSession } = require('../services/smsService');

// Role checks
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin role required.' });
  }
  next();
};


// ============================================================
// ALL ROUTES BELOW REQUIRE JWT AUTH
// ============================================================
router.use(authMiddleware);

// ============================================================
// GET /api/v1/sms/logs
// Admin only — paginated, filterable SMS logs
// ============================================================
router.get('/logs', superAdminOnly, async (req, res) => {
  try {
    const { session_id, status, date_from, date_to, page, limit: limitParam } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limitParam) || 30;
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = supabaseAdmin
      .from('sms_logs')
      .select(`
        *,
        student:students(full_name, roll_number),
        session:attendance_sessions(
          session_date,
          session_type,
          classes(name)
        )
      `, { count: 'exact' });

    if (session_id) query = query.eq('session_id', session_id);
    if (status) query = query.eq('status', status);
    if (date_from) query = query.gte('sent_at', `${date_from}T00:00:00`);
    if (date_to) query = query.lte('sent_at', `${date_to}T23:59:59`);

    query = query
      .order('sent_at', { ascending: false })
      .range(from, to);

    const { data: logs, count, error } = await query;
    if (error) throw error;

    return res.json({
      logs: logs || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum
    });
  } catch (err) {
    console.error('[SMS Route] Logs fetch error:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve SMS logs.' });
  }
});

// ============================================================
// GET /api/v1/sms/logs/:sessionId
// Admin only — all logs for a specific session
// ============================================================
router.get('/logs/:sessionId', superAdminOnly, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const logs = await getSmsLogsForSession(sessionId);
    return res.json(logs);
  } catch (err) {
    console.error('[SMS Route] Session logs error:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve session SMS logs.' });
  }
});

// ============================================================
// POST /api/v1/sms/retry/:sessionId
// Admin only — retry failed SMS logs for session
// ============================================================
router.post('/retry/:sessionId', superAdminOnly, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const summary = await retrySmsForSession(sessionId);
    return res.json(summary);
  } catch (err) {
    console.error('[SMS Route] Retry error:', err.message);
    return res.status(500).json({ message: 'Failed to retry SMS notifications.' });
  }
});

// ============================================================
// GET /api/super-admin/sms/stats
// Admin only — SMS statistics
// ============================================================
router.get('/stats', superAdminOnly, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const weekAgo = d.toISOString().split('T')[0];

    const { data: todayLogs, error: todayErr } = await supabaseAdmin
      .from('sms_logs')
      .select('status')
      .gte('sent_at', `${todayStr}T00:00:00`);

    if (todayErr) throw todayErr;

    const { data: weekLogs, error: weekErr } = await supabaseAdmin
      .from('sms_logs')
      .select('status')
      .gte('sent_at', `${weekAgo}T00:00:00`);

    if (weekErr) throw weekErr;

    const sentToday = (todayLogs || []).filter(l => l.status === 'sent' || l.status === 'delivered').length;
    const failedToday = (todayLogs || []).filter(l => l.status === 'failed').length;
    const totalWeek = (weekLogs || []).length;

    return res.json({
      sentToday,
      failedToday,
      totalWeek
    });
  } catch (err) {
    console.error('[SMS Route] Stats fetch error:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve SMS stats.' });
  }
});

module.exports = router;
