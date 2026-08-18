import { Router, Request, Response } from 'express';
import authMiddleware from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();
router.use(authMiddleware);

// GET /api/v1/notifications
// Returns last 20 notifications for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return res.status(500).json({ 
        message: error.message 
      });
    }

    // Rename created_at to createdAt for frontend
    const notifications = (data || []).map(n => ({
      ...n,
      createdAt: n.created_at
    }));

    return res.status(200).json({ notifications });
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
});

// PUT /api/v1/notifications/read-all
// Mark all notifications as read
router.put(
  '/read-all', 
  async (req: Request, res: Response) => {
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', req.user!.id)
        .eq('read', false);

      if (error) {
        return res.status(500).json({ 
          message: error.message 
        });
      }

      return res.status(200).json({ 
        success: true 
      });
    } catch (e: any) {
      return res.status(500).json({ message: e.message });
    }
  }
);

export default router;
