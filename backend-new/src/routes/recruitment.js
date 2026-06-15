const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireEmployee, checkPermission } = require('../middleware/permissions');
const recruitmentController = require('../controllers/recruitmentController');

router.use(auth);
router.use(requireEmployee);

router.get('/pipeline', checkPermission('recruitment.view'), recruitmentController.getPipeline);
router.get('/postings', checkPermission('recruitment.view'), recruitmentController.getPostings);
router.get('/candidates', checkPermission('recruitment.view'), recruitmentController.getCandidates);
router.get('/stages', checkPermission('recruitment.view'), recruitmentController.getStages);
router.post('/candidates', checkPermission('recruitment.manage'), recruitmentController.addCandidate);
router.put('/candidates/:id/move', checkPermission('recruitment.manage'), recruitmentController.moveCandidate);
router.put('/candidates/:id/hire', checkPermission('recruitment.manage'), recruitmentController.hireCandidate);
router.patch('/candidates/:id', checkPermission('recruitment.manage'), recruitmentController.updateCandidate);
router.get('/:id/pipeline', checkPermission('recruitment.view'), recruitmentController.getPipelineById);
router.get('/', checkPermission('recruitment.view'), recruitmentController.list);
router.post('/', checkPermission('recruitment.manage'), recruitmentController.create);

module.exports = router;
