const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUuid = (value) => {
  return typeof value === 'string' && UUID_REGEX.test(value.trim());
};

/**
 * Express param handler callback for router.param(name, uuidParamHandler)
 */
const uuidParamHandler = (req, res, next, val, name) => {
  if (!isValidUuid(val)) {
    return res.status(400).json({
      status: 'fail',
      message: `Parameter '${name}' harus berupa UUID yang valid`
    });
  }
  next();
};

/**
 * Middleware explicitly checking one or more params on the route
 */
const validateUuidParam = (...paramNames) => {
  const names = paramNames.length > 0 ? paramNames : ['id'];
  return (req, res, next) => {
    for (const name of names) {
      const val = req.params ? req.params[name] : undefined;
      if (val !== undefined && !isValidUuid(val)) {
        return res.status(400).json({
          status: 'fail',
          message: `Parameter '${name}' harus berupa UUID yang valid`
        });
      }
    }
    next();
  };
};

module.exports = {
  UUID_REGEX,
  isValidUuid,
  uuidParamHandler,
  validateUuidParam
};
