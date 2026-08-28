const damageReportService = require('../services/damageReportService');
const { sendSuccess } = require('../utils/responseHandler');
const { ROLES } = require('../constants/roles');

exports.getAllReports = async (req, res, next) => {
  try {
    const isPrivileged = [ROLES.ADMIN, ROLES.PETUGAS].includes(req.user.role);
    const query = { ...req.query };
    if (!isPrivileged) {
      query.user_id = req.user.id;
    }
    const result = await damageReportService.findAllReports(query);
    return sendSuccess(
      res,
      'Data laporan kerusakan berhasil dimuat',
      result.reports,
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

exports.getReportById = async (req, res, next) => {
  try {
    const data = await damageReportService.findReportById(req.params.id);
    const isPrivileged = [ROLES.ADMIN, ROLES.PETUGAS].includes(req.user.role);
    if (!isPrivileged && data.user_id !== req.user.id) {
      return res.status(403).json({
        status: 'fail',
        message: 'Akses ditolak: Anda tidak memiliki izin untuk melihat data ini.'
      });
    }
    return sendSuccess(res, 'Detail laporan kerusakan berhasil dimuat', data, 200);
  } catch (err) {
    next(err);
  }
};

exports.createReport = async (req, res, next) => {
  try {
    req.body.user_id = req.user.id;
    const data = await damageReportService.createNewReport(req.body);
    return sendSuccess(res, 'Laporan kerusakan berhasil dikirim', data, 201);
  } catch (err) {
    next(err);
  }
};

exports.updateReportStatus = async (req, res, next) => {
  try {
    const data = await damageReportService.updateStatus(req.params.id, req.body);
    return sendSuccess(res, 'Status laporan berhasil diperbarui', data, 200);
  } catch (err) {
    next(err);
  }
};
