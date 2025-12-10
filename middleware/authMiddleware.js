// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = {
  // Middleware para verificar token JWT
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. Token no proporcionado.'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_super_seguro', (err, user) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Token inválido o expirado.'
        });
      }
      
      req.user = user;
      next();
    });
  },

  // Middleware para verificar rol de administrador
  isAdmin: (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso restringido. Se requiere rol de administrador.'
      });
    }
    next();
  }
};

module.exports = authMiddleware;