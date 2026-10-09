const auditLogService = require('../services/auditLogService');
const { sendSuccess } = require('../utils/responseHandler');

exports.getAllAuditLogs = async (req, res, next) => {
  try {
    const result = await auditLogService.findAllLogs(req.query);
    return sendSuccess(
      res,
      'Data audit log berhasil dimuat',
      result.logs,
      200,
      {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        ...(result.notice && { notice: result.notice })
      }
    );
  } catch (err) {
    next(err);
  }
};
