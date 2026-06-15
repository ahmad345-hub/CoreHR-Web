const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee, checkPermission } = require('../middleware/permissions');
const payrollController = require('../controllers/payrollController');

router.use(auth);

router.get('/summary', requireEmployee, checkPermission('payroll.view'), payrollController.getSummary);
router.get('/payslips', requireEmployee, checkPermission('payroll.view'), payrollController.getPayslips);
router.post('/payslips/generate', requireEmployee, checkPermission('payroll.manage'), payrollController.generatePayslips);
router.put('/payslips/:id/confirm', requireEmployee, checkPermission('payroll.manage'), payrollController.confirmPayslip);
router.put('/payslips/:id/pay', requireEmployee, checkPermission('payroll.manage'), payrollController.payPayslip);
router.patch('/payslips/:id', requireEmployee, checkPermission('payroll.manage'), payrollController.updatePayslip);
router.get('/contracts', requireEmployee, checkPermission('payroll.manage'), payrollController.getContracts);
router.post('/contracts', requireEmployee, checkPermission('payroll.manage'), payrollController.createContract);
router.get('/allowances', requireEmployee, checkPermission('payroll.manage'), payrollController.getAllowances);
router.get('/deductions', requireEmployee, checkPermission('payroll.manage'), payrollController.getDeductions);

module.exports = router;
