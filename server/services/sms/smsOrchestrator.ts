import { supabaseAdmin } from '../../lib/supabase';
import { sendSMS } from './sms.service';

export interface SmsNotificationSummary {
  total:   number;
  sent:    number;
  failed:  number;
  skipped: number;
  results: SmsNotificationResult[];
}

export interface SmsNotificationResult {
  studentId:   string;
  studentName: string;
  phone:       string | null;
  status:      'present' | 'absent';
  smsSent:     boolean;
  smsStatus:   'sent' | 'failed' | 'skipped';
  error?:      string;
  messageId?:  string;
}

export async function sendAttendanceNotifications(
  sessionId: string
): Promise<SmsNotificationSummary> {

  const summary: SmsNotificationSummary = {
    total:   0,
    sent:    0,
    failed:  0,
    skipped: 0,
    results: []
  };

  // ── 1. Fetch session + class details ──────────
  const { data: session, error: sessionError } =
    await supabaseAdmin
      .from('attendance_sessions')
      .select(`
        id,
        session_date,
        session_type,
        classes ( name )
      `)
      .eq('id', sessionId)
      .single();

  if (sessionError || !session) {
    console.error(
      '[SMS] Session not found:', sessionId
    );
    return summary;
  }

  const className   = 
    (session.classes as any)?.name || 'class';
  const sessionType = session.session_type;
  const sessionDate = new Date(session.session_date)
    .toLocaleDateString('en-IN', {
      day:   '2-digit',
      month: 'short',
      year:  'numeric'
    });

  // ── 2. Fetch ABSENT attendance records ────────
  // Only students marked as absent
  const { data: records, error: recordError } =
    await supabaseAdmin
      .from('attendance_records')
      .select(`
        student_id,
        status,
        students (
          id,
          full_name,
          parent_phone
        )
      `)
      .eq('session_id', sessionId)
      .eq('status', 'absent');

  if (recordError || !records?.length) {
    console.error(
      '[SMS] No records found for session:',
      sessionId, recordError?.message
    );
    return summary;
  }

  summary.total = records.length;

  console.log(
    `[SMS] Processing ${records.length} students ` +
    `for session ${sessionId}`
  );

  // ── 3. Send SMS to each student's parent ──────
  for (const record of records) {
    const student    = record.students as any;
    const attendance = record.status as 
                       'present' | 'absent';

    // Guard: missing student data
    if (!student) {
      summary.skipped++;
      summary.results.push({
        studentId:   record.student_id,
        studentName: 'Unknown',
        phone:       null,
        status:      attendance,
        smsSent:     false,
        smsStatus:   'skipped',
        error:       'Student data not found'
      });
      continue;
    }

    // Guard: missing or empty phone number
    if (!student.parent_phone?.trim()) {
      console.warn(
        '[SMS] No parent phone for:',
        student.full_name, '— skipping'
      );

      summary.skipped++;
      summary.results.push({
        studentId:   student.id,
        studentName: student.full_name,
        phone:       null,
        status:      attendance,
        smsSent:     false,
        smsStatus:   'skipped',
        error:       'No parent phone number'
      });

      // Log skipped to sms_logs
      const { error: logErr } = await supabaseAdmin.from('sms_logs').insert({
        session_id:   sessionId,
        student_id:   student.id,
        phone_number: null,
        message_body: null,
        gateway_ref:  null,
        status:       'FAILED',
        retry_count:  0,
        sent_at:      new Date().toISOString()
      });
      if (logErr) {
        console.error('[SMS] sms_logs insert error:', logErr.message);
      }

      continue;
    }

    // Build absent message
    const message = `Attend-Pro: Your ward ${student.full_name} ` +
      `was marked ABSENT for the ${sessionType} ` +
      `session on ${sessionDate} at ${className}. ` +
      `Please contact the college for details.`;

    // Send SMS via Twilio
    try {
      const smsResult = await sendSMS(
        student.parent_phone,
        message
      );

      // Write to sms_logs
      const { error: logErr } = await supabaseAdmin.from('sms_logs').insert({
        session_id:   sessionId,
        student_id:   student.id,
        phone_number: student.parent_phone,
        message_body: message,
        gateway_ref:  smsResult.messageId || null,
        status:       smsResult.success 
                      ? 'SENT' : 'FAILED',
        retry_count:  0,
        sent_at:      new Date().toISOString()
      });
      if (logErr) {
        console.error('[SMS] sms_logs insert error:', logErr.message);
      }

      const result: SmsNotificationResult = {
        studentId:   student.id,
        studentName: student.full_name,
        phone:       student.parent_phone,
        status:      attendance,
        smsSent:     smsResult.success,
        smsStatus:   smsResult.success 
                     ? 'sent' : 'failed',
        messageId:   smsResult.messageId,
        error:       smsResult.error
      };

      summary.results.push(result);

      if (smsResult.success) {
        console.log(
          `[SMS] ✅ ${attendance.toUpperCase()} ` +
          `SMS sent to ${student.full_name} ` +
          `(${student.parent_phone})`
        );
        summary.sent++;
      } else {
        console.error(
          `[SMS] ❌ Failed for ${student.full_name}:`,
          smsResult.error
        );
        summary.failed++;
      }

    } catch (err: any) {
      console.error(
        '[SMS] Exception for',
        student.full_name, ':', err.message
      );

      // Write exception-level failures to sms_logs so they appear in summaries
      const { error: catchLogErr } = await supabaseAdmin.from('sms_logs').insert({
        session_id:   sessionId,
        student_id:   student.id,
        phone_number: student.parent_phone || null,
        message_body: message,
        gateway_ref:  null,
        status:       'FAILED',
        retry_count:  0,
        sent_at:      new Date().toISOString()
      });
      if (catchLogErr) {
        console.error('[SMS] sms_logs insert error (catch):', catchLogErr.message);
      }

      summary.failed++;
      summary.results.push({
        studentId:   student.id,
        studentName: student.full_name,
        phone:       student.parent_phone,
        status:      attendance,
        smsSent:     false,
        smsStatus:   'failed',
        error:       err.message
      });
    }
  }

  // ── 4. Log final summary ───────────────────────
  console.log(
    '\n[SMS] ══════════════════════════════'
  );
  console.log('[SMS] Notification Summary:');
  console.log(`[SMS]   Total students : ${summary.total}`);
  console.log(`[SMS]   SMS sent       : ${summary.sent}`);
  console.log(`[SMS]   SMS failed     : ${summary.failed}`);
  console.log(`[SMS]   Skipped        : ${summary.skipped}`);
  console.log(
    '[SMS] ══════════════════════════════\n'
  );

  return summary;
}

// Keep backward compatibility
// Old name still works if referenced anywhere
export const sendAbsenteeNotifications = 
  sendAttendanceNotifications;
