const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../lib/supabase');

/**
 * Middleware to verify Supabase JWT, authenticate the user,
 * and attach user profile and role details to the request.
 */
module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Malformed authorization header' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-supabase-jwt-secret-or-custom-secret');
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired session token' });
    }

    const userId = decoded.sub; // Supabase uses the 'sub' claim for the auth user's UUID

    // Retrieve user details from our custom users table using the admin client (RLS bypass)
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, role, full_name, is_active')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'User profile not found in Attend-Pro registry' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'This user account is deactivated' });
    }

    // Attach user profile information to request object
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role, // 'super_admin' or 'staff'
      full_name: user.full_name
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(500).json({ message: 'Internal server error during authentication verification' });
  }
};
