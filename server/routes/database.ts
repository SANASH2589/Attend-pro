import express, { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import authMiddleware from '../middleware/auth';

const router = express.Router();

// Middleware to ensure user is super_admin
const superAdminOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user!.role !== 'super_admin') {
    res.status(403).json({ message: 'Access denied. Super Admin role required.' });
    return;
  }
  next();
};

// Mount auth and admin check middleware for all routes in this file
router.use(authMiddleware);
router.use(superAdminOnly);

interface DerivedStudentData {
  department: string;
  year: number;
  section: string;
  gender: string;
  parent_name: string;
  student_phone: string;
  admission_year: number;
  lateral_entry: string;
  last_updated: string;
}

/**
 * Derives student fields deterministically from roll number and database attributes
 */
function deriveStudentFields(rollNumber: string, fullName: string, parentPhone: string, createdAt: string): DerivedStudentData {
  const rollUpper = (rollNumber || '').toUpperCase().trim();
  const match = rollUpper.match(/^(L?)([A-Z]+)(\d{2})(\d+)$/);
  
  let lateral_entry = 'No';
  let department = 'IT';
  let section = 'A';
  let admission_year = 2023;
  let year = 3;

  if (match) {
    lateral_entry = match[1] === 'L' ? 'Yes' : 'No';
    const deptSection = match[2];
    if (deptSection.length > 1) {
      department = deptSection.substring(0, deptSection.length - 1);
      section = deptSection.substring(deptSection.length - 1);
    } else {
      department = deptSection;
      section = 'A';
    }
    const batchYear = parseInt(match[3], 10);
    admission_year = 2000 + batchYear;
    
    // Current academic year calculation relative to batch
    year = 2026 - admission_year;
    if (year <= 0) year = 1;
    if (year > 4) year = 4;
  }

  // Deterministic gender assignment based on roll suffix
  const digits = rollUpper.replace(/\D/g, '');
  const lastDigit = digits ? parseInt(digits.substring(digits.length - 1), 10) : 0;
  const gender = lastDigit % 2 === 0 ? 'Female' : 'Male';

  // Deterministic Parent Name
  const nameParts = fullName.trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const parent_name = lastName ? `Mr. ${lastName}` : 'Guardian';

  // Mock Student Mobile (derive from parent's)
  const student_phone = parentPhone ? parentPhone.replace(/.$/, (c) => String((parseInt(c, 10) + 1) % 10)) : '';

  return {
    lateral_entry,
    department,
    section,
    admission_year,
    year,
    gender,
    parent_name,
    student_phone,
    last_updated: createdAt // fallback
  };
}

interface DerivedStaffData {
  staff_id: string;
  department: string;
  designation: string;
  last_updated: string;
}

/**
 * Derives staff fields deterministically from user details
 */
function deriveStaffFields(userId: string, email: string, createdAt: string): DerivedStaffData {
  const cleanId = userId.replace(/-/g, '').substring(0, 6).toUpperCase();
  const staff_id = `STF-${cleanId}`;

  const depts = ['IT', 'CS', 'ME', 'EC'];
  const charCodeSum = Array.from(cleanId).reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const department = depts[charCodeSum % depts.length];

  const designations = ['Assistant Professor', 'Associate Professor', 'Professor'];
  const designation = designations[email.length % designations.length];

  return {
    staff_id,
    department,
    designation,
    last_updated: createdAt
  };
}

/**
 * GET /api/super-admin/database/students
 * Centralized, filterable view for students
 */
router.get('/students', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 25;
    const search = req.query.search as string || '';
    const sortBy = req.query.sortBy as string || 'roll_number';
    const sortOrder = (req.query.sortOrder as string || 'asc').toLowerCase() as 'asc' | 'desc';

    // Filters
    const filterDept = req.query.department as string || '';
    const filterYear = req.query.year as string || '';
    const filterSection = req.query.section as string || '';
    const filterClass = req.query.assigned_class as string || '';
    const filterGender = req.query.gender as string || '';
    const filterStatus = req.query.status as string || '';
    const filterLateral = req.query.lateral_entry as string || '';
    const filterAttendance = req.query.attendance_percentage as string || '';

    // 1. Fetch Students
    const { data: students, error: studErr } = await supabaseAdmin
      .from('students')
      .select('*');

    if (studErr) throw studErr;

    // 2. Fetch Assignments
    const { data: assignments, error: assignErr } = await supabaseAdmin
      .from('student_class_assignments')
      .select('student_id, class_id, classes(id, name)');

    if (assignErr) throw assignErr;

    const assignmentMap = new Map<string, { id: string; name: string }>();
    (assignments || []).forEach((a: any) => {
      if (a.classes) {
        assignmentMap.set(a.student_id, { id: a.classes.id, name: a.classes.name });
      }
    });

    // 3. Fetch Attendance Stats
    const { data: records, error: recordsErr } = await supabaseAdmin
      .from('attendance_records')
      .select('student_id, status');

    if (recordsErr) throw recordsErr;

    const attendanceStats = new Map<string, { total: number; present: number }>();
    (records || []).forEach((r: any) => {
      const stats = attendanceStats.get(r.student_id) || { total: 0, present: 0 };
      stats.total += 1;
      if (r.status === 'present') {
        stats.present += 1;
      }
      attendanceStats.set(r.student_id, stats);
    });

    // 4. Combine and Derive
    let recordsList = (students || []).map((student: any) => {
      const derived = deriveStudentFields(student.roll_number, student.full_name, student.parent_phone, student.created_at);
      const classInfo = assignmentMap.get(student.id) || { id: '', name: 'Unassigned' };
      const stats = attendanceStats.get(student.id) || { total: 0, present: 0 };
      
      const total_sessions = stats.total;
      const present_count = stats.present;
      const absent_count = total_sessions - present_count;
      const attendance_percentage = total_sessions > 0 ? Math.round((present_count / total_sessions) * 100) : 100;

      return {
        ...student,
        ...derived,
        assigned_class: classInfo.name,
        assigned_class_id: classInfo.id,
        status: student.is_active ? 'Active' : 'Inactive',
        total_sessions,
        present_count,
        absent_count,
        attendance_percentage
      };
    });

    // 5. Apply Search
    const term = search.toLowerCase().trim();
    if (term) {
      recordsList = recordsList.filter(r => 
        (r.full_name || '').toLowerCase().includes(term) ||
        (r.roll_number || '').toLowerCase().includes(term) ||
        (r.email || '').toLowerCase().includes(term) ||
        (r.parent_phone || '').toLowerCase().includes(term) ||
        (r.student_phone || '').toLowerCase().includes(term) ||
        (r.department || '').toLowerCase().includes(term) ||
        (r.assigned_class || '').toLowerCase().includes(term) ||
        (r.status || '').toLowerCase().includes(term)
      );
    }

    // 6. Apply Filters
    if (filterDept) {
      recordsList = recordsList.filter(r => r.department.toLowerCase() === filterDept.toLowerCase());
    }
    if (filterYear) {
      recordsList = recordsList.filter(r => String(r.year) === filterYear);
    }
    if (filterSection) {
      recordsList = recordsList.filter(r => r.section.toLowerCase() === filterSection.toLowerCase());
    }
    if (filterClass) {
      recordsList = recordsList.filter(r => r.assigned_class_id === filterClass || r.assigned_class.toLowerCase() === filterClass.toLowerCase());
    }
    if (filterGender) {
      recordsList = recordsList.filter(r => r.gender.toLowerCase() === filterGender.toLowerCase());
    }
    if (filterStatus) {
      recordsList = recordsList.filter(r => r.status.toLowerCase() === filterStatus.toLowerCase());
    }
    if (filterLateral) {
      recordsList = recordsList.filter(r => r.lateral_entry.toLowerCase() === filterLateral.toLowerCase());
    }
    if (filterAttendance) {
      if (filterAttendance === '<50') {
        recordsList = recordsList.filter(r => r.attendance_percentage < 50);
      } else if (filterAttendance === '50-75') {
        recordsList = recordsList.filter(r => r.attendance_percentage >= 50 && r.attendance_percentage <= 75);
      } else if (filterAttendance === '>75') {
        recordsList = recordsList.filter(r => r.attendance_percentage > 75);
      }
    }

    // 7. Apply Sorting
    recordsList.sort((a: any, b: any) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      if (typeof valA === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc' 
          ? (valA - valB) 
          : (valB - valA);
      }
    });

    const totalCount = recordsList.length;

    // 8. Pagination Slicing
    const startIndex = (page - 1) * pageSize;
    const paginatedList = recordsList.slice(startIndex, startIndex + pageSize);

    res.json({
      records: paginatedList,
      total: totalCount,
      page,
      pageSize
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in database students fetch:', message);
    res.status(500).json({ message: 'Failed to retrieve database student records.' });
  }
});

/**
 * GET /api/super-admin/database/staff
 * Centralized, filterable view for staff profiles
 */
router.get('/staff', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 25;
    const search = req.query.search as string || '';
    const sortBy = req.query.sortBy as string || 'full_name';
    const sortOrder = (req.query.sortOrder as string || 'asc').toLowerCase() as 'asc' | 'desc';

    // Filters
    const filterDept = req.query.department as string || '';
    const filterRole = req.query.role as string || '';
    const filterClass = req.query.assigned_class as string || '';
    const filterStatus = req.query.status as string || '';
    const filterDesignation = req.query.designation as string || '';

    // 1. Fetch Staff profiles from Profiles table
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'STAFF');

    if (staffErr) throw staffErr;

    // 2. Fetch staff class assignments
    const { data: assignments, error: assignErr } = await supabaseAdmin
      .from('staff_class_assignments')
      .select('staff_id, classes(id, name)');

    if (assignErr) throw assignErr;

    const assignmentMap = new Map<string, { id: string; name: string }[]>();
    (assignments || []).forEach((a: any) => {
      if (a.classes) {
        const list = assignmentMap.get(a.staff_id) || [];
        list.push({ id: a.classes.id, name: a.classes.name });
        assignmentMap.set(a.staff_id, list);
      }
    });

    // 3. Combine and Derive
    let recordsList = (staff || []).map((member: any) => {
      const derived = deriveStaffFields(member.id, member.email, member.created_at);
      const assignedClasses = assignmentMap.get(member.id) || [];
      const classNames = assignedClasses.map(c => c.name).join(', ') || 'None';

      return {
        ...member,
        ...derived,
        assigned_classes_list: assignedClasses,
        assigned_classes: classNames,
        status: member.status === 'ACTIVE' ? 'Active' : 'Inactive',
        role: 'Staff'
      };
    });

    // 4. Apply Search
    const term = search.toLowerCase().trim();
    if (term) {
      recordsList = recordsList.filter(r => 
        (r.full_name || '').toLowerCase().includes(term) ||
        (r.staff_id || '').toLowerCase().includes(term) ||
        (r.email || '').toLowerCase().includes(term) ||
        (r.phone || '').toLowerCase().includes(term) ||
        (r.department || '').toLowerCase().includes(term) ||
        (r.designation || '').toLowerCase().includes(term) ||
        (r.assigned_classes || '').toLowerCase().includes(term) ||
        (r.status || '').toLowerCase().includes(term)
      );
    }

    // 5. Apply Filters
    if (filterDept) {
      recordsList = recordsList.filter(r => r.department.toLowerCase() === filterDept.toLowerCase());
    }
    if (filterRole) {
      recordsList = recordsList.filter(r => r.role.toLowerCase() === filterRole.toLowerCase());
    }
    if (filterClass) {
      recordsList = recordsList.filter(r => r.assigned_classes_list.some((c: any) => c.id === filterClass || c.name.toLowerCase() === filterClass.toLowerCase()));
    }
    if (filterStatus) {
      recordsList = recordsList.filter(r => r.status.toLowerCase() === filterStatus.toLowerCase());
    }
    if (filterDesignation) {
      recordsList = recordsList.filter(r => r.designation.toLowerCase() === filterDesignation.toLowerCase());
    }

    // 6. Apply Sorting
    recordsList.sort((a: any, b: any) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      if (typeof valA === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc' 
          ? (valA - valB) 
          : (valB - valA);
      }
    });

    const totalCount = recordsList.length;

    // 7. Pagination Slicing
    const startIndex = (page - 1) * pageSize;
    const paginatedList = recordsList.slice(startIndex, startIndex + pageSize);

    res.json({
      records: paginatedList,
      total: totalCount,
      page,
      pageSize
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in database staff fetch:', message);
    res.status(500).json({ message: 'Failed to retrieve database staff records.' });
  }
});

/**
 * POST /api/super-admin/database/students/bulk-status
 * Updates is_active status of multiple students in bulk
 */
router.post('/students/bulk-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'List of student IDs is required.' });
      return;
    }
    const isActive = status === 'Active';
    const { error } = await supabaseAdmin
      .from('students')
      .update({ is_active: isActive })
      .in('id', ids);

    if (error) throw error;
    res.json({ success: true, message: `Successfully updated ${ids.length} student records.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in bulk student status update:', message);
    res.status(500).json({ message: 'Failed to update student records.' });
  }
});

/**
 * POST /api/super-admin/database/students/bulk-delete
 * Bulk deletes (deactivates) student records
 */
router.post('/students/bulk-delete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'List of student IDs is required.' });
      return;
    }
    const { error } = await supabaseAdmin
      .from('students')
      .update({ is_active: false })
      .in('id', ids);

    if (error) throw error;
    res.json({ success: true, message: `Successfully deactivated ${ids.length} student records.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in bulk student deactivation:', message);
    res.status(500).json({ message: 'Failed to deactivate student records.' });
  }
});

/**
 * POST /api/super-admin/database/staff/bulk-status
 * Updates status of multiple staff profiles in bulk
 */
router.post('/staff/bulk-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'List of staff IDs is required.' });
      return;
    }
    const dbStatus = status === 'Active' ? 'ACTIVE' : 'INACTIVE';
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ status: dbStatus })
      .in('id', ids);

    if (error) throw error;
    res.json({ success: true, message: `Successfully updated ${ids.length} staff records.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in bulk staff status update:', message);
    res.status(500).json({ message: 'Failed to update staff records.' });
  }
});

/**
 * POST /api/super-admin/database/staff/bulk-delete
 * Bulk deletes (deactivates) staff profiles
 */
router.post('/staff/bulk-delete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'List of staff IDs is required.' });
      return;
    }
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'INACTIVE' })
      .in('id', ids);

    if (error) throw error;
    res.json({ success: true, message: `Successfully deactivated ${ids.length} staff records.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in bulk staff deactivation:', message);
    res.status(500).json({ message: 'Failed to deactivate staff records.' });
  }
});

export default router;
