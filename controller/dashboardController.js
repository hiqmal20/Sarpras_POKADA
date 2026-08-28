const dashboardService = require('../services/dashboardService');
const { sendSuccess } = require('../utils/responseHandler');

exports.getStats = async (req, res, next) => {
  try {
    const data = await dashboardService.getStats();
    return sendSuccess(res, 'Data statistik dashboard berhasil dimuat', data, 200);
  } catch (err) {
    next(err);
  }
};
