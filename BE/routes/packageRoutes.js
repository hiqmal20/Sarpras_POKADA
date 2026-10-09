const express = require('express');
const router = express.Router();
const packageController = require('../controller/packageController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { ROLES } = require('../constants/roles');
const validateRequest = require('../middleware/validateRequest');
const { uuidParamHandler } = require('../middleware/validateUuid');
const { createPackageSchema, updatePackageSchema } = require('../validations/packageValidation');
const uploadCSV = require('../middleware/uploadMiddleware').uploadCSV;

router.param('id', uuidParamHandler);
router.use(requireAuth);

router.get('/', packageController.getAllPackages);
router.get('/:id', packageController.getPackageById);
router.post('/import', requireRole(ROLES.ADMIN, ROLES.PETUGAS), uploadCSV.single('file'), packageController.importPackages);
router.post('/:id/stock', requireRole(ROLES.ADMIN, ROLES.PETUGAS), packageController.adjustPackageStock);
router.post('/', requireRole(ROLES.ADMIN, ROLES.PETUGAS), validateRequest(createPackageSchema), packageController.createPackage);
router.put('/:id', requireRole(ROLES.ADMIN, ROLES.PETUGAS), validateRequest(updatePackageSchema), packageController.updatePackage);
router.delete('/:id', requireRole(ROLES.ADMIN), packageController.deletePackage);

module.exports = router;
