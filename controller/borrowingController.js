const borrowingService = require('../services/borrowingService');
const { sendSuccess } = require('../utils/responseHandler');

// Get all borrowings
exports.getAllBorrowings = async (req, res, next) => {
  try {
    const result = await borrowingService.findAllBorrowings(req.query);
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

// Get borrowing by ID
exports.getBorrowingById = async (req, res, next) => {
  try {
    const data = await borrowingService.findBorrowingById(req.params.id);
    return sendSuccess(res, 'Detail peminjaman berhasil dimuat', data, 200);
  } catch (err) {
    next(err);
  }
};

// Create new borrowing request
exports.createBorrowing = async (req, res, next) => {
  try {
    const data = await borrowingService.createBorrowingRequest(req.body);
    return sendSuccess(res, 'Pengajuan peminjaman berhasil dibuat', data, 201);
  } catch (err) {
    next(err);
  }
};

// Update borrowing status (Approval / Rejection / Cancellation)
exports.updateBorrowingStatus = async (req, res, next) => {
  try {
    const data = await borrowingService.updateStatus(req.params.id, req.body);
    return sendSuccess(res, `Status peminjaman berhasil diperbarui menjadi ${req.body.status}`, data, 200);
  } catch (err) {
    next(err);
  }
};
