const { verifyAccessToken } = require('../jwt');
const { AppError } = require('../errors');

function withAuth(handler) {
  return async (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        throw new AppError('UNAUTHORIZED', 'Token de acceso requerido', 401);
      }
      const token = auth.split(' ')[1];
      const decoded = verifyAccessToken(token);
      req.user = { id: decoded.id, email: decoded.email, plan: decoded.plan };
      return handler(req, res);
    } catch (err) {
      if (err.isAppError) {
        return res.status(err.status).json({
          error: { code: err.code, message: err.message }
        });
      }
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: { code: 'TOKEN_EXPIRED', message: 'El token ha expirado' }
        });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: { code: 'INVALID_TOKEN', message: 'Token inválido' }
        });
      }
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' }
      });
    }
  };
}

module.exports = { withAuth };
