import express, { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import authMiddleware from '../middleware/auth';
import { z } from 'zod';

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

// Convert "HH:MM" or "HH:MM:SS" to minutes since midnight
function timeToMinutes(t: string | null | undefined): number {
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
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Fetch classes
    const { data: classes, error: classError } = await supabaseAdmin
      .from('classes')
      .select('*')
      .order('name', { ascending: true });

    if (classError) throw classError;

    if (classes!.length === 0) {
      res.json([]);
      return;
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
    const studentCounts: Record<string, number> = {};
    const staffCounts: Record<string, number> = {};

    studentAssignments!.forEach((sa: { class_id: string }) => {
      studentCounts[sa.class_id] = (studentCounts[sa.class_id] || 0) + 1;
    });

    staffAssignments!.forEach((sa: { class_id: string }) => {
      staffCounts[sa.class_id] = (staffCounts[sa.class_id] || 0) + 1;
    });

    // 4. Combine results
    const classesWithMetrics = classes!.map((c: { id: string; [key: string]: unknown }) => ({
      ...c,
      student_count: studentCounts[c.id] || 0,
      staff_count: staffCounts[c.id] || 0
    }));

    res.json(classesWithMetrics);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching classes list:', message);
    res.status(500).json({ message: 'Failed to retrieve class records.' });
  }
});

/**
 * POST /api/v1/classes
 * Creates a new class configuration.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = classSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ message: parseResult.error.errors[0].message });
      return;
    }

    const classData: Record<string, unknown> = { ...parseResult.data };
    
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
      .eq('name', classData.name as string)
      .maybeSingle();

    if (existingClass) {
      res.status(409).json({ message: `Class with name "${classData.name}" already exists.` });
      return;
    }

    const { data: newClass, error } = await supabaseAdmin
      .from('classes')
      .insert({
        ...classData,
        created_by: req.user!.id
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(newClass);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error creating class:', message);
    res.status(500).json({ message: message || 'Failed to create class configuration.' });
  }
});

/**
 * PUT /api/v1/classes/:id
 * Updates details of an existing class.
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parseResult = updateClassSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ message: parseResult.error.errors[0].message });
      return;
    }

    const updateData: Record<string, unknown> = { ...parseResult.data };

    // Verify class exists
    const { data: existingClass, error: checkError } = await supabaseAdmin
      .from('classes')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingClass) {
      res.status(404).json({ message: 'Class configuration not found.' });
      return;
    }

    // Check name conflict if name is updated
    if (updateData.name && updateData.name !== existingClass.name) {
      const { data: nameConflict } = await supabaseAdmin
        .from('classes')
        .select('id')
        .eq('name', updateData.name as string)
        .neq('id', id)
        .maybeSingle();

      if (nameConflict) {
        res.status(409).json({ message: `Class with name "${updateData.name}" already exists.` });
        return;
      }
    }

    // Clear times if batch_type is updated
    const finalBatchType = (updateData.batch_type || existingClass.batch_type) as string;
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

    res.json(updatedClass);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error updating class profile:', message);
    res.status(500).json({ message: 'Failed to update class configuration.' });
  }
});

/**
 * DELETE /api/v1/classes/:id
 * Deletes a class configuration, subject to 409 session guard.
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Verify class exists
    const { data: existingClass, error: checkError } = await supabaseAdmin
      .from('classes')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingClass) {
      res.status(404).json({ message: 'Class configuration not found.' });
      return;
    }

    // 409 Conflict Guard: check if attendance sessions exist
    const { count, error: countError } = await supabaseAdmin
      .from('attendance_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', id);

    if (countError) throw countError;

    if (count && count > 0) {
      res.status(409).json({
        message: 'Cannot delete this class. There are attendance sessions logged for it.'
      });
      return;
    }

    const { error: deleteError } = await supabaseAdmin
      .from('classes')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    res.json({
      success: true,
      message: 'Class configuration deleted successfully.'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error deleting class configuration:', message);
    res.status(500).json({ message: 'Failed to delete class configuration.' });
  }
});

interface ParseResult {
  validRollNumbers: string[];
  invalidTokens: string[];
}

/**
 * Parses and expands a comma-separated string containing roll numbers and ranges.
 */
function parseRollNumberInput(input: string): ParseResult {
  const validRolls = new Set<string>();
  const invalidTokens: string[] = [];

  if (!input || !input.trim()) {
    return { validRollNumbers: [], invalidTokens: [] };
  }

  // Split by comma
  const tokens = input.split(',');

  for (let token of tokens) {
    token = token.trim();
    if (!token) continue; // Skip empty tokens

    // Check if it's a range
    if (token.includes('-')) {
      const parts = token.split('-');
      if (parts.length !== 2) {
        invalidTokens.push(token);
        continue;
      }

      const startRaw = parts[0].trim().toUpperCase();
      const endRaw = parts[1].trim().toUpperCase();

      if (!startRaw || !endRaw) {
        invalidTokens.push(token);
        continue;
      }

      // Match alphabetical prefix and numeric suffix
      const matchRegex = /^([A-Z]+)(\d+)$/;
      const startMatch = startRaw.match(matchRegex);
      const endMatch = endRaw.match(matchRegex);

      if (!startMatch || !endMatch) {
        invalidTokens.push(token);
        continue;
      }

      const [, startPrefix, startNumStr] = startMatch;
      const [, endPrefix, endNumStr] = endMatch;

      if (startPrefix !== endPrefix) {
        invalidTokens.push(token);
        continue;
      }

      const startNum = parseInt(startNumStr, 10);
      const endNum = parseInt(endNumStr, 10);

      if (startNum > endNum) {
        invalidTokens.push(token);
        continue;
      }

      const numLength = startNumStr.length;
      for (let i = startNum; i <= endNum; i++) {
        const paddedNum = String(i).padStart(numLength, '0');
        validRolls.add(`${startPrefix}${paddedNum}`);
      }
    } else {
      // Individual roll number
      const rollUpper = token.toUpperCase();
      const matchRegex = /^([A-Z]+)(\d+)$/;
      if (!rollUpper.match(matchRegex)) {
        invalidTokens.push(token);
        continue;
      }
      validRolls.add(rollUpper);
    }
  }

  return {
    validRollNumbers: Array.from(validRolls),
    invalidTokens
  };
}

/**
 * POST /api/super-admin/classes/:id/assign-range
 * Preview or execute student assignment by roll number ranges.
 */
router.post('/:id/assign-range', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: classId } = req.params;
    const { ranges, preview } = req.body;

    if (typeof ranges !== 'string') {
      res.status(400).json({ message: 'Ranges must be a comma-separated string of roll numbers.' });
      return;
    }

    // 1. Verify class exists
    const { data: existingClass, error: classCheckError } = await supabaseAdmin
      .from('classes')
      .select('id')
      .eq('id', classId)
      .maybeSingle();

    if (classCheckError || !existingClass) {
      res.status(404).json({ message: 'Class section not found.' });
      return;
    }

    // 2. Parse the roll number range string
    const { validRollNumbers, invalidTokens } = parseRollNumberInput(ranges);

    // If no valid roll numbers were parsed, and we have no invalid tokens, it's an empty input
    if (validRollNumbers.length === 0 && invalidTokens.length === 0) {
      res.status(400).json({ message: 'No roll numbers provided.' });
      return;
    }

    // 3. Query all active students matching the valid roll numbers
    let dbStudents: any[] = [];
    if (validRollNumbers.length > 0) {
      const { data: fetchedStudents, error: studentError } = await supabaseAdmin
        .from('students')
        .select('id, roll_number, is_active')
        .in('roll_number', validRollNumbers)
        .eq('is_active', true);

      if (studentError) throw studentError;
      dbStudents = fetchedStudents || [];
    }

    // Map database roll numbers to their profiles for easy lookup
    const studentMap = new Map<string, { id: string; roll_number: string }>();
    dbStudents.forEach(student => {
      studentMap.set(student.roll_number.toUpperCase(), student);
    });

    // 4. Query student assignments for this class
    const { data: existingAssignments, error: assignError } = await supabaseAdmin
      .from('student_class_assignments')
      .select('student_id')
      .eq('class_id', classId);

    if (assignError) throw assignError;

    const assignedStudentIds = new Set((existingAssignments || []).map((a: { student_id: string }) => a.student_id));

    // 5. Partition the parsed roll numbers into states
    const assignedRolls: string[] = [];
    const alreadyAssignedRolls: string[] = [];
    const notFoundRolls: string[] = [];
    const studentsToAssign: { id: string; roll_number: string }[] = [];

    validRollNumbers.forEach(roll => {
      const student = studentMap.get(roll);
      if (!student) {
        notFoundRolls.push(roll);
      } else if (assignedStudentIds.has(student.id)) {
        alreadyAssignedRolls.push(roll);
      } else {
        assignedRolls.push(roll);
        studentsToAssign.push(student);
      }
    });

    const isPreview = !!preview;

    // 6. If not preview mode, perform the batch insert
    if (!isPreview && studentsToAssign.length > 0) {
      const insertRows = studentsToAssign.map(s => ({
        student_id: s.id,
        class_id: classId
      }));

      const { error: insertError } = await supabaseAdmin
        .from('student_class_assignments')
        .insert(insertRows);

      if (insertError) throw insertError;
    }

    // 7. Calculate stats and return response
    const requestedCount = validRollNumbers.length + invalidTokens.length;
    const assignedCount = studentsToAssign.length;
    const alreadyAssignedCount = alreadyAssignedRolls.length;
    const invalidCount = invalidTokens.length;
    const notFoundCount = notFoundRolls.length;

    res.json({
      success: true,
      summary: {
        requested: requestedCount,
        assigned: assignedCount,
        alreadyAssigned: alreadyAssignedCount,
        invalid: invalidCount,
        notFound: notFoundCount
      },
      details: {
        assigned: assignedRolls,
        alreadyAssigned: alreadyAssignedRolls,
        invalid: invalidTokens,
        notFound: notFoundRolls
      }
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in range-based student assignment:', message);
    res.status(500).json({ message: 'Failed to process range-based student assignment.' });
  }
});

export default router;
