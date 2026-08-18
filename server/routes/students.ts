import express, { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import authMiddleware from '../middleware/auth';
import { z } from 'zod';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import xlsx from 'xlsx';
import type { ImportValidationError, ImportSummary, NormalizedImportRow } from '../types';

const router = express.Router();

// Multer memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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

// Zod schemas for input validation
const studentSchema = z.object({
  roll_number:  z.string().min(1).max(50),
  full_name:    z.string().min(2).max(100),
  department:   z.string().max(100).optional(),
  section:      z.string().max(20).optional(),
  parent_phone: z.string().min(10).max(15),
  email:        z.string().email().optional()
                .or(z.literal(''))
                .nullable(),
});

const updateStudentSchema = z.object({
  roll_number:  z.string().min(1).max(50).optional(),
  full_name:    z.string().min(2).max(100).optional(),
  department:   z.string().max(100).optional(),
  section:      z.string().max(20).optional(),
  parent_phone: z.string().min(10).max(15).optional(),
  email:        z.string().email().optional()
                .or(z.literal(''))
                .nullable(),
  is_active:    z.boolean().optional()
});

/**
 * GET /api/v1/students
 * Retrieve all students with optional filters for search and class_id.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, class_id } = req.query as { search?: string; class_id?: string };

    // Query 1: fetch students base query
    let query = supabaseAdmin
      .from('students')
      .select('id, roll_number, full_name, department, section, parent_phone, email, is_active, created_at, updated_at')
      .order('roll_number', { ascending: true });

    if (class_id) {
      // Find student IDs assigned to this class
      const { data: assignments, error: assignError } = await supabaseAdmin
        .from('student_class_assignments')
        .select('student_id')
        .eq('class_id', class_id);

      if (assignError) {
        console.error('[Students GET] Assignment error:', assignError.message);
        res.status(500).json({ message: assignError.message });
        return;
      }

      const studentIds = (assignments || []).map((a: any) => a.student_id);
      if (studentIds.length === 0) {
        res.json([]);
        return;
      }
      query = query.in('id', studentIds);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,roll_number.ilike.%${search}%`);
    }

    const { data: students, error: sErr } = await query;

    if (sErr) {
      console.error('[Students GET] Supabase error:', JSON.stringify(sErr, null, 2));
      res.status(500).json({ 
        message: sErr.message,
        details: sErr.details,
        hint:    sErr.hint
      });
      return;
    }

    // Query 2: fetch assignments for matched students
    const studentIds = (students || []).map(s => s.id);
    let assignments: any[] = [];
    if (studentIds.length > 0) {
      const { data: assignData, error: aErr } = await supabaseAdmin
        .from('student_class_assignments')
        .select('student_id, classes(name)')
        .in('student_id', studentIds);

      if (aErr) {
        console.error('[Students GET] Assignments fetch error:', aErr.message);
        res.status(500).json({ message: aErr.message });
        return;
      }
      assignments = assignData || [];
    }

    // Build lookup map
    const classMap: Record<string, string> = {};
    assignments.forEach((a: any) => {
      classMap[a.student_id] = a.classes?.name || null;
    });

    // Merge
    const result = (students || []).map(s => ({
      id:             s.id,
      roll_number:    s.roll_number,
      full_name:      s.full_name,
      department:     s.department || null,
      section:        s.section || null,
      parent_phone:   s.parent_phone,
      email:          s.email || null,
      is_active:      s.is_active,
      assigned_class: classMap[s.id] || null,
      created_at:     s.created_at,
      updated_at:     s.updated_at || s.created_at,
    }));

    res.json(result);
  } catch (err: any) {
    console.error('[Students GET] Exception:', err.message, err.stack);
    res.status(500).json({ 
      message: err.message 
    });
  }
});

/**
 * POST /api/v1/students
 * Creates a new student profile in the database.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = studentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ message: parseResult.error.errors[0].message });
      return;
    }

    const data = parseResult.data;
    const studentData = {
      roll_number:  data.roll_number,
      full_name:    data.full_name,
      department:   data.department || null,
      section:      data.section || null,
      parent_phone: data.parent_phone,
      email:        data.email || null,
      is_active:    true,
    };

    // Check for roll number conflict
    const { data: existingStudent, error: checkError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('roll_number', studentData.roll_number as string)
      .maybeSingle();

    if (existingStudent) {
      res.status(409).json({ message: `Roll number ${studentData.roll_number} is already registered.` });
      return;
    }

    const { data: newStudent, error } = await supabaseAdmin
      .from('students')
      .insert(studentData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(newStudent);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error creating student:', message);
    res.status(500).json({ message: message || 'Failed to create student.' });
  }
});

/**
 * PUT /api/v1/students/:id
 * Updates details of an existing student.
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate - only allow known fields
    const updateSchema = z.object({
      roll_number:  z.string().min(1).max(50).optional(),
      full_name:    z.string().min(2).max(100).optional(),
      department:   z.string().max(100).nullable().optional(),
      section:      z.string().max(20).nullable().optional(),
      parent_phone: z.string().min(10).max(15).optional(),
      email:        z.string().email().nullable()
                    .optional()
                    .or(z.literal('')),
      is_active:    z.boolean().optional(),
    });

    const parsed = updateSchema.safeParse(req.body);
    
    if (!parsed.success) {
      res.status(400).json({
        message: parsed.error.errors[0].message,
        errors:  parsed.error.issues
      });
      return;
    }

    // Build update object — only include fields that were actually sent
    const updateData: Record<string, any> = {};
    
    if (parsed.data.roll_number !== undefined)
      updateData.roll_number = parsed.data.roll_number;
    if (parsed.data.full_name !== undefined)
      updateData.full_name = parsed.data.full_name;
    if (parsed.data.department !== undefined)
      updateData.department = parsed.data.department;
    if (parsed.data.section !== undefined)
      updateData.section = parsed.data.section;
    if (parsed.data.parent_phone !== undefined)
      updateData.parent_phone = parsed.data.parent_phone;
    if (parsed.data.email !== undefined)
      updateData.email = parsed.data.email || null;
    if (parsed.data.is_active !== undefined)
      updateData.is_active = parsed.data.is_active;

    console.log('[Students PUT] Updating:', id, updateData);

    // Verify student exists
    const { data: existingStudent, error: checkError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingStudent) {
      res.status(404).json({ message: 'Student record not found.' });
      return;
    }

    // If updating roll_number, check for duplicates
    if (updateData.roll_number) {
      const { data: conflictStudent, error: conflictCheckError } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('roll_number', updateData.roll_number as string)
        .neq('id', id)
        .maybeSingle();

      if (conflictStudent) {
        res.status(409).json({ message: `Roll number ${updateData.roll_number} is already in use by another student.` });
        return;
      }
    }

    const { data: updatedStudent, error } = await supabaseAdmin
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Students PUT] Error:', JSON.stringify(error, null, 2));
      res.status(500).json({ 
        message: error.message,
        hint:    error.hint 
      });
      return;
    }

    res.status(200).json(updatedStudent);
  } catch (err: any) {
    console.error('[Students PUT] Exception:', err.message);
    res.status(500).json({ 
      message: err.message 
    });
  }
});

/**
 * DELETE /api/v1/students/:id
 * Hard deletes a student and all their attendance history.
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if student has attendance records
    const { data: records } = await supabaseAdmin
      .from('attendance_records')
      .select('id')
      .eq('student_id', id)
      .limit(1);

    if (records && records.length > 0) {
      // Has attendance history — soft delete only
      const { error } = await supabaseAdmin
        .from('students')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw new Error(error.message);

      res.status(200).json({
        message: 
          'Student deactivated. Cannot permanently ' +
          'delete a student with attendance records.',
        soft_deleted: true
      });
      return;
    }

    // No attendance records — safe to hard delete
    // First remove class assignment if exists
    await supabaseAdmin
      .from('student_class_assignments')
      .delete()
      .eq('student_id', id);

    // Also delete any sms logs associated with the student (if any)
    await supabaseAdmin
      .from('sms_logs')
      .delete()
      .eq('student_id', id);

    // Then delete the student
    const { error } = await supabaseAdmin
      .from('students')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    res.status(200).json({
      message: 'Student deleted successfully.',
      soft_deleted: false
    });
    return;

  } catch (err: any) {
    console.error('[Students DELETE]', err.message);
    res.status(500).json({ 
      message: err.message 
    });
    return;
  }
});

/**
 * Helper to normalize column keys to match database fields
 */
function normalizeKeys(row: Record<string, unknown>): Partial<NormalizedImportRow> {
  const normalized: Partial<NormalizedImportRow> = {};
  for (const key of Object.keys(row)) {
    const k = key.toLowerCase().trim().replace(/[\s_.-]+/g, '');
    if (k === 'rollnumber' || k === 'rollno' || k === 'rollno.' || k === 'roll' || k === 'roll_number') {
      normalized.roll_number = String(row[key]).trim();
    } else if (k === 'fullname' || k === 'name' || k === 'studentname' || k === 'full_name') {
      normalized.full_name = String(row[key]).trim();
    } else if (k === 'parentphone' || k === 'parentphone_number' || k === 'phone' || k === 'parentmobile' || k === 'parent_phone' || k === 'mobile') {
      normalized.parent_phone = String(row[key]).trim();
    } else if (k === 'email' || k === 'emailid' || k === 'email_id') {
      normalized.email = String(row[key]).trim() || null;
    } else if (k === 'classid' || k === 'class_id') {
      normalized.class_id = String(row[key]).trim() || null;
    } else if (k === 'department' || k === 'dept') {
      normalized.department = String(row[key]).trim() || null;
    } else if (k === 'section' || k === 'sec') {
      normalized.section = String(row[key]).trim() || null;
    }
  }
  return normalized;
}

/**
 * POST /api/v1/students/import
 * Accept CSV or Excel uploads, validates columns and content, checks database roll conflicts,
 * and bulk inserts valid rows. Returns detail list of validation failures if any exist.
 */
router.post('/import', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded.' });
      return;
    }

    let parsedRows: Record<string, unknown>[] = [];
    const extension = req.file.originalname.split('.').pop()!.toLowerCase();

    if (extension === 'csv') {
      try {
        parsedRows = parse(req.file.buffer.toString('utf-8'), {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
      } catch (parseErr) {
        res.status(400).json({ message: 'Failed to parse CSV file. Ensure it is a valid format.' });
        return;
      }
    } else if (['xls', 'xlsx'].includes(extension)) {
      try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        parsedRows = xlsx.utils.sheet_to_json(worksheet);
      } catch (parseErr) {
        res.status(400).json({ message: 'Failed to parse Excel file.' });
        return;
      }
    } else {
      res.status(400).json({ message: 'Unsupported file type. Only CSV and Excel (.xls/.xlsx) files are supported.' });
      return;
    }

    if (parsedRows.length === 0) {
      res.status(400).json({ message: 'The uploaded file does not contain any data.' });
      return;
    }

    // 1. Normalize and clean the row fields
    const normalizedRows = parsedRows.map((row, idx) => ({
      rawIndex: idx + 2, // Excel/CSV rows are 1-based, plus header row
      ...normalizeKeys(row)
    }));

    const errors: ImportValidationError[] = [];
    const validRows: { roll_number: string; full_name: string; department?: string | null; section?: string | null; parent_phone: string; email: string | null; is_active: boolean }[] = [];
    const rollNumbersSeenInImport = new Set<string>();

    // Fetch existing roll numbers from DB to verify duplicate conflicts
    const { data: dbStudents, error: dbErr } = await supabaseAdmin
      .from('students')
      .select('roll_number');

    if (dbErr) throw dbErr;
    const dbRollNumbers = new Set((dbStudents || []).map((s: { roll_number: string }) => s.roll_number));

    for (const row of normalizedRows) {
      const rowErrors: string[] = [];

      if (!row.roll_number) {
        rowErrors.push('Roll Number is missing.');
      } else {
        if (rollNumbersSeenInImport.has(row.roll_number)) {
          rowErrors.push(`Duplicate roll number "${row.roll_number}" within the uploaded file.`);
        }
        if (dbRollNumbers.has(row.roll_number)) {
          rowErrors.push(`Roll number "${row.roll_number}" is already registered in the system.`);
        }
        rollNumbersSeenInImport.add(row.roll_number);
      }

      if (!row.full_name) {
        rowErrors.push('Student Name is missing.');
      }

      if (!row.parent_phone) {
        rowErrors.push('Parent Phone Number is missing.');
      } else if (row.parent_phone.length < 5) {
        rowErrors.push('Parent Phone Number is too short.');
      }

      if (row.email) {
        const emailSchema = z.string().email();
        const emailCheck = emailSchema.safeParse(row.email);
        if (!emailCheck.success) {
          rowErrors.push(`Invalid email format: "${row.email}".`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: row.rawIndex,
          studentName: row.full_name || 'Unknown',
          rollNumber: row.roll_number || 'N/A',
          reasons: rowErrors
        });
      } else {
        validRows.push({
          roll_number: row.roll_number!,
          full_name: row.full_name!,
          department: row.department || null,
          section: row.section || null,
          parent_phone: row.parent_phone!,
          email: row.email || null,
          is_active: true
        });
      }
    }

    const summary: ImportSummary = {
      total: normalizedRows.length,
      valid: validRows.length,
      invalid: errors.length
    };

    // If there are validation errors, we reject the import entirely (transactional/all-or-nothing behavior)
    if (errors.length > 0) {
      res.json({
        success: false,
        summary,
        errors
      });
      return;
    }

    // Insert all valid student records
    const { data: insertedStudents, error: insertError } = await supabaseAdmin
      .from('students')
      .insert(validRows)
      .select();

    if (insertError) {
      throw insertError;
    }

    res.json({
      success: true,
      summary,
      importedCount: insertedStudents!.length
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error during bulk import of students:', message);
    res.status(500).json({ message: 'Internal server error during student bulk import.' });
  }
});

/**
 * POST /api/super-admin/students/import-preview
 * Parses and validates CSV/Excel roster without writing to DB, returning a preview.
 */
router.post('/import-preview', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded.' });
      return;
    }

    let parsedRows: Record<string, unknown>[] = [];
    const extension = req.file.originalname.split('.').pop()!.toLowerCase();

    if (extension === 'csv') {
      try {
        parsedRows = parse(req.file.buffer.toString('utf-8'), {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
      } catch (parseErr) {
        res.status(400).json({ message: 'Failed to parse CSV file. Ensure it is a valid format.' });
        return;
      }
    } else if (['xls', 'xlsx'].includes(extension)) {
      try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        parsedRows = xlsx.utils.sheet_to_json(worksheet);
      } catch (parseErr) {
        res.status(400).json({ message: 'Failed to parse Excel file.' });
        return;
      }
    } else {
      res.status(400).json({ message: 'Unsupported file type. Only CSV and Excel (.xls/.xlsx) files are supported.' });
      return;
    }

    if (parsedRows.length === 0) {
      res.status(400).json({ message: 'The uploaded file does not contain any data.' });
      return;
    }

    const normalizedRows = parsedRows.map((row, idx) => ({
      rawIndex: idx + 2,
      ...normalizeKeys(row)
    }));

    const errors: ImportValidationError[] = [];
    const validRows: { roll_number: string; full_name: string; department?: string | null; section?: string | null; parent_phone: string; email: string | null; is_active: boolean; class_id?: string | null; rawIndex?: number }[] = [];
    const rollNumbersSeenInImport = new Set<string>();

    const { data: dbStudents, error: dbErr } = await supabaseAdmin
      .from('students')
      .select('roll_number');

    if (dbErr) throw dbErr;
    const dbRollNumbers = new Set((dbStudents || []).map((s: { roll_number: string }) => s.roll_number));

    for (const row of normalizedRows) {
      const rowErrors: string[] = [];

      if (!row.roll_number) {
        rowErrors.push('Roll Number is missing.');
      } else {
        if (rollNumbersSeenInImport.has(row.roll_number)) {
          rowErrors.push(`Duplicate roll number "${row.roll_number}" within the uploaded file.`);
        }
        if (dbRollNumbers.has(row.roll_number)) {
          rowErrors.push(`Roll number "${row.roll_number}" is already registered in the system.`);
        }
        rollNumbersSeenInImport.add(row.roll_number);
      }

      if (!row.full_name) {
        rowErrors.push('Student Name is missing.');
      }

      if (!row.parent_phone) {
        rowErrors.push('Parent Phone Number is missing.');
      } else if (row.parent_phone.length < 5) {
        rowErrors.push('Parent Phone Number is too short.');
      }

      if (row.email) {
        const emailSchema = z.string().email();
        const emailCheck = emailSchema.safeParse(row.email);
        if (!emailCheck.success) {
          rowErrors.push(`Invalid email format: "${row.email}".`);
        }
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: row.rawIndex,
          studentName: row.full_name || 'Unknown',
          rollNumber: row.roll_number || 'N/A',
          reasons: rowErrors
        });
      } else {
        validRows.push({
          roll_number: row.roll_number!,
          full_name: row.full_name!,
          department: row.department || null,
          section: row.section || null,
          parent_phone: row.parent_phone!,
          email: row.email || null,
          is_active: true,
          class_id: row.class_id || null,
          rawIndex: row.rawIndex
        } as any);
      }
    }

    const summary: ImportSummary = {
      total: normalizedRows.length,
      valid: validRows.length,
      invalid: errors.length
    };

    res.json({
      success: errors.length === 0,
      summary,
      errors,
      previewRows: validRows
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error during import preview:', message);
    res.status(500).json({ message: 'Internal server error during student import preview.' });
  }
});

/**
 * POST /api/super-admin/students/import-save
 * Inserts the validated preview students list into the database.
 */
router.post('/import-save', async (req: Request, res: Response): Promise<void> => {
  try {
    const { students } = req.body;
    if (!students || !Array.isArray(students) || students.length === 0) {
      res.status(400).json({ message: 'No student data to save.' });
      return;
    }

    const studentsToInsert = students.map((s: any) => {
      const { class_id, rawIndex, ...studentData } = s;
      return studentData;
    });

    const { data: insertedStudents, error: insertError } = await supabaseAdmin
      .from('students')
      .insert(studentsToInsert)
      .select();

    if (insertError) {
      throw insertError;
    }

    const warnings: string[] = [];
    const { data: classesList } = await supabaseAdmin
      .from('classes')
      .select('id, name');
    const classesMap = new Map((classesList || []).map((c: any) => [c.id, c.name]));

    for (const student of (insertedStudents || [])) {
      const originalRow = students.find((s: any) => s.roll_number === student.roll_number);
      if (originalRow && originalRow.class_id) {
        const classId = originalRow.class_id;
        const rawIndex = originalRow.rawIndex || 'N/A';

        const { data: existingAssignment } = await supabaseAdmin
          .from('student_class_assignments')
          .select('class_id, classes(name)')
          .eq('student_id', student.id)
          .maybeSingle();

        if (existingAssignment) {
          const currentClassName = (existingAssignment.classes as any)?.name || 'a class';
          warnings.push(`Row ${rawIndex}: Student already assigned to "${currentClassName}" — class assignment skipped.`);
        } else {
          if (classesMap.has(classId)) {
            const { error: assignErr } = await supabaseAdmin
              .from('student_class_assignments')
              .insert({ student_id: student.id, class_id: classId });
            if (assignErr) {
              console.error(`Failed to assign student ${student.full_name} to class ${classId}:`, assignErr.message);
              warnings.push(`Row ${rawIndex}: Failed to assign student to class — ${assignErr.message}.`);
            }
          } else {
            warnings.push(`Row ${rawIndex}: Class ID "${classId}" not found — class assignment skipped.`);
          }
        }
      }
    }

    res.json({
      success: true,
      importedCount: insertedStudents!.length,
      warnings
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error saving imported students:', message);
    res.status(500).json({ message: 'Internal server error during saving imported students.' });
  }
});

export default router;
