import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get current Indian time in minutes and date string (UTC + 5:30)
    const now = new Date();
    const indianTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    
    const currentMinutes = indianTime.getUTCHours() * 60 + indianTime.getUTCMinutes();
    
    const year = indianTime.getUTCFullYear();
    const month = String(indianTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(indianTime.getUTCDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // 2. Fetch all class timings
    const { data: classes, error: classErr } = await supabase
      .from('classes')
      .select('id, batch_type, morning_lock, evening_lock');
      
    if (classErr) throw classErr;

    // Helper to convert "HH:MM:SS" or "HH:MM" to minutes
    const timeToMinutes = (t: string | null) => {
      if (!t) return 0;
      const parts = t.split(':').map(Number);
      return parts[0] * 60 + parts[1];
    };

    const lockedSessions: any[] = [];

    for (const c of (classes || [])) {
      const lockMorning = c.morning_lock ? timeToMinutes(c.morning_lock) : 0;
      const lockEvening = c.evening_lock ? timeToMinutes(c.evening_lock) : 0;

      // Check morning auto-locks
      if ((c.batch_type === 'morning' || c.batch_type === 'both') && lockMorning > 0) {
        if (currentMinutes >= lockMorning) {
          const { data: morningSession } = await supabase
            .from('attendance_sessions')
            .select('id, is_locked')
            .eq('class_id', c.id)
            .eq('session_date', todayStr)
            .eq('session_type', 'morning')
            .eq('is_locked', false)
            .maybeSingle();

          if (morningSession) {
            const { error: lockErr } = await supabase
              .from('attendance_sessions')
              .update({ is_locked: true, locked_at: now.toISOString() })
              .eq('id', morningSession.id);

            if (!lockErr) {
              await supabase
                .from('audit_log')
                .insert({
                  action: 'auto_lock_session',
                  session_id: morningSession.id
                });
              lockedSessions.push({ class_id: c.id, session_type: 'morning', session_id: morningSession.id });
            }
          }
        }
      }

      // Check evening auto-locks
      if ((c.batch_type === 'evening' || c.batch_type === 'both') && lockEvening > 0) {
        if (currentMinutes >= lockEvening) {
          const { data: eveningSession } = await supabase
            .from('attendance_sessions')
            .select('id, is_locked')
            .eq('class_id', c.id)
            .eq('session_date', todayStr)
            .eq('session_type', 'evening')
            .eq('is_locked', false)
            .maybeSingle();

          if (eveningSession) {
            const { error: lockErr } = await supabase
              .from('attendance_sessions')
              .update({ is_locked: true, locked_at: now.toISOString() })
              .eq('id', eveningSession.id);

            if (!lockErr) {
              await supabase
                .from('audit_log')
                .insert({
                  action: 'auto_lock_session',
                  session_id: eveningSession.id
                });
              lockedSessions.push({ class_id: c.id, session_type: 'evening', session_id: eveningSession.id });
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Completed auto-lock checks. Locked ${lockedSessions.length} session(s).`,
      locked: lockedSessions
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
