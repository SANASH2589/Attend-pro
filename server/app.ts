import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// ============================================================
// Import Route Modules
// ============================================================
import authRouter from './routes/auth';
import staffRouter from './routes/staff';
import studentsRouter from './routes/students';
import classesRouter from './routes/classes';
import assignmentsRouter from './routes/assignments';
import reportsRouter from './routes/reports';
import dashboardRouter from './routes/dashboard';
import attendanceRouter from './routes/attendance';

// ============================================================
// Create Express Application
// ============================================================
const app = express();

// ============================================================
// Middleware Configuration
// ============================================================

// CORS configuration to allow connections from Vite client
const corsOptions: cors.CorsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// ============================================================
// SHARED AUTH ROUTES — /api/auth/*
// ============================================================
app.use('/api/auth', authRouter);

// ============================================================
// SUPER ADMIN ROUTES — /api/super-admin/*
// All routes below require super_admin role via their own middleware
// ============================================================
app.use('/api/super-admin/staff', staffRouter);
app.use('/api/super-admin/students', studentsRouter);
app.use('/api/super-admin/classes', classesRouter);
app.use('/api/super-admin/assignments', assignmentsRouter);
app.use('/api/super-admin/reports', reportsRouter);
app.use('/api/super-admin/dashboard', dashboardRouter);

// Super admin attendance monitoring (read-only session management)
app.use('/api/super-admin/attendance', attendanceRouter);

// ============================================================
// STAFF ROUTES — /api/staff/*
// All routes below require staff role via their own middleware
// ============================================================
app.use('/api/staff/attendance', attendanceRouter);

// ============================================================
// Health Check Endpoint
// ============================================================
app.get('/health', (req: Request, res: Response): void => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// ============================================================
// Centralized Error-Handling Middleware
// ============================================================
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Centralized Server Error:', err.message);
  res.status(500).json({ message: 'An unexpected server error occurred.' });
});

export default app;
