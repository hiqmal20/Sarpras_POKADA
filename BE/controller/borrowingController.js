const borrowingService = require('../services/borrowingService');
const { sendSuccess } = require('../utils/responseHandler');
const { ROLES } = require('../constants/roles');

exports.getAllBorrowings = async (req, res, next) => {
  try {
    const isPrivileged = [ROLES.ADMIN, ROLES.PETUGAS].includes(req.user.role);
    const query = { ...req.query };
    if (!isPrivileged) {
      query.user_id = req.user.id;
    }
    const result = await borrowingService.findAllBorrowings(query);
    return sendSuccess(
      res,
      'Data peminjaman berhasil dimuat',
      result.borrowings,
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

exports.getBorrowingById = async (req, res, next) => {
  try {
    const data = await borrowingService.findBorrowingById(req.params.id);
    const isPrivileged = [ROLES.ADMIN, ROLES.PETUGAS].includes(req.user.role);
    if (!isPrivileged && data.user_id !== req.user.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'Akses ditolak: Anda tidak memiliki izin untuk melihat data ini.'
      });
    }
    return sendSuccess(res, 'Detail peminjaman berhasil dimuat', data, 200);
  } catch (err) {
    next(err);
  }
};

exports.createBorrowing = async (req, res, next) => {
  try {
    req.body.user_id = req.user.id;
    const data = await borrowingService.createBorrowingRequest(req.body);
    return sendSuccess(res, 'Pengajuan peminjaman berhasil dibuat', data, 201);
  } catch (err) {
    next(err);
  }
};

exports.updateBorrowingStatus = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (payload.admin_notes && !payload.admin_note) {
      payload.admin_note = payload.admin_notes;
    }
    const data = await borrowingService.updateStatus(req.params.id, payload);
    return sendSuccess(res, `Status peminjaman berhasil diperbarui menjadi ${req.body.status}`, data, 200);
  } catch (err) {
    next(err);
  }
};
