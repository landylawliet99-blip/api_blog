// controllers/authController.js
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

// VERIFICACIÓN DE SEGURIDAD CRÍTICA
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'tu_secreto_super_seguro') {
  console.error('❌❌❌ ERROR CRÍTICO DE SEGURIDAD ❌❌❌');
  console.error('JWT_SECRET no está configurado correctamente en las variables de entorno.');
  console.error('En desarrollo local, crea un archivo .env con:');
  console.error('  JWT_SECRET=un_secreto_muy_largo_y_complejo_aqui');
  console.error('En producción (Render), configura la variable de entorno JWT_SECRET.');
  process.exit(1); // Detiene el servidor por seguridad
}

const authController = {
  /**
   * REGISTRO de usuario (solo para el primer admin)
   */
  async register(req, res) {
    try {
      const { email, username, password } = req.body;

      // Validaciones básicas
      if (!email || !username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email, username y password son obligatorios'
        });
      }

      // Verificar si el usuario ya existe
      try {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'El usuario ya existe'
          });
        }
      } catch (error) {
        // Si no encuentra el usuario, continuamos con el registro
      }

      // Crear usuario
      const newUser = await User.create({ email, username, password });

      // Crear token JWT CON SEGURIDAD
      const token = jwt.sign(
        { 
          id: newUser.id, 
          email: newUser.email, 
          role: newUser.role,
          iat: Math.floor(Date.now() / 1000) // issued at
        },
        process.env.JWT_SECRET, // ← SOLO variable de entorno, NO fallback
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        message: '✅ Usuario creado exitosamente',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            role: newUser.role
          },
          token
        }
      });

    } catch (error) {
      console.error('[Auth Controller] Error en register:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar usuario',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  },

  /**
   * LOGIN de usuario
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y password son obligatorios'
        });
      }

      // Buscar usuario
      const user = await User.findByEmail(email);

      // Verificar contraseña
      const isValidPassword = await User.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Crear token JWT CON SEGURIDAD
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET, // ← SOLO variable de entorno
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: '✅ Login exitoso',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role
          },
          token
        }
      });

    } catch (error) {
      console.error('[Auth Controller] Error en login:', error);
      
      // Respuesta genérica por seguridad (no revelar si el usuario existe o no)
      res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * VALIDAR token (endpoint para probar que el JWT funciona)
   */
  async validateToken(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token no proporcionado'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      res.json({
        success: true,
        message: '✅ Token válido',
        data: {
          user: decoded,
          expiresIn: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null
        }
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  }
};

module.exports = authController;