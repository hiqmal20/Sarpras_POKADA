const damageReportService = require('../services/damageReportService');
const { sendSuccess } = require('../utils/responseHandler');

// Get all damage reports
exports.getAllReports = async (req, res, next) => {
  try {
    const result = await damageReportService.findAllReports(req.query);
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

// Get damage report by ID
exports.getReportById = async (req, res, next) => {
  try {
    const data = await damageReportService.findReportById(req.params.id);
    return sendSuccess(res, 'Detail laporan kerusakan berhasil dimuat', data, 200);
  } catch (err) {
    next(err);
  }
};

// Create report
exports.createReport = async (req, res, next) => {
  try {
    const data = await damageReportService.createNewReport(req.body);
    return sendSuccess(res, 'Laporan kerusakan berhasil dikirim', data, 201);
  } catch (err) {
    next(err);
  }
};

// Update status
exports.updateReportStatus = async (req, res, next) => {
  try {
    const data = await damageReportService.updateStatus(req.params.id, req.body);
    return sendSuccess(res, 'Status laporan berhasil diperbarui', data, 200);
  } catch (err) {
    next(err);
  }
};
