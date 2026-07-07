import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { startScheduler } from './services/attendanceScheduler';

const PORT: number = parseInt(process.env.PORT || '3001', 10);

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
