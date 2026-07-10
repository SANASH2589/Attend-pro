import { Router } from 'express';
import {
  sendSmsController,
  testSmsController
} from '../controllers/sms.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

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

export default router;
