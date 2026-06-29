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

/**
 * Full student report with session-level detail, consecutive absence tracking.
 */
async function getFullStudentReport(studentId, classId, dateFrom, dateTo) {
  // Fetch student info
  const { data: student, error: studErr } = await supabaseAdmin
    .from('students')
    .select('id, roll_number, full_name, parent_phone')
    .eq('id', studentId)
    .single();

  if (studErr || !student) throw new Error('Student not found');

  // Fetch class info
  let classInfo = null;
  if (classId) {
    const { data: cls } = await supabaseAdmin
      .from('classes')
      .select('id, name')
      .eq('id', classId)
      .single();
    classInfo = cls;
  }

  // Fetch sessions
  let sessionQuery = supabaseAdmin
    .from('attendance_sessions')
    .select('id, session_date, session_type, submitted_at, classes(name)')
    .order('session_date', { ascending: true });

  if (classId) sessionQuery = sessionQuery.eq('class_id', classId);
  if (dateFrom) sessionQuery = sessionQuery.gte('session_date', dateFrom);
  if (dateTo) sessionQuery = sessionQuery.lte('session_date', dateTo);

  const { data: sessions, error: sessErr } = await sessionQuery;
  if (sessErr) throw sessErr;

  if (!sessions || sessions.length === 0) {
    return {
      student: { id: student.id, roll_number: student.roll_number, full_name: student.full_name, parent_phone: student.parent_phone },
      class: classInfo,
      period: { from: dateFrom, to: dateTo },
      summary: { total_sessions: 0, present: 0, absent: 0, percentage: null, consecutive_absences_max: 0, last_absent_date: null },
      sessions: []
    };
  }

  const sessionIds = sessions.map(s => s.id);

  // Fetch student's records
  const { data: records, error: recErr } = await supabaseAdmin
    .from('attendance_records')
    .select('session_id, status')
    .eq('student_id', studentId)
    .in('session_id', sessionIds);

  if (recErr) throw recErr;

  const recordMap = {};
  (records || []).forEach(r => { recordMap[r.session_id] = r.status; });

  // Build session detail list and compute stats
  let present = 0;
  let absent = 0;
  let consecutiveAbsent = 0;
  let maxConsecutiveAbsent = 0;
  let lastAbsentDate = null;

  const sessionDetails = sessions.map(s => {
    const status = recordMap[s.id] || null;
    if (status === 'present') {
      present++;
      consecutiveAbsent = 0;
    } else if (status === 'absent') {
      absent++;
      consecutiveAbsent++;
      lastAbsentDate = s.session_date;
      if (consecutiveAbsent > maxConsecutiveAbsent) {
        maxConsecutiveAbsent = consecutiveAbsent;
      }
    }

    return {
      session_date: s.session_date,
      session_type: s.session_type,
      status: status,
      class_name: s.classes?.name || '',
      submitted_at: s.submitted_at
    };
  });

  const total = present + absent;
  const percentage = total > 0 ? parseFloat(((present / total) * 100).toFixed(2)) : null;

  return {
    student: { id: student.id, roll_number: student.roll_number, full_name: student.full_name, parent_phone: student.parent_phone },
    class: classInfo,
    period: { from: dateFrom, to: dateTo },
    summary: {
      total_sessions: total,
      present,
      absent,
      percentage,
      consecutive_absences_max: maxConsecutiveAbsent,
      last_absent_date: lastAbsentDate
    },
    sessions: sessionDetails
  };
}

/**
 * Full class report with per-student breakdown and daily stats.
 */
async function getFullClassReport(classId, dateFrom, dateTo) {
  // Fetch class info
  const { data: classInfo, error: clsErr } = await supabaseAdmin
    .from('classes')
    .select('id, name, batch_type')
    .eq('id', classId)
    .single();

  if (clsErr || !classInfo) throw new Error('Class not found');

  // Fetch sessions
  let sessionQuery = supabaseAdmin
    .from('attendance_sessions')
    .select('id, session_date, session_type, total_students, total_absent')
    .eq('class_id', classId)
    .order('session_date', { ascending: true });

  if (dateFrom) sessionQuery = sessionQuery.gte('session_date', dateFrom);
  if (dateTo) sessionQuery = sessionQuery.lte('session_date', dateTo);

  const { data: sessions, error: sessErr } = await sessionQuery;
  if (sessErr) throw sessErr;

  if (!sessions || sessions.length === 0) {
    return {
      class: classInfo,
      period: { from: dateFrom, to: dateTo },
      summary: { total_sessions: 0, avg_attendance_pct: null, best_day: null, worst_day: null },
      students: [],
      daily: []
    };
  }

  // Build daily stats
  let bestDay = null;
  let worstDay = null;
  const daily = sessions.map(s => {
    const total = s.total_students || 0;
    const absent = s.total_absent || 0;
    const present = Math.max(0, total - absent);
    const pct = total > 0 ? parseFloat(((present / total) * 100).toFixed(2)) : null;

    if (pct !== null) {
      if (!bestDay || pct > bestDay.percentage) bestDay = { date: s.session_date, percentage: pct };
      if (!worstDay || pct < worstDay.percentage) worstDay = { date: s.session_date, percentage: pct };
    }

    return {
      session_date: s.session_date,
      session_type: s.session_type,
      total,
      present,
      absent,
      percentage: pct
    };
  });

  // Overall average
  let totalStudentSlots = 0;
  let totalPresent = 0;
  daily.forEach(d => {
    totalStudentSlots += d.total;
    totalPresent += d.present;
  });
  const avgPct = totalStudentSlots > 0 ? parseFloat(((totalPresent / totalStudentSlots) * 100).toFixed(2)) : null;

  // Fetch students assigned to this class
  const { data: assignments, error: assignErr } = await supabaseAdmin
    .from('student_class_assignments')
    .select('student:students(id, roll_number, full_name, is_active)')
    .eq('class_id', classId);

  if (assignErr) throw assignErr;

  const activeStudents = (assignments || [])
    .map(a => a.student)
    .filter(s => s && s.is_active);

  const sessionIds = sessions.map(s => s.id);

  // Fetch all records for these sessions
  const { data: allRecords, error: recErr } = await supabaseAdmin
    .from('attendance_records')
    .select('student_id, status')
    .in('session_id', sessionIds);

  if (recErr) throw recErr;

  // Build per-student stats
  const studentStatsMap = {};
  activeStudents.forEach(s => {
    studentStatsMap[s.id] = { id: s.id, roll_number: s.roll_number, full_name: s.full_name, total_sessions: 0, present: 0, absent: 0 };
  });

  (allRecords || []).forEach(r => {
    if (studentStatsMap[r.student_id]) {
      studentStatsMap[r.student_id].total_sessions++;
      if (r.status === 'present') {
        studentStatsMap[r.student_id].present++;
      } else {
        studentStatsMap[r.student_id].absent++;
      }
    }
  });

  const students = Object.values(studentStatsMap).map(s => ({
    ...s,
    percentage: s.total_sessions > 0 ? parseFloat(((s.present / s.total_sessions) * 100).toFixed(2)) : null
  })).sort((a, b) => (a.percentage ?? 999) - (b.percentage ?? 999)); // ASC, null last

  return {
    class: classInfo,
    period: { from: dateFrom, to: dateTo },
    summary: {
      total_sessions: sessions.length,
      avg_attendance_pct: avgPct,
      best_day: bestDay,
      worst_day: worstDay
    },
    students,
    daily
  };
}

/**
 * Admin overview report across all classes.
 */
async function getAdminOverviewReport(dateFrom, dateTo) {
  // Fetch sessions in range
  let sessionQuery = supabaseAdmin
    .from('attendance_sessions')
    .select('id, class_id, staff_id, session_date, session_type, total_students, total_absent, classes(name), users(full_name)');

  if (dateFrom) sessionQuery = sessionQuery.gte('session_date', dateFrom);
  if (dateTo) sessionQuery = sessionQuery.lte('session_date', dateTo);

  const { data: sessions, error: sessErr } = await sessionQuery;
  if (sessErr) throw sessErr;

  // SMS stats
  let smsQuery = supabaseAdmin
    .from('sms_logs')
    .select('status, sent_at');

  if (dateFrom) smsQuery = smsQuery.gte('sent_at', `${dateFrom}T00:00:00`);
  if (dateTo) smsQuery = smsQuery.lte('sent_at', `${dateTo}T23:59:59`);

  const { data: smsLogs } = await smsQuery;
  const totalSmsSent = (smsLogs || []).filter(l => l.status === 'sent' || l.status === 'delivered').length;
  const totalSmsFailed = (smsLogs || []).filter(l => l.status === 'failed').length;

  if (!sessions || sessions.length === 0) {
    return {
      period: { from: dateFrom, to: dateTo },
      overall: { total_sessions: 0, avg_attendance_pct: null, total_sms_sent: totalSmsSent, total_sms_failed: totalSmsFailed },
      by_class: [],
      by_staff: [],
      low_attendance_students: []
    };
  }

  // Overall stats
  let overallTotal = 0;
  let overallPresent = 0;
  sessions.forEach(s => {
    const t = s.total_students || 0;
    const a = s.total_absent || 0;
    overallTotal += t;
    overallPresent += Math.max(0, t - a);
  });
  const overallPct = overallTotal > 0 ? parseFloat(((overallPresent / overallTotal) * 100).toFixed(2)) : null;

  // By class
  const classMap = {};
  sessions.forEach(s => {
    if (!classMap[s.class_id]) {
      classMap[s.class_id] = {
        class_id: s.class_id,
        class_name: s.classes?.name || 'Unknown',
        total_sessions: 0,
        total_student_slots: 0,
        total_present: 0,
        student_ids: new Set()
      };
    }
    const c = classMap[s.class_id];
    c.total_sessions++;
    const t = s.total_students || 0;
    const a = s.total_absent || 0;
    c.total_student_slots += t;
    c.total_present += Math.max(0, t - a);
  });

  // Get student counts per class
  const classIds = Object.keys(classMap);
  for (const cid of classIds) {
    const { count } = await supabaseAdmin
      .from('student_class_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', cid);
    classMap[cid].total_students = count || 0;
  }

  const byClass = Object.values(classMap).map(c => ({
    class_id: c.class_id,
    class_name: c.class_name,
    total_sessions: c.total_sessions,
    avg_pct: c.total_student_slots > 0 ? parseFloat(((c.total_present / c.total_student_slots) * 100).toFixed(2)) : null,
    total_students: c.total_students
  })).sort((a, b) => (a.avg_pct ?? 999) - (b.avg_pct ?? 999));

  // By staff
  const staffMap = {};
  sessions.forEach(s => {
    if (!s.staff_id) return;
    if (!staffMap[s.staff_id]) {
      staffMap[s.staff_id] = {
        staff_id: s.staff_id,
        staff_name: s.users?.full_name || 'Unknown',
        sessions_taken: 0,
        total_student_slots: 0,
        total_present: 0
      };
    }
    const st = staffMap[s.staff_id];
    st.sessions_taken++;
    const t = s.total_students || 0;
    const a = s.total_absent || 0;
    st.total_student_slots += t;
    st.total_present += Math.max(0, t - a);
  });

  const byStaff = Object.values(staffMap).map(st => ({
    staff_id: st.staff_id,
    staff_name: st.staff_name,
    sessions_taken: st.sessions_taken,
    avg_pct_their_classes: st.total_student_slots > 0 ? parseFloat(((st.total_present / st.total_student_slots) * 100).toFixed(2)) : null
  }));

  // Low attendance students (below 75%)
  const sessionIds = sessions.map(s => s.id);
  const { data: allRecords } = await supabaseAdmin
    .from('attendance_records')
    .select('student_id, status')
    .in('session_id', sessionIds);

  const studentAttMap = {};
  (allRecords || []).forEach(r => {
    if (!studentAttMap[r.student_id]) {
      studentAttMap[r.student_id] = { total: 0, present: 0 };
    }
    studentAttMap[r.student_id].total++;
    if (r.status === 'present') studentAttMap[r.student_id].present++;
  });

  const lowAttStudentIds = Object.entries(studentAttMap)
    .filter(([_, v]) => v.total > 0 && ((v.present / v.total) * 100) < 75)
    .map(([id]) => id);

  let lowAttendanceStudents = [];
  if (lowAttStudentIds.length > 0) {
    const { data: students } = await supabaseAdmin
      .from('students')
      .select('id, roll_number, full_name')
      .in('id', lowAttStudentIds);

    // Get class names for these students
    const { data: assignments } = await supabaseAdmin
      .from('student_class_assignments')
      .select('student_id, classes(name)')
      .in('student_id', lowAttStudentIds);

    const studentClassMap = {};
    (assignments || []).forEach(a => {
      if (!studentClassMap[a.student_id]) {
        studentClassMap[a.student_id] = a.classes?.name || '';
      }
    });

    lowAttendanceStudents = (students || []).map(s => {
      const att = studentAttMap[s.id];
      return {
        student_id: s.id,
        roll_number: s.roll_number,
        full_name: s.full_name,
        class_name: studentClassMap[s.id] || '',
        overall_pct: att ? parseFloat(((att.present / att.total) * 100).toFixed(2)) : null
      };
    }).sort((a, b) => (a.overall_pct ?? 999) - (b.overall_pct ?? 999));
  }

  return {
    period: { from: dateFrom, to: dateTo },
    overall: {
      total_sessions: sessions.length,
      avg_attendance_pct: overallPct,
      total_sms_sent: totalSmsSent,
      total_sms_failed: totalSmsFailed
    },
    by_class: byClass,
    by_staff: byStaff,
    low_attendance_students: lowAttendanceStudents
  };
}

module.exports = {
  getStudentAttendanceStats,
  getClassAttendanceStats,
  getFullStudentReport,
  getFullClassReport,
  getAdminOverviewReport
};
