const { createClient } = require('@supabase/supabase-js');

// Service-role client — only used server-side, never expose this key to the client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Ask Supabase directly whether this token is valid —
    // no need for JWT_SECRET or manual verification at all
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Fetch role + profile info from profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, full_name, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ message: 'User profile not found' });
    }

    if (profile.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is deactivated' });
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
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(500).json({ message: 'Authentication check failed' });
  }
}

// Role guard — use after authMiddleware
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

// Support both function-direct import and object destructuring
authMiddleware.authMiddleware = authMiddleware;
authMiddleware.requireRole = requireRole;

module.exports = authMiddleware;

