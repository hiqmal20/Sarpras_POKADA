const returnService = require('../services/returnService');
const { sendSuccess } = require('../utils/responseHandler');

// Get all returns
exports.getAllReturns = async (req, res, next) => {
  try {
    const result = await returnService.findAllReturns(req.query);
    return sendSuccess(
      res,
      'Data pengembalian berhasil dimuat',
      result.returns,
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

// Get return by ID
exports.getReturnById = async (req, res, next) => {
  try {
    const data = await returnService.findReturnById(req.params.id);
    return sendSuccess(res, 'Detail pengembalian berhasil dimuat', data, 200);
  } catch (err) {
    next(err);
  }
};

// Create return
exports.createReturn = async (req, res, next) => {
  try {
    const data = await returnService.createReturnRecord(req.body);
    return sendSuccess(res, 'Pengembalian barang berhasil diproses', data, 201);
  } catch (err) {
    next(err);
  }
};
