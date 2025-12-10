// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta pública: Registro (solo para crear el primer admin)
router.post('/auth/register', authController.register);

// Ruta pública: Login
router.post('/auth/login', authController.login);

module.exports = router;