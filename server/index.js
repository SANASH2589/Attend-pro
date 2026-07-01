require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration to allow connections from Vite client
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5174',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// ============================================================
// SHARED AUTH ROUTES — /api/auth/*
// ============================================================
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// ============================================================
// SUPER ADMIN ROUTES — /api/super-admin/*
// All routes below require super_admin role via their own middleware
// ============================================================
const staffRouter = require('./routes/staff');
const studentsRouter = require('./routes/students');
const classesRouter = require('./routes/classes');
const assignmentsRouter = require('./routes/assignments');
const smsRouter = require('./routes/sms');
const reportsRouter = require('./routes/reports');
const dashboardRouter = require('./routes/dashboard');

app.use('/api/super-admin/staff', staffRouter);
app.use('/api/super-admin/students', studentsRouter);
app.use('/api/super-admin/classes', classesRouter);
app.use('/api/super-admin/assignments', assignmentsRouter);
app.use('/api/super-admin/sms', smsRouter);
app.use('/api/super-admin/reports', reportsRouter);
app.use('/api/super-admin/dashboard', dashboardRouter);

// Super admin attendance monitoring (read-only session management)
const attendanceRouter = require('./routes/attendance');
app.use('/api/super-admin/attendance', attendanceRouter);

// ============================================================
// STAFF ROUTES — /api/staff/*
// All routes below require staff role via their own middleware
// ============================================================
app.use('/api/staff/attendance', attendanceRouter);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Centralized error-handling middleware
app.use((err, req, res, next) => {
  console.error('Centralized Server Error:', err.message);
  res.status(500).json({ message: 'An unexpected server error occurred.' });
});

const { startScheduler } = require('./services/attendanceScheduler');

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Attend-Pro Express Server running on port: ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Express Server Started`);
  console.log(` Supabase Connected`);
  startScheduler();
  console.log(` Attendance Scheduler Started`);
  console.log(` Listening on Port ${PORT}`);
  console.log(`==================================================`);
});
