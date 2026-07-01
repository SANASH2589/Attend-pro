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

// Zod schemas for input validation
const createStaffSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().optional().nullable()
});

const updateStaffSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').optional(),
  phone: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional()
});

// Helper to normalize a profiles row for the API response
function normalizeProfile(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role?.toLowerCase() || 'staff',
    full_name: row.full_name,
    phone: row.phone,
    is_active: row.status === 'ACTIVE',
    created_at: row.created_at
  };
}

/**
 * GET /api/v1/staff
 * Retrieve all registered staff members, sorted by full_name.
 */
router.get('/', async (req, res) => {
  try {
    const { data: staff, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, full_name, phone, status, created_at')
      .eq('role', 'STAFF')
      .order('full_name', { ascending: true });

    if (error) {
      throw error;
    }

    return res.json(staff.map(normalizeProfile));
  } catch (err) {
    console.error('Error fetching staff list:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve staff list.' });
  }
});

/**
 * POST /api/v1/staff
 * Registers a new staff member in Supabase Auth and inserts their profile into the profiles table.
 */
router.post('/', async (req, res) => {
  let createdAuthUserId = null;
  try {
    const parseResult = createStaffSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: parseResult.error.errors[0].message });
    }

    const { email, password, full_name, phone } = parseResult.data;

    // 1. Create auth user via admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError || !authData.user) {
      return res.status(400).json({
        message: authError?.message || 'Failed to create auth credentials.'
      });
    }

    createdAuthUserId = authData.user.id;

    // 2. Insert profile record into public.profiles
    const { data: userData, error: userError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: createdAuthUserId,
        email,
        role: 'STAFF',
        full_name,
        phone: phone || null,
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (userError) {
      throw userError;
    }

    return res.status(201).json(normalizeProfile(userData));
  } catch (err) {
    console.error('Error creating staff account:', err.message);
    
    // Cleanup auth user if database insertion failed
    if (createdAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      } catch (cleanupErr) {
        console.error('Failed to cleanup auth user after db insertion error:', cleanupErr.message);
      }
    }

    return res.status(500).json({
      message: err.message || 'Internal server error occurred while creating staff.'
    });
  }
});

/**
 * PUT /api/v1/staff/:id
 * Updates an existing staff profile details.
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parseResult = updateStaffSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: parseResult.error.errors[0].message });
    }

    const updateData = { ...parseResult.data };

    // Map is_active boolean from client to status string for DB
    if ('is_active' in req.body) {
      updateData.status = req.body.is_active ? 'ACTIVE' : 'INACTIVE';
    }

    // Verify user exists and is staff
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    if (existingUser.role !== 'STAFF') {
      return res.status(400).json({ message: 'User is not a staff member.' });
    }

    // Update public.profiles record
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return res.json(normalizeProfile(updatedUser));
  } catch (err) {
    console.error('Error updating staff profile:', err.message);
    return res.status(500).json({ message: 'Failed to update staff profile.' });
  }
});

/**
 * DELETE /api/v1/staff/:id
 * Deactivates a staff member (marks status = INACTIVE).
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user exists and is staff
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    if (existingUser.role !== 'STAFF') {
      return res.status(400).json({ message: 'User is not a staff member.' });
    }

    const { data: deactivatedUser, error: deactivateError } = await supabaseAdmin
      .from('profiles')
      .update({ status: 'INACTIVE' })
      .eq('id', id)
      .select()
      .single();

    if (deactivateError) {
      throw deactivateError;
    }

    return res.json({
      success: true,
      message: 'Staff member deactivated successfully.',
      user: normalizeProfile(deactivatedUser)
    });
  } catch (err) {
    console.error('Error deactivating staff member:', err.message);
    return res.status(500).json({ message: 'Failed to deactivate staff member.' });
  }
});

/**
 * POST /api/super-admin/staff/:id/reset-password
 * Resets the password of a staff member.
 */
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Verify user exists and is staff
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    if (existingUser.role !== 'STAFF') {
      return res.status(400).json({ message: 'User is not a staff member.' });
    }

    // Update password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: password
    });

    if (authError) {
      throw authError;
    }

    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    console.error('Error resetting staff password:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to reset staff password.' });
  }
});

module.exports = router;
