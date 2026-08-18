import express, { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import authMiddleware from '../middleware/auth';
import { z } from 'zod';
import type { Profile, NormalizedProfile } from '../types';

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
function normalizeProfile(row: Profile): NormalizedProfile {
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
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: staff, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, full_name, phone, status, created_at')
      .eq('role', 'STAFF')
      .order('full_name', { ascending: true });

    if (error) {
      throw error;
    }

    res.json(staff!.map((row: Profile) => normalizeProfile(row)));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching staff list:', message);
    res.status(500).json({ message: 'Failed to retrieve staff list.' });
  }
});

/**
 * POST /api/v1/staff
 * Registers a new staff member in Supabase Auth and inserts their profile into the profiles table.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  let createdAuthUserId: string | null = null;
  try {
    const parseResult = createStaffSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ message: parseResult.error.errors[0].message });
      return;
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
      res.status(400).json({
        message: authError?.message || 'Failed to create auth credentials.'
      });
      return;
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

    res.status(201).json(normalizeProfile(userData));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error creating staff account:', message);
    
    // Cleanup auth user if database insertion failed
    if (createdAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      } catch (cleanupErr: unknown) {
        const cleanupMessage = cleanupErr instanceof Error ? cleanupErr.message : 'Unknown error';
        console.error('Failed to cleanup auth user after db insertion error:', cleanupMessage);
      }
    }

    res.status(500).json({
      message: message || 'Internal server error occurred while creating staff.'
    });
  }
});

/**
 * PUT /api/v1/staff/:id
 * Updates an existing staff profile details.
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const parseResult = updateStaffSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ message: parseResult.error.errors[0].message });
      return;
    }

    const updateData: Record<string, unknown> = { ...parseResult.data };

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
      res.status(404).json({ message: 'Staff member not found.' });
      return;
    }

    if (existingUser.role !== 'STAFF') {
      res.status(400).json({ message: 'User is not a staff member.' });
      return;
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

    res.json(normalizeProfile(updatedUser));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error updating staff profile:', message);
    res.status(500).json({ message: 'Failed to update staff profile.' });
  }
});

/**
 * DELETE /api/v1/staff/:id
 * Hard deletes a staff member and all their session history.
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Prevent self-deletion
    if (id === req.user?.id) {
      res.status(403).json({
        success: false,
        message: 'You cannot delete your own account.'
      });
      return;
    }

    // Check staff exists
    const { data: staff, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', id)
      .eq('role', 'STAFF')
      .single();

    if (findError || !staff) {
      res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
      return;
    }

    // Delete in correct FK dependency order

    // 1. Get all sessions by this staff member
    const { data: sessions } = await supabaseAdmin
      .from('attendance_sessions')
      .select('id')
      .eq('staff_id', id);

    const sessionIds = sessions?.map(s => s.id) || [];

    // 2. Delete attendance_records for those sessions
    if (sessionIds.length > 0) {
      await supabaseAdmin
        .from('attendance_records')
        .delete()
        .in('session_id', sessionIds);

      // 3. Delete sms_logs for those sessions
      await supabaseAdmin
        .from('sms_logs')
        .delete()
        .in('session_id', sessionIds);

      // 4. Delete audit_log for those sessions
      await supabaseAdmin
        .from('audit_log')
        .delete()
        .in('session_id', sessionIds);

      // 5. Delete the sessions themselves
      await supabaseAdmin
        .from('attendance_sessions')
        .delete()
        .eq('staff_id', id);
    }

    // 6. Delete staff class assignments
    await supabaseAdmin
      .from('staff_class_assignments')
      .delete()
      .eq('staff_id', id);

    // 7. Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.error('[Staff Delete] Auth delete error:', authError.message);
      // Continue anyway — remove from profiles table
    }

    // 8. Delete from profiles table
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete staff record',
        error: deleteError.message
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `${staff.full_name} and all related records have been deleted.`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error deleting staff member:', message);
    res.status(500).json({ message: 'Failed to delete staff member.' });
  }
});

/**
 * POST /api/super-admin/staff/:id/reset-password
 * Resets the password of a staff member.
 */
router.post('/:id/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { password } = req.body;

    if (!password || password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters long' });
      return;
    }

    // Verify user exists and is staff
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      res.status(404).json({ message: 'Staff member not found.' });
      return;
    }

    if (existingUser.role !== 'STAFF') {
      res.status(400).json({ message: 'User is not a staff member.' });
      return;
    }

    // Update password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: password
    });

    if (authError) {
      throw authError;
    }

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error resetting staff password:', message);
    res.status(500).json({ message: message || 'Failed to reset staff password.' });
  }
});

export default router;
