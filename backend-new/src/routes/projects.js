const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee, checkPermission } = require('../middleware/permissions');
const projectController = require('../controllers/projectController');

router.use(auth);
router.use(requireEmployee);

router.get('/timesheets', projectController.getTimesheets);
router.post('/timesheets', projectController.createTimesheet);
router.put('/tasks/:id', checkPermission('projects.manage'), projectController.updateTask);
router.patch('/tasks/:id', checkPermission('projects.manage'), projectController.updateTask);
router.delete('/tasks/:id', checkPermission('projects.manage'), projectController.deleteTask);
router.get('/', checkPermission('projects.view'), projectController.list);
router.post('/', checkPermission('projects.manage'), projectController.create);
router.get('/:id/tasks', checkPermission('projects.view'), projectController.getTasks);
router.post('/:id/tasks', checkPermission('projects.manage'), projectController.createTask);

module.exports = router;
