class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
    this.isAppError = true;
  }
}

function sendError(res, err) {
  if (err.isAppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message }
    });
  }
  console.error('Error inesperado:', err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' }
  });
}

module.exports = { AppError, sendError };
