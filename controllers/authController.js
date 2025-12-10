// controllers/authController.js
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

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

      // Crear token JWT
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        process.env.JWT_SECRET || 'tu_secreto_super_seguro',
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
        error: error.message
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

      // Crear token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'tu_secreto_super_seguro',
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
      res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
        error: error.message
      });
    }
  }
};

module.exports = authController;