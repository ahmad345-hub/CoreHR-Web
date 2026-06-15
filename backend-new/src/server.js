require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const payrollRoutes = require('./routes/payroll');
const recruitmentRoutes = require('./routes/recruitment');
const onboardingRoutes = require('./routes/onboarding');
const offboardingRoutes = require('./routes/offboarding');
const performanceRoutes = require('./routes/performance');
const helpdeskRoutes = require('./routes/helpdesk');
const assetRoutes = require('./routes/assets');
const projectRoutes = require('./routes/projects');
const notificationRoutes = require('./routes/notifications');
const settingsRoutes = require('./routes/settings');
const reportRoutes = require('./routes/reports');
const permissionRoutes = require('./routes/permissions');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health-check', (req, res) => {
  res.json({ message: 'CoreHR API is running.', timestamp: new Date().toISOString() });
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/offboarding', offboardingRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/helpdesk', helpdeskRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/permissions', permissionRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Start server
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    await sequelize.sync({ alter: false });
    console.log('Database synced.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`CoreHR API server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
