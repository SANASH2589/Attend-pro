import { Router } from 'express';
import {
  sendSmsController,
  testSmsController
} from '../controllers/sms.controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

// Protected test route — requires super_admin
router.post(
  '/test',
  authMiddleware,
  requireRole('super_admin'),
  testSmsController
);

// Protected send route
router.post(
  '/send',
  authMiddleware,
  requireRole('super_admin'),
  sendSmsController
);

// Retrieve SMS logs list for dashboard review
router.get(
  '/logs',
  authMiddleware,
  requireRole('super_admin'),
  async (req, res): Promise<any> => {
    try {
      const { 
        search = '', 
        status = '', 
        page   = '1', 
        limit  = '30' 
      } = req.query as { search?: string; status?: string; page?: string; limit?: string };

      // Use inner join when searching to filter parent rows correctly in PostgREST
      const studentSelect = search 
        ? 'students!inner(full_name, roll_number)' 
        : 'students(full_name, roll_number)';

      let query = supabaseAdmin
        .from('sms_logs')
        .select(`
          id,
          phone_number,
          message_body,
          status,
          sent_at,
          ${studentSelect}
        `, { count: 'exact' })
        .order('sent_at', { ascending: false })
        .range(
          (Number(page) - 1) * Number(limit),
          Number(page) * Number(limit) - 1
        );

      if (status) {
        query = query.eq('status', status.toLowerCase());
      }
      
      if (search) {
        query = query.ilike(
          'students.full_name', 
          `%${search}%`
        );
      }

      const { data, error, count } = await query;

      if (error) {
        return res.status(500).json({ 
          message: error.message 
        });
      }

      return res.status(200).json({ 
        data, 
        total: count,
        page:  Number(page),
        limit: Number(limit)
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message || 'Failed to fetch SMS logs.' });
    }
  }
);

export default router;
