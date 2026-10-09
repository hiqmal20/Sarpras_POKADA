const packageService = require('../services/packageService');
const { sendSuccess } = require('../utils/responseHandler');

// Get all packages
exports.getAllPackages = async (req, res, next) => {
  try {
    const data = await packageService.findAllPackages(req.query);
    return sendSuccess(res, 'Data paket sarpras berhasil dimuat', data, 200, { total: data.length });
  } catch (err) {
    next(err);
  }
};

// Get package by ID
exports.getPackageById = async (req, res, next) => {
  try {
    const data = await packageService.findPackageById(req.params.id);
    return sendSuccess(res, 'Detail paket sarpras berhasil dimuat', data, 200);
  } catch (err) {
    next(err);
  }
};

// Create package
exports.createPackage = async (req, res, next) => {
  try {
    const data = await packageService.createNewPackage(req.body);
    const io = req.app.get('io');
    if (io) {
      io.emit('package_created', { package: data });
      io.emit('package_updated', { package: data });
      io.emit('stock_updated', { type: 'package', action: 'create', package: data, id: data.id });
    }
    return sendSuccess(res, 'Paket sarpras berhasil dibuat', data, 201);
  } catch (err) {
    next(err);
  }
};

// Update package
exports.updatePackage = async (req, res, next) => {
  try {
    const data = await packageService.updateExistingPackage(req.params.id, req.body);
    const io = req.app.get('io');
    if (io) {
      io.emit('package_updated', { package: data });
      io.emit('stock_updated', { type: 'package', action: 'update', package: data, id: data.id });
    }
    return sendSuccess(res, 'Paket sarpras berhasil diperbarui', data, 200);
  } catch (err) {
    next(err);
  }
};

// Delete package
exports.deletePackage = async (req, res, next) => {
  try {
    await packageService.deleteExistingPackage(req.params.id);
    const io = req.app.get('io');
    if (io) {
      io.emit('package_deleted', { id: req.params.id });
      io.emit('stock_updated', { type: 'package', action: 'delete', id: req.params.id });
    }
    return sendSuccess(res, 'Paket sarpras berhasil dihapus', null, 200);
  } catch (err) {
    next(err);
  }
};

// Import packages from CSV
exports.importPackages = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new Error('File CSV paket wajib diunggah'));
    }

    const result = await packageService.importPackagesFromCSV(req.file.buffer);
    const io = req.app.get('io');
    if (io) {
      io.emit('stock_updated', { type: 'package', action: 'import' });
    }
    const message = `Import paket selesai: ${result.success.length} berhasil, ${result.failed.length} gagal`;
    return sendSuccess(res, message, result, result.failed.length > 0 ? 207 : 201);
  } catch (err) {
    next(err);
  }
};

// Adjust package stock (+ or -)
exports.adjustPackageStock = async (req, res, next) => {
  try {
    const data = await packageService.adjustPackageStock(req.params.id, req.body);
    const io = req.app.get('io');
    if (io) {
      io.emit('package_updated', { package: data });
      io.emit('stock_updated', { type: 'package', action: 'adjust', package: data, id: req.params.id });
    }
    return sendSuccess(res, 'Stok paket berhasil diperbarui', data, 200);
  } catch (err) {
    next(err);
  }
};
