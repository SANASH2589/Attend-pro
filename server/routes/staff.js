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
  is_active: z.boolean().optional()
});

/**
 * GET /api/v1/staff
 * Retrieve all registered staff members, sorted by full_name.
 */
router.get('/', async (req, res) => {
  try {
    const { data: staff, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role, full_name, phone, is_active, created_at')
      .eq('role', 'staff')
      .order('full_name', { ascending: true });

    if (error) {
      throw error;
    }

    return res.json(staff);
  } catch (err) {
    console.error('Error fetching staff list:', err.message);
    return res.status(500).json({ message: 'Failed to retrieve staff list.' });
  }
});

/**
 * POST /api/v1/staff
 * Registers a new staff member in Supabase Auth and inserts their profile details into our database.
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

    // 2. Insert profile record into public.users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: createdAuthUserId,
        email,
        role: 'staff',
        full_name,
        phone: phone || null,
        is_active: true
      })
      .select()
      .single();

    if (userError) {
      throw userError;
    }

    return res.status(201).json(userData);
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

    const updateData = parseResult.data;

    // Verify user exists and is staff
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    if (existingUser.role !== 'staff') {
      return res.status(400).json({ message: 'User is not a staff member.' });
    }

    // Update public.users record
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return res.json(updatedUser);
  } catch (err) {
    console.error('Error updating staff profile:', err.message);
    return res.status(500).json({ message: 'Failed to update staff profile.' });
  }
});

/**
 * DELETE /api/v1/staff/:id
 * Deactivates a staff member (marks is_active = false).
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user exists and is staff
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return res.status(404).json({ message: 'Staff member not found.' });
    }

    if (existingUser.role !== 'staff') {
      return res.status(400).json({ message: 'User is not a staff member.' });
    }

    const { data: deactivatedUser, error: deactivateError } = await supabaseAdmin
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (deactivateError) {
      throw deactivateError;
    }

    return res.json({
      success: true,
      message: 'Staff member deactivated successfully.',
      user: deactivatedUser
    });
  } catch (err) {
    console.error('Error deactivating staff member:', err.message);
    return res.status(500).json({ message: 'Failed to deactivate staff member.' });
  }
});

module.exports = router;
