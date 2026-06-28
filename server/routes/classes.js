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

// Convert "HH:MM" or "HH:MM:SS" to minutes since midnight
function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Zod schemas for input validation
const classSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  batch_type: z.enum(['morning', 'evening', 'both']),
  morning_start: z.string().optional().nullable(),
  morning_lock: z.string().optional().nullable(),
  evening_start: z.string().optional().nullable(),
  evening_lock: z.string().optional().nullable()
}).superRefine((data, ctx) => {
  if (data.batch_type === 'morning' || data.batch_type === 'both') {
    if (!data.morning_start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Morning start time is required', path: ['morning_start'] });
    }
    if (!data.morning_lock) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Morning lock time is required', path: ['morning_lock'] });
    }
    if (data.morning_start && data.morning_lock) {
      if (timeToMinutes(data.morning_lock) <= timeToMinutes(data.morning_start)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Morning lock time must be after start time', path: ['morning_lock'] });
      }
    }
  }

  if (data.batch_type === 'evening' || data.batch_type === 'both') {
    if (!data.evening_start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Evening start time is required', path: ['evening_start'] });
    }
    if (!data.evening_lock) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Evening lock time is required', path: ['evening_lock'] });
    }
    if (data.evening_start && data.evening_lock) {
      if (timeToMinutes(data.evening_lock) <= timeToMinutes(data.evening_start)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Evening lock time must be after start time', path: ['evening_lock'] });
      }
    }
  }
});

const updateClassSchema = z.object({
  name: z.string().min(1, 'Class name is required').optional(),
  batch_type: z.enum(['morning', 'evening', 'both']).optional(),
  morning_start: z.string().optional().nullable(),
  morning_lock: z.string().optional().nullable(),
  evening_start: z.string().optional().nullable(),
  evening_lock: z.string().optional().nullable()
}).superRefine((data, ctx) => {
  const batchType = data.batch_type;
  
  // Only perform refinement if times are updated or batch_type is present
  if (batchType === 'morning' || batchType === 'both') {
    if (data.morning_start && data.morning_lock) {
      if (timeToMinutes(data.morning_lock) <= timeToMinutes(data.morning_start)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Morning lock time must be after start time', path: ['morning_lock'] });
      }
    }
  }
  if (batchType === 'evening' || batchType === 'both') {
    if (data.evening_start && data.evening_lock) {
      if (timeToMinutes(data.evening_lock) <= timeToMinutes(data.evening_start)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Evening lock time must be after start time', path: ['evening_lock'] });
      }
    }
  }
});

/**
 * GET /api/v1/classes
 * Retrieve all classes with counts of assigned students and staff.
 */
router.get('/', async (req, res) => {
  try {
    // 1. Fetch classes
    const { data: classes, error: classError } = await supabaseAdmin
      .from('classes')
      .select('*')
      .order('name', { ascending: true });

    if (classError) throw classError;

    if (classes.length === 0) {
      return res.json([]);
    }

    // 2. Fetch assignments to compute counts
    const { data: studentAssignments, error: studError } = await supabaseAdmin
      .from('student_class_assignments')
      .select('class_id');

    if (studError) throw studError;

    const { data: staffAssignments, error: staffError } = await supabaseAdmin
      .from('staff_class_assignments')
      .select('class_id');

    if (staffError) throw staffError;

    // 3. Aggregate counts in memory
    const studentCounts = {};
    const staffCounts = {};

    studentAssignments.forEach(sa => {
      studentCounts[sa.class_id] = (studentCounts[sa.class_id] || 0) + 1;
    });

    staffAssignments.forEach(sa => {
      staffCounts[sa.class_id] = (staffCounts[sa.class_id] || 0) + 1;
    });

    // 4. Combine results
    const classesWithMetrics = classes.map(c => ({
      ...c,
      student_count: studentCounts[c.id] || 0,
      staff_count: staffCounts[c.id] || 0
    }));

    return res.json(classesWithMetrics);
  } catch (err) {
    console.error('Error fetching classes list:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve class records.' });
  }
});

/**
 * POST /api/v1/classes
 * Creates a new class configuration.
 */
router.post('/', async (req, res) => {
  try {
    const parseResult = classSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: parseResult.error.errors[0].message });
    }

    const classData = parseResult.data;
    
    // Clear out times that don't match the batch type
    if (classData.batch_type === 'morning') {
      classData.evening_start = null;
      classData.evening_lock = null;
    } else if (classData.batch_type === 'evening') {
      classData.morning_start = null;
      classData.morning_lock = null;
    }

    // Check for class name duplicate conflict
    const { data: existingClass, error: checkError } = await supabaseAdmin
      .from('classes')
      .select('id')
      .eq('name', classData.name)
      .maybeSingle();

    if (existingClass) {
      return res.status(409).json({ message: `Class with name "${classData.name}" already exists.` });
    }

    const { data: newClass, error } = await supabaseAdmin
      .from('classes')
      .insert({
        ...classData,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(newClass);
  } catch (err) {
    console.error('Error creating class:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to create class configuration.' });
  }
});

/**
 * PUT /api/v1/classes/:id
 * Updates details of an existing class.
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parseResult = updateClassSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: parseResult.error.errors[0].message });
    }

    const updateData = parseResult.data;

    // Verify class exists
    const { data: existingClass, error: checkError } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingClass) {
      return res.status(404).json({ message: 'Class configuration not found.' });
    }

    // Check name conflict if name is updated
    if (updateData.name && updateData.name !== existingClass.name) {
      const { data: nameConflict } = await supabaseAdmin
        .from('classes')
        .select('id')
        .eq('name', updateData.name)
        .neq('id', id)
        .maybeSingle();

      if (nameConflict) {
        return res.status(409).json({ message: `Class with name "${updateData.name}" already exists.` });
      }
    }

    // Clear times if batch_type is updated
    const finalBatchType = updateData.batch_type || existingClass.batch_type;
    if (finalBatchType === 'morning') {
      updateData.evening_start = null;
      updateData.evening_lock = null;
    } else if (finalBatchType === 'evening') {
      updateData.morning_start = null;
      updateData.morning_lock = null;
    }

    const { data: updatedClass, error } = await supabaseAdmin
      .from('classes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json(updatedClass);
  } catch (err) {
    console.error('Error updating class profile:', err.message);
    return res.status(500).json({ message: 'Failed to update class configuration.' });
  }
});

/**
 * DELETE /api/v1/classes/:id
 * Deletes a class configuration, subject to 409 session guard.
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify class exists
    const { data: existingClass, error: checkError } = await supabaseAdmin
      .from('classes')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingClass) {
      return res.status(404).json({ message: 'Class configuration not found.' });
    }

    // 409 Conflict Guard: check if attendance sessions exist
    const { count, error: countError } = await supabaseAdmin
      .from('attendance_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', id);

    if (countError) throw countError;

    if (count && count > 0) {
      return res.status(409).json({
        message: 'Cannot delete this class. There are attendance sessions logged for it.'
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('classes')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return res.json({
      success: true,
      message: 'Class configuration deleted successfully.'
    });
  } catch (err) {
    console.error('Error deleting class configuration:', err.message);
    return res.status(500).json({ message: 'Failed to delete class configuration.' });
  }
});

module.exports = router;
