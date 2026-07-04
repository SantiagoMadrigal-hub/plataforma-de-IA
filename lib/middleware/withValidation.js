const { AppError } = require('../errors');

function withValidation(schema) {
  return (handler) => async (req, res) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.errors[0];
      throw new AppError('VALIDATION_ERROR', first.message, 400);
    }
    req.validated = result.data;
    return handler(req, res);
  };
}

module.exports = { withValidation };
