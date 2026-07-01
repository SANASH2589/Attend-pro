const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');
const { z } = require('zod');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const xlsx = require('xlsx');

// Multer memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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

// Zod schemas for input validation
const studentSchema = z.object({
  roll_number: z.string().min(1, 'Roll number is required'),
  full_name: z.string().min(1, 'Full name is required'),
  parent_phone: z.string().min(5, 'Parent phone number is required'),
  email: z.string().email('Invalid email format').optional().nullable().or(z.literal(''))
});

const updateStudentSchema = z.object({
  roll_number: z.string().min(1, 'Roll number is required').optional(),
  full_name: z.string().min(1, 'Full name is required').optional(),
  parent_phone: z.string().min(5, 'Parent phone number is required').optional(),
  email: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
  is_active: z.boolean().optional()
});

/**
 * GET /api/v1/students
 * Retrieve all students with optional filters for search and class_id.
 */
router.get('/', async (req, res) => {
  try {
    const { search, class_id } = req.query;

    let query = supabaseAdmin
      .from('students')
      .select('*')
      .order('roll_number', { ascending: true });

    if (class_id) {
      // Find students assigned to this class
      const { data: assignments, error: assignError } = await supabaseAdmin
        .from('student_class_assignments')
        .select('student_id')
        .eq('class_id', class_id);

      if (assignError) throw assignError;

      const studentIds = (assignments || []).map(a => a.student_id);
      
      // If no students are assigned to this class, we should return an empty array
      if (studentIds.length === 0) {
        return res.json([]);
      }
      
      query = query.in('id', studentIds);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,roll_number.ilike.%${search}%`);
    }

    const { data: students, error } = await query;
    if (error) throw error;

    return res.json(students);
  } catch (err) {
    console.error('Error fetching students list:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve student records.' });
  }
});

/**
 * POST /api/v1/students
 * Creates a new student profile in the database.
 */
router.post('/', async (req, res) => {
  try {
    const parseResult = studentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: parseResult.error.errors[0].message });
    }

    const studentData = parseResult.data;
    
    // Normalize empty email string to null
    if (studentData.email === '') {
      studentData.email = null;
    }

    // Check for roll number conflict
    const { data: existingStudent, error: checkError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('roll_number', studentData.roll_number)
      .maybeSingle();

    if (existingStudent) {
      return res.status(409).json({ message: `Roll number ${studentData.roll_number} is already registered.` });
    }

    const { data: newStudent, error } = await supabaseAdmin
      .from('students')
      .insert(studentData)
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(newStudent);
  } catch (err) {
    console.error('Error creating student:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to create student.' });
  }
});

/**
 * PUT /api/v1/students/:id
 * Updates details of an existing student.
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parseResult = updateStudentSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: parseResult.error.errors[0].message });
    }

    const updateData = parseResult.data;
    
    // Normalize empty email string to null
    if (updateData.email === '') {
      updateData.email = null;
    }

    // Verify student exists
    const { data: existingStudent, error: checkError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingStudent) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    // If updating roll_number, check for duplicates
    if (updateData.roll_number) {
      const { data: conflictStudent, error: conflictCheckError } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('roll_number', updateData.roll_number)
        .neq('id', id)
        .maybeSingle();

      if (conflictStudent) {
        return res.status(409).json({ message: `Roll number ${updateData.roll_number} is already in use by another student.` });
      }
    }

    const { data: updatedStudent, error } = await supabaseAdmin
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json(updatedStudent);
  } catch (err) {
    console.error('Error updating student profile:', err.message);
    return res.status(500).json({ message: 'Failed to update student profile.' });
  }
});

/**
 * DELETE /api/v1/students/:id
 * Deactivates a student profile (sets is_active = false).
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify student exists
    const { data: existingStudent, error: checkError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingStudent) {
      return res.status(404).json({ message: 'Student record not found.' });
    }

    const { data: deactivatedStudent, error } = await supabaseAdmin
      .from('students')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      message: 'Student record deactivated successfully.',
      student: deactivatedStudent
    });
  } catch (err) {
    console.error('Error deactivating student:', err.message);
    return res.status(500).json({ message: 'Failed to deactivate student record.' });
  }
});

/**
 * Helper to normalize column keys to match database fields
 */
function normalizeKeys(row) {
  const normalized = {};
  for (const key of Object.keys(row)) {
    const k = key.toLowerCase().trim().replace(/[\s_-]+/g, '');
    if (k === 'rollnumber' || k === 'rollno' || k === 'roll' || k === 'roll_number') {
      normalized.roll_number = String(row[key]).trim();
    } else if (k === 'fullname' || k === 'name' || k === 'studentname' || k === 'full_name') {
      normalized.full_name = String(row[key]).trim();
    } else if (k === 'parentphone' || k === 'parentphone_number' || k === 'phone' || k === 'parentmobile' || k === 'parent_phone') {
      normalized.parent_phone = String(row[key]).trim();
    } else if (k === 'email' || k === 'emailid' || k === 'email_id') {
      normalized.email = String(row[key]).trim() || null;
    }
  }
  return normalized;
}

/**
 * POST /api/v1/students/import
 * Accept CSV or Excel uploads, validates columns and content, checks database roll conflicts,
 * and bulk inserts valid rows. Returns detail list of validation failures if any exist.
 */
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    let parsedRows = [];
    const extension = req.file.originalname.split('.').pop().toLowerCase();

    if (extension === 'csv') {
      try {
        parsedRows = parse(req.file.buffer.toString('utf-8'), {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
      } catch (parseErr) {
        return res.status(400).json({ message: 'Failed to parse CSV file. Ensure it is a valid format.' });
      }
    } else if (['xls', 'xlsx'].includes(extension)) {
      try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        parsedRows = xlsx.utils.sheet_to_json(worksheet);
      } catch (parseErr) {
        return res.status(400).json({ message: 'Failed to parse Excel file.' });
      }
    } else {
      return res.status(400).json({ message: 'Unsupported file type. Only CSV and Excel (.xls/.xlsx) files are supported.' });
    }

    if (parsedRows.length === 0) {
      return res.status(400).json({ message: 'The uploaded file does not contain any data.' });
    }

    // 1. Normalize and clean the row fields
    const normalizedRows = parsedRows.map((row, idx) => ({
      rawIndex: idx + 2, // Excel/CSV rows are 1-based, plus header row
      ...normalizeKeys(row)
    }));

    // 2. Perform validations
    const errors = [];
    const validRows = [];
    const rollNumbersSeenInImport = new Set();

    // Fetch existing roll numbers from DB to verify duplicate conflicts
    const { data: dbStudents, error: dbErr } = await supabaseAdmin
      .from('students')
      .select('roll_number');

    if (dbErr) throw dbErr;
    const dbRollNumbers = new Set((dbStudents || []).map(s => s.roll_number));

    for (const row of normalizedRows) {
      const rowErrors = [];

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
          roll_number: row.roll_number,
          full_name: row.full_name,
          parent_phone: row.parent_phone,
          email: row.email || null,
          is_active: true
        });
      }
    }

    const summary = {
      total: normalizedRows.length,
      valid: validRows.length,
      invalid: errors.length
    };

    // If there are validation errors, we reject the import entirely (transactional/all-or-nothing behavior)
    if (errors.length > 0) {
      return res.json({
        success: false,
        summary,
        errors
      });
    }

    // Insert all valid student records
    const { data: insertedStudents, error: insertError } = await supabaseAdmin
      .from('students')
      .insert(validRows)
      .select();

    if (insertError) {
      throw insertError;
    }

    return res.json({
      success: true,
      summary,
      importedCount: insertedStudents.length
    });
  } catch (err) {
    console.error('Error during bulk import of students:', err.message);
    return res.status(500).json({ message: 'Internal server error during student bulk import.' });
  }
});

/**
 * POST /api/super-admin/students/import-preview
 * Parses and validates CSV/Excel roster without writing to DB, returning a preview.
 */
router.post('/import-preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    let parsedRows = [];
    const extension = req.file.originalname.split('.').pop().toLowerCase();

    if (extension === 'csv') {
      try {
        parsedRows = parse(req.file.buffer.toString('utf-8'), {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
      } catch (parseErr) {
        return res.status(400).json({ message: 'Failed to parse CSV file. Ensure it is a valid format.' });
      }
    } else if (['xls', 'xlsx'].includes(extension)) {
      try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        parsedRows = xlsx.utils.sheet_to_json(worksheet);
      } catch (parseErr) {
        return res.status(400).json({ message: 'Failed to parse Excel file.' });
      }
    } else {
      return res.status(400).json({ message: 'Unsupported file type. Only CSV and Excel (.xls/.xlsx) files are supported.' });
    }

    if (parsedRows.length === 0) {
      return res.status(400).json({ message: 'The uploaded file does not contain any data.' });
    }

    const normalizedRows = parsedRows.map((row, idx) => ({
      rawIndex: idx + 2,
      ...normalizeKeys(row)
    }));

    const errors = [];
    const validRows = [];
    const rollNumbersSeenInImport = new Set();

    const { data: dbStudents, error: dbErr } = await supabaseAdmin
      .from('students')
      .select('roll_number');

    if (dbErr) throw dbErr;
    const dbRollNumbers = new Set((dbStudents || []).map(s => s.roll_number));

    for (const row of normalizedRows) {
      const rowErrors = [];

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
          roll_number: row.roll_number,
          full_name: row.full_name,
          parent_phone: row.parent_phone,
          email: row.email || null,
          is_active: true
        });
      }
    }

    const summary = {
      total: normalizedRows.length,
      valid: validRows.length,
      invalid: errors.length
    };

    return res.json({
      success: errors.length === 0,
      summary,
      errors,
      previewRows: validRows
    });
  } catch (err) {
    console.error('Error during import preview:', err.message);
    return res.status(500).json({ message: 'Internal server error during student import preview.' });
  }
});

/**
 * POST /api/super-admin/students/import-save
 * Inserts the validated preview students list into the database.
 */
router.post('/import-save', async (req, res) => {
  try {
    const { students } = req.body;
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'No student data to save.' });
    }

    const { data: insertedStudents, error: insertError } = await supabaseAdmin
      .from('students')
      .insert(students)
      .select();

    if (insertError) {
      throw insertError;
    }

    return res.json({
      success: true,
      importedCount: insertedStudents.length
    });
  } catch (err) {
    console.error('Error saving imported students:', err.message);
    return res.status(500).json({ message: 'Internal server error during saving imported students.' });
  }
});

module.exports = router;
