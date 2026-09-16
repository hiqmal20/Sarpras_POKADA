const damageReportService = require('../services/damageReportService');
const { sendSuccess } = require('../utils/responseHandler');
const AppError = require('../utils/appError');
const { ROLES } = require('../constants/roles');

// GET all reports
exports.getAllReports = async (req, res, next) => {
  try {
    const isPrivileged = [ROLES.ADMIN, ROLES.PETUGAS].includes(req.user.role);
    const query = { ...req.query };
    // User biasa hanya bisa lihat laporan miliknya sendiri
    if (!isPrivileged) {
      query.user_id = req.user.id;
    }
    const result = await damageReportService.findAllReports(query);
    return sendSuccess(
      res,
      'Data laporan kerusakan/kehilangan berhasil dimuat',
      result.reports,
      200,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        counts: result.counts
      }
    );
  } catch (err) {
    next(err);
  }
};

// GET report by ID
exports.getReportById = async (req, res, next) => {
  try {
    const data = await damageReportService.findReportById(req.params.id);
    const isPrivileged = [ROLES.ADMIN, ROLES.PETUGAS].includes(req.user.role);
    if (!isPrivileged && data.user_id !== req.user.id) {
      return next(new AppError('Akses ditolak: Anda tidak memiliki izin untuk melihat data ini', 403));
    }
    return sendSuccess(res, 'Detail laporan berhasil dimuat', data, 200);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/damage-reports
 * Admin/Petugas membuat laporan kerusakan atau kehilangan secara manual.
 * Bisa langsung memasukkan nominal denda.
 */
exports.createReport = async (req, res, next) => {
  try {
    const isPrivileged = [ROLES.ADMIN, ROLES.PETUGAS].includes(req.user.role);
    if (!isPrivileged || !req.body.user_id) {
      req.body.user_id = isPrivileged ? (req.body.user_id || req.user.id) : req.user.id;
    }
    // Jika bukan admin, cegah manipulasi denda sendiri
    if (!isPrivileged) {
      delete req.body.fine_amount;
      delete req.body.fine_reason;
      delete req.body.fine_status;
    }
    if (req.body.photo_url && !req.body.image_url) {
      req.body.image_url = req.body.photo_url;
    }
    if (req.body.damage_description && !req.body.description) {
      req.body.description = req.body.damage_description;
    }
    const data = await damageReportService.createNewReport(req.body);
    return sendSuccess(res, 'Laporan kerusakan/kehilangan berhasil dibuat', data, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/damage-reports/:id
 * Update laporan: status, denda, kondisi barang — semuanya manual oleh Admin/Petugas.
 */
exports.updateReport = async (req, res, next) => {
  try {
    const data = await damageReportService.updateReport(req.params.id, req.body);
    return sendSuccess(res, 'Laporan berhasil diperbarui', data, 200);
  } catch (err) {
    next(err);
  }
};
