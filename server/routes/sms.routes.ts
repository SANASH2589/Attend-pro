import { Router } from 'express';
import {
  sendSmsController,
  testSmsController
} from '../controllers/sms.controller';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Protected route
router.post(
  '/send',
  authMiddleware,
  requireRole('super_admin'),
  sendSmsController
);

// Temporary public route for local testing
// TODO: restore auth after SMS confirmed working
router.post('/test', testSmsController);

export default router;
