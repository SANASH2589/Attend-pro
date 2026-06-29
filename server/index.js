require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration to allow connections from Vite client
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Auth router mounting
const authRouter = require('./routes/auth');
app.use('/api/v1/auth', authRouter);

// Admin routers mounting
const staffRouter = require('./routes/staff');
const studentsRouter = require('./routes/students');
const classesRouter = require('./routes/classes');
const assignmentsRouter = require('./routes/assignments');
const attendanceRouter = require('./routes/attendance');
const smsRouter = require('./routes/sms');
const reportsRouter = require('./routes/reports');

app.use('/api/v1/staff', staffRouter);
app.use('/api/v1/students', studentsRouter);
app.use('/api/v1/classes', classesRouter);
app.use('/api/v1/assignments', assignmentsRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/sms', smsRouter);
app.use('/api/v1/reports', reportsRouter);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Centralized error-handling middleware
app.use((err, req, res, next) => {
  console.error('Centralized Server Error:', err.message);
  res.status(500).json({ message: 'An unexpected server error occurred.' });
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Attend-Pro Express Server running on port: ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`==================================================`);
});
