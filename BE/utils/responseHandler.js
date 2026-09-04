// Standardized API Response Formatter

const sendSuccess = (res, message, data = null, statusCode = 200, meta = null) => {
  const response = {
    status: 'success',
    message
  };

  if (meta) {
    Object.assign(response, meta);
  }

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

const sendError = (res, message, statusCode = 500, errors = null) => {
  const response = {
    status: `${statusCode}`.startsWith('4') ? 'fail' : 'error',
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess,
  sendError
};
