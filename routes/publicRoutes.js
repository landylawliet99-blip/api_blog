// api_blog/routes/publicRoutes.js - VERSIÓN ACTUALIZADA
const express = require('express');
const router = express.Router();
const Article = require('../models/articleModel');

// 🔓 RUTA PÚBLICA - Obtener artículo con productos y enlaces
router.get('/articles/:slug', async (req, res) => {
  try {
    const article = await Article.getWithProducts(req.params.slug);
    
    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('[Public Routes] Error:', error);
    res.status(404).json({
      success: false,
      message: 'Artículo no encontrado o no está publicado'
    });
  }
});

module.exports = router;