const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee, checkPermission } = require('../middleware/permissions');
const helpdeskController = require('../controllers/helpdeskController');

router.use(auth);
router.use(requireEmployee);

router.get('/categories', helpdeskController.getCategories);
router.post('/categories', checkPermission('helpdesk.manage'), helpdeskController.createCategory);
router.get('/tickets', checkPermission('helpdesk.view'), helpdeskController.getTickets);
router.post('/tickets', checkPermission('helpdesk.create'), helpdeskController.createTicket);
router.put('/tickets/:id', checkPermission('helpdesk.manage'), helpdeskController.updateTicket);
router.patch('/tickets/:id', checkPermission('helpdesk.manage'), helpdeskController.updateTicket);
router.delete('/tickets/:id', checkPermission('helpdesk.manage'), helpdeskController.deleteTicket);

module.exports = router;
