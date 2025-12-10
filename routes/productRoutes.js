// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');

// Rutas de Productos
router.post('/products', authMiddleware.authenticateToken, authMiddleware.isAdmin, productController.create);
router.get('/products', productController.getAllWithLinks);
router.get('/products/:id', productController.getById);
router.put('/products/:id', authMiddleware.authenticateToken, authMiddleware.isAdmin, productController.update);
router.delete('/products/:id', authMiddleware.authenticateToken, authMiddleware.isAdmin, productController.delete);

// Rutas de Enlaces de Afiliado
router.post('/products/:productId/links', authMiddleware.authenticateToken, authMiddleware.isAdmin, productController.addAffiliateLink);
router.put('/products/:productId/links/:linkId', authMiddleware.authenticateToken, authMiddleware.isAdmin, productController.updateAffiliateLink);
router.delete('/products/:productId/links/:linkId', authMiddleware.authenticateToken, authMiddleware.isAdmin, productController.deleteAffiliateLink);

// Rutas de Relación Producto-Artículo
router.post('/articles/:articleId/products', authMiddleware.authenticateToken, authMiddleware.isAdmin, productController.linkToArticle);

module.exports = router;