import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import type { AuthenticatedUser } from '../types';

async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Ask Supabase directly whether this token is valid —
    // no need for JWT_SECRET or manual verification at all
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }

    // Fetch role + profile info from profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, full_name, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      res.status(401).json({ message: 'User profile not found' });
      return;
    }

    if (profile.status !== 'ACTIVE') {
      res.status(403).json({ message: 'Account is deactivated' });
      return;
    }

    // Attach to request — normalize role to lowercase for downstream guards
    req.user = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role.toLowerCase(),
      is_active: profile.status === 'ACTIVE'
    };

    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Auth middleware error:', message);
    res.status(500).json({ message: 'Authentication check failed' });
  }
}

// Role guard — use after authMiddleware
function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export default authMiddleware;
export { authMiddleware, requireRole };
