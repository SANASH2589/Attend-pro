const axios = require('axios');
const { supabaseAdmin } = require('../lib/supabase');

// ============================================================
// SMS PROVIDER ADAPTERS
// Swap provider by changing SMS_PROVIDER env var.
// Each adapter must implement: send(phone, message) => { success, gateway_ref, error }
// ============================================================

const msg91Adapter = {
  async send(phone, message) {
    try {
      const response = await axios.post(
        'https://control.msg91.com/api/v5/flow/',
        {
          template_id: process.env.MSG91_TEMPLATE_ID,
          sender: process.env.MSG91_SENDER_ID || 'ATNDPR',
          short_url: '0',
          mobiles: phone,
          VAR1: message
        },
        {
          headers: {
            'authkey': process.env.MSG91_AUTH_KEY,
            'Content-Type': 'application/json'
          }
        }
      );
      return {
        success: true,
        gateway_ref: response.data?.request_id || response.data?.message || 'msg91_ok'
      };
    } catch (err) {
      return {
        success: false,
        gateway_ref: null,
        error: err.response?.data?.message || err.message
      };
    }
  }
};

const twilioAdapter = {
  async send(phone, message) {
    // Placeholder for Twilio integration
    // Implement when switching to Twilio
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_NUMBER;
      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({ To: phone, From: from, Body: message }),
        { auth: { username: accountSid, password: authToken } }
      );
      return {
        success: true,
        gateway_ref: response.data?.sid || 'twilio_ok'
      };
    } catch (err) {
      return {
        success: false,
        gateway_ref: null,
        error: err.response?.data?.message || err.message
      };
    }
  }
};

const providers = {
  msg91: msg91Adapter,
  twilio: twilioAdapter
};

function getProvider() {
  const providerName = (process.env.SMS_PROVIDER || 'msg91').toLowerCase();
  return providers[providerName] || msg91Adapter;
}

function isSmsEnabled() {
  return process.env.SMS_ENABLED === 'true';
}

// ============================================================
// BUILD SMS MESSAGE
// ============================================================
function buildAbsentMessage(studentName, sessionType, sessionDate, className) {
  const formattedDate = new Date(sessionDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const sessionLabel = sessionType === 'morning' ? 'Morning' : 'Evening';
  return `Dear Parent, your ward ${studentName} was marked ABSENT for the ${sessionLabel} session on ${formattedDate} at ${className}. - Attend-Pro`;
}

// ============================================================
// CORE SMS FUNCTIONS
// ============================================================

/**
 * Send SMS notifications for all absent students in a session.
 * Never throws — catches per-student errors and continues.
 */
async function sendAbsenteeNotifications(sessionId) {
  const result = { sent: 0, failed: 0, logs: [] };

  try {
    // 1. Fetch attendance session
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('attendance_sessions')
      .select('id, class_id, session_date, session_type, classes(name)')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      console.error('[SMS] Session not found:', sessionId, sessErr?.message);
      return result;
    }

    // 2. Fetch absent records with student details
    const { data: absentRecords, error: recErr } = await supabaseAdmin
      .from('attendance_records')
      .select('student_id, student:students(id, full_name, parent_phone, roll_number)')
      .eq('session_id', sessionId)
      .eq('status', 'absent');

    if (recErr) {
      console.error('[SMS] Failed to fetch absent records:', recErr.message);
      return result;
    }

    if (!absentRecords || absentRecords.length === 0) {
      console.log('[SMS] No absent students for session:', sessionId);
      return result;
    }

    const provider = getProvider();
    const className = session.classes?.name || 'Unknown Class';

    // 3. Process each absent student
    for (const record of absentRecords) {
      const student = record.student;
      if (!student) continue;

      const phone = student.parent_phone;
      const message = buildAbsentMessage(
        student.full_name,
        session.session_type,
        session.session_date,
        className
      );

      let smsStatus = 'pending';
      let gatewayRef = null;

      try {
        if (!isSmsEnabled()) {
          // DEV MODE — simulate send
          console.log(`[SMS-SIM] → ${phone}: ${message}`);
          smsStatus = 'sent';
          gatewayRef = 'dev_simulation';
        } else {
          // PRODUCTION — call provider
          const sendResult = await provider.send(phone, message);
          if (sendResult.success) {
            smsStatus = 'sent';
            gatewayRef = sendResult.gateway_ref;
          } else {
            smsStatus = 'failed';
            console.error(`[SMS] Failed for ${student.full_name}:`, sendResult.error);
          }
        }
      } catch (sendErr) {
        smsStatus = 'failed';
        console.error(`[SMS] Exception sending to ${student.full_name}:`, sendErr.message);
      }

      // 4. Always insert sms_log regardless of outcome
      try {
        const { data: logEntry, error: logErr } = await supabaseAdmin
          .from('sms_logs')
          .insert({
            session_id: sessionId,
            student_id: student.id,
            phone_number: phone,
            message_body: message,
            gateway_ref: gatewayRef,
            status: smsStatus,
            retry_count: 0,
            sent_at: new Date().toISOString()
          })
          .select()
          .single();

        if (logErr) {
          console.error('[SMS] Failed to insert sms_log:', logErr.message);
        }

        if (smsStatus === 'sent') {
          result.sent++;
        } else {
          result.failed++;
        }

        result.logs.push({
          student_id: student.id,
          student_name: student.full_name,
          phone,
          status: smsStatus,
          gateway_ref: gatewayRef,
          log_id: logEntry?.id || null
        });
      } catch (logCatchErr) {
        console.error('[SMS] Exception inserting log:', logCatchErr.message);
        result.failed++;
      }
    }
  } catch (outerErr) {
    console.error('[SMS] Fatal error in sendAbsenteeNotifications:', outerErr.message);
  }

  console.log(`[SMS] Session ${sessionId} complete: ${result.sent} sent, ${result.failed} failed`);
  return result;
}

/**
 * Retry failed SMS logs for a session (max 3 retries per log).
 */
async function retrySmsForSession(sessionId) {
  const summary = { retried: 0, succeeded: 0, still_failed: 0 };

  try {
    // Fetch failed logs with retry_count < 3
    const { data: failedLogs, error: fetchErr } = await supabaseAdmin
      .from('sms_logs')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'failed')
      .lt('retry_count', 3);

    if (fetchErr) {
      console.error('[SMS-RETRY] Failed to fetch logs:', fetchErr.message);
      return summary;
    }

    if (!failedLogs || failedLogs.length === 0) {
      return summary;
    }

    const provider = getProvider();

    for (const log of failedLogs) {
      summary.retried++;

      let newStatus = 'failed';
      let newGatewayRef = log.gateway_ref;

      try {
        if (!isSmsEnabled()) {
          console.log(`[SMS-RETRY-SIM] → ${log.phone_number}: (retry #${log.retry_count + 1})`);
          newStatus = 'sent';
          newGatewayRef = 'dev_retry_simulation';
        } else {
          const sendResult = await provider.send(log.phone_number, log.message_body);
          if (sendResult.success) {
            newStatus = 'sent';
            newGatewayRef = sendResult.gateway_ref;
          }
        }
      } catch (err) {
        console.error(`[SMS-RETRY] Exception:`, err.message);
      }

      // Update the log entry
      const { error: updateErr } = await supabaseAdmin
        .from('sms_logs')
        .update({
          status: newStatus,
          retry_count: log.retry_count + 1,
          gateway_ref: newGatewayRef,
          sent_at: new Date().toISOString()
        })
        .eq('id', log.id);

      if (updateErr) {
        console.error('[SMS-RETRY] Failed to update log:', updateErr.message);
      }

      if (newStatus === 'sent') {
        summary.succeeded++;
      } else {
        summary.still_failed++;
      }
    }
  } catch (outerErr) {
    console.error('[SMS-RETRY] Fatal error:', outerErr.message);
  }

  return summary;
}

/**
 * Get all SMS logs for a session, joined with student details.
 */
async function getSmsLogsForSession(sessionId) {
  const { data, error } = await supabaseAdmin
    .from('sms_logs')
    .select('*, student:students(full_name, roll_number)')
    .eq('session_id', sessionId)
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('[SMS] Failed to fetch session logs:', error.message);
    return [];
  }

  return data || [];
}

module.exports = {
  sendAbsenteeNotifications,
  retrySmsForSession,
  getSmsLogsForSession
};
