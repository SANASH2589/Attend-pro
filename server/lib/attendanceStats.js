const { supabaseAdmin } = require('./supabase');

/**
 * Calculates attendance statistics for a single student.
 */
async function getStudentAttendanceStats(studentId, classId, dateFrom, dateTo) {
  // 1. Fetch relevant attendance sessions
  let sessionQuery = supabaseAdmin
    .from('attendance_sessions')
    .select('id');

  if (classId) {
    sessionQuery = sessionQuery.eq('class_id', classId);
  }
  if (dateFrom) {
    sessionQuery = sessionQuery.gte('session_date', dateFrom);
  }
  if (dateTo) {
    sessionQuery = sessionQuery.lte('session_date', dateTo);
  }

  const { data: sessions, error: sessionErr } = await sessionQuery;
  if (sessionErr) throw sessionErr;

  const sessionIds = (sessions || []).map(s => s.id);
  if (sessionIds.length === 0) {
    return {
      total_sessions: 0,
      present: 0,
      absent: 0,
      percentage: 0
    };
  }

  // 2. Fetch student's records for those sessions
  const { data: records, error: recordErr } = await supabaseAdmin
    .from('attendance_records')
    .select('status')
    .eq('student_id', studentId)
    .in('session_id', sessionIds);

  if (recordErr) throw recordErr;

  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent = total - present;
  const percentage = total > 0 ? parseFloat(((present / total) * 100).toFixed(2)) : 0;

  return {
    total_sessions: total,
    present,
    absent,
    percentage
  };
}

/**
 * Calculates attendance statistics for a class section.
 */
async function getClassAttendanceStats(classId, dateFrom, dateTo) {
  let sessionQuery = supabaseAdmin
    .from('attendance_sessions')
    .select('id, session_date, session_type, total_students, total_absent')
    .eq('class_id', classId);

  if (dateFrom) {
    sessionQuery = sessionQuery.gte('session_date', dateFrom);
  }
  if (dateTo) {
    sessionQuery = sessionQuery.lte('session_date', dateTo);
  }

  const { data: sessions, error: sessionErr } = await sessionQuery;
  if (sessionErr) throw sessionErr;

  let overallTotal = 0;
  let overallAbsent = 0;

  const sessionStats = (sessions || []).map(s => {
    const total = s.total_students || 0;
    const absent = s.total_absent || 0;
    const present = Math.max(0, total - absent);
    const percentage = total > 0 ? parseFloat(((present / total) * 100).toFixed(2)) : 0;

    overallTotal += total;
    overallAbsent += absent;

    return {
      session_id: s.id,
      session_date: s.session_date,
      session_type: s.session_type,
      total_students: total,
      present_students: present,
      absent_students: absent,
      percentage
    };
  });

  const overallPresent = Math.max(0, overallTotal - overallAbsent);
  const overallPercentage = overallTotal > 0 ? parseFloat(((overallPresent / overallTotal) * 100).toFixed(2)) : 0;

  return {
    overall: {
      total_sessions: sessions.length,
      total_students_registered: overallTotal,
      present_students_registered: overallPresent,
      absent_students_registered: overallAbsent,
      percentage: overallPercentage
    },
    sessions: sessionStats
  };
}

module.exports = {
  getStudentAttendanceStats,
  getClassAttendanceStats
};
