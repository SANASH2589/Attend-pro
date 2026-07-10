import cron from 'node-cron';
import { supabaseAdmin } from '../lib/supabase';
import { sendAbsenteeNotifications } from './sms/smsOrchestrator';

/**
 * Helper to convert "HH:MM:SS" or "HH:MM" to minutes
 */
const timeToMinutes = (t: string | null | undefined): number => {
  if (!t) return 0;
  const parts = t.split(':').map(Number);
  return parts[0] * 60 + parts[1];
};

/**
 * Background task to check and auto-lock attendance sessions.
 * Runs every 5 minutes.
 */
async function runAutoLock(): Promise<void> {
  const cronTime = new Date().toISOString();
  console.log(`[Scheduler] Running attendance auto-lock at ${cronTime}...`);

  let checkedCount = 0;
  let lockedCount = 0;

  try {
    // 1. Get current Indian time in minutes and date string (UTC + 5:30)
    const now = new Date();
    const indianTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    const currentMinutes = indianTime.getUTCHours() * 60 + indianTime.getUTCMinutes();
    
    const year = indianTime.getUTCFullYear();
    const month = String(indianTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(indianTime.getUTCDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // 2. Fetch all classes
    const { data: classes, error: classErr } = await supabaseAdmin
      .from('classes')
      .select('id, name, batch_type, morning_lock, evening_lock');
      
    if (classErr) throw classErr;

    const classesList = classes || [];
    checkedCount = classesList.length;

    for (const c of classesList) {
      try {
        const lockMorning = c.morning_lock ? timeToMinutes(c.morning_lock) : 0;
        const lockEvening = c.evening_lock ? timeToMinutes(c.evening_lock) : 0;

        // A. Morning session auto-lock
        if ((c.batch_type === 'morning' || c.batch_type === 'both') && lockMorning > 0) {
          if (currentMinutes >= lockMorning) {
            const { data: morningSession } = await supabaseAdmin
              .from('attendance_sessions')
              .select('id, is_locked')
              .eq('class_id', c.id)
              .eq('session_date', todayStr)
              .eq('session_type', 'morning')
              .eq('is_locked', false)
              .maybeSingle();

            if (morningSession) {
              const { error: lockErr } = await supabaseAdmin
                .from('attendance_sessions')
                .update({ is_locked: true, locked_at: now.toISOString() })
                .eq('id', morningSession.id);

              if (lockErr) {
                console.error(`[Scheduler] Failed to lock morning session ${morningSession.id} for class ${c.name}:`, lockErr.message);
              } else {
                lockedCount++;
                console.log(`[Scheduler] Locked session: ${morningSession.id} (Morning session for class: ${c.name})`);

                // Create audit log entry
                const { error: auditErr } = await supabaseAdmin
                  .from('audit_log')
                  .insert({
                    action: 'auto_lock_session',
                    session_id: morningSession.id
                  });
                if (auditErr) {
                  console.error(`[Scheduler] Failed to insert audit log for session ${morningSession.id}:`, auditErr.message);
                }

                // Send SMS notifications for absent students
                sendAbsenteeNotifications(morningSession.id)
                  .catch(err => console.error(
                    '[Scheduler] SMS error for session',
                    morningSession.id, ':', err.message
                  ));
              }
            }
          }
        }

        // B. Evening session auto-lock
        if ((c.batch_type === 'evening' || c.batch_type === 'both') && lockEvening > 0) {
          if (currentMinutes >= lockEvening) {
            const { data: eveningSession } = await supabaseAdmin
              .from('attendance_sessions')
              .select('id, is_locked')
              .eq('class_id', c.id)
              .eq('session_date', todayStr)
              .eq('session_type', 'evening')
              .eq('is_locked', false)
              .maybeSingle();

            if (eveningSession) {
              const { error: lockErr } = await supabaseAdmin
                .from('attendance_sessions')
                .update({ is_locked: true, locked_at: now.toISOString() })
                .eq('id', eveningSession.id);

              if (lockErr) {
                console.error(`[Scheduler] Failed to lock evening session ${eveningSession.id} for class ${c.name}:`, lockErr.message);
              } else {
                lockedCount++;
                console.log(`[Scheduler] Locked session: ${eveningSession.id} (Evening session for class: ${c.name})`);

                // Create audit log entry
                const { error: auditErr } = await supabaseAdmin
                  .from('audit_log')
                  .insert({
                    action: 'auto_lock_session',
                    session_id: eveningSession.id
                  });
                if (auditErr) {
                  console.error(`[Scheduler] Failed to insert audit log for session ${eveningSession.id}:`, auditErr.message);
                }

                // Send SMS notifications for absent students
                sendAbsenteeNotifications(eveningSession.id)
                  .catch(err => console.error(
                    '[Scheduler] SMS error for session',
                    eveningSession.id, ':', err.message
                  ));
              }
            }
          }
        }
      } catch (classLoopErr: unknown) {
        const message = classLoopErr instanceof Error ? classLoopErr.message : 'Unknown error';
        console.error(`[Scheduler] Error checking auto-lock for class ${c.name || c.id}:`, message);
      }
    }
  } catch (outerErr: unknown) {
    const message = outerErr instanceof Error ? outerErr.message : 'Unknown error';
    console.error('[Scheduler] Unexpected error in scheduler run:', message);
  }

  console.log(`[Scheduler] Finished auto-lock check. Classes checked: ${checkedCount}, Sessions locked: ${lockedCount}.`);
}

/**
 * Initializes and starts the background attendance cron scheduler
 */
function startScheduler(): void {
  console.log('[Scheduler] Scheduler started. Auto-lock checked every 5 minutes.');
  
  // Register node-cron to run every 5 minutes: */5 * * * *
  cron.schedule('*/5 * * * *', () => {
    runAutoLock().catch((err: Error) => {
      console.error('[Scheduler] Cron execution failed unexpectedly:', err.message);
    });
  });
}

export {
  startScheduler,
  runAutoLock // exported for testing/manual triggers
};
