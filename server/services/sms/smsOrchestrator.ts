import { supabaseAdmin } from '../../lib/supabase';
import { sendAbsentSMS } from './sms.service';

export async function sendAbsenteeNotifications(
  sessionId: string
): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  const results = { sent: 0, failed: 0, skipped: 0 };

  // ── 1. Fetch session + class info ─────────────
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
      '[SMS Orchestrator] Session not found:',
      sessionId, sessionError?.message
    );
    return results;
  }

  const className   = (session.classes as any)?.name
                      || 'class';
  const sessionDate = session.session_date;
  const sessionType = session.session_type;

  // ── 2. Fetch all absent students ─────────────
  const { data: absentRecords, error: recordError } =
    await supabaseAdmin
      .from('attendance_records')
      .select(`
        student_id,
        students (
          id,
          full_name,
          parent_phone
        )
      `)
      .eq('session_id', sessionId)
      .eq('status', 'absent');

  if (recordError) {
    console.error(
      '[SMS Orchestrator] Failed to fetch records:',
      recordError.message
    );
    return results;
  }

  if (!absentRecords || absentRecords.length === 0) {
    console.log(
      '[SMS Orchestrator] No absent students ' +
      'for session:', sessionId
    );
    return results;
  }

  console.log(
    `[SMS Orchestrator] Processing ${absentRecords.length}` +
    ` absent students for session ${sessionId}`
  );

  // ── 3. Send SMS to each absent student ────────
  for (const record of absentRecords) {
    const student = record.students as any;

    // Guard: no student data
    if (!student) {
      console.error(
        '[SMS Orchestrator] Missing student data ' +
        'for record, student_id:', record.student_id
      );
      results.skipped++;
      continue;
    }

    // Guard: no parent phone
    if (!student.parent_phone ||
         student.parent_phone.trim() === '') {
      console.warn(
        '[SMS Orchestrator] No parent phone for:',
        student.full_name, '— skipping'
      );

      // Log as skipped in sms_logs
      await supabaseAdmin.from('sms_logs').insert({
        session_id:   sessionId,
        student_id:   student.id,
        phone_number: null,
        message_body: null,
        gateway_ref:  null,
        status:       'failed',
        retry_count:  0,
        sent_at:      new Date().toISOString()
      });

      results.skipped++;
      continue;
    }

    // ── Send the SMS ────────────────────────────
    const detail =
      `ward ${student.full_name} was marked ABSENT ` +
      `for the ${sessionType} session on ` +
      `${new Date(sessionDate).toLocaleDateString(
        'en-IN', {
          day:   '2-digit',
          month: 'short',
          year:  'numeric'
        }
      )} at ${className}`;

    try {
      const smsResult = await sendAbsentSMS(
        student.parent_phone,
        student.full_name,
        sessionType,
        sessionDate,
        className
      );

      // Write to sms_logs regardless of outcome
      await supabaseAdmin.from('sms_logs').insert({
        session_id:   sessionId,
        student_id:   student.id,
        phone_number: student.parent_phone,
        message_body: detail,
        gateway_ref:  smsResult.messageId || null,
        status:       smsResult.success
                      ? 'sent' : 'failed',
        retry_count:  0,
        sent_at:      new Date().toISOString()
      });

      if (smsResult.success) {
        console.log(
          '[SMS Orchestrator] ✅ Sent to',
          student.full_name,
          student.parent_phone
        );
        results.sent++;
      } else {
        console.error(
          '[SMS Orchestrator] ❌ Failed for',
          student.full_name, ':', smsResult.error
        );
        results.failed++;
      }

    } catch (err: any) {
      console.error(
        '[SMS Orchestrator] Exception for',
        student.full_name, ':', err.message
      );
      results.failed++;
    }
  }

  console.log(
    '[SMS Orchestrator] Done —',
    `Sent: ${results.sent}`,
    `Failed: ${results.failed}`,
    `Skipped: ${results.skipped}`
  );

  return results;
}
