const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee, checkPermission } = require('../middleware/permissions');
const settingsController = require('../controllers/settingsController');

router.use(auth);
router.use(requireEmployee);
router.use(checkPermission('settings.manage'));

// Companies
router.get('/companies', settingsController.getCompanies);
router.post('/companies', settingsController.createCompany);
router.put('/companies/:id', settingsController.updateCompany);
router.delete('/companies/:id', settingsController.deleteCompany);

// Departments
router.get('/departments', settingsController.getDepartments);
router.post('/departments', settingsController.createDepartment);
router.put('/departments/:id', settingsController.updateDepartment);
router.delete('/departments/:id', settingsController.deleteDepartment);

// Positions (frontend calls both /positions and /job-positions)
router.get('/positions', settingsController.getJobPositions);
router.get('/job-positions', settingsController.getJobPositions);
router.post('/positions', settingsController.createPosition);
router.post('/job-positions', settingsController.createPosition);
router.put('/positions/:id', settingsController.updatePosition);
router.put('/job-positions/:id', settingsController.updatePosition);
router.delete('/positions/:id', settingsController.deletePosition);
router.delete('/job-positions/:id', settingsController.deletePosition);

// Shifts
router.get('/shifts', settingsController.getShifts);
router.post('/shifts', settingsController.createShift);
router.put('/shifts/:id', settingsController.updateShift);
router.delete('/shifts/:id', settingsController.deleteShift);

// Work Types
router.get('/work-types', settingsController.getWorkTypes);

// Holidays
router.get('/holidays', settingsController.getHolidays);
router.post('/holidays', settingsController.createHoliday);
router.put('/holidays/:id', settingsController.updateHoliday);
router.delete('/holidays/:id', settingsController.deleteHoliday);

// General settings
router.get('/', settingsController.get);
router.put('/', settingsController.update);

module.exports = router;
