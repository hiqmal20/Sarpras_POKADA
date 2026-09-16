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
    const isPrivileged = ['Admin', 'Petugas'].includes(req.user.role);
    if (!isPrivileged && data?.borrowings?.user_id !== req.user.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'Akses ditolak: Anda tidak memiliki izin untuk melihat data ini.'
      });
    }
    return sendSuccess(res, 'Detail pengembalian berhasil dimuat', data, 200);
  } catch (err) {
    next(err);
  }
};

// Create return
exports.createReturn = async (req, res, next) => {
  try {
    const isPrivileged = ['Admin', 'Petugas'].includes(req.user.role);
    const payload = { ...req.body };
    if (payload.notes && !payload.note) {
      payload.note = payload.notes;
    }
    if (!isPrivileged) {
      delete payload.received_by;
    } else if (!payload.received_by) {
      payload.received_by = req.user.id;
    }
    const data = await returnService.createReturnRecord(payload, { requester: req.user });
    return sendSuccess(res, 'Pengembalian barang berhasil diproses', data, 201);
  } catch (err) {
    next(err);
  }
};
