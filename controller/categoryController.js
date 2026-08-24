const categoryService = require('../services/categoryService');
const { sendSuccess } = require('../utils/responseHandler');

// Get all categories
exports.getAllCategories = async (req, res, next) => {
  try {
    const data = await categoryService.findAllCategories(req.query);
    return sendSuccess(res, 'Data kategori berhasil dimuat', data, 200, { total: data.length });
  } catch (err) {
    next(err);
  }
};

// Get category by ID
exports.getCategoryById = async (req, res, next) => {
  try {
    const data = await categoryService.findCategoryById(req.params.id);
    return sendSuccess(res, 'Detail kategori berhasil dimuat', data, 200);
  } catch (err) {
    next(err);
  }
};

// Create new category
exports.createCategory = async (req, res, next) => {
  try {
    const data = await categoryService.createNewCategory(req.body);
    return sendSuccess(res, 'Kategori berhasil ditambahkan', data, 201);
  } catch (err) {
    next(err);
  }
};

// Update category
exports.updateCategory = async (req, res, next) => {
  try {
    const data = await categoryService.updateExistingCategory(req.params.id, req.body);
    return sendSuccess(res, 'Kategori berhasil diperbarui', data, 200);
  } catch (err) {
    next(err);
  }
};

// Delete category
exports.deleteCategory = async (req, res, next) => {
  try {
    await categoryService.deleteExistingCategory(req.params.id);
    return sendSuccess(res, 'Kategori berhasil dihapus', null, 200);
  } catch (err) {
    next(err);
  }
};
