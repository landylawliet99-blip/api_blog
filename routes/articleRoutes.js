// routes/articleRoutes.js
const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const authMiddleware = require('../middleware/authMiddleware');

// 🔒 RUTAS PROTEGIDAS: Crear, actualizar y eliminar artículos requieren autenticación y ser admin
router.post('/articles', authMiddleware.authenticateToken, authMiddleware.isAdmin, articleController.create);
router.get('/articles', articleController.getAll); // Esta puede ser pública
router.get('/articles/:id', articleController.getById); // Esta puede ser pública
router.put('/articles/:id', authMiddleware.authenticateToken, authMiddleware.isAdmin, articleController.update);
router.delete('/articles/:id', authMiddleware.authenticateToken, authMiddleware.isAdmin, articleController.delete);

module.exports = router;