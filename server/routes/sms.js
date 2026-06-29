const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');
const { sendAbsenteeNotifications, retrySmsForSession, getSmsLogsForSession } = require('../services/smsService');

// ============================================================
// INTERNAL SERVICE KEY AUTH (for Edge Function cron calls)
// ============================================================
const internalAuth = (req, res, next) => {
  const serviceKey = req.headers['x-service-key'];
  const expectedKey = process.env.INTERNAL_SERVICE_KEY;

  if (!expectedKey || serviceKey !== expectedKey) {
    return res.status(401).json({ message: 'Invalid or missing service key.' });
  }
  next();
};

// Role checks
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin role required.' });
  }
  next();
};

// ============================================================
// INTERNAL ROUTE — Used by Edge Function cron
// POST /api/v1/sms/session/:sessionId/notify
// ============================================================
router.post('/session/:sessionId/notify', internalAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await sendAbsenteeNotifications(sessionId);
    return res.json(result);
  } catch (err) {
    console.error('[SMS Route] Notify error:', err.message);
    return res.status(500).json({ message: 'Failed to process SMS notifications.' });
  }
});

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

module.exports = router;
