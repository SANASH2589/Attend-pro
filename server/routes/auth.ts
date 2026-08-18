import express, { Request, Response } from 'express';
import { supabaseClient, supabaseAdmin } from '../lib/supabase';
import authMiddleware from '../middleware/auth';
import { z } from 'zod';
import type { LoginResponse, ApiError } from '../types';

const router = express.Router();

// Input validation schema using Zod
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters long')
});

/**
 * POST /api/v1/auth/login
 * Accepts email & password, authenticates via Supabase Auth,
 * verifies record in custom users table, and returns JWT session token and role.
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ message: parseResult.error.errors[0].message });
      return;
    }

    const { email, password } = parseResult.data;

    // Authenticate credentials via Supabase client
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.session) {
      res.status(401).json({
        message: authError?.message || 'Authentication failed. Please verify credentials.'
      });
      return;
    }

    const userId = authData.user.id;

    // Retrieve database profile details (bypass RLS using admin client)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, full_name, status')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      // User is authenticated in Supabase auth, but missing in our profiles table
      res.status(401).json({
        message: 'Your account is not registered in the Attend-Pro system.'
      });
      return;
    }

    if (userProfile.status !== 'ACTIVE') {
      res.status(403).json({
        message: 'Your account has been deactivated. Please contact administration.'
      });
      return;
    }

    const normalizedRole = userProfile.role.toLowerCase();

    // Return the session token, user details, and user role
    res.json({
      token: authData.session.access_token,
      role: normalizedRole,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.full_name || userProfile.email.split('@')[0],
        role: normalizedRole
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Login routing error:', message);
    res.status(500).json({ message: 'Internal server error occurred during login.' });
  }
});

/**
 * POST /api/v1/auth/logout
 * Handles backend notification of session clearance.
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      // Try to sign out in Supabase auth system using standard client
      await supabaseClient.auth.signOut({ scope: 'local' });
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.warn('Supabase logout trigger warning:', message);
    res.json({ success: true, message: 'Session token cleared.' });
  }
});

/**
 * GET /api/v1/auth/me
 * Retrieves current user profile details based on session bearer token.
 */
router.get('/me', authMiddleware, (req: Request, res: Response): void => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role,
    name: req.user!.full_name || req.user!.email.split('@')[0]
  });
});

export default router;
