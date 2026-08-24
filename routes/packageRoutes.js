const express = require('express');
const router = express.Router();
const packageController = require('../controller/packageController');
const validateRequest = require('../middleware/validateRequest');
const { createPackageSchema, updatePackageSchema } = require('../validations/packageValidation');

router.get('/', packageController.getAllPackages);
router.get('/:id', packageController.getPackageById);
router.post('/', validateRequest(createPackageSchema), packageController.createPackage);
router.put('/:id', validateRequest(updatePackageSchema), packageController.updatePackage);
router.delete('/:id', packageController.deletePackage);

module.exports = router;
