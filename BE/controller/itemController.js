const itemService = require('../services/itemService');
const { sendSuccess } = require('../utils/responseHandler');
const { recordLog } = require('../services/auditLogService');

// Get all items
exports.getAllItems = async (req, res, next) => {
  try {
    const result = await itemService.findAllItems(req.query);
    return sendSuccess(
      res,
      'Data barang berhasil dimuat',
      result.items,
      200,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    );
  } catch (err) {
    next(err);
  }
};

// Get item by ID
exports.getItemById = async (req, res, next) => {
  try {
    const data = await itemService.findItemById(req.params.id);
    return sendSuccess(res, 'Detail barang berhasil dimuat', data, 200);
  } catch (err) {
    next(err);
  }
};

// Create new item
exports.createItem = async (req, res, next) => {
  try {
    const data = await itemService.createNewItem(req.body);
    recordLog({
      action: 'CREATE_ITEM',
      entityType: 'items',
      entityId: data?.id,
      details: { name: data?.name, code: data?.code ?? data?.item_code, stock: data?.stock },
      req
    });
    return sendSuccess(res, 'Barang berhasil ditambahkan', data, 201);
  } catch (err) {
    next(err);
  }
};

// Update item
exports.updateItem = async (req, res, next) => {
  try {
    const data = await itemService.updateExistingItem(req.params.id, req.body);
    recordLog({
      action: 'UPDATE_ITEM',
      entityType: 'items',
      entityId: req.params.id,
      details: { name: data?.name, stock: data?.stock, status: data?.status },
      req
    });
    return sendSuccess(res, 'Data barang berhasil diperbarui', data, 200);
  } catch (err) {
    next(err);
  }
};

// Delete item
exports.deleteItem = async (req, res, next) => {
  try {
    await itemService.deleteExistingItem(req.params.id);
    recordLog({
      action: 'DELETE_ITEM',
      entityType: 'items',
      entityId: req.params.id,
      req
    });
    return sendSuccess(res, 'Barang berhasil dihapus', null, 200);
  } catch (err) {
    next(err);
  }
};
