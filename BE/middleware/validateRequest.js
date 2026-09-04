// Middleware validasi request menggunakan Joi schema
const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));

      return res.status(400).json({
        status: 'fail',
        message: 'Validasi data gagal',
        errors: errorDetails
      });
    }

    // Replace dengan data yang sudah disanitasi & di-cast oleh Joi
    req[source] = value;
    next();
  };
};

module.exports = validateRequest;
