const express = require('express');
const router = express.Router();
const damageReportController = require('../controller/damageReportController');
const validateRequest = require('../middleware/validateRequest');
const { createDamageReportSchema, updateDamageReportStatusSchema } = require('../validations/damageReportValidation');

router.get('/', damageReportController.getAllReports);
router.get('/:id', damageReportController.getReportById);
router.post('/', validateRequest(createDamageReportSchema), damageReportController.createReport);
router.patch('/:id/status', validateRequest(updateDamageReportStatusSchema), damageReportController.updateReportStatus);

module.exports = router;
