const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');
const { z } = require('zod');

// Middleware to ensure user is super_admin
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super Admin role required.' });
  }
  next();
};

// Mount auth and admin check middleware for all routes in this file
router.use(authMiddleware);
router.use(superAdminOnly);

// Zod schemas for validation
const studentAssignmentSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  class_id: z.string().uuid('Invalid class ID')
});

const staffAssignmentSchema = z.object({
  staff_id: z.string().uuid('Invalid staff ID'),
  class_id: z.string().uuid('Invalid class ID')
});

/**
 * GET /api/v1/assignments/students/:class_id
 * Returns assigned and unassigned active students for the given class section.
 */
router.get('/students/:class_id', async (req, res) => {
  try {
    const { class_id } = req.params;

    // 1. Fetch all active students
    const { data: allStudents, error: studErr } = await supabaseAdmin
      .from('students')
      .select('id, roll_number, full_name, parent_phone, email, is_active')
      .eq('is_active', true)
      .order('roll_number', { ascending: true });

    if (studErr) throw studErr;

    // 2. Fetch student assignments for this class
    const { data: assignments, error: assignErr } = await supabaseAdmin
      .from('student_class_assignments')
      .select('student_id')
      .eq('class_id', class_id);

    if (assignErr) throw assignErr;

    const assignedIds = new Set((assignments || []).map(a => a.student_id));

    // 3. Partition students
    const assigned = [];
    const unassigned = [];

    (allStudents || []).forEach(student => {
      if (assignedIds.has(student.id)) {
        assigned.push(student);
      } else {
        unassigned.push(student);
      }
    });

    return res.json({ assigned, unassigned });
  } catch (err) {
    console.error('Error fetching student assignments:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve student assignment lists.' });
  }
});

/**
 * POST /api/v1/assignments/students
 * Assigns a student to a class section.
 */
router.post('/students', async (req, res) => {
  try {
    const parseResult = studentAssignmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: parseResult.error.errors[0].message });
    }

    const { student_id, class_id } = parseResult.data;

    // Check if assignment already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('student_class_assignments')
      .select('id')
      .eq('student_id', student_id)
      .eq('class_id', class_id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      return res.status(409).json({ message: 'This student is already assigned to the class.' });
    }

    // Create assignment
    const { data: newAssignment, error: insertError } = await supabaseAdmin
      .from('student_class_assignments')
      .insert({ student_id, class_id })
      .select()
      .single();

    if (insertError) throw insertError;

    return res.status(201).json(newAssignment);
  } catch (err) {
    console.error('Error assigning student to class:', err.message);
    return res.status(500).json({ message: 'Failed to assign student to class.' });
  }
});

/**
 * DELETE /api/v1/assignments/students
 * Unassigns a student from a class section.
 */
router.delete('/students', async (req, res) => {
  try {
    const student_id = req.body.student_id || req.query.student_id;
    const class_id = req.body.class_id || req.query.class_id;

    if (!student_id || !class_id) {
      return res.status(400).json({ message: 'Both student_id and class_id are required.' });
    }

    const { error } = await supabaseAdmin
      .from('student_class_assignments')
      .delete()
      .eq('student_id', student_id)
      .eq('class_id', class_id);

    if (error) throw error;

    return res.json({ success: true, message: 'Student unassigned successfully.' });
  } catch (err) {
    console.error('Error unassigning student from class:', err.message);
    return res.status(500).json({ message: 'Failed to unassign student from class.' });
  }
});

/**
 * GET /api/v1/assignments/staff/:class_id
 * Returns assigned and unassigned active staff members for the given class section.
 */
router.get('/staff/:class_id', async (req, res) => {
  try {
    const { class_id } = req.params;

    // 1. Fetch all active staff
    const { data: allStaff, error: staffErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, phone, status')
      .eq('role', 'STAFF')
      .eq('status', 'ACTIVE')
      .order('full_name', { ascending: true });

    if (staffErr) throw staffErr;

    // 2. Fetch staff assignments for this class
    const { data: assignments, error: assignErr } = await supabaseAdmin
      .from('staff_class_assignments')
      .select('staff_id')
      .eq('class_id', class_id);

    if (assignErr) throw assignErr;

    const assignedIds = new Set((assignments || []).map(a => a.staff_id));

    // 3. Partition staff members
    const assigned = [];
    const unassigned = [];

    (allStaff || []).forEach(staff => {
      if (assignedIds.has(staff.id)) {
        assigned.push(staff);
      } else {
        unassigned.push(staff);
      }
    });

    return res.json({ assigned, unassigned });
  } catch (err) {
    console.error('Error fetching staff assignments:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve staff assignment lists.' });
  }
});

/**
 * POST /api/v1/assignments/staff
 * Assigns a staff member to a class section.
 */
router.post('/staff', async (req, res) => {
  try {
    const parseResult = staffAssignmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: parseResult.error.errors[0].message });
    }

    const { staff_id, class_id } = parseResult.data;

    // Check if assignment already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('staff_class_assignments')
      .select('id')
      .eq('staff_id', staff_id)
      .eq('class_id', class_id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      return res.status(409).json({ message: 'This staff member is already assigned to the class.' });
    }

    // Create assignment
    const { data: newAssignment, error: insertError } = await supabaseAdmin
      .from('staff_class_assignments')
      .insert({ staff_id, class_id })
      .select()
      .single();

    if (insertError) throw insertError;

    return res.status(201).json(newAssignment);
  } catch (err) {
    console.error('Error assigning staff to class:', err.message);
    return res.status(500).json({ message: 'Failed to assign staff to class.' });
  }
});

/**
 * DELETE /api/v1/assignments/staff
 * Unassigns a staff member from a class section.
 */
router.delete('/staff', async (req, res) => {
  try {
    const staff_id = req.body.staff_id || req.query.staff_id;
    const class_id = req.body.class_id || req.query.class_id;

    if (!staff_id || !class_id) {
      return res.status(400).json({ message: 'Both staff_id and class_id are required.' });
    }

    const { error } = await supabaseAdmin
      .from('staff_class_assignments')
      .delete()
      .eq('staff_id', staff_id)
      .eq('class_id', class_id);

    if (error) throw error;

    return res.json({ success: true, message: 'Staff member unassigned successfully.' });
  } catch (err) {
    console.error('Error unassigning staff from class:', err.message);
    return res.status(500).json({ message: 'Failed to unassign staff from class.' });
  }
});

module.exports = router;
